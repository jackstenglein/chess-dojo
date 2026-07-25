import { Client } from '@opensearch-project/opensearch';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createGamesIndex } from './mapping';

const runIntegration = process.env.OPENSEARCH_INTEGRATION === 'true';
const index = `test-mapping-${Date.now()}`;
const client = new Client({ node: 'http://localhost:9200' });

describe.runIf(runIntegration)('games index mapping', () => {
    beforeAll(async () => {
        await createGamesIndex(client, index);
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
    });

    async function search(query: object): Promise<number> {
        const res = await client.search({ index, body: { query } });
        return res.body.hits.hits.length;
    }

    it('is idempotent when the index already exists', async () => {
        await expect(createGamesIndex(client, index)).resolves.not.toThrow();
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
});
