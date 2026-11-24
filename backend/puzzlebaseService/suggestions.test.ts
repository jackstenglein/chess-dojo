'use strict';

import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.hoisted(() => vi.fn());

const USERS: Record<string, any> = {
    admin: { username: 'admin', displayName: 'Admin', isAdmin: true },
    approved: { username: 'approved', displayName: 'Approved One', isAdmin: false },
    ann: { username: 'ann', displayName: 'Ann', isAdmin: false },
    bob: { username: 'bob', displayName: 'Bob', isAdmin: false },
};

vi.mock('../directoryService/database', () => ({
    dynamo: { send: sendMock },
    getUser: vi.fn(async (username: string) => USERS[username]),
}));

import { listSuggestionsHandler, resolveSuggestionsHandler, suggestHandler } from './suggestions';

const FEN = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';
const puzzle = (id: string, buckets: string[] = [], themes: string[] = []) => ({
    id,
    fen: FEN,
    solutionPgn: `[SetUp "1"]\n[FEN "${FEN}"]\n\n1. Rd8#`,
    annotator: 'a',
    annotatorDisplayName: 'A',
    rating: 1000,
    buckets,
    themes,
    createdAt: 'T0',
    updatedAt: 'T0',
});

function event(
    as: string | undefined,
    body: unknown = {},
    pathParameters: Record<string, string> = {},
): APIGatewayProxyEventV2 {
    return {
        body: JSON.stringify(body),
        pathParameters,
        requestContext: as ? { authorizer: { jwt: { claims: { 'cognito:username': as } } } } : {},
    } as unknown as APIGatewayProxyEventV2;
}

async function call(fn: any, e: APIGatewayProxyEventV2) {
    const res = (await fn(e, {} as any, () => {})) as APIGatewayProxyStructuredResultV2;
    return { status: res.statusCode, body: JSON.parse(res.body || '{}') };
}

let puzzles: Record<string, any>;
let suggestions: Map<string, any>; // key: `${puzzleId}#${username}`

beforeEach(() => {
    sendMock.mockReset();
    puzzles = {
        '001': puzzle('001'),
        '002': puzzle('002', ['Tactics'], ['Fork']),
    };
    suggestions = new Map();

    sendMock.mockImplementation(async (cmd: any) => {
        const name = cmd.constructor.name;
        const key = cmd.input.Key ? unmarshall(cmd.input.Key) : undefined;
        const item = cmd.input.Item ? unmarshall(cmd.input.Item) : undefined;

        if (name === 'GetItemCommand') {
            if (key!.pk === 'PUZZLE') {
                const p = puzzles[key!.sk];
                return { Item: p ? marshall({ pk: 'PUZZLE', sk: key!.sk, ...p }) : undefined };
            }
            // Contributors: only "approved" is approved. Admins need no record.
            if (key!.pk === 'CONTRIBUTOR') {
                return {
                    Item:
                        key!.sk === 'approved'
                            ? marshall({ pk: 'CONTRIBUTOR', sk: 'approved', status: 'APPROVED' })
                            : undefined,
                };
            }
            return { Item: undefined }; // no stored taxonomy: the defaults are used
        }
        if (name === 'QueryCommand') {
            const values = unmarshall(cmd.input.ExpressionAttributeValues);
            if (values[':pk'] === 'PUZZLE') {
                return {
                    Items: Object.values(puzzles).map((p) =>
                        marshall({ pk: 'PUZZLE', sk: p.id, ...p }),
                    ),
                };
            }
            const prefix: string | undefined = values[':prefix'];
            return {
                Items: [...suggestions.entries()]
                    .filter(([k]) => !prefix || k.startsWith(prefix))
                    .map(([k, s]) => marshall({ pk: 'SUGGESTION', sk: k, ...s })),
            };
        }
        if (name === 'PutItemCommand' && item) {
            if (item.pk === 'PUZZLE') puzzles[item.sk] = item;
            if (item.pk === 'SUGGESTION') suggestions.set(item.sk, item);
        }
        if (name === 'DeleteItemCommand') {
            suggestions.delete(key!.sk);
        }
        return {};
    });
});

