'use strict';

import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.hoisted(() => vi.fn());
const lastSeenMock = vi.hoisted(() => vi.fn());

const USERS: Record<string, any> = {
    ann: { username: 'ann', displayName: 'Ann', isAdmin: false },
    bob: { username: 'bob', displayName: 'Bob', isAdmin: false },
    admin: { username: 'admin', displayName: 'Admin', isAdmin: true },
};

vi.mock('../directoryService/database', () => ({
    dynamo: { send: sendMock },
    getUser: vi.fn(async (username: string) => USERS[username]),
}));
vi.mock('./runsDatabase', () => ({ getLastSeen: lastSeenMock }));

import { handler as listPuzzles } from './list';
import { trainHandler, trainingTagsHandler } from './training';
import { voteHandler } from './votes';

const puzzle = (id: string) => ({
    id,
    fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    solutionPgn: '1. Rd8#',
    rating: 1000,
    buckets: [],
    themes: [],
    annotator: 'a',
    annotatorDisplayName: 'A',
    createdAt: 'T0',
    updatedAt: 'T0',
});

function event(as: string, body: unknown = {}, queryStringParameters: Record<string, string> = {}) {
    return {
        body: JSON.stringify(body),
        queryStringParameters,
        pathParameters: {},
        requestContext: { authorizer: { jwt: { claims: { 'cognito:username': as } } } },
    } as unknown as APIGatewayProxyEventV2;
}

async function call(fn: any, e: APIGatewayProxyEventV2) {
    const res = (await fn(e, {} as any, () => {})) as APIGatewayProxyStructuredResultV2;
    return { status: res.statusCode, body: JSON.parse(res.body || '{}') };
}

/** The table, in memory. */
let puzzles: Record<string, any>;
let votes: Record<string, { vote: 1 | -1 }>; // by `username#puzzleId`
let totals: Record<string, { upvotes: number; downvotes: number }>;
let cancelNext: number;

beforeEach(() => {
    process.env.PUZZLEBASE_TRAINING_OPEN = 'true';
    sendMock.mockReset();
    lastSeenMock.mockReset();
    lastSeenMock.mockResolvedValue({ '001': '2026-10-01T00:00:00.000Z' });
    puzzles = { '001': puzzle('001'), '002': puzzle('002') };
    votes = {};
    totals = {};
    cancelNext = 0;

    sendMock.mockImplementation(async (cmd: any) => {
        const name = cmd.constructor.name;
        if (name === 'GetItemCommand') {
            const key = unmarshall(cmd.input.Key);
            if (key.pk === 'PUZZLE') {
                return { Item: puzzles[key.sk] && marshall({ ...key, ...puzzles[key.sk] }) };
            }
            if (key.pk === 'VOTE') {
                return { Item: votes[key.sk] && marshall({ ...key, ...votes[key.sk] }) };
            }
            if (key.pk === 'VOTES') {
                return { Item: totals[key.sk] && marshall({ ...key, ...totals[key.sk] }) };
            }
            return {}; // contributor records
        }
        if (name === 'QueryCommand') {
            const { ':pk': pk, ':prefix': prefix } = unmarshall(
                cmd.input.ExpressionAttributeValues,
            );
            if (pk === 'PUZZLE') {
                return {
                    Items: Object.values(puzzles).map((p) => marshall({ pk, sk: p.id, ...p })),
                };
            }
            if (pk === 'VOTES') {
                return {
                    Items: Object.entries(totals).map(([sk, t]) => marshall({ pk, sk, ...t })),
                };
            }
            if (pk === 'VOTE') {
                return {
                    Items: Object.entries(votes)
                        .filter(([sk]) => sk.startsWith(prefix))
                        .map(([sk, v]) => marshall({ pk, sk, ...v })),
                };
            }
            return { Items: [] };
        }
        if (name === 'TransactWriteItemsCommand') {
            if (cancelNext > 0) {
                cancelNext--;
                throw new TransactionCanceledException({ message: 'x', $metadata: {} });
            }
            for (const item of cmd.input.TransactItems) {
                if (item.Put) {
                    const row = unmarshall(item.Put.Item);
                    votes[row.sk] = { vote: row.vote };
                }
                if (item.Delete) {
                    delete votes[unmarshall(item.Delete.Key).sk];
                }
                if (item.Update) {
                    const sk = unmarshall(item.Update.Key).sk;
                    const { ':up': up, ':down': down } = unmarshall(
                        item.Update.ExpressionAttributeValues,
                    );
                    const now = totals[sk] ?? { upvotes: 0, downvotes: 0 };
                    totals[sk] = { upvotes: now.upvotes + up, downvotes: now.downvotes + down };
                }
            }
            return {};
        }
        return {};
    });
});

