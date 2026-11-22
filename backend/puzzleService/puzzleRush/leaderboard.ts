import {
    AttributeValue,
    BatchGetItemCommand,
    ConditionalCheckFailedException,
    GetItemCommand,
    PutItemCommand,
    QueryCommand,
    ScanCommand,
    UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
    GetPuzzleRushLeaderboardResponse,
    PuzzleRushLeaderboardRow,
} from '@jackstenglein/chess-dojo-common/src/puzzles/rush/api';
import {
    comparePuzzleRushLeaderboardRows,
    puzzleRushCohort,
    PuzzleRushLeaderboardPlayer,
    puzzleRushLeaderboardWrites,
} from '@jackstenglein/chess-dojo-common/src/puzzles/rush/leaderboard';
import {
    puzzleRushUtcMonth,
    summarizePuzzleRushRuns,
} from '@jackstenglein/chess-dojo-common/src/puzzles/rush/summary';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { errToApiGatewayProxyResultV2, requireUserInfo, success } from '../../directoryService/api';
import { dynamo, USER_TABLE } from '../../directoryService/database';
import { listPuzzleRushScores } from './summary';

const puzzleRushResultsTable = `${process.env.stage}-puzzle-rush-results`;
/** DynamoDB table of one row per player per leaderboard window. */
export const puzzleRushLeaderboardTable = `${process.env.stage}-puzzle-rush-leaderboard`;

const BACKFILL_PERIOD = 'meta';
const BACKFILL_USERNAME = '__puzzle_rush_backfill';
const BACKFILL_PAGE_SIZE = 40;
const BACKFILL_DEADLINE_MS = 15_000;

interface BackfillState {
    done: boolean;
    startKeyJson?: string;
    startKey?: Record<string, AttributeValue>;
}

/**
 * Handles GET /puzzle/rush/leaderboard. Returns every player's all-time and current-month
 * puzzle rush score, plus how many runs they have completed in that window. Each row includes
 * the player's current Dojo cohort so the client can show an overall board and one board per cohort.
 * Runs saved before this table existed are added a page at a time until `complete` is true.
 *
 * @param event The API Gateway proxy event.
 * @returns The all-time and monthly leaderboards.
 */
export const getHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        const month = puzzleRushUtcMonth(new Date());
        const deadline = Date.now() + BACKFILL_DEADLINE_MS;

        let complete = false;
        while (!complete && Date.now() < deadline) {
            complete = await advanceBackfill(month);
        }
        await refreshPuzzleRushLeaderboardPlayer(userInfo.username, month);

        const [allTime, monthly] = await Promise.all([listPeriod('allTime'), listPeriod(month)]);
        const response: GetPuzzleRushLeaderboardResponse = {
            month,
            allTime: allTime.sort(comparePuzzleRushLeaderboardRows),
            monthly: monthly.sort(comparePuzzleRushLeaderboardRows),
            complete,
        };
        return success(response);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Loads the display name and cohort stored for a player.
 * A missing user falls back to the username and no cohort.
 * @param username The player to load.
 * @returns The name and cohort to show on the leaderboard.
 */
export async function loadPuzzleRushPlayer(username: string): Promise<PuzzleRushLeaderboardPlayer> {
    const output = await dynamo.send(
        new GetItemCommand({
            TableName: USER_TABLE,
            Key: { username: { S: username } },
            ProjectionExpression: 'displayName, dojoCohort',
        }),
    );
    if (!output.Item) {
        return { displayName: username };
    }
    const user = unmarshall(output.Item) as { displayName?: string; dojoCohort?: string };
    const displayName = user.displayName?.trim();
    return {
        displayName: displayName || username,
        cohort: user.dojoCohort,
    };
}

/**
 * Updates the caller's name and cohort on the boards without changing their score.
 * Opening the leaderboard after a graduation or rename moves the caller immediately.
 * @param username The player whose rows to refresh.
 * @param month The current UTC month, `YYYY-MM`.
 */
async function refreshPuzzleRushLeaderboardPlayer(username: string, month: string): Promise<void> {
    const player = await loadPuzzleRushPlayer(username);
    const cohort = puzzleRushCohort(player.cohort);
    for (const period of ['allTime', month]) {
        await updatePlayerProfile(period, username, player.displayName ?? username, cohort);
    }
}

/**
 * Scans one page of saved runs and adds any player who is not on the leaderboard yet.
 * The cursor moves forward only when this worker still owns it, so two readers cannot
 * rewind the scan or double-count a player.
 * @param month The current UTC month. Monthly rows are written only for this month.
 * @returns True when every saved run has been considered.
 */
