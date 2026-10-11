'use strict';

import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.hoisted(() => vi.fn());
const getLichessStudyMock = vi.hoisted(() => vi.fn());

const USERS: Record<string, any> = {
    admin: { username: 'admin', displayName: 'Admin', isAdmin: true },
    approved: { username: 'approved', displayName: 'Approved One', isAdmin: false },
    pending: { username: 'pending', displayName: 'Pending One', isAdmin: false },
    stranger: { username: 'stranger', displayName: 'Stranger', isAdmin: false },
};

vi.mock('../directoryService/database', () => ({
    dynamo: { send: sendMock },
    getUser: vi.fn(async (username: string) => USERS[username]),
}));
vi.mock('../pgnService/game/lichess', () => ({ getLichessStudy: getLichessStudyMock }));

import { listHandler as listAdminLog } from './audit';
import {
    addContributorHandler,
    applyHandler,
    approveHandler,
    denyHandler,
    leaderboardHandler,
    meHandler,
    profileHandler,
    revokeHandler,
} from './contributors';
import { handler as create } from './create';
import { handler as get } from './get';
import { handler as importStudy, lichessStudyUrl } from './importStudy';
import { handler as list } from './list';
import {
    createThemeHandler,
    deleteThemeHandler,
    getHandler as getTaxonomyHandler,
} from './taxonomy';
import { handler as update } from './update';

const FEN = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';
const PUZZLE_PGN = `[White "A"]\n[Black "B"]\n[SetUp "1"]\n[FEN "${FEN}"]\n\n1. Rd8#`;
const FULL_GAME_PGN = '[White "A"]\n[Black "B"]\n\n1. e4 e5 2. Nf3 *';
const ILLEGAL_MOVE_PGN = `[SetUp "1"]\n[FEN "${FEN}"]\n\n1. Rd8+ Qh5`;

/** Builds an API Gateway event. Without `as`, the request is unauthenticated. */
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

/** The DynamoDB commands sent so far, of the given type. */
function sent(type: string): any[] {
    return sendMock.mock.calls.map((c) => c[0]).filter((cmd) => cmd.constructor.name === type);
}

/** Stores for the fake table. */
let contributors: Record<string, any>;
let puzzles: Record<string, any>;
let lastNumber: number;
let taxonomy: any;
let audit: Record<string, any>;

beforeEach(() => {
    sendMock.mockReset();
    getLichessStudyMock.mockReset();
    contributors = {
        approved: { status: 'APPROVED', displayName: 'Approved One', puzzleCount: 2 },
        pending: { status: 'PENDING', displayName: 'Pending One', puzzleCount: 0 },
    };
    puzzles = {};
    lastNumber = 4;
    taxonomy = undefined;
    audit = {};

    // A tiny in-memory stand-in for the puzzlebase table.
    sendMock.mockImplementation(async (cmd: any) => {
        const name = cmd.constructor.name;
        const key = cmd.input.Key ? unmarshall(cmd.input.Key) : undefined;
        const item = cmd.input.Item ? unmarshall(cmd.input.Item) : undefined;

        if (name === 'GetItemCommand') {
            if (key!.pk === 'CONTRIBUTOR') {
                const s = contributors[key!.sk];
                return { Item: s ? marshall({ pk: 'CONTRIBUTOR', sk: key!.sk, ...s }) : undefined };
            }
            if (key!.pk === 'PUZZLE') {
                const p = puzzles[key!.sk];
                return { Item: p ? marshall({ pk: 'PUZZLE', sk: key!.sk, ...p }) : undefined };
            }
            if (key!.sk === 'TAXONOMY') {
                return { Item: taxonomy ? marshall({ ...taxonomy }) : undefined };
            }
        }
        if (name === 'UpdateItemCommand') {
            if (key!.sk === 'COUNTER') {
                lastNumber += unmarshall(cmd.input.ExpressionAttributeValues)[':count'];
                return { Attributes: marshall({ lastNumber }) };
            }
            if (key!.pk === 'CONTRIBUTOR') {
                const values = unmarshall(cmd.input.ExpressionAttributeValues);
                const denying = ':denied' in values;
                const revoking = ':revoked' in values;
                return {
                    Attributes: marshall({
                        pk: 'CONTRIBUTOR',
                        sk: key!.sk,
                        status: denying ? 'DENIED' : revoking ? 'REVOKED' : 'APPROVED',
                    }),
                };
            }
        }
        if (name === 'QueryCommand') {
            const pk = unmarshall(cmd.input.ExpressionAttributeValues)[':pk'];
            const rows = pk === 'PUZZLE' ? puzzles : pk === 'AUDIT' ? audit : {};
            return {
                Items: Object.entries(rows).map(([sk, row]) => marshall({ pk, sk, ...row })),
            };
        }
        if (name === 'PutItemCommand' && item) {
            if (item.pk === 'AUDIT') audit[item.sk] = item;
            if (item.sk === 'TAXONOMY') taxonomy = item;
            if (item.pk === 'PUZZLE') puzzles[item.sk] = item;
            if (item.pk === 'CONTRIBUTOR') contributors[item.sk] = item;
        }
        return {};
    });
});