describe('voting on a puzzle', () => {
    it('records a thumbs up and returns the totals', async () => {
        const { status, body } = await call(
            voteHandler,
            event('ann', { puzzleId: '001', vote: 1 }),
        );
        expect(status).toBe(200);
        expect(body).toEqual({ upvotes: 1, downvotes: 0, vote: 1 });
        expect(votes['ann#001']).toEqual({ vote: 1 });
    });

    it('adds up the votes of different members', async () => {
        lastSeenMock.mockResolvedValue({ '001': 'T' });
        await call(voteHandler, event('ann', { puzzleId: '001', vote: 1 }));
        const { body } = await call(voteHandler, event('bob', { puzzleId: '001', vote: -1 }));
        expect(body).toEqual({ upvotes: 1, downvotes: 1, vote: -1 });
    });

    it('moves a vote when a member changes their mind, and takes it back', async () => {
        await call(voteHandler, event('ann', { puzzleId: '001', vote: 1 }));
        const changed = await call(voteHandler, event('ann', { puzzleId: '001', vote: -1 }));
        expect(changed.body).toEqual({ upvotes: 0, downvotes: 1, vote: -1 });
        const taken = await call(voteHandler, event('ann', { puzzleId: '001', vote: 0 }));
        expect(taken.body).toEqual({ upvotes: 0, downvotes: 0, vote: 0 });
        expect(votes['ann#001']).toBeUndefined();
    });

    it('counts the same vote sent twice once', async () => {
        await call(voteHandler, event('ann', { puzzleId: '001', vote: 1 }));
        const { body } = await call(voteHandler, event('ann', { puzzleId: '001', vote: 1 }));
        expect(body).toMatchObject({ upvotes: 1, downvotes: 0 });
    });

    it('tries again when the vote is changed at the same moment', async () => {
        cancelNext = 1;
        const { status, body } = await call(
            voteHandler,
            event('ann', { puzzleId: '001', vote: 1 }),
        );
        expect(status).toBe(200);
        expect(body).toMatchObject({ upvotes: 1 });
    });

    it('only lets members vote on puzzles they have played', async () => {
        const { status, body } = await call(
            voteHandler,
            event('ann', { puzzleId: '002', vote: 1 }),
        );
        expect(status).toBe(403);
        expect(body.message).toMatch(/Play the puzzle/);
        expect(totals['002']).toBeUndefined();
    });

    it('rejects a puzzle that is not there and nonsense votes', async () => {
        expect((await call(voteHandler, event('ann', { puzzleId: '999', vote: 1 }))).status).toBe(
            404,
        );
        expect((await call(voteHandler, event('ann', { puzzleId: '001', vote: 5 }))).status).toBe(
            400,
        );
    });

    it('is closed to members while training is not open', async () => {
        process.env.PUZZLEBASE_TRAINING_OPEN = 'false';
        expect((await call(voteHandler, event('ann', { puzzleId: '001', vote: 1 }))).status).toBe(
            403,
        );
    });
});

describe('seeing votes', () => {
    it('gives Puzzle Contributors the totals with every puzzle', async () => {
        totals = { '001': { upvotes: 3, downvotes: 1 } };
        const { body } = await call(listPuzzles, event('admin'));
        const byId = Object.fromEntries(body.map((p: any) => [p.id, p]));
        expect(byId['001']).toMatchObject({ upvotes: 3, downvotes: 1 });
        expect(byId['002']).toMatchObject({ upvotes: 0, downvotes: 0 });
    });

    it('gives a member their own vote on the puzzles to train on, and no totals', async () => {
        votes = { 'ann#001': { vote: -1 }, 'bob#002': { vote: 1 } };
        totals = { '001': { upvotes: 3, downvotes: 1 } };
        const { body } = await call(trainHandler, event('ann'));
        const byId = Object.fromEntries(body.map((p: any) => [p.id, p]));
        expect(byId['001'].myVote).toBe(-1);
        expect(byId['002'].myVote).toBeUndefined();
        expect(byId['001'].upvotes).toBeUndefined();
    });
});

describe('the tags to offer for training', () => {
    it('gives the tag sets of the puzzles, and nothing else about them', async () => {
        puzzles = {
            '001': { ...puzzle('001'), buckets: ['Tactics'], themes: ['Fork'] },
            '002': { ...puzzle('002'), buckets: ['Tactics'], themes: ['Fork'] },
            '003': { ...puzzle('003'), buckets: ['Strategy'], themes: [] },
        };
        const { status, body } = await call(trainingTagsHandler, event('ann'));
        expect(status).toBe(200);
        expect(body).toEqual([
            { buckets: ['Tactics'], themes: ['Fork'], count: 2 },
            { buckets: ['Strategy'], themes: [], count: 1 },
        ]);
    });

    it('is closed to members while training is not open', async () => {
        process.env.PUZZLEBASE_TRAINING_OPEN = 'false';
        expect((await call(trainingTagsHandler, event('ann'))).status).toBe(403);
    });
});