async function advanceBackfill(month: string): Promise<boolean> {
    const state = await loadBackfillState();
    if (state.done) {
        return true;
    }

    const output = await dynamo.send(
        new ScanCommand({
            TableName: puzzleRushResultsTable,
            ProjectionExpression: 'username',
            Limit: BACKFILL_PAGE_SIZE,
            ExclusiveStartKey: state.startKey,
        }),
    );
    const usernames = [
        ...new Set(
            (output.Items ?? [])
                .map((item) => unmarshall(item).username)
                .filter(
                    (username): username is string =>
                        typeof username === 'string' && username.length > 0,
                ),
        ),
    ];
    const existing = await loadExistingUsernames(usernames);
    await mapPool(
        usernames.filter((username) => !existing.has(username)),
        4,
        (username) => ensurePlayer(username, month),
    );

    const finished = output.LastEvaluatedKey === undefined;
    const saved = await saveBackfillState(state.startKeyJson, {
        done: finished,
        startKey: finished ? undefined : output.LastEvaluatedKey,
    });
    if (!saved) {
        return (await loadBackfillState()).done;
    }
    return finished;
}

/**
 * Builds leaderboard rows from a player's saved runs and inserts them if a submit
 * has not already written the row.
 * @param username The player to add.
 * @param month The current UTC month. Older monthly rows are not written.
 */
async function ensurePlayer(username: string, month: string): Promise<void> {
    let summary: ReturnType<typeof summarizePuzzleRushRuns>;
    try {
        summary = summarizePuzzleRushRuns(username, await listPuzzleRushScores(username), 'UTC');
    } catch (err) {
        console.log('Skipping puzzle rush leaderboard backfill for %s: %s', username, err);
        return;
    }
    if (!summary) {
        return;
    }

    const player = await loadPuzzleRushPlayer(username);
    for (const write of puzzleRushLeaderboardWrites(summary, player)) {
        if (write.period !== 'allTime' && write.period !== month) {
            continue;
        }
        await putIfMissing(write.period, write.row);
    }
}

/**
 * Inserts a leaderboard row when the player does not already have one.
 * A submit that landed first keeps its score.
 * @param period The board key: `allTime` or a UTC month.
 * @param row The row to insert.
 */
async function putIfMissing(period: string, row: PuzzleRushLeaderboardRow): Promise<void> {
    try {
        await dynamo.send(
            new PutItemCommand({
                TableName: puzzleRushLeaderboardTable,
                Item: marshall({ ...row, period }, { removeUndefinedValues: true }),
                ConditionExpression: 'attribute_not_exists(username)',
            }),
        );
    } catch (err) {
        if (err instanceof ConditionalCheckFailedException) {
            return;
        }
        throw err;
    }
}

/**
 * Lists every player on one board.
 * @param period The board key: `allTime` or a UTC month.
 * @returns The rows, in DynamoDB key order.
 */
async function listPeriod(period: string): Promise<PuzzleRushLeaderboardRow[]> {
    const rows: PuzzleRushLeaderboardRow[] = [];
    let startKey: Record<string, AttributeValue> | undefined;

    do {
        const output = await dynamo.send(
            new QueryCommand({
                TableName: puzzleRushLeaderboardTable,
                KeyConditionExpression: '#period = :period',
                ExpressionAttributeNames: { '#period': 'period' },
                ExpressionAttributeValues: { ':period': { S: period } },
                ExclusiveStartKey: startKey,
            }),
        );
        for (const item of output.Items ?? []) {
            const row = unmarshall(item) as PuzzleRushLeaderboardRow;
            if (!row.username || typeof row.score !== 'number' || typeof row.runs !== 'number') {
                continue;
            }
            rows.push({
                username: row.username,
                displayName: row.displayName || row.username,
                ...(row.cohort ? { cohort: row.cohort } : {}),
                score: row.score,
                runs: row.runs,
                sessionCreatedAt: row.sessionCreatedAt,
            });
        }
        startKey = output.LastEvaluatedKey;
    } while (startKey);

    return rows;
}

/**
 * Returns the usernames that already have an all-time leaderboard row.
 * @param usernames The players to check.
 * @returns The subset that is already on the board.
 */
async function loadExistingUsernames(usernames: string[]): Promise<Set<string>> {
    const found = new Set<string>();
    let pending = usernames.map((username) => ({
        period: { S: 'allTime' },
        username: { S: username },
    }));

    for (let attempt = 0; pending.length > 0 && attempt < 5; attempt++) {
        const output = await dynamo.send(
            new BatchGetItemCommand({
                RequestItems: {
                    [puzzleRushLeaderboardTable]: {
                        Keys: pending.slice(0, 100),
                        ProjectionExpression: 'username',
                    },
                },
            }),
        );
        for (const item of output.Responses?.[puzzleRushLeaderboardTable] ?? []) {
            const username = item.username?.S;
            if (username) {
                found.add(username);
            }
        }
        const unprocessed = output.UnprocessedKeys?.[puzzleRushLeaderboardTable]?.Keys ?? [];
        pending = [...unprocessed, ...pending.slice(100)];
    }
    if (pending.length > 0) {
        throw new Error('Puzzle rush leaderboard batch get did not finish');
    }
    return found;
}

