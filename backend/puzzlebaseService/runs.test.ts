'use strict';

import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.hoisted(() => vi.fn());

const USERS: Record<string, any> = {
    solver: { username: 'solver', displayName: 'Solver', isAdmin: false, isCoach: false },
    other: { username: 'other', displayName: 'Other', isAdmin: false, isCoach: false },
    coach: { username: 'coach', displayName: 'Coach', isAdmin: false, isCoach: true },
    admin: { username: 'admin', displayName: 'Admin', isAdmin: true, isCoach: false },
    rated: {
        username: 'rated',
        displayName: 'Rated',
        isAdmin: false,
        isCoach: false,
        ratingSystem: 'LICHESS',
        ratings: { LICHESS: { currentRating: 1500 } },
    },
};

vi.mock('../directoryService/database', () => ({
    dynamo: { send: sendMock },
    getUser: vi.fn((username: string) => Promise.resolve(USERS[username])),
}));

import { RatingSystem } from '@jackstenglein/chess-dojo-common/src/database/ratingSystem';
import { getNormalizedRating } from '@jackstenglein/chess-dojo-common/src/ratings/ratings';
import { runsHandler, statsHandler } from './stats';
import { submitAttemptHandler, trainHandler } from './training';

const NOW = new Date('2026-09-29T12:00:00.000Z');

const FEN = '3q3k/8/8/4N3/8/8/8/6K1 w - - 0 1';
const PGN = `[SetUp "1"]\n[FEN "${FEN}"]\n\n1. Nf7+ Kg8 2. Nxd8`;
const puzzle = (id: string, rating: number, buckets: string[], themes: string[]) => ({
    id,
    fen: FEN,
    solutionPgn: PGN,
    rating,
    buckets,
    themes,
    annotator: 'a',
    annotatorDisplayName: 'A',
    createdAt: 'T0',
    updatedAt: 'T0',
});

/** Both tables, in memory. Just enough of DynamoDB for what these endpoints do. */
let puzzles: Record<string, any>;
let runs: Map<string, Record<string, any>>; // key: `${username}|${sk}`
let pstats: Record<string, Record<string, number>>; // the totals behind each puzzle's averages

/** Resolves `#alias` names in an update expression. */
const resolveName = (name: string, names: Record<string, string> = {}) =>
    name.startsWith('#') ? names[name] : name;

function runUpdate(input: any) {
    const key = unmarshall(input.Key);
    const values = unmarshall(input.ExpressionAttributeValues ?? {});
    const names = input.ExpressionAttributeNames ?? {};
    const id = `${key.username}|${key.sk}`;
    const item = runs.get(id) ?? { username: key.username, sk: key.sk };

    const [setPart, addPart] = String(input.UpdateExpression).split(' ADD ');
    if (setPart.startsWith('SET ')) {
        for (const assignment of setPart.slice(4).split(', ')) {
            const [name, value] = assignment.split(' = ');
            item[resolveName(name.trim(), names)] = values[value.trim()];
        }
    }
    const adds = (
        addPart ??
        (input.UpdateExpression.startsWith('ADD ') ? input.UpdateExpression.slice(4) : '')
    )
        .split(', ')
        .filter(Boolean);
    for (const add of adds) {
        const [name, value] = add.trim().split(' ');
        const field = resolveName(name, names);
        item[field] = (item[field] ?? 0) + values[value];
    }
    runs.set(id, item);
}

function runQuery(input: any) {
    const values = unmarshall(input.ExpressionAttributeValues);
    let items = [...runs.values()]
        .filter((i) => i.username === values[':username'])
        .sort((a, b) => a.sk.localeCompare(b.sk));

    if (input.KeyConditionExpression.includes('begins_with')) {
        items = items.filter((i) => i.sk.startsWith(values[':prefix']));
    } else if (input.KeyConditionExpression.includes('BETWEEN')) {
        items = items.filter((i) => i.sk >= values[':from'] && i.sk <= values[':to']);
    }
    if (input.ScanIndexForward === false) items.reverse();
    if (input.Limit) items = items.slice(0, input.Limit);
    return { Items: items.map((i) => marshall(i, { removeUndefinedValues: true })) };
}

