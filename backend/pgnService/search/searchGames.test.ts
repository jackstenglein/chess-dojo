import { Client } from '@opensearch-project/opensearch';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createGamesIndex } from './mapping';
import { buildSearchQuery, handler } from './searchGames';

const base = {
    white: 'naroditsky',
    ignoreColors: true,
    eloMode: 'one',
    startKey: 0,
} as const;

describe('buildSearchQuery', () => {
    it('searches both colors with fuzzy and prefix matching when ignoreColors', () => {
        const query = buildSearchQuery({ ...base }) as never;
        const should = query['bool']['should'];
        expect(should).toHaveLength(2);
        const whiteName = should[0]['bool']['should'];
        expect(whiteName).toEqual([
            {
                match: {
                    white: {
                        query: 'naroditsky',
                        fuzziness: 'AUTO',
                        operator: 'and',
                    },
                },
            },
            { match_phrase_prefix: { white: 'naroditsky' } },
        ]);
        expect(query['bool']['minimum_should_match']).toBe(1);
    });

    it('restricts to white when ignoreColors is false', () => {
        const query = buildSearchQuery({
            white: 'naroditsky',
            ignoreColors: false,
            eloMode: 'one',
            startKey: 0,
        }) as never;
        expect(query['bool']['should']).toBeUndefined();
        expect(JSON.stringify(query['bool']['filter'])).toContain('"white"');
        expect(JSON.stringify(query['bool']['filter'])).not.toContain('"black":');
    });

    it('matches both players in either order when ignoreColors', () => {
        const query = buildSearchQuery({
            white: 'carlsen',
            black: 'nakamura',
            ignoreColors: true,
            eloMode: 'one',
            startKey: 0,
        }) as never;
        const should = query['bool']['should'];
        expect(should).toHaveLength(2);
        expect(JSON.stringify(should[0])).toContain('carlsen');
        expect(JSON.stringify(should[0])).toContain('nakamura');
        expect(JSON.stringify(should[1])).toContain('carlsen');
        expect(JSON.stringify(should[1])).toContain('nakamura');
    });

    it('matches white and black in fixed colors when not ignoring', () => {
        const query = buildSearchQuery({
            white: 'carlsen',
            black: 'nakamura',
            ignoreColors: false,
            eloMode: 'one',
            startKey: 0,
        }) as never;
        expect(query['bool']['should']).toBeUndefined();
        const filter = query['bool']['filter'];
        expect(JSON.stringify(filter[0])).toContain('"white"');
        expect(JSON.stringify(filter[0])).toContain('carlsen');
        expect(JSON.stringify(filter[1])).toContain('"black"');
        expect(JSON.stringify(filter[1])).toContain('nakamura');
    });

    it('applies eloMode=one as either-side range', () => {
        const query = buildSearchQuery({
            ...base,
            minElo: 1500,
            maxElo: 1800,
            eloMode: 'one',
        }) as never;
        expect(query['bool']['filter']).toContainEqual({
            bool: {
                should: [
                    { range: { whiteElo: { gte: 1500, lte: 1800 } } },
                    { range: { blackElo: { gte: 1500, lte: 1800 } } },
                ],
                minimum_should_match: 1,
            },
        });
    });

    it('applies eloMode=both to both sides', () => {
        const query = buildSearchQuery({
            eloMode: 'both',
            ignoreColors: false,
            startKey: 0,
            minElo: 1500,
            maxElo: 1800,
        }) as never;
        expect(query['bool']['filter']).toContainEqual({
            range: { whiteElo: { gte: 1500, lte: 1800 } },
        });
        expect(query['bool']['filter']).toContainEqual({
            range: { blackElo: { gte: 1500, lte: 1800 } },
        });
    });

    it('applies eloMode=average to avgElo', () => {
        const query = buildSearchQuery({
            eloMode: 'average',
            ignoreColors: false,
            startKey: 0,
            minElo: 2000,
            maxElo: 2200,
        }) as never;
        expect(query['bool']['filter']).toContainEqual({
            range: { avgElo: { gte: 2000, lte: 2200 } },
        });
    });

    it('filters by a subset of PGN results', () => {
        const query = buildSearchQuery({
            ...base,
            results: ['1-0', '1/2-1/2'],
        }) as never;
        expect(query['bool']['filter']).toContainEqual({
            terms: { result: ['1-0', '1/2-1/2'] },
        });
    });

    it('skips the result filter when all results are selected', () => {
        const query = buildSearchQuery({
            ...base,
            results: ['1-0', '0-1', '1/2-1/2'],
        }) as never;
        expect(JSON.stringify(query['bool']['filter'])).not.toContain('"terms"');
    });

    it('applies cohort and date filters at the top level', () => {
        const query = buildSearchQuery({
            ...base,
            cohort: 'masters',
            startDate: '2024-01-01',
            endDate: '2024-12-31',
        }) as never;
        expect(query['bool']['filter']).toContainEqual({ term: { cohort: 'masters' } });
        expect(query['bool']['filter']).toContainEqual({
            range: { date: { gte: '2024-01-01', lte: '2024-12-31' } },
        });
    });

    it('builds filter-only queries without a player', () => {
        const query = buildSearchQuery({
            ignoreColors: false,
            startKey: 0,
            eloMode: 'both',
            minElo: 2600,
            results: ['1-0'],
            cohort: 'masters',
        }) as never;
        expect(query['bool']['should']).toBeUndefined();
        expect(query['bool']['filter']).toContainEqual({
            range: { whiteElo: { gte: 2600 } },
        });
        expect(query['bool']['filter']).toContainEqual({
            range: { blackElo: { gte: 2600 } },
        });
        expect(query['bool']['filter']).toContainEqual({ terms: { result: ['1-0'] } });
        expect(query['bool']['filter']).toContainEqual({ term: { cohort: 'masters' } });
    });

    it('matches everything with no criteria', () => {
        const query = buildSearchQuery({
            ignoreColors: false,
            eloMode: 'one',
            startKey: 0,
        }) as never;
        expect(query['bool']['should']).toBeUndefined();
        expect(query['bool']['filter']).toEqual([]);
    });

    it('routes ECO codes in opening to a prefix filter', () => {
        const query = buildSearchQuery({
            ignoreColors: false,
            eloMode: 'one',
            startKey: 0,
            opening: 'b1',
        }) as never;
        expect(query['bool']['filter']).toContainEqual({ prefix: { eco: 'B1' } });
    });

    it('routes opening names to text matching', () => {
        const query = buildSearchQuery({
            ignoreColors: false,
            eloMode: 'one',
            startKey: 0,
            opening: 'caro kann',
        }) as never;
        expect(query['bool']['filter']).toContainEqual({
            bool: {
                should: [
                    { match: { opening: { query: 'caro kann', operator: 'and' } } },
                    { match_phrase_prefix: { opening: 'caro kann' } },
                ],
                minimum_should_match: 1,
            },
        });
    });

    it('converts a move range to a plyCount range', () => {
        const query = buildSearchQuery({
            ignoreColors: false,
            eloMode: 'one',
            startKey: 0,
            minMoves: 20,
            maxMoves: 40,
        }) as never;
        expect(query['bool']['filter']).toContainEqual({
            range: { plyCount: { gte: 39, lte: 80 } },
        });
    });

    it('filters by time class', () => {
        const query = buildSearchQuery({
            ignoreColors: false,
            eloMode: 'one',
            startKey: 0,
            timeClass: 'blitz',
        }) as never;
        expect(query['bool']['filter']).toContainEqual({ term: { timeClass: 'blitz' } });
    });

    it('applies the new filters at the top level with a player too', () => {
        const query = buildSearchQuery({
            ...base,
            opening: 'B12',
            minMoves: 10,
            timeClass: 'rapid',
        }) as never;
        expect(query['bool']['filter']).toContainEqual({ prefix: { eco: 'B12' } });
        expect(query['bool']['filter']).toContainEqual({
            range: { plyCount: { gte: 19 } },
        });
        expect(query['bool']['filter']).toContainEqual({ term: { timeClass: 'rapid' } });
        expect(query['bool']['should']).toHaveLength(2);
    });
});