describe('who can add puzzles', () => {
    const body = { pgn: PUZZLE_PGN, rating: 600 };

    it('rejects requests that are not signed in', async () => {
        expect((await call(create, event(undefined, body))).status).toBe(400);
        expect(sent('PutItemCommand')).toHaveLength(0);
    });

    it('lets a Puzzle Contributor add a puzzle and credits them', async () => {
        const { status, body: created } = await call(create, event('approved', body));
        expect(status).toBe(200);
        expect(created.warnings).toEqual([]);
        expect(created.puzzle).toMatchObject({
            id: '005',
            fen: FEN,
            annotator: 'approved',
            annotatorDisplayName: 'Approved One',
            rating: 600,
            white: 'A',
        });

        const credit = sent('UpdateItemCommand').find(
            (c) => unmarshall(c.input.Key).pk === 'CONTRIBUTOR',
        );
        expect(unmarshall(credit.input.ExpressionAttributeValues)[':count']).toBe(1);
    });

    it('lets an admin add a puzzle without applying first', async () => {
        const { status, body: created } = await call(create, event('admin', body));
        expect(status).toBe(200);
        expect(created.puzzle.annotator).toBe('admin');
    });

    it('turns away someone whose application is still pending', async () => {
        const { status, body: err } = await call(create, event('pending', body));
        expect(status).toBe(403);
        expect(err.message).toMatch(/Puzzle Contributor/);
        expect(sent('PutItemCommand')).toHaveLength(0);
    });

    it('turns away someone who never applied', async () => {
        expect((await call(create, event('stranger', body))).status).toBe(403);
    });
});

describe('bad puzzles never use up an id', () => {
    const reservedAnId = () =>
        sent('UpdateItemCommand').some((c) => unmarshall(c.input.Key).sk === 'COUNTER');

    it('rejects a full game', async () => {
        const { status, body } = await call(
            create,
            event('approved', { pgn: FULL_GAME_PGN, rating: 600 }),
        );
        expect(status).toBe(400);
        expect(body.message).toMatch(/full game/);
        expect(reservedAnId()).toBe(false);
    });

    it('rejects an illegal move in the solution', async () => {
        const { status, body } = await call(
            create,
            event('approved', { pgn: ILLEGAL_MOVE_PGN, rating: 600 }),
        );
        expect(status).toBe(400);
        expect(body.message).toMatch(/not legal/);
        expect(reservedAnId()).toBe(false);
    });

    it('rejects a theme that is not in the taxonomy', async () => {
        const { status, body } = await call(
            create,
            event('approved', { pgn: PUZZLE_PGN, rating: 600, themes: ['Made up'] }),
        );
        expect(status).toBe(400);
        expect(body.message).toMatch(/Unknown theme/);
        expect(reservedAnId()).toBe(false);
    });

    it('rejects a rating outside 0 to 3500', async () => {
        expect(
            (await call(create, event('approved', { pgn: PUZZLE_PGN, rating: 9000 }))).status,
        ).toBe(400);
    });
});