/**
 * Reads the backfill cursor.
 * @returns Whether the scan has finished and the key to resume from.
 */
async function loadBackfillState(): Promise<BackfillState> {
    const output = await dynamo.send(
        new GetItemCommand({
            TableName: puzzleRushLeaderboardTable,
            Key: {
                period: { S: BACKFILL_PERIOD },
                username: { S: BACKFILL_USERNAME },
            },
            ConsistentRead: true,
        }),
    );
    if (!output.Item) {
        return { done: false };
    }
    const item = unmarshall(output.Item) as { done?: boolean; startKeyJson?: string };
    return {
        done: item.done === true,
        startKeyJson: item.startKeyJson,
        startKey: parseStartKey(item.startKeyJson),
    };
}

/**
 * Advances the backfill cursor when it still has the value this worker read.
 * @param expectedJson The cursor this worker started from. Undefined on the first page.
 * @param next The cursor to store after this page.
 * @returns True when this worker's cursor was saved.
 */
async function saveBackfillState(
    expectedJson: string | undefined,
    next: { done: boolean; startKey?: Record<string, AttributeValue> },
): Promise<boolean> {
    const startKeyJson = next.startKey ? JSON.stringify(next.startKey) : undefined;
    const item = marshall(
        {
            period: BACKFILL_PERIOD,
            username: BACKFILL_USERNAME,
            done: next.done,
            startKeyJson,
        },
        { removeUndefinedValues: true },
    );
    const values: Record<string, AttributeValue> = { ':true': { BOOL: true } };
    let condition =
        'attribute_not_exists(username) OR (attribute_not_exists(startKeyJson) AND done <> :true)';
    if (expectedJson !== undefined) {
        condition = 'startKeyJson = :expected AND done <> :true';
        values[':expected'] = { S: expectedJson };
    }

    try {
        await dynamo.send(
            new PutItemCommand({
                TableName: puzzleRushLeaderboardTable,
                Item: item,
                ConditionExpression: condition,
                ExpressionAttributeValues: values,
            }),
        );
        return true;
    } catch (err) {
        if (err instanceof ConditionalCheckFailedException) {
            return false;
        }
        throw err;
    }
}

/**
 * Sets the name and cohort on an existing leaderboard row.
 * @param period The board key.
 * @param username The player to update.
 * @param displayName The name to show.
 * @param cohort The Dojo cohort, or undefined to remove one.
 */
async function updatePlayerProfile(
    period: string,
    username: string,
    displayName: string,
    cohort: string | undefined,
): Promise<void> {
    const values: Record<string, AttributeValue> = { ':displayName': { S: displayName } };
    if (cohort) {
        values[':cohort'] = { S: cohort };
    }
    try {
        await dynamo.send(
            new UpdateItemCommand({
                TableName: puzzleRushLeaderboardTable,
                Key: { period: { S: period }, username: { S: username } },
                UpdateExpression: cohort
                    ? 'SET displayName = :displayName, cohort = :cohort'
                    : 'SET displayName = :displayName REMOVE cohort',
                ConditionExpression: 'attribute_exists(username)',
                ExpressionAttributeValues: values,
            }),
        );
    } catch (err) {
        if (err instanceof ConditionalCheckFailedException) {
            return;
        }
        throw err;
    }
}

/**
 * Parses a stored scan cursor.
 * A corrupt cursor starts the scan over. Inserts are conditional, so a restart does not
 * duplicate players.
 * @param value The JSON cursor stored on the backfill item.
 * @returns The DynamoDB start key, or undefined when the scan should start at the beginning.
 */
function parseStartKey(value: unknown): Record<string, AttributeValue> | undefined {
    if (typeof value !== 'string' || value.length === 0) {
        return undefined;
    }
    try {
        const parsed: unknown = JSON.parse(value);
        if (!parsed || typeof parsed !== 'object') {
            return undefined;
        }
        return parsed as Record<string, AttributeValue>;
    } catch {
        return undefined;
    }
}

/**
 * Runs `worker` over `items` with at most `limit` workers at once.
 * @param items The items to process.
 * @param limit The maximum number of workers.
 * @param worker The work for one item.
 */
async function mapPool<T>(
    items: T[],
    limit: number,
    worker: (item: T) => Promise<void>,
): Promise<void> {
    if (items.length === 0) {
        return;
    }
    let next = 0;
    const run = async () => {
        while (next < items.length) {
            const item = items[next];
            next += 1;
            if (item !== undefined) {
                await worker(item);
            }
        }
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
}