describe('suggesting tags', () => {
    it('lets any signed-in member suggest, and adds nothing to the puzzle', async () => {
        const { status } = await call(
            suggestHandler,
            event('ann', { themes: ['Pin'], buckets: ['Tactics'] }, { id: '001' }),
        );
        expect(status).toBe(200);
        expect(puzzles['001'].themes).toEqual([]);
        expect(suggestions.get('001#ann')).toMatchObject({
            puzzleId: '001',
            username: 'ann',
            displayName: 'Ann',
            themes: ['Pin'],
            buckets: ['Tactics'],
        });
    });

    it('needs a signed-in member', async () => {
        expect(
            (await call(suggestHandler, event(undefined, { themes: ['Pin'] }, { id: '001' })))
                .status,
        ).toBe(400);
        expect(suggestions.size).toBe(0);
    });

    it('replaces a member’s earlier suggestion for the same puzzle', async () => {
        await call(suggestHandler, event('ann', { themes: ['Pin'] }, { id: '001' }));
        await call(suggestHandler, event('ann', { themes: ['Skewer'] }, { id: '001' }));
        expect(suggestions.size).toBe(1);
        expect(suggestions.get('001#ann').themes).toEqual(['Skewer']);
    });

    it('withdraws the suggestion when sent with no tags', async () => {
        await call(suggestHandler, event('ann', { themes: ['Pin'] }, { id: '001' }));
        const { status } = await call(suggestHandler, event('ann', {}, { id: '001' }));
        expect(status).toBe(200);
        expect(suggestions.size).toBe(0);
    });

    it('turns away tags that are not in the taxonomy', async () => {
        const { status, body } = await call(
            suggestHandler,
            event('ann', { themes: ['Made up'] }, { id: '001' }),
        );
        expect(status).toBe(400);
        expect(body.message).toMatch(/Unknown theme/);
        expect(suggestions.size).toBe(0);
    });

    it('turns away tags the puzzle already has', async () => {
        const { status, body } = await call(
            suggestHandler,
            event('ann', { themes: ['Fork'], buckets: ['Tactics'] }, { id: '002' }),
        );
        expect(status).toBe(400);
        expect(body.message).toMatch(/already on this puzzle/);
    });

    it('keeps only the new tags when some are already there', async () => {
        await call(suggestHandler, event('ann', { themes: ['Fork', 'Pin'] }, { id: '002' }));
        expect(suggestions.get('002#ann').themes).toEqual(['Pin']);
    });

    it('says when the puzzle does not exist', async () => {
        expect(
            (await call(suggestHandler, event('ann', { themes: ['Pin'] }, { id: '999' }))).status,
        ).toBe(404);
    });
});

describe('the review pile', () => {
    beforeEach(async () => {
        await call(suggestHandler, event('ann', { themes: ['Pin', 'Skewer'] }, { id: '001' }));
        await call(suggestHandler, event('bob', { themes: ['Pin'] }, { id: '001' }));
        await call(suggestHandler, event('bob', { themes: ['Pin'] }, { id: '002' }));
    });

    it('is for Puzzle Contributors and admins only', async () => {
        expect((await call(listSuggestionsHandler, event('ann'))).status).toBe(403);
        expect((await call(listSuggestionsHandler, event('approved'))).status).toBe(200);
        expect((await call(listSuggestionsHandler, event('admin'))).status).toBe(200);
    });

    it('groups what was suggested by puzzle, most wanted first, with who suggested it', async () => {
        const { body } = await call(listSuggestionsHandler, event('approved'));
        expect(body.map((s: any) => s.puzzleId)).toEqual(['001', '002']);
        expect(body[0].tags.map((t: any) => [t.name, t.count])).toEqual([
            ['Pin', 2],
            ['Skewer', 1],
        ]);
        expect(body[0].tags[0].suggestedBy.sort()).toEqual(['Ann', 'Bob']);
    });

    it('leaves out a tag the puzzle has been given since', async () => {
        puzzles['001'] = puzzle('001', ['Tactics'], ['Pin']);
        const { body } = await call(listSuggestionsHandler, event('approved'));
        expect(body[0].tags.map((t: any) => t.name)).toEqual(['Skewer']);
    });
});