describe('tags and ratings written in the PGN', () => {
    const pgnWith = (extra: string, headers = '') =>
        `[White "A"]\n[Black "B"]\n${headers}[SetUp "1"]\n[FEN "${FEN}"]\n\n${extra}1. Rd8#`;

    it('uses tags and a rating from a comment before the first move', async () => {
        const pgn = pgnWith('{ tags: back rank mate, Endgame; rating: 1450 } ');
        const { status, body } = await call(create, event('approved', { pgn, rating: 600 }));

        expect(status).toBe(200);
        expect(body.puzzle).toMatchObject({
            themes: ['Back rank mate'],
            buckets: ['Endgame', 'Tactics'].sort(),
            rating: 1450,
        });
        expect(body.warnings).toEqual([]);
    });

    it('uses tags and a rating from headers', async () => {
        const pgn = pgnWith('', '[Themes "Fork, Pin"]\n[Rating "900"]\n');
        const { body } = await call(create, event('approved', { pgn, rating: 600 }));
        expect(body.puzzle.themes).toEqual(['Fork', 'Pin']);
        expect(body.puzzle.rating).toBe(900);
    });

    it('adds the tags in the PGN to the ones in the request', async () => {
        const pgn = pgnWith('{ tags: Pin } ');
        const { body } = await call(
            create,
            event('approved', { pgn, rating: 600, themes: ['Fork'], buckets: ['Opening'] }),
        );
        expect(body.puzzle.themes.sort()).toEqual(['Fork', 'Pin']);
        expect(body.puzzle.buckets).toContain('Opening');
    });

    it('still adds the puzzle when a tag is not a real theme, and says what it left off', async () => {
        const pgn = pgnWith('{ tags: Fork, Skewr } ');
        const { status, body } = await call(create, event('approved', { pgn, rating: 600 }));

        expect(status).toBe(200);
        expect(body.puzzle.themes).toEqual(['Fork']);
        expect(body.warnings).toEqual([
            'Unknown tag "Skewr". Did you mean "Skewer"? It was left off.',
        ]);
    });

    it('falls back to the requested rating when the PGN has a bad one, and says so', async () => {
        const pgn = pgnWith('{ rating: lots } ');
        const { body } = await call(create, event('approved', { pgn, rating: 600 }));
        expect(body.puzzle.rating).toBe(600);
        expect(body.warnings[0]).toMatch(/Ignored the rating "lots"/);
    });

    it('gives every chapter of a study its own tags and rating', async () => {
        getLichessStudyMock.mockResolvedValue([
            pgnWith('{ tags: Fork; rating: 500 } '),
            pgnWith('{ tags: Pin, Banana } '),
            pgnWith(''),
        ]);
        const { status, body } = await call(
            importStudy,
            event('approved', { study: 'abcd1234', rating: 1000 }),
        );

        expect(status).toBe(200);
        expect(body.puzzles.map((p: any) => [p.rating, p.themes])).toEqual([
            [500, ['Fork']],
            [1000, ['Pin']],
            [1000, []],
        ]);
        // The typo does not skip the chapter. It is reported against it.
        expect(body.skipped).toEqual([]);
        expect(body.warnings).toEqual([
            { chapter: 2, message: 'Unknown tag "Banana". It was left off.' },
        ]);
    });
});

