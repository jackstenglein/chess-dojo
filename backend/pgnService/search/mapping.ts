import { API, Client } from '@opensearch-project/opensearch';

/** Index settings and mappings for the games search index. */
export const GAMES_INDEX_SETTINGS: API.Indices_Create_RequestBody = {
    settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
        analysis: {
            analyzer: {
                name_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'asciifolding'],
                },
            },
        },
    },
    mappings: {
        properties: {
            cohort: { type: 'keyword' },
            id: { type: 'keyword' },
            white: {
                type: 'text',
                analyzer: 'name_analyzer',
                fields: { keyword: { type: 'keyword' } },
            },
            black: {
                type: 'text',
                analyzer: 'name_analyzer',
                fields: { keyword: { type: 'keyword' } },
            },
            whiteElo: { type: 'integer' },
            blackElo: { type: 'integer' },
            avgElo: { type: 'integer' },
            result: { type: 'keyword' },
            eco: { type: 'keyword' },
            opening: { type: 'text' },
            date: { type: 'date', format: 'yyyy-MM-dd' },
            createdAt: { type: 'date' },
            timeControl: { type: 'keyword' },
            timeClass: { type: 'keyword' },
            plyCount: { type: 'integer' },
            owner: { type: 'keyword' },
            ownerDisplayName: {
                type: 'text',
                fields: { keyword: { type: 'keyword' } },
            },
        },
    },
};

/** Creates the games search index if it does not already exist. */
export async function createGamesIndex(client: Client, index: string): Promise<void> {
    const exists = await client.indices.exists({ index });
    if (!exists.body) {
        await client.indices.create({ index, body: GAMES_INDEX_SETTINGS });
    }
}