beforeEach(() => {
    // Training is open to every member, except in the tests of the closed beta below.
    process.env.PUZZLEBASE_TRAINING_OPEN = 'true';
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    sendMock.mockReset();
    pstats = {};
    puzzles = {
        '001': puzzle('001', 500, ['Tactics'], ['Fork']),
        '002': puzzle('002', 900, ['Tactics'], ['Pin']),
        '003': puzzle('003', 1300, ['Endgame'], ['Passed pawn']),
        '004': puzzle('004', 1700, ['Tactics', 'Endgame'], ['Fork', 'Passed pawn']),
    };
    runs = new Map();

    sendMock.mockImplementation((cmd: any) => {
        const name = cmd.constructor.name;
        const table: string = cmd.input.TableName;
        if (table.endsWith('-runs')) {
            if (name === 'GetItemCommand') {
                const key = unmarshall(cmd.input.Key);
                const stored = runs.get(`${key.username}|${key.sk}`);
                return Promise.resolve({ Item: stored ? marshall(stored) : undefined });
            }
            if (name === 'PutItemCommand' && unmarshall(cmd.input.Item).sk === 'RATING') {
                const item = unmarshall(cmd.input.Item);
                const id = `${item.username}|RATING`;
                const existing = runs.get(id);
                const values = cmd.input.ExpressionAttributeValues
                    ? unmarshall(cmd.input.ExpressionAttributeValues)
                    : undefined;
                const allowed = values ? existing?.count === values[':previous'] : !existing;
                if (!allowed) {
                    return Promise.reject(
                        new ConditionalCheckFailedException({ message: 'changed', $metadata: {} }),
                    );
                }
                runs.set(id, item);
                return Promise.resolve({});
            }
            if (name === 'PutItemCommand') {
                const item = unmarshall(cmd.input.Item);
                const id = `${item.username}|${item.sk}`;
                if (runs.has(id)) {
                    return Promise.reject(
                        new ConditionalCheckFailedException({ message: 'exists', $metadata: {} }),
                    );
                }
                runs.set(id, item);
                return Promise.resolve({});
            }
            if (name === 'UpdateItemCommand') {
                runUpdate(cmd.input);
                return Promise.resolve({});
            }
            if (name === 'QueryCommand') {
                return Promise.resolve(runQuery(cmd.input));
            }
        } else {
            if (name === 'QueryCommand') {
                const { ':pk': pk, ':prefix': prefix } = unmarshall(
                    cmd.input.ExpressionAttributeValues,
                );
                // The totals behind the averages, one item per puzzle and band of rating.
                if (pk === 'PSTATS') {
                    return Promise.resolve({
                        Items: Object.entries(pstats)
                            .filter(([sk]) => sk.startsWith(prefix))
                            .map(([sk, row]) => marshall({ pk, sk, ...row })),
                    });
                }
                // Otherwise only puzzles are in this table here; nobody has voted.
                if (pk !== 'PUZZLE') {
                    return Promise.resolve({ Items: [] });
                }
                return Promise.resolve({
                    Items: Object.values(puzzles).map((p) =>
                        marshall({ pk: 'PUZZLE', sk: p.id, ...p }),
                    ),
                });
            }
            if (name === 'UpdateItemCommand') {
                // Adding to the totals behind a puzzle's averages, kept per band of rating.
                const key = unmarshall(cmd.input.Key);
                const values = unmarshall(cmd.input.ExpressionAttributeValues);
                const now = pstats[key.sk] ?? {};
                const names: Record<string, string> = {
                    ':one': 'attempts',
                    ':accuracy': 'accuracySum',
                    ':speed': 'speedSum',
                    ':score': 'scoreSum',
                    ':thinking': 'thinkingMsSum',
                };
                for (const [placeholder, field] of Object.entries(names)) {
                    now[field] = (now[field] ?? 0) + values[placeholder];
                }
                pstats[key.sk] = now;
                return Promise.resolve({});
            }
            if (name === 'GetItemCommand') {
                const key = unmarshall(cmd.input.Key);
                const p = puzzles[key.sk];
                return Promise.resolve({
                    Item: p ? marshall({ pk: 'PUZZLE', sk: p.id, ...p }) : undefined,
                });
            }
        }
        return Promise.resolve({});
    });
});