describe('importing a Lichess study', () => {
    it('imports the usable chapters and reports the rest', async () => {
        getLichessStudyMock.mockResolvedValue([PUZZLE_PGN, FULL_GAME_PGN, ILLEGAL_MOVE_PGN]);

        const { status, body } = await call(
            importStudy,
            event('approved', {
                study: 'https://lichess.org/study/abcd1234/chap0001',
                rating: 900,
            }),
        );

        expect(status).toBe(200);
        expect(body.puzzles).toHaveLength(1);
        expect(body.puzzles[0]).toMatchObject({
            id: '005',
            rating: 900,
            annotator: 'approved',
            lichessStudyUrl: 'https://lichess.org/study/abcd1234',
        });
        expect(body.skipped.map((s: any) => s.chapter)).toEqual([2, 3]);
        expect(body.skipped[0].reason).toMatch(/full game/);
        expect(getLichessStudyMock).toHaveBeenCalledWith('https://lichess.org/study/abcd1234');

        // Only the one usable chapter used an id and counted for the leaderboard.
        const counter = sent('UpdateItemCommand').find(
            (c) => unmarshall(c.input.Key).sk === 'COUNTER',
        );
        expect(unmarshall(counter.input.ExpressionAttributeValues)[':count']).toBe(1);
    });

    it('gives consecutive ids to consecutive chapters', async () => {
        getLichessStudyMock.mockResolvedValue([PUZZLE_PGN, PUZZLE_PGN, PUZZLE_PGN]);
        const { body } = await call(
            importStudy,
            event('approved', { study: 'abcd1234', rating: 500 }),
        );
        expect(body.puzzles.map((p: any) => p.id)).toEqual(['005', '006', '007']);
    });

    it('does not let strangers import', async () => {
        expect(
            (await call(importStudy, event('stranger', { study: 'abcd1234', rating: 500 }))).status,
        ).toBe(403);
        expect(getLichessStudyMock).not.toHaveBeenCalled();
    });

    it('accepts study links and bare ids, and nothing else', () => {
        expect(lichessStudyUrl('abcd1234')).toBe('https://lichess.org/study/abcd1234');
        expect(lichessStudyUrl(' https://lichess.org/study/abcd1234/xyz98765 ')).toBe(
            'https://lichess.org/study/abcd1234',
        );
        expect(() => lichessStudyUrl('https://example.com/nope')).toThrow();
        expect(() => lichessStudyUrl('too-short')).toThrow();
    });
});

describe('editing a puzzle', () => {
    beforeEach(() => {
        puzzles['003'] = {
            id: '003',
            fen: FEN,
            solutionPgn: PUZZLE_PGN,
            annotator: 'approved',
            annotatorDisplayName: 'Approved One',
            rating: 600,
            buckets: [],
            themes: [],
            createdAt: 'T0',
            updatedAt: 'T0',
        };
    });

    it('lets a Puzzle Contributor change the rating and tags', async () => {
        const { status, body } = await call(
            update,
            event('approved', { rating: 1200, themes: ['Back rank mate'] }, { id: '003' }),
        );
        expect(status).toBe(200);
        expect(body.rating).toBe(1200);
        expect(body.buckets).toEqual(['Tactics']);
        expect(body.annotator).toBe('approved');
    });

    it('only saves if nobody changed the puzzle in the meantime', async () => {
        await call(update, event('approved', { rating: 1200 }, { id: '003' }));
        const put = sent('PutItemCommand').at(-1);
        expect(put.input.ConditionExpression).toBe('updatedAt = :previous');
        expect(unmarshall(put.input.ExpressionAttributeValues)[':previous']).toBe('T0');
    });

    it('reports a 409 when someone else got there first', async () => {
        const original = sendMock.getMockImplementation()!;
        sendMock.mockImplementation(async (cmd: any) => {
            if (cmd.constructor.name === 'PutItemCommand') {
                throw new ConditionalCheckFailedException({ message: 'x', $metadata: {} });
            }
            return original(cmd);
        });
        const { status, body } = await call(
            update,
            event('approved', { rating: 1200 }, { id: '003' }),
        );
        expect(status).toBe(409);
        expect(body.message).toMatch(/Someone else changed/);
    });

    it('rejects a new solution with an illegal move', async () => {
        const { status } = await call(
            update,
            event('approved', { solutionPgn: ILLEGAL_MOVE_PGN }, { id: '003' }),
        );
        expect(status).toBe(400);
    });

    it('404s for a puzzle that does not exist', async () => {
        expect((await call(update, event('approved', { rating: 700 }, { id: '999' }))).status).toBe(
            404,
        );
    });

    it('does not let strangers edit', async () => {
        expect((await call(update, event('stranger', { rating: 700 }, { id: '003' }))).status).toBe(
            403,
        );
    });

    it('lets a Puzzle Contributor read a puzzle', async () => {
        const { status, body } = await call(get, event('approved', {}, { id: '003' }));
        expect(status).toBe(200);
        expect(body.id).toBe('003');
        expect(body).not.toHaveProperty('pk');
    });
});

