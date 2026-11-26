'use strict';

import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { Chess } from '@jackstenglein/chess';
import { APIGatewayProxyHandlerV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { ExplorerGame } from './types';

const dynamo = new DynamoDBClient({ region: 'us-east-1' });
export const explorerTable = `${process.env.stage}-explorer`;
const mastersTable =
    process.env.stage === 'prod' ? 'prod-masters-explorer' : explorerTable;

export type MastersSortDirection = 'asc' | 'desc';

/** The time controls of masters explorer games. See getExplorerCohort in processGame.ts. */
export const mastersTimeControls = ['standard', 'rapid', 'blitz', 'unknown'];

/**
 * The masters streams queried per page: the dated and undated games of each time control.
 * Undated games (dates starting with `?`) sort after all dated games.
 */
export const mastersStreamKeys = mastersTimeControls.flatMap((tc) => [
    `${tc}:dated`,
    `${tc}:undated`,
]);

/** The number of masters games returned per page. */
export const MASTERS_PAGE_SIZE = 100;

/**
 * Pagination cursor for masters games. Maps each stream key to the id of the last
 * game returned from it ('' if none yet). Exhausted streams are omitted.
 */
export type MastersCursor = Record<string, string>;

export interface MastersStreamResult {
    /** The stream key, one of mastersStreamKeys. */
    stream: string;
    /** Whether the stream contains undated games, which sort after all dated games. */
    undated: boolean;
    /** The cursor value used for this query ('' = started from the beginning). */
    startAfter: string;
    /** The items returned by DynamoDB, in query order. */
    items: ExplorerGame[];
    /** Whether DynamoDB returned a LastEvaluatedKey. */
    hasMore: boolean;
}

/**
 * Returns a list of games with the provided FEN. The FEN is normalized before searching for games.
 * @param event The HTTP event prompting this request. Must contain the fen query string parameter.
 * The startKey query string parameter can be included for pagination. For masters games, the
 * timeControls (comma-separated) and sortDirection (asc or desc) query string parameters can be
 * included to filter and order the games by date.
 * @returns A list of games and the lastEvaluatedKey if there are more games on the next page.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    console.log('Event: %j', event);

    const fen = event.queryStringParameters?.fen;
    if (!fen) {
        return handleError(400, { publicMessage: 'Invalid request: FEN is required' });
    }
    const startKey = event.queryStringParameters?.startKey;
    const masters = event.queryStringParameters?.masters === 'true';

    if (!masters) {
        try {
            return await listDojoGames(new Chess({ fen }).normalizedFen(), startKey);
        } catch (err) {
            console.error(`Failed to list games for FEN ${fen}:`, err);
            return handleError(500, err);
        }
    }

    const timeControlsParam = event.queryStringParameters?.timeControls;
    const timeControls = timeControlsParam ? timeControlsParam.split(',') : mastersTimeControls;
    if (timeControls.some((tc) => !mastersTimeControls.includes(tc))) {
        return handleError(400, { publicMessage: 'Invalid request: unknown time control' });
    }

    const sortDirection = event.queryStringParameters?.sortDirection ?? 'desc';
    if (sortDirection !== 'asc' && sortDirection !== 'desc') {
        return handleError(400, {
            publicMessage: 'Invalid request: sortDirection must be asc or desc',
        });
    }

    let cursor: MastersCursor | undefined;
    if (startKey) {
        cursor = parseMastersCursor(startKey);
        if (!cursor) {
            return handleError(400, { publicMessage: 'Invalid request: startKey is invalid' });
        }
    }

    try {
        const normalizedFen = new Chess({ fen }).normalizedFen();
        const streams: [string, string][] = cursor
            ? Object.entries(cursor)
            : timeControls.flatMap((tc) => [
                  [`${tc}:dated`, ''],
                  [`${tc}:undated`, ''],
              ]);
        const query = ([stream, startAfter]: [string, string]) =>
            queryMastersStream(normalizedFen, stream, startAfter, sortDirection);

        // Undated games sort after every dated game, so they are only read once every
        // dated stream is exhausted and the dated games can't fill the page.
        const undatedStreams = streams.filter(([stream]) => stream.endsWith(':undated'));
        const results = await Promise.all(
            streams.filter(([stream]) => stream.endsWith(':dated')).map(query),
        );
        const datedExhausted =
            results.every((r) => !r.hasMore) &&
            results.reduce((sum, r) => sum + r.items.length, 0) < MASTERS_PAGE_SIZE;
        if (datedExhausted) {
            results.push(...(await Promise.all(undatedStreams.map(query))));
        }

        const page = mergeMastersPage(results, sortDirection, MASTERS_PAGE_SIZE);
        const nextCursor: MastersCursor = {
            ...(datedExhausted ? {} : Object.fromEntries(undatedStreams)),
            ...page.cursor,
        };

        return {
            statusCode: 200,
            body: JSON.stringify({
                games: page.games.map((g) => g.game),
                lastEvaluatedKey: Object.keys(nextCursor).length
                    ? JSON.stringify(nextCursor)
                    : undefined,
            }),
        };
    } catch (err) {
        console.error(`Failed to list games for FEN ${fen}:`, err);
        return handleError(500, err);
    }
};

/**
 * Returns a page of Dojo explorer games with the given normalized FEN.
 * @param normalizedFen The normalized FEN to list games for.
 * @param startKey The DynamoDB start key, as a JSON string, for pagination.
 */
async function listDojoGames(
    normalizedFen: string,
    startKey?: string,
): Promise<APIGatewayProxyResultV2> {
    const queryOutput = await dynamo.send(
        new QueryCommand({
            KeyConditionExpression: `#fen = :fen AND begins_with ( #id, :id )`,
            ExpressionAttributeNames: {
                '#fen': 'normalizedFen',
                '#id': 'id',
            },
            ExpressionAttributeValues: {
                ':fen': { S: normalizedFen },
                ':id': { S: 'GAME#' },
            },
            ExclusiveStartKey: startKey ? JSON.parse(startKey) : undefined,
            TableName: explorerTable,
        }),
    );

    const games = queryOutput.Items?.map((item) => (unmarshall(item) as ExplorerGame).game);
    const lastEvaluatedKey = JSON.stringify(queryOutput.LastEvaluatedKey);

    return {
        statusCode: 200,
        body: JSON.stringify({
            games,
            lastEvaluatedKey,
        }),
    };
}

/**
 * Parses the masters pagination cursor from the startKey query string parameter.
 * @param startKey The startKey query string parameter.
 * @returns The parsed cursor, or undefined if it is invalid.
 */
function parseMastersCursor(startKey: string): MastersCursor | undefined {
    let parsed: unknown;
    try {
        parsed = JSON.parse(startKey);
    } catch {
        return undefined;
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return undefined;
    }
    for (const [key, value] of Object.entries(parsed)) {
        if (!mastersStreamKeys.includes(key) || typeof value !== 'string') {
            return undefined;
        }
    }
    return parsed as MastersCursor;
}

/**
 * Queries a single page of masters explorer games of the given stream, ordered by game id
 * (which starts with the date).
 * @param normalizedFen The normalized FEN to list games for.
 * @param stream The masters stream key, one of mastersStreamKeys.
 * @param startAfter The explorer item id to start after, or '' to start from the beginning.
 * @param sortDirection The direction to order the games by date.
 */
async function queryMastersStream(
    normalizedFen: string,
    stream: string,
    startAfter: string,
    sortDirection: MastersSortDirection,
): Promise<MastersStreamResult> {
    const [timeControl, kind] = stream.split(':');
    const undated = kind === 'undated';
    const prefix = `GAME#masters-${timeControl}#`;
    // BETWEEN is inclusive, but no id equals the shared bound `${prefix}?` exactly
    // (ids continue with the rest of the date and _uuid). `$` is the character after `#`.
    const lower = undated ? `${prefix}?` : prefix;
    const upper = undated ? `GAME#masters-${timeControl}$` : `${prefix}?`;

    const queryOutput = await dynamo.send(
        new QueryCommand({
            KeyConditionExpression: `#fen = :fen AND #id BETWEEN :lower AND :upper`,
            ExpressionAttributeNames: {
                '#fen': 'normalizedFen',
                '#id': 'id',
            },
            ExpressionAttributeValues: {
                ':fen': { S: normalizedFen },
                ':lower': { S: lower },
                ':upper': { S: upper },
            },
            ExclusiveStartKey: startAfter
                ? { normalizedFen: { S: normalizedFen }, id: { S: startAfter } }
                : undefined,
            ScanIndexForward: sortDirection === 'asc',
            Limit: MASTERS_PAGE_SIZE,
            TableName: mastersTable,
        }),
    );

    return {
        stream,
        undated,
        startAfter,
        items: queryOutput.Items?.map((item) => unmarshall(item) as ExplorerGame) ?? [],
        hasMore: !!queryOutput.LastEvaluatedKey,
    };
}

/**
 * Merges the pages of several masters streams into one page ordered by date. Each stream
 * must be ordered by game id in the given direction and hold at most pageSize items.
 * @param streams The query results for each stream.
 * @param sortDirection The direction to order the games by date.
 * @param pageSize The maximum number of games to return.
 * @returns The merged page of games and the cursor for the next page, if there are more games.
 */
export function mergeMastersPage(
    streams: MastersStreamResult[],
    sortDirection: MastersSortDirection,
    pageSize: number,
): { games: ExplorerGame[]; cursor: MastersCursor | undefined } {
    // Plain comparison (not localeCompare) to match DynamoDB's byte ordering of sort keys.
    const sign = sortDirection === 'asc' ? 1 : -1;
    const sorted = streams
        .flatMap((stream) => stream.items.map((item) => ({ stream, item })))
        .sort((a, b) => {
            if (a.stream.undated !== b.stream.undated) {
                return a.stream.undated ? 1 : -1;
            }
            if (a.item.game.id === b.item.game.id) {
                return 0;
            }
            return a.item.game.id < b.item.game.id ? -sign : sign;
        });
    const page = sorted.slice(0, pageSize);

    const cursor: MastersCursor = {};
    for (const stream of streams) {
        const taken = page.filter((t) => t.stream === stream);
        if (taken.length < stream.items.length || stream.hasMore) {
            cursor[stream.stream] = taken.length
                ? taken[taken.length - 1].item.id
                : stream.startAfter;
        }
    }

    return {
        games: page.map((t) => t.item),
        cursor: Object.keys(cursor).length ? cursor : undefined,
    };
}

function handleError(code: number, err: any): APIGatewayProxyResultV2 {
    console.error(err);

    return {
        statusCode: code,
        isBase64Encoded: false,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(err),
    };
}
