'use strict';

import { marshall } from '@aws-sdk/util-dynamodb';
import { MergeMultipleSchema } from '@jackstenglein/chess-dojo-common/src/pgn/merge';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { assert, beforeEach, describe, test, vi, expect } from 'vitest';
import { Game } from './types';

// vi.hoisted runs before vi.mock hoisting, so mockSend is available in the factory
const { mockSend } = vi.hoisted(() => {
    const mockSend = vi.fn();
    // Set frontendHost before module import so the module-level const captures it
    process.env['frontendHost'] = 'https://www.chessdojo.club';
    return { mockSend };
});

vi.mock('@aws-sdk/client-dynamodb', async () => {
    const actual = await vi.importActual<typeof import('@aws-sdk/client-dynamodb')>(
        '@aws-sdk/client-dynamodb',
    );
    class MockDynamoDBClient {
        send = mockSend;
    }
    return {
        ...actual,
        DynamoDBClient: MockDynamoDBClient,
    };
});

// Mock uuid to produce deterministic IDs
vi.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }));

import { handler } from './mergeMultiple';

/** Helper: build a minimal Game object. */
function makeGame(overrides: Partial<Game> & { cohort: string; id: string; pgn: string }): Game {
    return {
        white: '?',
        black: '?',
        date: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        owner: 'test-user',
        ownerDisplayName: 'Test User',
        ownerPreviousCohort: '',
        headers: {},
        orientation: 'white',
        comments: [],
        positionComments: {},
        unlisted: false,
        ...overrides,
    };
}

/** Helper: build a fake API Gateway event with the given body and username. */
function makeEvent(body: object, username = 'test-user'): APIGatewayProxyEventV2 {
    return {
        body: JSON.stringify(body),
        requestContext: {
            authorizer: {
                jwt: {
                    claims: { 'cognito:username': username },
                },
            },
        } as any,
        headers: {},
        isBase64Encoded: false,
        rawPath: '',
        rawQueryString: '',
        routeKey: '',
        version: '2.0',
    } as APIGatewayProxyEventV2;
}

/** Helper to build a game key with a unique id (for schema tests). */
function gameKey(index: number) {
    return { cohort: '2000-2100', id: `2025-01-01_game${index}` };
}

/** Helper: set up mockSend to return the given games via BatchGetItem. */
function mockDynamoGames(games: Game[]) {
    mockSend.mockImplementation((command: any) => {
        const commandName = command.constructor.name;

        if (commandName === 'BatchGetItemCommand') {
            const requestItems = command.input?.RequestItems;
            const tableName = Object.keys(requestItems)[0];
            const keys = requestItems[tableName].Keys;

            const items = keys
                .map((key: any) => {
                    const cohort = key.cohort?.S;
                    const id = key.id?.S;
                    return games.find((g) => g.cohort === cohort && g.id === id);
                })
                .filter(Boolean)
                .map((g: Game) => marshall(g, { removeUndefinedValues: true }));

            return {
                Responses: { [tableName]: items },
                UnprocessedKeys: {},
            };
        }

        // PutItemCommand returns nothing meaningful
        return {};
    });
}

beforeEach(() => {
    mockSend.mockReset();
});

describe('MergeMultipleSchema', () => {
    test('rejects fewer than 2 games', () => {
        const result = MergeMultipleSchema.safeParse({
            games: [gameKey(1)],
            headerSource: gameKey(1),
        });
        expect(result.success).toBe(false);
    });

    test('accepts exactly 2 games', () => {
        const result = MergeMultipleSchema.safeParse({
            games: [gameKey(1), gameKey(2)],
            headerSource: gameKey(1),
        });
        expect(result.success).toBe(true);
    });

    test('accepts exactly 20 games', () => {
        const games = Array.from({ length: 20 }, (_, i) => gameKey(i + 1));
        const result = MergeMultipleSchema.safeParse({
            games,
            headerSource: games[0],
        });
        expect(result.success).toBe(true);
    });

    test('rejects more than 20 games', () => {
        const games = Array.from({ length: 21 }, (_, i) => gameKey(i + 1));
        const result = MergeMultipleSchema.safeParse({
            games,
            headerSource: games[0],
        });
        expect(result.success).toBe(false);
    });

    test('rejects duplicate cohort/id pairs', () => {
        const result = MergeMultipleSchema.safeParse({
            games: [gameKey(1), gameKey(1)],
            headerSource: gameKey(1),
        });
        expect(result.success).toBe(false);
    });
});

