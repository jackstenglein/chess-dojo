import { Client } from '@opensearch-project/opensearch';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
    assertGamesIndexMapping,
    ensureGamesIndex,
    GAMES_INDEX_SETTINGS,
    GamesIndexMappingError,
    resetGamesIndexEnsureCache,
} from './mapping';

const runIntegration = process.env.OPENSEARCH_INTEGRATION === 'true';
const index = `test-mapping-${Date.now()}`;
const client = new Client({ node: 'http://localhost:9200' });

describe.runIf(runIntegration)('games index mapping', () => {
    beforeAll(async () => {
        resetGamesIndexEnsureCache();
        await ensureGamesIndex(client, index);
        await client.index({
            index,
            id: '1',
            body: {
                cohort: '1500-1600',
                id: 'g1',
                white: 'Daniel Naroditsky',
                black: 'Magnus Carlsen',
                whiteElo: 2650,
                result: '1-0',
                date: '2026-06-15',
                createdAt: '2026-07-01T12:00:00Z',
                owner: 'user-1',
                ownerDisplayName: 'Kerv',
            },
            refresh: true,
        });
    });

    afterAll(async () => {
        await client.indices.delete({ index });
        resetGamesIndexEnsureCache();
    });

    async function search(query: object): Promise<number> {
        const res = await client.search({ index, body: { query } });
        return res.body.hits.hits.length;
    }

    it('is idempotent when the index already exists with the correct mapping', async () => {
        await expect(ensureGamesIndex(client, index)).resolves.not.toThrow();
    });

    it('disables index auto-creation', async () => {
        const settings = await client.cluster.getSettings();
        const persistent = settings.body.persistent as Record<string, unknown>;
        const value =
            persistent['action.auto_create_index'] ??
            (persistent.action as { auto_create_index?: string } | undefined)?.auto_create_index;
        expect(value).toBe('false');
    });

    it('fails closed when an existing index has incompatible field types', async () => {
        const badIndex = `test-mapping-bad-${Date.now()}`;
        await client.indices.create({
            index: badIndex,
            body: {
                mappings: {
                    properties: {
                        cohort: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                    },
                },
            },
        });
        try {
            await expect(ensureGamesIndex(client, badIndex)).rejects.toThrow(
                GamesIndexMappingError,
            );
        } finally {
            await client.indices.delete({ index: badIndex });
        }
    });

    it('matches a partial name', async () => {
        expect(await search({ match: { white: 'naroditsky' } })).toBe(1);
    });

    it('matches a misspelled name with fuzziness', async () => {
        expect(
            await search({
                match: { white: { query: 'narodidsky', fuzziness: 'AUTO' } },
            }),
        ).toBe(1);
    });

    it('folds diacritics in queries', async () => {
        expect(await search({ match: { white: 'nàroditsky' } })).toBe(1);
    });

    it('does not match a different name', async () => {
        expect(await search({ match: { white: 'kasparov' } })).toBe(0);
    });

    it('matches hyphenated cohorts with a term query on cohort', async () => {
        expect(await search({ term: { cohort: '1500-1600' } })).toBe(1);
    });
});

describe('assertGamesIndexMapping', () => {
    const expected = {
        properties: GAMES_INDEX_SETTINGS.mappings!.properties,
    };

    it('accepts the canonical games index mapping', () => {
        expect(() => assertGamesIndexMapping('dev-games', expected)).not.toThrow();
    });

    it('rejects a missing properties object', () => {
        expect(() => assertGamesIndexMapping('dev-games', {})).toThrow(GamesIndexMappingError);
    });

    it('rejects dynamic text mapping for cohort', () => {
        expect(() =>
            assertGamesIndexMapping('prod-games', {
                properties: {
                    ...expected.properties,
                    cohort: {
                        type: 'text',
                        fields: { keyword: { type: 'keyword' } },
                    },
                },
            }),
        ).toThrow(/field "cohort" has type "text"/);
    });

    it('rejects a missing keyword field', () => {
        const { cohort: _cohort, ...rest } = expected.properties as Record<string, object>;
        expect(() =>
            assertGamesIndexMapping('dev-games', {
                properties: rest,
            }),
        ).toThrow(/missing mapped field "cohort"/);
    });

    it('rejects text fields that lack a keyword subfield', () => {
        expect(() =>
            assertGamesIndexMapping('dev-games', {
                properties: {
                    ...expected.properties,
                    white: { type: 'text', analyzer: 'name_analyzer' },
                },
            }),
        ).toThrow(/missing the keyword subfield/);
    });
});