describe('adding themes', () => {
    it('adds a theme for a Puzzle Contributor', async () => {
        const { status, body } = await call(
            createThemeHandler,
            event('approved', { bucket: 'Endgame', theme: 'wrong bishop' }),
        );
        expect(status).toBe(200);
        expect(body.buckets.Endgame).toContain('Wrong bishop');

        const put = sent('PutItemCommand').at(-1);
        expect(put.input.ConditionExpression).toBe('attribute_not_exists(pk)');
    });

    it('lists a theme from another bucket under this one too, as the same theme', async () => {
        const { status, body } = await call(
            createThemeHandler,
            event('approved', { bucket: 'Endgame', theme: 'pin' }),
        );
        expect(status).toBe(200);
        expect(body.buckets.Endgame).toContain('Pin');
        expect(body.buckets.Endgame).not.toContain('pin');
        expect(body.buckets.Tactics).toContain('Pin');
    });

    it('rejects a theme the bucket already has', async () => {
        const { status, body } = await call(
            createThemeHandler,
            event('approved', { bucket: 'Tactics', theme: 'pin' }),
        );
        expect(status).toBe(400);
        expect(body.message).toMatch(/"Pin" is already in Tactics/);
    });

    it('does not let strangers add themes', async () => {
        expect(
            (
                await call(
                    createThemeHandler,
                    event('stranger', { bucket: 'Endgame', theme: 'Something new' }),
                )
            ).status,
        ).toBe(403);
    });
});

describe('deleting themes', () => {
    const puzzle = (id: string, themes: string[]) => ({
        id,
        buckets: ['Tactics'],
        themes,
        updatedAt: '2026-01-01T00:00:00.000Z',
    });

    it('lets an admin delete a theme, removes it from puzzles and logs it', async () => {
        puzzles = { '001': puzzle('001', ['Pin', 'Fork']), '002': puzzle('002', ['Fork']) };
        const { status, body } = await call(
            deleteThemeHandler,
            event('admin', { bucket: 'Tactics', theme: 'pin' }),
        );
        expect(status).toBe(200);
        expect(body.taxonomy.buckets.Tactics).not.toContain('Pin');
        expect(body.puzzlesChanged).toBe(1);
        expect(puzzles['001'].themes).toEqual(['Fork']);
        expect(puzzles['002'].themes).toEqual(['Fork']);

        const log = await call(listAdminLog, event('admin'));
        expect(log.status).toBe(200);
        expect(log.body).toHaveLength(1);
        expect(log.body[0]).toMatchObject({ username: 'admin', type: 'DELETE_THEME' });
        expect(log.body[0].summary).toMatch(/Deleted the theme "Pin" from Tactics/);
    });

    it('keeps the theme on puzzles when another bucket still lists it', async () => {
        taxonomy = {
            pk: 'META',
            sk: 'TAXONOMY',
            version: 1,
            buckets: { Tactics: ['Fork'], Endgame: ['Fork'] },
        };
        puzzles = { '001': puzzle('001', ['Fork']) };
        const { status, body } = await call(
            deleteThemeHandler,
            event('admin', { bucket: 'Tactics', theme: 'Fork' }),
        );
        expect(status).toBe(200);
        expect(body.puzzlesChanged).toBe(0);
        expect(puzzles['001'].themes).toEqual(['Fork']);
    });

    it('is only for admins, contributors included', async () => {
        for (const who of ['approved', 'stranger']) {
            expect(
                (await call(deleteThemeHandler, event(who, { bucket: 'Tactics', theme: 'Pin' })))
                    .status,
            ).toBe(403);
            expect((await call(listAdminLog, event(who))).status).toBe(403);
        }
    });

    it('rejects a theme that is not there', async () => {
        const { status, body } = await call(
            deleteThemeHandler,
            event('admin', { bucket: 'Tactics', theme: 'Nope' }),
        );
        expect(status).toBe(400);
        expect(body.message).toMatch(/not in Tactics/);
    });

    it('logs approving a contributor', async () => {
        await call(approveHandler, event('admin', {}, { username: 'pending' }));
        const log = await call(listAdminLog, event('admin'));
        expect(log.body[0]).toMatchObject({ type: 'APPROVE_CONTRIBUTOR' });
    });
});

