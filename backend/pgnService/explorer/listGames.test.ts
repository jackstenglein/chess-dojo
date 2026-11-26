import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from 'aws-lambda';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handler, MASTERS_PAGE_SIZE, MastersStreamResult, mergeMastersPage } from './listGames';
import { ExplorerGame, GameResult } from './types';

function game(timeControl: string, gameId: string): ExplorerGame {
    return {
        normalizedFen: 'fen',
        id: `GAME#masters-${timeControl}#${gameId}`,
        cohort: `masters-${timeControl}`,
        owner: 'masters',
        result: 'white',
        game: {
            cohort: 'masters',
            id: gameId,
            date: gameId.split('_')[0],
            createdAt: '2025.01.01',
            owner: 'masters',
            timeClass: timeControl,
            headers: { White: 'A', Black: 'B', Result: GameResult.White },
        },
    };
}

function stream(
    key: string,
    gameIds: string[],
    hasMore = false,
    startAfter = '',
): MastersStreamResult {
    const timeControl = key.split(':')[0];
    return {
        stream: key,
        undated: key.endsWith(':undated'),
        startAfter,
        items: gameIds.map((id) => game(timeControl, id)),
        hasMore,
    };
}

describe('mergeMastersPage', () => {
    it('keeps a fully taken stream in the cursor while DynamoDB has more items', () => {
        const blitz = stream('blitz:dated', ['2024.05.01_a', '2019.01.01_b'], true);
        const standard = stream('standard:dated', ['2025.01.01_c', '2010.01.01_d']);

        const { cursor } = mergeMastersPage([blitz, standard], 'desc', 3);

        expect(cursor).toEqual({
            'blitz:dated': 'GAME#masters-blitz#2019.01.01_b',
            'standard:dated': 'GAME#masters-standard#2025.01.01_c',
        });
    });

    it('keeps the incoming cursor of a stream with no items taken', () => {
        const blitz = stream('blitz:dated', ['2024.05.01_a', '2023.01.01_b']);
        const unknown = stream(
            'unknown:dated',
            ['2001.01.01_c'],
            true,
            'GAME#masters-unknown#2002.01.01_x',
        );

        const { games, cursor } = mergeMastersPage([blitz, unknown], 'desc', 2);

        expect(games.map((g) => g.game.id)).toEqual(['2024.05.01_a', '2023.01.01_b']);
        expect(cursor).toEqual({ 'unknown:dated': 'GAME#masters-unknown#2002.01.01_x' });
    });
});

describe('handler (masters)', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    let table: ExplorerGame[];

    beforeEach(() => {
        table = [];
        // In-memory DynamoDB Query over one partition: BETWEEN on the sort key, byte order,
        // ScanIndexForward, ExclusiveStartKey and Limit.
        vi.spyOn(DynamoDBClient.prototype, 'send').mockImplementation(async (command) => {
            const input = (command as QueryCommand).input;
            const values = input.ExpressionAttributeValues ?? {};
            const lower = values[':lower']?.S ?? '';
            const upper = values[':upper']?.S ?? '';
            let rows = table
                .filter((g) => g.id >= lower && g.id <= upper)
                .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
            if (input.ScanIndexForward === false) {
                rows.reverse();
            }
            const startAfter = input.ExclusiveStartKey?.id?.S;
            if (startAfter) {
                rows = rows.slice(rows.findIndex((g) => g.id === startAfter) + 1);
            }
            const limit = input.Limit ?? rows.length;
            const page = rows.slice(0, limit);
            return {
                Items: page.map((g) => marshall(g)),
                LastEvaluatedKey:
                    rows.length > limit ? { id: { S: page[page.length - 1].id } } : undefined,
            } as never;
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    async function call(params: Record<string, string>) {
        const result = (await handler(
            {
                queryStringParameters: { fen, masters: 'true', ...params },
            } as never as APIGatewayProxyEventV2,
            {} as Context,
            () => undefined,
        )) as APIGatewayProxyStructuredResultV2;
        return {
            statusCode: result.statusCode,
            body: JSON.parse(result.body ?? '{}') as {
                games: { id: string }[];
                lastEvaluatedKey?: string;
            },
        };
    }

    async function listAll(params: Record<string, string>) {
        const ids: string[] = [];
        let startKey: string | undefined;
        do {
            const { statusCode, body } = await call(startKey ? { ...params, startKey } : params);
            expect(statusCode).toBe(200);
            ids.push(...body.games.map((g) => g.id));
            startKey = body.lastEvaluatedKey;
        } while (startKey);
        return ids;
    }

    function seed() {
        let n = 0;
        for (const tc of ['standard', 'rapid', 'blitz', 'unknown']) {
            for (let year = 1990; year < 2026; year++) {
                table.push(game(tc, `${year}.01.01_${n++}`));
                table.push(game(tc, `${year}.??.??_${n++}`));
            }
            for (let i = 0; i < 60; i++) {
                table.push(game(tc, `????.??.??_${n++}`));
            }
        }
    }

    it.each(['asc', 'desc'] as const)(
        'pages the selected time controls by date %s with undated games last',
        async (sortDirection) => {
            seed();
            const selected = ['standard', 'unknown'];

            const ids = await listAll({ timeControls: selected.join(','), sortDirection });

            const sign = sortDirection === 'asc' ? 1 : -1;
            const expected = table
                .filter((g) => selected.includes(g.game.timeClass ?? ''))
                .map((g) => g.game.id)
                .sort((a, b) => {
                    const aUndated = a >= '?';
                    const bUndated = b >= '?';
                    if (aUndated !== bUndated) {
                        return aUndated ? 1 : -1;
                    }
                    return a < b ? -sign : a > b ? sign : 0;
                });
            expect(expected.length).toBeGreaterThan(2 * MASTERS_PAGE_SIZE);
            expect(ids).toEqual(expected);
        },
    );

    it('rejects a start key for an unknown stream', async () => {
        const { statusCode } = await call({ startKey: JSON.stringify({ bullet: '' }) });

        expect(statusCode).toBe(400);
    });
});
