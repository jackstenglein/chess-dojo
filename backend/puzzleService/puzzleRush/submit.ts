import { TransactionCanceledException, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import {
    PuzzleRushSession,
    PuzzleRushStanding,
    SubmitPuzzleRushSessionResponse,
    submitPuzzleRushSessionSchema,
} from '@jackstenglein/chess-dojo-common/src/puzzles/rush/api';
import { computePuzzleRushStats } from '@jackstenglein/chess-dojo-common/src/puzzles/rush/rating';
import {
    applyPuzzleRushSummary,
    puzzleRushPeriods,
    puzzleRushStanding,
    PuzzleRushSummaryRecord,
    PuzzleRushSummaryUpdate,
    summarizePuzzleRushRuns,
} from '@jackstenglein/chess-dojo-common/src/puzzles/rush/summary';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseBody,
    requireUserInfo,
    success,
} from '../../directoryService/api';
import { dynamo } from '../../directoryService/database';
import { listPuzzleRushScores, loadPuzzleRushSummary, requireTimeZone } from './summary';

const puzzleRushResultsTable = `${process.env.stage}-puzzle-rush-results`;
const puzzleRushSummariesTable = `${process.env.stage}-puzzle-rush-summaries`;

/** How many times to retry a summary write that lost an optimistic-concurrency race. */
const MAX_SUMMARY_ATTEMPTS = 5;

/**
 * Handles POST /puzzle/rush/session. Validates a completed puzzle rush run,
 * computes its statistics server-side, and persists the run. The player's summary
 * is updated in the same transaction: best solved-puzzle counts for all time, this
 * week, and today, plus the counts used to rank the run among the player's own runs.
 *
 * @param event The API Gateway proxy event.
 * @returns The saved run and its standing among the player's runs.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        const request = parseBody(event, submitPuzzleRushSessionSchema);
        const timeZone = requireTimeZone(request.timeZone);

        const session: PuzzleRushSession = {
            ...request,
            ...computePuzzleRushStats(request.attempts),
            username: userInfo.username,
            createdAt: request.createdAt ?? new Date().toISOString(),
        };
        const periods = puzzleRushPeriods(new Date(session.createdAt), timeZone);
        const update: PuzzleRushSummaryUpdate = {
            username: userInfo.username,
            score: session.correctCount,
            createdAt: session.createdAt,
            day: periods.day,
            week: periods.week,
        };

        const standing = await saveSession(session, update, timeZone);
        const response: SubmitPuzzleRushSessionResponse = { session, standing };
        return success(response);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Saves the run and folds it into the player's summary.
 * A retry of a run that was already saved returns the standing without counting it twice.
 * @param session The run to save.
 * @param update The score and calendar period used to update the summary.
 * @param timeZone IANA timezone used to place saved runs when building the first summary.
 * @returns The run's standing after the summary includes it.
 */
async function saveSession(
    session: PuzzleRushSession,
    update: PuzzleRushSummaryUpdate,
    timeZone: string,
): Promise<PuzzleRushStanding> {
    for (let attempt = 1; attempt <= MAX_SUMMARY_ATTEMPTS; attempt++) {
        const stored = await loadPuzzleRushSummary(update.username);
        const current = stored ?? (await backfillSummary(update, timeZone));
        const { summary, standing } = applyPuzzleRushSummary(current, update);

        try {
            await dynamo.send(
                new TransactWriteItemsCommand({
                    TransactItems: [
                        {
                            Put: {
                                TableName: puzzleRushResultsTable,
                                Item: marshall(session, { removeUndefinedValues: true }),
                                ConditionExpression: 'attribute_not_exists(createdAt)',
                            },
                        },
                        {
                            Put: {
                                TableName: puzzleRushSummariesTable,
                                Item: marshall(summary, { removeUndefinedValues: true }),
                                ...summaryCondition(stored),
                            },
                        },
                    ],
                }),
            );
            return standing;
        } catch (err) {
            const codes = cancellationCodes(err);
            if (codes === undefined) {
                throw err;
            }
            if (codes[0] === 'ConditionalCheckFailed') {
                const saved = await loadPuzzleRushSummary(update.username);
                return puzzleRushStanding(saved, update);
            }
            if (codes[1] === 'ConditionalCheckFailed' && attempt < MAX_SUMMARY_ATTEMPTS) {
                console.log('Puzzle rush summary conflict for %s, retrying', update.username);
                continue;
            }
            throw err;
        }
    }

    throw new ApiError({
        statusCode: 500,
        publicMessage: 'Temporary server error',
        privateMessage: 'Exhausted puzzle rush summary retries',
    });
}

/**
 * Builds a summary from runs saved before summaries existed.
 * The run being saved is omitted so the caller can add it once.
 * @param update The run about to be saved.
 * @param timeZone IANA timezone used to place each saved run.
 * @returns A summary of the earlier runs, or undefined when the player has none.
 */
async function backfillSummary(
    update: PuzzleRushSummaryUpdate,
    timeZone: string,
): Promise<PuzzleRushSummaryRecord | undefined> {
    const runs = (await listPuzzleRushScores(update.username)).filter(
        (run) => run.createdAt !== update.createdAt,
    );
    return summarizePuzzleRushRuns(update.username, runs, timeZone);
}

/**
 * Returns the condition that makes a summary write fail when another run landed first.
 * @param current The summary read before this write. Undefined for the player's first run.
 * @returns The condition expression for the summary put.
 */
function summaryCondition(current: PuzzleRushSummaryRecord | undefined): {
    ConditionExpression: string;
    ExpressionAttributeValues?: Record<string, { N: string }>;
} {
    if (!current) {
        return { ConditionExpression: 'attribute_not_exists(username)' };
    }
    return {
        ConditionExpression: 'version = :version',
        ExpressionAttributeValues: { ':version': { N: String(current.version) } },
    };
}

/**
 * Returns the cancellation codes from a failed DynamoDB transaction.
 * @param err The error thrown by the transaction.
 * @returns The reason code for each transaction item, or undefined when `err` is not a cancellation.
 */
function cancellationCodes(err: unknown): string[] | undefined {
    if (!(err instanceof TransactionCanceledException)) {
        return undefined;
    }
    return (err.CancellationReasons ?? []).map((reason) => reason.Code ?? '');
}