afterEach(() => {
    vi.useRealTimers();
});

function event(
    as: string | undefined,
    body: unknown = {},
    pathParameters: Record<string, string> = {},
    queryStringParameters: Record<string, string> = {},
): APIGatewayProxyEventV2 {
    return {
        body: JSON.stringify(body),
        pathParameters,
        queryStringParameters,
        requestContext: as ? { authorizer: { jwt: { claims: { 'cognito:username': as } } } } : {},
    } as unknown as APIGatewayProxyEventV2;
}

async function call(fn: any, e: APIGatewayProxyEventV2) {
    const res = (await fn(e, {} as any, () => {})) as APIGatewayProxyStructuredResultV2;
    return { status: res.statusCode, body: JSON.parse(res.body || '{}') };
}

/** A minute of solving that ends `minutesAgo` minutes before the fake "now". */
const at = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString();

const rightMove = (ply: number, expected: string, ms = 2000) => ({
    line: 0,
    ply,
    expected,
    tries: [{ move: expected, correct: true, ms }],
    ms,
});
const missedMove = (ply: number, expected: string, wrong: string) => ({
    line: 0,
    ply,
    expected,
    tries: [
        { move: wrong, correct: false, ms: 3000 },
        { move: expected, correct: true, ms: 8000 },
    ],
    ms: 8000,
});

const submission = (over: Record<string, unknown> = {}) => ({
    puzzleId: '001',
    startedAt: at(60),
    finishedAt: at(59),
    moves: [rightMove(0, 'Nf7+'), rightMove(2, 'Nxd8')],
    ...over,
});

const stored = (username: string, prefix: string) =>
    [...runs.values()].filter((i) => i.username === username && i.sk.startsWith(prefix));

describe('while training is not open yet', () => {
    beforeEach(() => {
        process.env.PUZZLEBASE_TRAINING_OPEN = 'false';
    });

    it('turns away members who are not Puzzle Contributors', async () => {
        expect((await call(trainHandler, event('other'))).status).toBe(403);
        expect((await call(submitAttemptHandler, event('other', {}))).status).toBe(403);
    });

    it('still lets admins train', async () => {
        const { status, body } = await call(trainHandler, event('admin'));
        expect(status).toBe(200);
        expect(body).toHaveLength(4);
    });
});