describe('listing admins as contributors', () => {
    it('lists an admin as an approved contributor the first time they visit', async () => {
        const { status, body } = await call(meHandler, event('admin'));
        expect(status).toBe(200);
        expect(body).toMatchObject({ canContribute: true, canTrain: true, isAdmin: true });
        const update = sent('UpdateItemCommand').at(-1);
        expect(unmarshall(update.input.ExpressionAttributeValues)).toMatchObject({
            ':approved': 'APPROVED',
            ':admin': 'ADMIN',
        });
    });

    it('does not list other members', async () => {
        await call(meHandler, event('stranger'));
        expect(sent('UpdateItemCommand')).toHaveLength(0);
    });
});

describe('adding contributors by username', () => {
    it('lets an admin make a member a contributor and logs it', async () => {
        const { status, body } = await call(
            addContributorHandler,
            event('admin', {}, { username: 'stranger' }),
        );
        expect(status).toBe(200);
        expect(body.status).toBe('APPROVED');
        const update = sent('UpdateItemCommand').at(-1);
        expect(update.input.Key).toEqual(marshall({ pk: 'CONTRIBUTOR', sk: 'stranger' }));
        const log = await call(listAdminLog, event('admin'));
        expect(log.body[0]).toMatchObject({ type: 'ADD_CONTRIBUTOR' });
    });

    it('is only for admins', async () => {
        expect(
            (await call(addContributorHandler, event('approved', {}, { username: 'stranger' })))
                .status,
        ).toBe(403);
    });

    it('rejects a username that does not exist', async () => {
        expect(
            (await call(addContributorHandler, event('admin', {}, { username: 'nobody' }))).status,
        ).toBeGreaterThanOrEqual(400);
    });
});

describe('denying applications', () => {
    it('lets an admin deny a pending application and logs it', async () => {
        const { status, body } = await call(
            denyHandler,
            event('admin', {}, { username: 'pending' }),
        );
        expect(status).toBe(200);
        expect(body.status).toBe('DENIED');
        const log = await call(listAdminLog, event('admin'));
        expect(log.body[0]).toMatchObject({ type: 'DENY_CONTRIBUTOR' });
    });

    it('is only for admins', async () => {
        expect(
            (await call(denyHandler, event('approved', {}, { username: 'pending' }))).status,
        ).toBe(403);
    });
});

describe('revoking contributors', () => {
    it('lets an admin remove a contributor and logs it', async () => {
        const { status, body } = await call(
            revokeHandler,
            event('admin', {}, { username: 'approved' }),
        );
        expect(status).toBe(200);
        expect(body.status).toBe('REVOKED');
        const log = await call(listAdminLog, event('admin'));
        expect(log.body[0]).toMatchObject({ type: 'REVOKE_CONTRIBUTOR' });
    });

    it('is only for admins', async () => {
        expect(
            (await call(revokeHandler, event('approved', {}, { username: 'approved' }))).status,
        ).toBe(403);
    });
});