describe('handler', () => {
    it('returns 503 when search is not configured', async () => {
        const previous = process.env.gameSearchEndpoint;
        process.env.gameSearchEndpoint = 'unset';
        try {
            const response = (await handler(
                { queryStringParameters: { white: 'naroditsky' } } as never,
                undefined as never,
                () => null,
            )) as { statusCode?: number; body?: string };
            expect(response.statusCode).toBe(503);
            expect(JSON.parse(response.body ?? '{}')).toEqual({
                message: 'Game search is not available on this deployment',
                code: 503,
            });
        } finally {
            process.env.gameSearchEndpoint = previous;
        }
    });

    it('rejects invalid result values', async () => {
        const previous = process.env.gameSearchEndpoint;
        process.env.gameSearchEndpoint = 'http://localhost:9200';
        try {
            const response = (await handler(
                {
                    queryStringParameters: {
                        results: 'win',
                    },
                } as never,
                undefined as never,
                () => null,
            )) as { statusCode?: number; body?: string };
            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body ?? '{}').message).toContain('Invalid request');
        } finally {
            process.env.gameSearchEndpoint = previous;
        }
    });
});

const runIntegration = process.env.OPENSEARCH_INTEGRATION === 'true';

describe.runIf(runIntegration)('search query semantics (integration)', () => {
    const stage = `test-search-${Date.now()}`;
    const index = `${stage}-games`;
    const client = new Client({ node: 'http://localhost:9200' });

    const docs = [
        // Naroditsky as white, wins, 2650
        {
            cohort: '1500-1600',
            id: 'g1',
            white: 'Daniel Naroditsky',
            black: 'A B',
            whiteElo: 2650,
            result: '1-0',
            eco: 'B12',
            opening: 'Caro-Kann Defense',
            plyCount: 80,
            timeClass: 'classical',
            date: '2026-06-15',
            createdAt: '2026-07-01T12:00:00Z',
            owner: 'u1',
            ownerDisplayName: 'U1',
        },
        // Naroditsky as black, loses, 2650
        {
            cohort: 'masters',
            id: 'g2',
            white: 'C D',
            black: 'Daniel Naroditsky',
            blackElo: 2650,
            result: '1-0',
            eco: 'C42',
            opening: 'Petrov Defense',
            plyCount: 30,
            timeClass: 'blitz',
            date: '2026-06-16',
            createdAt: '2026-07-01T12:00:00Z',
            owner: 'u2',
            ownerDisplayName: 'U2',
        },
    ];

    beforeAll(async () => {
        await createGamesIndex(client, index);
        for (const [i, doc] of docs.entries()) {
            await client.index({ index, id: String(i), body: doc, refresh: true });
        }
    });

    afterAll(async () => {
        await client.indices.delete({ index });
    });

    async function ids(request: object): Promise<string[]> {
        const res = await client.search({
            index,
            body: {
                query: buildSearchQuery({
                    startKey: 0,
                    ignoreColors: true,
                    eloMode: 'one',
                    ...request,
                } as never),
            },
        });
        return res.body.hits.hits.map((h) => (h._source as { id: string }).id).sort();
    }

    it('finds both colors for a partial name', async () => {
        expect(await ids({ white: 'naroditsky' })).toEqual(['g1', 'g2']);
    });

    it('finds a first-name prefix', async () => {
        expect(await ids({ white: 'daniel n' })).toEqual(['g1', 'g2']);
    });

    it('filters by cohort', async () => {
        expect(await ids({ white: 'naroditsky', cohort: 'masters' })).toEqual(['g2']);
    });

    it('applies eloMode=one to either side', async () => {
        expect(await ids({ white: 'naroditsky', minElo: 2600 })).toEqual(['g1', 'g2']);
        expect(await ids({ white: 'naroditsky', minElo: 2700 })).toEqual([]);
    });

    it('supports filter-only searches', async () => {
        expect(await ids({ cohort: 'masters' })).toEqual(['g2']);
        expect(await ids({ results: ['1-0'] })).toEqual(['g1', 'g2']);
        // Both docs are missing one side's elo, so a both-sides range matches neither.
        expect(await ids({ minElo: 2600, eloMode: 'both' })).toEqual([]);
        expect(await ids({ minElo: 2600, eloMode: 'one' })).toEqual(['g1', 'g2']);
        expect(await ids({})).toEqual(['g1', 'g2']);
    });

    it('filters wins for a player via absolute results', async () => {
        // g1: naroditsky white, 1-0; g2: naroditsky black, 1-0 (loss for black)
        expect(await ids({ white: 'naroditsky', results: ['1-0'] })).toEqual(['g1', 'g2']);
        expect(await ids({ white: 'naroditsky', results: ['0-1'] })).toEqual([]);
    });

    it('filters by opening name and eco prefix', async () => {
        expect(await ids({ opening: 'caro' })).toEqual(['g1']);
        expect(await ids({ opening: 'B1' })).toEqual(['g1']);
        expect(await ids({ opening: 'kasparov gambit' })).toEqual([]);
    });

    it('filters by move count range', async () => {
        expect(await ids({ minMoves: 30 })).toEqual(['g1']);
        expect(await ids({ maxMoves: 20 })).toEqual(['g2']);
    });

    it('filters by time class', async () => {
        expect(await ids({ timeClass: 'blitz' })).toEqual(['g2']);
        expect(await ids({ timeClass: 'bullet' })).toEqual([]);
    });

    it('does not expose OpenSearch details when a search fails', async () => {
        const previousEndpoint = process.env.gameSearchEndpoint;
        const previousStage = process.env.stage;
        process.env.gameSearchEndpoint = 'http://localhost:9200';
        process.env.stage = stage;
        try {
            const response = (await handler(
                { queryStringParameters: { startKey: '10000' } } as never,
                undefined as never,
                () => null,
            )) as { statusCode?: number; body?: string };

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body ?? '{}')).toEqual({
                message: 'Temporary server error',
                code: 500,
            });
            expect(response.body).not.toContain('ResponseError');
            expect(response.body).not.toContain('test-games');
        } finally {
            process.env.gameSearchEndpoint = previousEndpoint;
            process.env.stage = previousStage;
        }
    });
});