describe('getting puzzles to train on', () => {
    it('is for signed-in members, and only them', async () => {
        expect((await call(trainHandler, event(undefined))).status).toBe(400);
        expect((await call(trainHandler, event('other'))).status).toBe(200);
    });

    it('does not need the member to be a Puzzle Contributor', async () => {
        const { status, body } = await call(trainHandler, event('other'));
        expect(status).toBe(200);
        expect(body).toHaveLength(4);
    });

    it('keeps to the rating range and the focus that were asked for', async () => {
        const rated = await call(
            trainHandler,
            event('solver', {}, {}, { minRating: '800', maxRating: '1400' }),
        );
        expect(rated.body.map((p: any) => p.id).sort()).toEqual(['002', '003']);

        const focused = await call(trainHandler, event('solver', {}, {}, { theme: 'Fork' }));
        expect(focused.body.map((p: any) => p.id).sort()).toEqual(['001', '004']);

        const bucket = await call(trainHandler, event('solver', {}, {}, { bucket: 'Endgame' }));
        expect(bucket.body.map((p: any) => p.id).sort()).toEqual(['003', '004']);
    });

    it('stops at the count, and leaves out puzzles the member has seen', async () => {
        expect(
            (await call(trainHandler, event('solver', {}, {}, { count: '2' }))).body,
        ).toHaveLength(2);
        const { body } = await call(
            trainHandler,
            event('solver', {}, {}, { exclude: '001,002,003' }),
        );
        expect(body.map((p: any) => p.id)).toEqual(['004']);
    });

    it('offers puzzles the member has never attempted before the ones they have', async () => {
        // The solver attempts 001 and 003.
        for (const [puzzleId, finishedAt] of [
            ['001', '2026-09-29T11:00:00.000Z'],
            ['003', '2026-09-29T11:05:00.000Z'],
        ]) {
            await call(
                submitAttemptHandler,
                event('solver', {
                    puzzleId,
                    startedAt: '2026-09-29T10:59:00.000Z',
                    finishedAt,
                    abandoned: false,
                    moves: [],
                }),
            );
        }
        for (let i = 0; i < 10; i++) {
            const { body } = await call(trainHandler, event('solver', {}, {}, { count: '2' }));
            expect(body.map((p: any) => p.id).sort()).toEqual(['002', '004']);
        }

        // Someone else's attempts do not count against this member.
        const other = await call(trainHandler, event('newcomer', {}, {}, { count: '4' }));
        expect(other.body).toHaveLength(4);
    });

    it('offers the puzzle attempted longest ago first once everything has been attempted', async () => {
        const times: Record<string, string> = {
            '003': '2026-09-29T10:00:00.000Z',
            '001': '2026-09-29T10:10:00.000Z',
            '004': '2026-09-29T10:20:00.000Z',
            '002': '2026-09-29T10:30:00.000Z',
        };
        for (const [puzzleId, finishedAt] of Object.entries(times)) {
            await call(
                submitAttemptHandler,
                event('solver', {
                    puzzleId,
                    startedAt: '2026-09-29T09:59:00.000Z',
                    finishedAt,
                    abandoned: false,
                    moves: [],
                }),
            );
        }
        const { body } = await call(trainHandler, event('solver', {}, {}, { count: '2' }));
        expect(body.map((p: any) => p.id)).toEqual(['003', '001']);
    });

    it('sends what the trainer needs to play the puzzle', async () => {
        const { body } = await call(trainHandler, event('solver', {}, {}, { count: '1' }));
        expect(body[0]).toMatchObject({ fen: FEN, solutionPgn: PGN });
    });

    it('rejects nonsense in the request', async () => {
        expect((await call(trainHandler, event('solver', {}, {}, { count: '500' }))).status).toBe(
            400,
        );
        expect(
            (await call(trainHandler, event('solver', {}, {}, { minRating: 'high' }))).status,
        ).toBe(400);
    });
});

