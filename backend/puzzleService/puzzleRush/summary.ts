import {
    ConditionalCheckFailedException,
    GetItemCommand,
    PutItemCommand,
    QueryCommand,
    QueryCommandInput,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
    GetPuzzleRushSummaryResponse,
    getPuzzleRushSummarySchema,
} from '@jackstenglein/chess-dojo-common/src/puzzles/rush/api';
import {
    PuzzleRushSummaryRecord,
    PuzzleRushSummaryRun,
    isValidTimeZone,
    puzzleRushPeriods,
    summarizePuzzleRushRuns,
    visiblePuzzleRushBests,
} from '@jackstenglein/chess-dojo-common/src/puzzles/rush/summary';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseEvent,
    requireUserInfo,
    success,
} from '../../directoryService/api';
import { dynamo } from '../../directoryService/database';

const puzzleRushResultsTable = `${process.env.stage}-puzzle-rush-results`;
const puzzleRushSummariesTable = `${process.env.stage}-puzzle-rush-summaries`;

/**
 * Handles GET /puzzle/rush/summary. Returns the calling user's current puzzle rush
 * bests. Week and day bests from a previous period are omitted.
 *
 * @param event The API Gateway proxy event.
 * @returns The player's all-time, weekly, and daily best solved-puzzle counts.
 */
export const getHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        const request = parseEvent(event, getPuzzleRushSummarySchema);
        const timeZone = requireTimeZone(request.timeZone);

        let summary = await loadPuzzleRushSummary(userInfo.username);
        if (!summary) {
            summary = await createSummaryFromHistory(userInfo.username, timeZone);
        }
        const response: GetPuzzleRushSummaryResponse = {
            bests: visiblePuzzleRushBests(summary, puzzleRushPeriods(new Date(), timeZone)),
        };
        return success(response);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Loads the player's puzzle rush summary.
 * @param username The player whose summary to load.
 * @returns The summary, or undefined when the player has no saved runs.
 */
export async function loadPuzzleRushSummary(
    username: string,
): Promise<PuzzleRushSummaryRecord | undefined> {
    const output = await dynamo.send(
        new GetItemCommand({
            TableName: puzzleRushSummariesTable,
            Key: { username: { S: username } },
            ConsistentRead: true,
        }),
    );
    if (!output.Item) {
        return undefined;
    }

    const summary = unmarshall(output.Item) as PuzzleRushSummaryRecord;
    summary.allTimeCounts = summary.allTimeCounts ?? {};
    summary.version = summary.version ?? 0;
    return summary;
}

/**
 * Lists the solved-puzzle count of each saved run, oldest first.
 * @param username The player whose runs to list.
 * @returns The score and timestamp of each run that has a solved-puzzle count.
 */
export async function listPuzzleRushScores(username: string): Promise<PuzzleRushSummaryRun[]> {
    const runs: PuzzleRushSummaryRun[] = [];
    let startKey: QueryCommandInput['ExclusiveStartKey'];

    do {
        const output = await dynamo.send(
            new QueryCommand({
                TableName: puzzleRushResultsTable,
                KeyConditionExpression: '#username = :username',
                ExpressionAttributeNames: { '#username': 'username' },
                ExpressionAttributeValues: { ':username': { S: username } },
                ProjectionExpression: 'createdAt, correctCount',
                ExclusiveStartKey: startKey,
                ScanIndexForward: true,
            }),
        );
        for (const item of output.Items ?? []) {
            const run = unmarshall(item) as { createdAt?: string; correctCount?: number };
            if (run.createdAt && typeof run.correctCount === 'number') {
                runs.push({ score: run.correctCount, createdAt: run.createdAt });
            }
        }
        startKey = output.LastEvaluatedKey;
    } while (startKey);

    return runs;
}

/**
 * Builds and stores a summary from runs saved before summaries existed.
 * @param username The player whose runs to summarize.
 * @param timeZone IANA timezone used to place each run on a day and week.
 * @returns The stored summary, or undefined when the player has no runs.
 */
async function createSummaryFromHistory(
    username: string,
    timeZone: string,
): Promise<PuzzleRushSummaryRecord | undefined> {
    const summary = summarizePuzzleRushRuns(
        username,
        await listPuzzleRushScores(username),
        timeZone,
    );
    if (!summary) {
        return undefined;
    }

    try {
        await dynamo.send(
            new PutItemCommand({
                TableName: puzzleRushSummariesTable,
                Item: marshall(summary, { removeUndefinedValues: true }),
                ConditionExpression: 'attribute_not_exists(username)',
            }),
        );
        return summary;
    } catch (err) {
        if (err instanceof ConditionalCheckFailedException) {
            return loadPuzzleRushSummary(username);
        }
        throw err;
    }
}

/**
 * Returns `timeZone` when it is a known IANA timezone.
 * @param timeZone The timezone from the request.
 * @returns The same timezone.
 */
export function requireTimeZone(timeZone: string): string {
    if (!isValidTimeZone(timeZone)) {
        throw new ApiError({
            statusCode: 400,
            publicMessage: 'Invalid request: timeZone is invalid',
        });
    }
    return timeZone;
}