describe('deciding on suggestions', () => {
    beforeEach(async () => {
        await call(suggestHandler, event('ann', { themes: ['Pin', 'Skewer'] }, { id: '001' }));
        await call(suggestHandler, event('bob', { themes: ['Pin'] }, { id: '001' }));
    });

    it('is for Puzzle Contributors and admins only', async () => {
        expect(
            (
                await call(
                    resolveSuggestionsHandler,
                    event('ann', { accept: ['Pin'] }, { id: '001' }),
                )
            ).status,
        ).toBe(403);
        expect(puzzles['001'].themes).toEqual([]);
    });

    it('adds an accepted tag to the puzzle with its bucket, and clears it for everyone', async () => {
        const { status, body } = await call(
            resolveSuggestionsHandler,
            event('approved', { accept: ['Pin'] }, { id: '001' }),
        );
        expect(status).toBe(200);
        expect(body.themes).toEqual(['Pin']);
        expect(body.buckets).toEqual(['Tactics']);
        expect(puzzles['001'].themes).toEqual(['Pin']);
        // Bob's only suggestion is gone; Ann's keeps Skewer.
        expect(suggestions.has('001#bob')).toBe(false);
        expect(suggestions.get('001#ann').themes).toEqual(['Skewer']);
    });

    it('dismisses a tag without adding it', async () => {
        const { status } = await call(
            resolveSuggestionsHandler,
            event('approved', { reject: ['Skewer'] }, { id: '001' }),
        );
        expect(status).toBe(200);
        expect(puzzles['001'].themes).toEqual([]);
        expect(suggestions.get('001#ann').themes).toEqual(['Pin']);
    });

    it('does both at once, and removes a suggestion that has nothing left', async () => {
        await call(
            resolveSuggestionsHandler,
            event('admin', { accept: ['Pin'], reject: ['Skewer'] }, { id: '001' }),
        );
        expect(suggestions.size).toBe(0);
    });

    it('refuses a tag that is not in the taxonomy and changes nothing', async () => {
        const { status } = await call(
            resolveSuggestionsHandler,
            event('approved', { accept: ['Nonsense'] }, { id: '001' }),
        );
        expect(status).toBe(400);
        expect(suggestions.size).toBe(2);
    });

    it('says when the puzzle does not exist', async () => {
        expect(
            (
                await call(
                    resolveSuggestionsHandler,
                    event('approved', { accept: ['Pin'] }, { id: '999' }),
                )
            ).status,
        ).toBe(404);
    });
});

describe('suggesting that tags come off', () => {
    it('lets any signed-in member suggest taking a tag off, without changing the puzzle', async () => {
        const { status } = await call(
            suggestHandler,
            event('ann', { removeThemes: ['Fork'] }, { id: '002' }),
        );
        expect(status).toBe(200);
        expect(puzzles['002'].themes).toEqual(['Fork']);
        expect(suggestions.get('002#ann')).toMatchObject({
            removeThemes: ['Fork'],
            removeBuckets: [],
            themes: [],
        });
    });

    it('turns away taking off a tag the puzzle does not have', async () => {
        const { status, body } = await call(
            suggestHandler,
            event('ann', { removeThemes: ['Pin'] }, { id: '002' }),
        );
        expect(status).toBe(400);
        expect(body.message).toMatch(/does not have those tags/);
        expect(suggestions.size).toBe(0);
    });

    it('turns away a removal of a tag that is not in the taxonomy', async () => {
        const { status, body } = await call(
            suggestHandler,
            event('ann', { removeThemes: ['Made up'] }, { id: '002' }),
        );
        expect(status).toBe(400);
        expect(body.message).toMatch(/Unknown theme/);
    });

    it('keeps the useful half when a suggestion adds one tag and removes another', async () => {
        await call(
            suggestHandler,
            event(
                'ann',
                { themes: ['Pin', 'Fork'], removeThemes: ['Fork', 'Skewer'] },
                { id: '002' },
            ),
        );
        expect(suggestions.get('002#ann')).toMatchObject({
            themes: ['Pin'],
            removeThemes: ['Fork'],
        });
    });

    it('shows removals in the review pile, apart from additions', async () => {
        await call(suggestHandler, event('ann', { removeThemes: ['Fork'] }, { id: '002' }));
        await call(
            suggestHandler,
            event('bob', { removeThemes: ['Fork'], themes: ['Pin'] }, { id: '002' }),
        );
        const { body } = await call(listSuggestionsHandler, event('approved'));
        expect(body[0].tags.map((t: any) => [t.name, t.action, t.count])).toEqual([
            ['Fork', 'remove', 2],
            ['Pin', 'add', 1],
        ]);
    });

    it('leaves a removal out of the pile once the tag has gone', async () => {
        await call(suggestHandler, event('ann', { removeThemes: ['Fork'] }, { id: '002' }));
        puzzles['002'] = puzzle('002', ['Tactics'], []);
        const { body } = await call(listSuggestionsHandler, event('approved'));
        expect(body).toEqual([]);
    });

    it('takes the tag off the puzzle when a contributor accepts, and clears it for everyone', async () => {
        await call(suggestHandler, event('ann', { removeThemes: ['Fork'] }, { id: '002' }));
        await call(suggestHandler, event('bob', { removeThemes: ['Fork'] }, { id: '002' }));
        const { status, body } = await call(
            resolveSuggestionsHandler,
            event('approved', { accept: ['Fork'] }, { id: '002' }),
        );
        expect(status).toBe(200);
        expect(body.themes).toEqual([]);
        expect(puzzles['002'].themes).toEqual([]);
        expect(suggestions.size).toBe(0);
    });

    it('keeps the tag when a contributor dismisses the removal', async () => {
        await call(suggestHandler, event('ann', { removeThemes: ['Fork'] }, { id: '002' }));
        await call(
            resolveSuggestionsHandler,
            event('approved', { reject: ['Fork'] }, { id: '002' }),
        );
        expect(puzzles['002'].themes).toEqual(['Fork']);
        expect(suggestions.size).toBe(0);
    });

    it('takes off a bucket with the themes that were only there for it', async () => {
        await call(suggestHandler, event('ann', { removeBuckets: ['Tactics'] }, { id: '002' }));
        await call(
            resolveSuggestionsHandler,
            event('admin', { accept: ['Tactics'] }, { id: '002' }),
        );
        expect(puzzles['002'].buckets).toEqual([]);
        expect(puzzles['002'].themes).toEqual([]);
    });
});