describe('recording an attempt', () => {
    it('records every move tried, including the wrong ones and the time for each', async () => {
        const moves = [rightMove(0, 'Nf7+'), missedMove(2, 'Nxd8', 'Nd7')];
        const { status, body } = await call(
            submitAttemptHandler,
            event('solver', submission({ moves })),
        );

        expect(status).toBe(200);
        expect(body.summary).toMatchObject({
            result: 'solved',
            moves: 2,
            movesFirstTry: 1,
            mistakes: 1,
        });

        const [saved] = stored('solver', 'ATTEMPT#');
        expect(saved.moves[1].tries).toEqual([
            { move: 'Nd7', correct: false, ms: 3000 },
            { move: 'Nxd8', correct: true, ms: 8000 },
        ]);
        expect(saved.moves[1].ms).toBe(8000);
    });

    it('takes the puzzle’s rating and tags from the server, not from the client', async () => {
        await call(
            submitAttemptHandler,
            event('solver', {
                ...submission({ puzzleId: '004' }),
                puzzleRating: 100,
                themes: ['Made up'],
                buckets: ['Made up'],
            }),
        );
        const [saved] = stored('solver', 'ATTEMPT#');
        expect(saved).toMatchObject({
            puzzleRating: 1700,
            buckets: ['Tactics', 'Endgame'],
            themes: ['Fork', 'Passed pawn'],
            fen: FEN,
        });
    });

    it('records an attempt that was left before the end', async () => {
        const { body } = await call(
            submitAttemptHandler,
            event('solver', submission({ abandoned: true, moves: [rightMove(0, 'Nf7+')] })),
        );
        expect(body.summary.result).toBe('abandoned');
        expect(stored('solver', 'STATS#TOTAL')[0]).toMatchObject({
            attempts: 1,
            abandoned: 1,
            clean: 0,
        });
    });

    it('keeps the attempts of different members apart', async () => {
        await call(submitAttemptHandler, event('solver', submission()));
        await call(submitAttemptHandler, event('other', submission()));
        expect(stored('solver', 'ATTEMPT#')).toHaveLength(1);
        expect(stored('other', 'ATTEMPT#')).toHaveLength(1);
    });

    it('turns away attempts that cannot be right', async () => {
        expect((await call(submitAttemptHandler, event(undefined, submission()))).status).toBe(400);
        expect(
            (await call(submitAttemptHandler, event('solver', submission({ puzzleId: '999' }))))
                .status,
        ).toBe(404);
        expect(
            (
                await call(
                    submitAttemptHandler,
                    event('solver', submission({ startedAt: 'yesterday' })),
                )
            ).status,
        ).toBe(400);
        const future = await call(
            submitAttemptHandler,
            event('solver', submission({ finishedAt: '2026-09-30T12:00:00.000Z' })),
        );
        expect(future.status).toBe(400);
        expect(future.body.message).toMatch(/future/);
        expect(runs.size).toBe(0);
    });

    it('saves an attempt once, however many times it is sent', async () => {
        for (let i = 0; i < 3; i++) {
            expect((await call(submitAttemptHandler, event('solver', submission()))).status).toBe(
                200,
            );
        }
        expect(stored('solver', 'ATTEMPT#')).toHaveLength(1);
        expect(stored('solver', 'STATS#TOTAL')[0].attempts).toBe(1);
        expect(stored('solver', 'SESSION#')[0].attempts).toBe(1);
    });
});

describe('sessions', () => {
    const attemptAt = (puzzleId: string, finishedMinutesAgo: number, over = {}) =>
        call(
            submitAttemptHandler,
            event(
                'solver',
                submission({
                    puzzleId,
                    startedAt: at(finishedMinutesAgo + 1),
                    finishedAt: at(finishedMinutesAgo),
                    ...over,
                }),
            ),
        );

    it('puts puzzles finished less than 30 minutes apart in one session', async () => {
        await attemptAt('001', 100);
        await attemptAt('002', 90);
        await attemptAt('003', 75);

        const sessions = stored('solver', 'SESSION#');
        expect(sessions).toHaveLength(1);
        expect(sessions[0]).toMatchObject({
            startedAt: at(101),
            lastActiveAt: at(75),
            attempts: 3,
            clean: 3,
        });
    });

    it('starts a new session after a break of 30 minutes or more', async () => {
        await attemptAt('001', 200);
        await attemptAt('002', 195);
        await attemptAt('003', 100);

        const sessions = stored('solver', 'SESSION#').sort((a, b) => a.sk.localeCompare(b.sk));
        expect(sessions.map((s) => s.attempts)).toEqual([2, 1]);
        expect(sessions[1].startedAt).toBe(at(101));
    });

    it('adds up wrong tries and time across a session', async () => {
        await attemptAt('001', 100, {
            moves: [missedMove(0, 'Nf7+', 'Nd7'), rightMove(2, 'Nxd8')],
        });
        await attemptAt('002', 95, { moves: [rightMove(0, 'Nf7+')] });
        expect(stored('solver', 'SESSION#')[0]).toMatchObject({
            attempts: 2,
            solved: 1,
            clean: 1,
            mistakes: 1,
            moves: 3,
            movesFirstTry: 2,
            totalMs: 120_000,
        });
    });
});