describe('mergeMultiple handler', () => {
    test('happy path: merges two games with overlapping lines', async () => {
        const game1 = makeGame({
            cohort: '2000-2100',
            id: 'game-1',
            pgn: '[White "Alice"]\n[Black "Bob"]\n[Date "2024.01.01"]\n[Result "*"]\n\n1. e4 e5 2. Nf3 *',
        });
        const game2 = makeGame({
            cohort: '2000-2100',
            id: 'game-2',
            pgn: '1. e4 e5 2. Bc4 *',
        });
        mockDynamoGames([game1, game2]);

        const event = makeEvent({
            games: [
                { cohort: '2000-2100', id: 'game-1' },
                { cohort: '2000-2100', id: 'game-2' },
            ],
            headerSource: { cohort: '2000-2100', id: 'game-1' },
        });

        const result = await handler(event, {} as any, () => {});
        const body = JSON.parse((result as any).body);

        assert.equal((result as any).statusCode, 200);
        assert.equal(body.cohort, '2000-2100');
        assert.include(body.id, 'test-uuid-1234');

        // The PutItemCommand should have been called with the merged PGN
        const putCall = mockSend.mock.calls.find(
            (call) => call[0].constructor.name === 'PutItemCommand',
        );
        assert.isDefined(putCall, 'should save the merged game');

        // Verify the merged PGN contains move trees from both games
        const pgn = putCall![0].input.Item.pgn.S as string;
        assert.include(pgn, 'Nf3', 'merged PGN should contain Nf3 from game1');
        assert.include(pgn, 'Bc4', 'merged PGN should contain Bc4 from game2');
    });

    test('happy path: merges three games, all lines present in result', async () => {
        const game1 = makeGame({
            cohort: 'c1',
            id: 'g1',
            pgn: '1. e4 *',
        });
        const game2 = makeGame({
            cohort: 'c1',
            id: 'g2',
            pgn: '1. d4 *',
        });
        const game3 = makeGame({
            cohort: 'c1',
            id: 'g3',
            pgn: '1. c4 *',
        });
        mockDynamoGames([game1, game2, game3]);

        const event = makeEvent({
            games: [
                { cohort: 'c1', id: 'g1' },
                { cohort: 'c1', id: 'g2' },
                { cohort: 'c1', id: 'g3' },
            ],
            headerSource: { cohort: 'c1', id: 'g1' },
        });

        const result = await handler(event, {} as any, () => {});
        assert.equal((result as any).statusCode, 200);

        // Verify the merged PGN contains all three opening moves
        const putCall = mockSend.mock.calls.find(
            (call) => call[0].constructor.name === 'PutItemCommand',
        );
        assert.isDefined(putCall, 'should save the merged game');
        const pgn = putCall![0].input.Item.pgn.S as string;
        assert.include(pgn, 'e4', 'merged PGN should contain e4 from game1');
        assert.include(pgn, 'd4', 'merged PGN should contain d4 from game2');
        assert.include(pgn, 'c4', 'merged PGN should contain c4 from game3');
    });

    test('rejects when caller does not own a private (unlisted) game', async () => {
        const game1 = makeGame({
            cohort: 'c1',
            id: 'g1',
            pgn: '1. e4 *',
            owner: 'test-user',
        });
        const game2 = makeGame({
            cohort: 'c1',
            id: 'g2',
            pgn: '1. d4 *',
            owner: 'someone-else',
            unlisted: true, // private game owned by someone else
        });
        mockDynamoGames([game1, game2]);

        const event = makeEvent({
            games: [
                { cohort: 'c1', id: 'g1' },
                { cohort: 'c1', id: 'g2' },
            ],
            headerSource: { cohort: 'c1', id: 'g1' },
        });

        const result = await handler(event, {} as any, () => {});
        assert.equal((result as any).statusCode, 403);
    });

    test('allows merging public games not owned by caller', async () => {
        const game1 = makeGame({
            cohort: 'c1',
            id: 'g1',
            pgn: '1. e4 *',
            owner: 'test-user',
        });
        const game2 = makeGame({
            cohort: 'c1',
            id: 'g2',
            pgn: '1. d4 *',
            owner: 'someone-else',
            unlisted: false, // public game
        });
        mockDynamoGames([game1, game2]);

        const event = makeEvent({
            games: [
                { cohort: 'c1', id: 'g1' },
                { cohort: 'c1', id: 'g2' },
            ],
            headerSource: { cohort: 'c1', id: 'g1' },
        });

        const result = await handler(event, {} as any, () => {});
        assert.equal((result as any).statusCode, 200);
    });

    test('returns 400 when games have mismatched starting positions', async () => {
        const game1 = makeGame({
            cohort: 'c1',
            id: 'g1',
            pgn: '1. e4 *', // standard starting position
        });
        const game2 = makeGame({
            cohort: 'c1',
            id: 'g2',
            pgn: '[SetUp "1"]\n[FEN "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"]\n\n1... e5 *', // position after 1. e4
        });
        mockDynamoGames([game1, game2]);

        const event = makeEvent({
            games: [
                { cohort: 'c1', id: 'g1' },
                { cohort: 'c1', id: 'g2' },
            ],
            headerSource: { cohort: 'c1', id: 'g1' },
        });

        const result = await handler(event, {} as any, () => {});
        assert.equal((result as any).statusCode, 400);

        const body = JSON.parse((result as any).body);
        assert.include(body.message, 'same position');
    });

    test('returns 400 when headerSource is not in the games list', async () => {
        const game1 = makeGame({ cohort: 'c1', id: 'g1', pgn: '1. e4 *' });
        const game2 = makeGame({ cohort: 'c1', id: 'g2', pgn: '1. d4 *' });
        mockDynamoGames([game1, game2]);

        const event = makeEvent({
            games: [
                { cohort: 'c1', id: 'g1' },
                { cohort: 'c1', id: 'g2' },
            ],
            headerSource: { cohort: 'c1', id: 'not-in-list' },
        });

        const result = await handler(event, {} as any, () => {});
        assert.equal((result as any).statusCode, 400);

        const body = JSON.parse((result as any).body);
        assert.include(body.message, 'headerSource');
    });

    test('returns 404 when a game is not found in DynamoDB', async () => {
        const game1 = makeGame({ cohort: 'c1', id: 'g1', pgn: '1. e4 *' });
        // game2 does not exist in the mock
        mockDynamoGames([game1]);

        const event = makeEvent({
            games: [
                { cohort: 'c1', id: 'g1' },
                { cohort: 'c1', id: 'missing-game' },
            ],
            headerSource: { cohort: 'c1', id: 'g1' },
        });

        const result = await handler(event, {} as any, () => {});
        assert.equal((result as any).statusCode, 404);

        const body = JSON.parse((result as any).body);
        assert.include(body.message, 'not found');
    });

    test('returns 400 when body is missing required fields', async () => {
        const event = makeEvent({
            // Missing games and headerSource
        });

        const result = await handler(event, {} as any, () => {});
        assert.equal((result as any).statusCode, 400);
    });

    test('returns 400 when fewer than 2 games provided', async () => {
        const event = makeEvent({
            games: [{ cohort: 'c1', id: 'g1' }],
            headerSource: { cohort: 'c1', id: 'g1' },
        });

        const result = await handler(event, {} as any, () => {});
        assert.equal((result as any).statusCode, 400);
    });

    test('uses headers from the headerSource game', async () => {
        const game1 = makeGame({
            cohort: 'c1',
            id: 'g1',
            pgn: '[White "Alice"]\n[Black "Bob"]\n[Date "2024.06.15"]\n[Result "*"]\n\n1. e4 *',
        });
        const game2 = makeGame({
            cohort: 'c1',
            id: 'g2',
            pgn: '[White "Charlie"]\n[Black "Dana"]\n\n1. d4 *',
        });
        mockDynamoGames([game1, game2]);

        const event = makeEvent({
            games: [
                { cohort: 'c1', id: 'g1' },
                { cohort: 'c1', id: 'g2' },
            ],
            headerSource: { cohort: 'c1', id: 'g1' },
        });

        const result = await handler(event, {} as any, () => {});
        assert.equal((result as any).statusCode, 200);

        // Verify PutItemCommand was called and the saved game has correct white/black from headers
        const putCall = mockSend.mock.calls.find(
            (call) => call[0].constructor.name === 'PutItemCommand',
        );
        assert.isDefined(putCall);
        const item = putCall![0].input.Item;
        // white/black in the saved Game are lowercased header values
        assert.equal(item.white.S, 'alice');
        assert.equal(item.black.S, 'bob');
    });

    test('new game is always unlisted', async () => {
        const game1 = makeGame({
            cohort: 'c1',
            id: 'g1',
            pgn: '1. e4 *',
            unlisted: false,
        });
        const game2 = makeGame({
            cohort: 'c1',
            id: 'g2',
            pgn: '1. d4 *',
            unlisted: false,
        });
        mockDynamoGames([game1, game2]);

        const event = makeEvent({
            games: [
                { cohort: 'c1', id: 'g1' },
                { cohort: 'c1', id: 'g2' },
            ],
            headerSource: { cohort: 'c1', id: 'g1' },
        });

        const result = await handler(event, {} as any, () => {});
        assert.equal((result as any).statusCode, 200);

        const putCall = mockSend.mock.calls.find(
            (call) => call[0].constructor.name === 'PutItemCommand',
        );
        assert.isDefined(putCall);
        const item = putCall![0].input.Item;
        assert.deepEqual(item.unlisted, { BOOL: true });
    });

    test('merge with OVERWRITE comment mode replaces comments', async () => {
        const game1 = makeGame({
            cohort: 'c1',
            id: 'g1',
            pgn: '1. e4 {original comment} *',
        });
        const game2 = makeGame({
            cohort: 'c1',
            id: 'g2',
            pgn: '1. e4 {new comment} *',
        });
        mockDynamoGames([game1, game2]);

        const event = makeEvent({
            games: [
                { cohort: 'c1', id: 'g1' },
                { cohort: 'c1', id: 'g2' },
            ],
            headerSource: { cohort: 'c1', id: 'g1' },
            commentMergeType: 'OVERWRITE',
        });

        const result = await handler(event, {} as any, () => {});
        assert.equal((result as any).statusCode, 200);

        const putCall = mockSend.mock.calls.find(
            (call) => call[0].constructor.name === 'PutItemCommand',
        );
        const item = putCall![0].input.Item;
        const pgn = item.pgn.S as string;
        assert.include(pgn, 'new comment');
        assert.notInclude(pgn, 'original comment');
    });

    test('merge with DISCARD comment mode keeps only target comments', async () => {
        const game1 = makeGame({
            cohort: 'c1',
            id: 'g1',
            pgn: '1. e4 {keep this} *',
        });
        const game2 = makeGame({
            cohort: 'c1',
            id: 'g2',
            pgn: '1. e4 {discard this} *',
        });
        mockDynamoGames([game1, game2]);

        const event = makeEvent({
            games: [
                { cohort: 'c1', id: 'g1' },
                { cohort: 'c1', id: 'g2' },
            ],
            headerSource: { cohort: 'c1', id: 'g1' },
            commentMergeType: 'DISCARD',
        });

        const result = await handler(event, {} as any, () => {});
        assert.equal((result as any).statusCode, 200);

        const putCall = mockSend.mock.calls.find(
            (call) => call[0].constructor.name === 'PutItemCommand',
        );
        const pgn = putCall![0].input.Item.pgn.S as string;
        assert.include(pgn, 'keep this');
        assert.notInclude(pgn, 'discard this');
    });

    test('merge with MERGE comment mode appends comments', async () => {
        const game1 = makeGame({
            cohort: 'c1',
            id: 'g1',
            pgn: '1. e4 {first} *',
        });
        const game2 = makeGame({
            cohort: 'c1',
            id: 'g2',
            pgn: '1. e4 {second} *',
        });
        mockDynamoGames([game1, game2]);

        const event = makeEvent({
            games: [
                { cohort: 'c1', id: 'g1' },
                { cohort: 'c1', id: 'g2' },
            ],
            headerSource: { cohort: 'c1', id: 'g1' },
            commentMergeType: 'MERGE',
        });

        const result = await handler(event, {} as any, () => {});
        assert.equal((result as any).statusCode, 200);

        const putCall = mockSend.mock.calls.find(
            (call) => call[0].constructor.name === 'PutItemCommand',
        );
        const pgn = putCall![0].input.Item.pgn.S as string;
        assert.include(pgn, 'first');
        assert.include(pgn, 'second');
    });

    test('empty PGN game is handled gracefully', async () => {
        const game1 = makeGame({
            cohort: 'c1',
            id: 'g1',
            pgn: '*',
        });
        const game2 = makeGame({
            cohort: 'c1',
            id: 'g2',
            pgn: '*',
        });
        mockDynamoGames([game1, game2]);

        const event = makeEvent({
            games: [
                { cohort: 'c1', id: 'g1' },
                { cohort: 'c1', id: 'g2' },
            ],
            headerSource: { cohort: 'c1', id: 'g1' },
        });

        const result = await handler(event, {} as any, () => {});
        assert.equal((result as any).statusCode, 200);
    });

    test('single-move games merge correctly', async () => {
        const game1 = makeGame({
            cohort: 'c1',
            id: 'g1',
            pgn: '1. e4 *',
        });
        const game2 = makeGame({
            cohort: 'c1',
            id: 'g2',
            pgn: '1. d4 *',
        });
        mockDynamoGames([game1, game2]);

        const event = makeEvent({
            games: [
                { cohort: 'c1', id: 'g1' },
                { cohort: 'c1', id: 'g2' },
            ],
            headerSource: { cohort: 'c1', id: 'g1' },
        });

        const result = await handler(event, {} as any, () => {});
        assert.equal((result as any).statusCode, 200);

        const putCall = mockSend.mock.calls.find(
            (call) => call[0].constructor.name === 'PutItemCommand',
        );
        const pgn = putCall![0].input.Item.pgn.S as string;
        assert.include(pgn, 'e4');
        assert.include(pgn, 'd4');
    });

    test('merged game owner is the calling user', async () => {
        const game1 = makeGame({
            cohort: 'c1',
            id: 'g1',
            pgn: '1. e4 *',
            owner: 'test-user',
        });
        const game2 = makeGame({
            cohort: 'c1',
            id: 'g2',
            pgn: '1. d4 *',
            owner: 'someone-else',
            unlisted: false,
        });
        mockDynamoGames([game1, game2]);

        const event = makeEvent(
            {
                games: [
                    { cohort: 'c1', id: 'g1' },
                    { cohort: 'c1', id: 'g2' },
                ],
                headerSource: { cohort: 'c1', id: 'g1' },
            },
            'calling-user',
        );

        const result = await handler(event, {} as any, () => {});
        assert.equal((result as any).statusCode, 200);

        const putCall = mockSend.mock.calls.find(
            (call) => call[0].constructor.name === 'PutItemCommand',
        );
        const item = putCall![0].input.Item;
        assert.equal(item.owner.S, 'calling-user');
    });

    test('cohort of merged game matches headerSource game', async () => {
        const game1 = makeGame({
            cohort: '1500-1600',
            id: 'g1',
            pgn: '1. e4 *',
        });
        const game2 = makeGame({
            cohort: '2000-2100',
            id: 'g2',
            pgn: '1. d4 *',
        });
        mockDynamoGames([game1, game2]);

        const event = makeEvent({
            games: [
                { cohort: '1500-1600', id: 'g1' },
                { cohort: '2000-2100', id: 'g2' },
            ],
            headerSource: { cohort: '1500-1600', id: 'g1' },
        });

        const result = await handler(event, {} as any, () => {});
        assert.equal((result as any).statusCode, 200);

        const body = JSON.parse((result as any).body);
        assert.equal(body.cohort, '1500-1600');
    });

    describe('citeSource', () => {
        test('appends citation comment with player names, ratings, date, and game URL', async () => {
            const game1 = makeGame({
                cohort: 'c1',
                id: 'g1',
                pgn: '1. e4 *',
            });
            const game2 = makeGame({
                cohort: 'c1',
                id: 'g2',
                pgn: `[White "Magnus Carlsen"]
[WhiteElo "2850"]
[Black "Ian Nepomniachtchi"]
[BlackElo "2789"]
[Date "2024.01.15"]

1. e4 e5 *`,
            });
            mockDynamoGames([game1, game2]);

            const event = makeEvent({
                games: [
                    { cohort: 'c1', id: 'g1' },
                    { cohort: 'c1', id: 'g2' },
                ],
                headerSource: { cohort: 'c1', id: 'g1' },
                citeSource: true,
            });

            const result = await handler(event, {} as any, () => {});
            assert.equal((result as any).statusCode, 200);

            const putCall = mockSend.mock.calls.find(
                (call) => call[0].constructor.name === 'PutItemCommand',
            );
            const pgn = putCall![0].input.Item.pgn.S as string;

            assert.include(pgn, 'Magnus Carlsen (2850)');
            assert.include(pgn, 'Ian Nepomniachtchi (2789)');
            assert.include(pgn, '2024.01.15');
            assert.include(pgn, 'chessdojo.club/games/c1/g2');
        });

        test('no citation when citeSource is false', async () => {
            const game1 = makeGame({
                cohort: 'c1',
                id: 'g1',
                pgn: '1. e4 *',
            });
            const game2 = makeGame({
                cohort: 'c1',
                id: 'g2',
                pgn: `[White "Player1"]
[Black "Player2"]

1. e4 e5 *`,
            });
            mockDynamoGames([game1, game2]);

            const event = makeEvent({
                games: [
                    { cohort: 'c1', id: 'g1' },
                    { cohort: 'c1', id: 'g2' },
                ],
                headerSource: { cohort: 'c1', id: 'g1' },
                citeSource: false,
            });

            const result = await handler(event, {} as any, () => {});
            assert.equal((result as any).statusCode, 200);

            const putCall = mockSend.mock.calls.find(
                (call) => call[0].constructor.name === 'PutItemCommand',
            );
            const pgn = putCall![0].input.Item.pgn.S as string;

            assert.notInclude(pgn, 'chessdojo.club');
            assert.notInclude(pgn, 'Player1');
        });

        test('no citation when citeSource is omitted', async () => {
            const game1 = makeGame({
                cohort: 'c1',
                id: 'g1',
                pgn: '1. e4 *',
            });
            const game2 = makeGame({
                cohort: 'c1',
                id: 'g2',
                pgn: `[White "Player1"]
[Black "Player2"]

1. e4 e5 *`,
            });
            mockDynamoGames([game1, game2]);

            const event = makeEvent({
                games: [
                    { cohort: 'c1', id: 'g1' },
                    { cohort: 'c1', id: 'g2' },
                ],
                headerSource: { cohort: 'c1', id: 'g1' },
                // citeSource not provided
            });

            const result = await handler(event, {} as any, () => {});
            assert.equal((result as any).statusCode, 200);

            const putCall = mockSend.mock.calls.find(
                (call) => call[0].constructor.name === 'PutItemCommand',
            );
            const pgn = putCall![0].input.Item.pgn.S as string;

            assert.notInclude(pgn, 'chessdojo.club');
        });

        test('citation falls back to NN for missing player names and omits rating', async () => {
            const game1 = makeGame({
                cohort: 'c1',
                id: 'g1',
                pgn: '1. e4 *',
            });
            const game2 = makeGame({
                cohort: 'c1',
                id: 'g2',
                // No White/Black/WhiteElo/BlackElo headers
                pgn: '1. e4 e5 *',
            });
            mockDynamoGames([game1, game2]);

            const event = makeEvent({
                games: [
                    { cohort: 'c1', id: 'g1' },
                    { cohort: 'c1', id: 'g2' },
                ],
                headerSource: { cohort: 'c1', id: 'g1' },
                citeSource: true,
            });

            const result = await handler(event, {} as any, () => {});
            assert.equal((result as any).statusCode, 200);

            const putCall = mockSend.mock.calls.find(
                (call) => call[0].constructor.name === 'PutItemCommand',
            );
            const pgn = putCall![0].input.Item.pgn.S as string;

            // Should fall back to 'NN' for both players
            assert.include(pgn, 'NN - NN');
            assert.include(pgn, 'chessdojo.club/games/c1/g2');
        });
    });
});