describe('a contributor suggesting tags', () => {
    it('has their tags added to the puzzle at once, with no review', async () => {
        const { status, body } = await call(
            suggestHandler,
            event('approved', { themes: ['Pin'] }, { id: '001' }),
        );
        expect(status).toBe(200);
        expect(body.applied).toBe(true);
        expect(body.puzzle.themes).toEqual(['Pin']);
        expect(body.puzzle.buckets).toEqual(['Tactics']);
        expect(puzzles['001'].themes).toEqual(['Pin']);
        expect(suggestions.size).toBe(0);
    });

    it('lets an admin do the same', async () => {
        const { body } = await call(
            suggestHandler,
            event('admin', { buckets: ['Endgame'], themes: ['Passed pawn'] }, { id: '001' }),
        );
        expect(body.applied).toBe(true);
        expect(puzzles['001'].buckets).toEqual(['Endgame']);
        expect(puzzles['001'].themes).toEqual(['Passed pawn']);
    });

    it('takes tags off at once too, and adds and removes together', async () => {
        const { body } = await call(
            suggestHandler,
            event('approved', { themes: ['Pin'], removeThemes: ['Fork'] }, { id: '002' }),
        );
        expect(body.applied).toBe(true);
        expect(puzzles['002'].themes).toEqual(['Pin']);
    });

    it('clears what other members suggested for the same tags', async () => {
        await call(suggestHandler, event('ann', { themes: ['Pin', 'Skewer'] }, { id: '001' }));
        await call(suggestHandler, event('bob', { themes: ['Pin'] }, { id: '001' }));
        await call(suggestHandler, event('approved', { themes: ['Pin'] }, { id: '001' }));
        expect(suggestions.has('001#bob')).toBe(false);
        expect(suggestions.get('001#ann').themes).toEqual(['Skewer']);
    });

    it('still turns away tags that do not exist or are already there', async () => {
        expect(
            (await call(suggestHandler, event('approved', { themes: ['Made up'] }, { id: '001' })))
                .status,
        ).toBe(400);
        expect(
            (await call(suggestHandler, event('approved', { themes: ['Fork'] }, { id: '002' })))
                .status,
        ).toBe(400);
    });

    it('does not change the puzzle for an ordinary member', async () => {
        const { body } = await call(
            suggestHandler,
            event('ann', { themes: ['Pin'] }, { id: '001' }),
        );
        expect(body.applied).toBe(false);
        expect(puzzles['001'].themes).toEqual([]);
        expect(suggestions.size).toBe(1);
    });
});