describe('running totals by tag', () => {
    it('counts each attempt overall, and for each bucket and theme of the puzzle', async () => {
        // A clean solve of a Fork puzzle, then a messy solve of a Fork + Passed pawn puzzle.
        await call(submitAttemptHandler, event('solver', submission({ puzzleId: '001' })));
        await call(
            submitAttemptHandler,
            event(
                'solver',
                submission({
                    puzzleId: '004',
                    startedAt: at(50),
                    finishedAt: at(49),
                    moves: [missedMove(0, 'Nf7+', 'Nd7'), rightMove(2, 'Nxd8')],
                }),
            ),
        );

        const total = (key: string) => stored('solver', `STATS#${key}`)[0];
        expect(total('TOTAL')).toMatchObject({
            attempts: 2,
            clean: 1,
            solved: 1,
            mistakes: 1,
            moves: 4,
        });
        expect(total('BUCKET#Tactics')).toMatchObject({ attempts: 2 });
        expect(total('BUCKET#Endgame')).toMatchObject({ attempts: 1, solved: 1 });
        expect(total('THEME#Fork')).toMatchObject({ attempts: 2, clean: 1, solved: 1 });
        expect(total('THEME#Passed pawn')).toMatchObject({ attempts: 1, solved: 1, mistakes: 1 });
        expect(stored('solver', 'STATS#THEME#Pin')).toHaveLength(0);
    });
});

describe('reading stats', () => {
    beforeEach(async () => {
        await call(submitAttemptHandler, event('solver', submission({ puzzleId: '004' })));
    });

    it('lets a member see their own stats', async () => {
        const { status, body } = await call(
            statsHandler,
            event('solver', {}, { username: 'solver' }),
        );
        expect(status).toBe(200);
        expect(body.total).toMatchObject({ attempts: 1, clean: 1 });
        expect(body.buckets.Tactics).toMatchObject({ attempts: 1 });
        expect(body.themes.Fork).toMatchObject({ attempts: 1 });
        expect(body.themes['Passed pawn']).toMatchObject({ attempts: 1 });
    });

    it('shows empty stats for someone who has not solved anything', async () => {
        const { body } = await call(statsHandler, event('other', {}, { username: 'other' }));
        expect(body.total).toMatchObject({ attempts: 0 });
        expect(body.themes).toEqual({});
    });

    it('lets coaches and admins see anyone’s stats', async () => {
        for (const viewer of ['coach', 'admin']) {
            const { status, body } = await call(
                statsHandler,
                event(viewer, {}, { username: 'solver' }),
            );
            expect(status).toBe(200);
            expect(body.total.attempts).toBe(1);
        }
    });

    it('keeps everyone else out', async () => {
        const { status, body } = await call(
            statsHandler,
            event('other', {}, { username: 'solver' }),
        );
        expect(status).toBe(403);
        expect(body.message).toMatch(/coach or admin/);
        expect(body).not.toHaveProperty('total');
    });

    it('needs a signed-in caller', async () => {
        expect(
            (await call(statsHandler, event(undefined, {}, { username: 'solver' }))).status,
        ).toBe(400);
    });
});

