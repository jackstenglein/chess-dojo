import { API, Client, errors } from '@opensearch-project/opensearch';

/** Index settings and mappings for the games search index. */
export const GAMES_INDEX_SETTINGS: API.Indices_Create_RequestBody = {
    settings: {
        number_of_shards: 1,
        number_of_replicas: 1,
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

/** Thrown when an existing games index has a mapping that cannot be used safely. */
export class GamesIndexMappingError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'GamesIndexMappingError';
    }
}

type FieldMapping = {
    type?: string;
    analyzer?: string;
    format?: string;
    fields?: Record<string, { type?: string }>;
};

type IndexMappings = {
    properties?: Record<string, FieldMapping>;
};

const EXPECTED_PROPERTIES = GAMES_INDEX_SETTINGS.mappings!.properties as Record<
    string,
    FieldMapping
>;

/**
 * Validates that an index mapping matches GAMES_INDEX_SETTINGS for fields
 * that search queries rely on (especially keyword term filters).
 */
export function assertGamesIndexMapping(index: string, mappings: IndexMappings | undefined): void {
    const properties = mappings?.properties;
    if (!properties) {
        throw new GamesIndexMappingError(`Index ${index} has no mappings.properties`);
    }

    for (const [field, expected] of Object.entries(EXPECTED_PROPERTIES)) {
        const actual = properties[field];
        if (!actual) {
            throw new GamesIndexMappingError(`Index ${index} is missing mapped field "${field}"`);
        }
        if (actual.type !== expected.type) {
            throw new GamesIndexMappingError(
                `Index ${index} field "${field}" has type "${actual.type}" but expected "${expected.type}". ` +
                    `Recreate the index with GAMES_INDEX_SETTINGS; field types cannot be changed in place.`,
            );
        }
        if (expected.fields?.keyword && actual.fields?.keyword?.type !== 'keyword') {
            throw new GamesIndexMappingError(
                `Index ${index} field "${field}" is missing the keyword subfield`,
            );
        }
    }
}

/** Disables dynamic index auto-creation on the cluster (persistent setting). */
export async function disableIndexAutoCreate(client: Client): Promise<void> {
    await client.cluster.putSettings({
        body: {
            persistent: {
                'action.auto_create_index': 'false',
            },
        },
    });
}

function isIndexAlreadyExistsError(err: unknown): boolean {
    return (
        err instanceof errors.ResponseError &&
        err.body?.error?.type === 'resource_already_exists_exception'
    );
}

/**
 * Ensures the games search index exists with the expected mapping and that the
 * cluster will not auto-create dynamically mapped indexes on write.
 *
 * - Missing index: creates it with GAMES_INDEX_SETTINGS.
 * - Existing index with wrong types: throws GamesIndexMappingError (fail closed).
 */
export async function ensureGamesIndex(client: Client, index: string): Promise<void> {
    await disableIndexAutoCreate(client);

    const exists = await client.indices.exists({ index });
    if (!exists.body) {
        try {
            await client.indices.create({ index, body: GAMES_INDEX_SETTINGS });
            return;
        } catch (err) {
            if (!isIndexAlreadyExistsError(err)) {
                throw err;
            }
            // Lost a create race with another writer; validate below.
        }
    }

    const mapping = await client.indices.getMapping({ index });
    assertGamesIndexMapping(index, mapping.body[index]?.mappings as IndexMappings | undefined);
}

/** @deprecated Prefer ensureGamesIndex — kept as an alias for call-site clarity. */
export async function createGamesIndex(client: Client, index: string): Promise<void> {
    await ensureGamesIndex(client, index);
}

/** Memoized ensure for warm Lambda invocations; retries after failure. */
let ensureOnce: Promise<void> | undefined;

export async function ensureGamesIndexOnce(client: Client, index: string): Promise<void> {
    if (!ensureOnce) {
        ensureOnce = ensureGamesIndex(client, index).catch((err) => {
            ensureOnce = undefined;
            throw err;
        });
    }
    return ensureOnce;
}

/** Clears the ensureGamesIndexOnce memo (for tests). */
export function resetGamesIndexEnsureCache(): void {
    ensureOnce = undefined;
}