describe('applying and approving', () => {
    it('records an application as pending', async () => {
        const { status, body } = await call(
            applyHandler,
            event('stranger', { message: 'I love puzzles' }),
        );
        expect(status).toBe(200);
        expect(body).toMatchObject({
            username: 'stranger',
            status: 'PENDING',
            message: 'I love puzzles',
            puzzleCount: 0,
        });
    });

    it('does not reset an existing application', async () => {
        sendMock.mockImplementationOnce(async () => {
            throw new ConditionalCheckFailedException({ message: 'x', $metadata: {} });
        });
        const { status, body } = await call(applyHandler, event('approved', {}));
        expect(status).toBe(200);
        expect(body.status).toBe('APPROVED');
    });

    it('only admins can approve', async () => {
        expect(
            (await call(approveHandler, event('approved', {}, { username: 'pending' }))).status,
        ).toBe(403);
        expect(sent('UpdateItemCommand')).toHaveLength(0);

        const { status, body } = await call(
            approveHandler,
            event('admin', {}, { username: 'pending' }),
        );
        expect(status).toBe(200);
        expect(body.status).toBe('APPROVED');
    });

    it('404s when approving someone who never applied', async () => {
        const original = sendMock.getMockImplementation()!;
        sendMock.mockImplementation(async (cmd: any) => {
            if (cmd.constructor.name === 'UpdateItemCommand') {
                throw new ConditionalCheckFailedException({ message: 'x', $metadata: {} });
            }
            return original(cmd);
        });
        expect(
            (await call(approveHandler, event('admin', {}, { username: 'stranger' }))).status,
        ).toBe(404);
    });

    it('reports whether the caller can contribute', async () => {
        const status = async (as: string) => (await call(meHandler, event(as))).body;
        expect(await status('approved')).toMatchObject({ canContribute: true, isAdmin: false });
        expect(await status('admin')).toMatchObject({ canContribute: true, isAdmin: true });
        expect(await status('pending')).toMatchObject({ canContribute: false });
        expect(await status('stranger')).toMatchObject({ canContribute: false, isAdmin: false });
    });
});

describe('who can look at the puzzlebase', () => {
    const reads: [string, any, Record<string, string>][] = [
        ['the puzzle list', list, {}],
        ['a puzzle', get, { id: '003' }],
        ['the leaderboard', leaderboardHandler, {}],
    ];

    beforeEach(() => {
        puzzles['003'] = { id: '003', fen: FEN, solutionPgn: PUZZLE_PGN, updatedAt: 'T0' };
    });

    it.each(reads)('shows %s to a Puzzle Contributor', async (_name, handler, params) => {
        expect((await call(handler, event('approved', {}, params))).status).toBe(200);
    });

    it.each(reads)('shows %s to an admin', async (_name, handler, params) => {
        expect((await call(handler, event('admin', {}, params))).status).toBe(200);
    });

    it.each(reads)(
        'hides %s from someone who has not been approved',
        async (_name, handler, params) => {
            for (const who of ['pending', 'stranger']) {
                const { status, body } = await call(handler, event(who, {}, params));
                expect(status).toBe(403);
                expect(body).not.toHaveProperty('id');
            }
        },
    );

    it.each(reads)('hides %s from anyone who is not signed in', async (_name, handler, params) => {
        expect((await call(handler, event(undefined, {}, params))).status).toBe(400);
    });

    it('never reads any puzzles for someone who is turned away', async () => {
        await call(list, event('stranger'));
        expect(
            sent('QueryCommand').filter(
                (c) => unmarshall(c.input.ExpressionAttributeValues)[':pk'] === 'PUZZLE',
            ),
        ).toHaveLength(0);
    });
});

describe('the contributor badge on profiles', () => {
    it('is public, and says who is a contributor and how many puzzles they added', async () => {
        const { status, body } = await call(
            profileHandler,
            event(undefined, {}, { username: 'approved' }),
        );
        expect(status).toBe(200);
        expect(body).toEqual({ isContributor: true, puzzleCount: 2 });
    });

    it('says nothing about people who only applied or never did', async () => {
        for (const username of ['pending', 'stranger']) {
            const { body } = await call(profileHandler, event(undefined, {}, { username }));
            expect(body).toEqual({ isContributor: false, puzzleCount: 0 });
        }
    });
});

describe('reading the themes', () => {
    it('is open to any signed-in member, so the trainer can offer a focus', async () => {
        for (const who of ['approved', 'pending', 'stranger', 'admin']) {
            const { status, body } = await call(getTaxonomyHandler, event(who));
            expect(status).toBe(200);
            expect(body.buckets.Tactics).toContain('Fork');
        }
    });

    it('still needs someone to be signed in', async () => {
        expect((await call(getTaxonomyHandler, event(undefined))).status).toBe(400);
    });
});