describe('reading runs', () => {
    it('returns sessions and attempts, with every move tried', async () => {
        await call(
            submitAttemptHandler,
            event(
                'solver',
                submission({ moves: [missedMove(0, 'Nf7+', 'Nd7'), rightMove(2, 'Nxd8')] }),
            ),
        );
        const { status, body } = await call(
            runsHandler,
            event('solver', {}, { username: 'solver' }),
        );

        expect(status).toBe(200);
        expect(body.sessions).toHaveLength(1);
        expect(body.attempts).toHaveLength(1);
        expect(body.attempts[0].moves[0].tries[0]).toEqual({
            move: 'Nd7',
            correct: false,
            ms: 3000,
        });
        expect(body.attempts[0]).not.toHaveProperty('sk');
        expect(body.attempts[0]).not.toHaveProperty('username');
    });

    it('defaults to the last 30 days, and can be asked for another range', async () => {
        const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();
        for (const [id, days] of [
            ['001', 2],
            ['002', 20],
            ['003', 45],
        ] as const) {
            await call(
                submitAttemptHandler,
                event(
                    'solver',
                    submission({
                        puzzleId: id,
                        startedAt: daysAgo(days),
                        finishedAt: new Date(Date.parse(daysAgo(days)) + 60_000).toISOString(),
                    }),
                ),
            );
        }

        const recent = await call(runsHandler, event('solver', {}, { username: 'solver' }));
        expect(recent.body.attempts.map((a: any) => a.puzzleId)).toEqual(['002', '001']);

        const older = await call(
            runsHandler,
            event('solver', {}, { username: 'solver' }, { from: daysAgo(60), to: daysAgo(30) }),
        );
        expect(older.body.attempts.map((a: any) => a.puzzleId)).toEqual(['003']);
    });

    it('applies the same rules about who can look', async () => {
        await call(submitAttemptHandler, event('solver', submission()));
        expect((await call(runsHandler, event('other', {}, { username: 'solver' }))).status).toBe(
            403,
        );
        expect((await call(runsHandler, event('coach', {}, { username: 'solver' }))).status).toBe(
            200,
        );
        expect((await call(runsHandler, event('admin', {}, { username: 'solver' }))).status).toBe(
            200,
        );
    });
});

describe('scoring and tactics rating', () => {
    const attemptBody = (puzzleId: string, finishedAt: string, ms = 2000) => ({
        puzzleId,
        startedAt: '2026-09-29T11:00:00.000Z',
        finishedAt,
        abandoned: false,
        moves: [
            {
                line: 0,
                ply: 0,
                expected: 'Nf7+',
                tries: [{ move: 'Nf7+', correct: true, ms }],
                ms,
            },
            {
                line: 0,
                ply: 2,
                expected: 'Nxd8',
                tries: [{ move: 'Nxd8', correct: true, ms }],
                ms,
            },
        ],
    });
    const normalized = getNormalizedRating(1500, RatingSystem.Lichess);

    it('starts a new rating at the member’s Dojo normalized rating', async () => {
        const { body } = await call(
            submitAttemptHandler,
            event('rated', attemptBody('001', '2026-09-29T11:01:00.000Z')),
        );
        expect(body.scoring).toMatchObject({
            counted: true,
            accuracy: 1,
            speed: 1,
            score: 1,
            puzzleRating: 500,
        });
        expect(body.scoring.ratingBefore).toBe(Math.round(normalized));
        expect(body.scoring.ratingAfter).toBeGreaterThan(body.scoring.ratingBefore);
    });

    it('saves the rating and shows it in the stats', async () => {
        const first = await call(
            submitAttemptHandler,
            event('rated', attemptBody('001', '2026-09-29T11:01:00.000Z')),
        );
        const { body } = await call(statsHandler, event('rated', {}, { username: 'rated' }));
        expect(body.rating.rating).toBeCloseTo(first.body.scoring.ratingAfter, 5);
        expect(body.rating.count).toBe(1);
    });

    it('builds on the saved rating for the next puzzle', async () => {
        const first = await call(
            submitAttemptHandler,
            event('rated', attemptBody('001', '2026-09-29T11:01:00.000Z')),
        );
        const second = await call(
            submitAttemptHandler,
            event('rated', attemptBody('002', '2026-09-29T11:03:00.000Z')),
        );
        expect(second.body.scoring.ratingBefore).toBeCloseTo(first.body.scoring.ratingAfter, 5);
        expect(second.body.scoring.counted).toBe(true);
    });

    it('scores a second attempt at a puzzle but does not move the rating', async () => {
        const first = await call(
            submitAttemptHandler,
            event('rated', attemptBody('001', '2026-09-29T11:01:00.000Z')),
        );
        const repeat = await call(
            submitAttemptHandler,
            event('rated', attemptBody('001', '2026-09-29T11:05:00.000Z')),
        );
        expect(repeat.body.scoring).toMatchObject({ counted: false, score: 1 });
        expect(repeat.body.scoring.delta).toBeUndefined();
        const { body } = await call(statsHandler, event('rated', {}, { username: 'rated' }));
        expect(body.rating.rating).toBeCloseTo(first.body.scoring.ratingAfter, 5);
        expect(body.rating.count).toBe(1);
    });

    it('answers a resent attempt with what was saved the first time', async () => {
        const sentOnce = await call(
            submitAttemptHandler,
            event('rated', attemptBody('001', '2026-09-29T11:01:00.000Z')),
        );
        const sentAgain = await call(
            submitAttemptHandler,
            event('rated', attemptBody('001', '2026-09-29T11:01:00.000Z')),
        );
        expect(sentAgain.body.scoring).toEqual(sentOnce.body.scoring);
        expect(sentAgain.body.scoring.counted).toBe(true);
        const { body } = await call(statsHandler, event('rated', {}, { username: 'rated' }));
        expect(body.rating.count).toBe(1);
    });

    it('does not count time for a puzzle without a reference time', async () => {
        const { body } = await call(
            submitAttemptHandler,
            event('rated', attemptBody('001', '2026-09-29T11:01:00.000Z', 600_000)),
        );
        expect(body.scoring.speed).toBe(1);
        expect(body.scoring.referenceMs).toBeUndefined();
    });

    it('takes points off a slow solve when the puzzle has a reference time', async () => {
        puzzles['001'] = { ...puzzles['001'], referenceMs: 4000 };
        const { body } = await call(
            submitAttemptHandler,
            event('rated', attemptBody('001', '2026-09-29T11:01:00.000Z', 8000)),
        );
        // 16s of thinking against a 4s reference is four times as long: the floor.
        expect(body.scoring.speed).toBeCloseTo(0.7);
        expect(body.scoring.score).toBeCloseTo(0.7);
    });

    it('starts someone with no rating at the default and still rates them', async () => {
        const { body } = await call(
            submitAttemptHandler,
            event('solver', attemptBody('001', '2026-09-29T11:01:00.000Z')),
        );
        expect(body.scoring.ratingBefore).toBe(1000);
    });

    it('sends back how members rated near the member do, once enough have played the puzzle', async () => {
        // Three members start at 1000. The fourth is rated much higher, so is not near them.
        const members = ['solver', 'other', 'coach', 'rated'];
        const results = [];
        for (const [i, member] of members.entries()) {
            results.push(
                await call(
                    submitAttemptHandler,
                    event(member, attemptBody('001', `2026-09-29T11:0${i + 1}:00.000Z`)),
                ),
            );
        }
        expect(results[1].body.scoring.average).toBeUndefined();
        expect(results[2].body.scoring.average).toMatchObject({ attempts: 3, accuracy: 1 });
        // Nobody else is within 200 points of the fourth member, so there is no average for them.
        expect(results[3].body.scoring.average).toBeUndefined();
    });

    it('does not count a repeat, or a puzzle that was left, in the averages', async () => {
        await call(
            submitAttemptHandler,
            event('solver', attemptBody('001', '2026-09-29T11:01:00.000Z')),
        );
        await call(
            submitAttemptHandler,
            event('solver', attemptBody('001', '2026-09-29T11:02:00.000Z')),
        );
        const left = { ...attemptBody('001', '2026-09-29T11:03:00.000Z'), abandoned: true };
        await call(submitAttemptHandler, event('other', left));
        const counted = Object.values(pstats).reduce((total, row) => total + row.attempts, 0);
        expect(counted).toBe(1);
    });

    it('leaves a member with no counted puzzles without a rating in their stats', async () => {
        const { body } = await call(statsHandler, event('rated', {}, { username: 'rated' }));
        expect(body.rating).toBeUndefined();
    });
});
