import {
    ConditionalCheckFailedException,
    GetItemCommand,
    PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
    GetTacticsForgerProgressResponse,
    SaveTacticsForgerProgressResponse,
    saveTacticsForgerProgressSchema,
    TacticsForgerLeaderboardRow,
} from '@jackstenglein/chess-dojo-common/src/tacticsTrainer/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseEvent,
    requireUserInfo,
    success,
} from '../directoryService/api';
import { dynamo, USER_TABLE } from '../directoryService/database';
import { packProgress, ProgressTooLargeError, unpackProgress } from './storage';

/** One row per player: the app's whole saved state, gzipped. */
export const tacticsForgerProgressTable = `${process.env.stage}-tactics-trainer-progress`;
/** One row per player: the numbers shown on the leaderboard. */
export const tacticsForgerLeaderboardTable = `${process.env.stage}-tactics-trainer-leaderboard`;

/**
 * Handles GET /tactics-trainer/progress. Returns the caller's saved Tactics Forger
 * progress, or null progress with version 0 when they have never saved.
 * @param event The API Gateway proxy event.
 * @returns The saved progress and its version.
 */
export const getHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const { username } = requireUserInfo(event);
        const output = await dynamo.send(
            new GetItemCommand({
                TableName: tacticsForgerProgressTable,
                Key: { username: { S: username } },
                ConsistentRead: true,
            }),
        );
        const item = output.Item;
        const response: GetTacticsForgerProgressResponse =
            item?.progress?.B && item.version?.N
                ? {
                      progress: unpackProgress(item.progress.B),
                      version: Number(item.version.N),
                      updatedAt: item.updatedAt?.S,
                  }
                : { progress: null, version: 0 };
        return success(response);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Handles PUT /tactics-trainer/progress. Saves the caller's progress if it is based on
 * the latest saved version (409 otherwise, so the app can load, merge and retry), then updates
 * their leaderboard row.
 * @param event The API Gateway proxy event.
 * @returns The new version.
 */
export const saveHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const { username } = requireUserInfo(event);
        const request = parseEvent(event, saveTacticsForgerProgressSchema);

        let packed: Buffer;
        try {
            packed = packProgress(request.progress).packed;
        } catch (err) {
            if (err instanceof ProgressTooLargeError) {
                throw new ApiError({
                    statusCode: 413,
                    publicMessage: 'Tactics Forger progress is too large to save',
                    privateMessage: err.message,
                });
            }
            throw err;
        }

        const version = request.baseVersion + 1;
        const updatedAt = new Date().toISOString();
        try {
            await dynamo.send(
                new PutItemCommand({
                    TableName: tacticsForgerProgressTable,
                    Item: {
                        username: { S: username },
                        progress: { B: packed },
                        version: { N: `${version}` },
                        updatedAt: { S: updatedAt },
                    },
                    ...(request.baseVersion === 0
                        ? { ConditionExpression: 'attribute_not_exists(username)' }
                        : {
                              ConditionExpression: 'version = :base',
                              ExpressionAttributeValues: {
                                  ':base': { N: `${request.baseVersion}` },
                              },
                          }),
                }),
            );
        } catch (err) {
            if (err instanceof ConditionalCheckFailedException) {
                throw new ApiError({
                    statusCode: 409,
                    publicMessage: 'Progress was saved from another device. Reload and try again.',
                });
            }
            throw err;
        }

        const player = await loadPlayer(username);
        const row: TacticsForgerLeaderboardRow = {
            ...request.summary,
            username,
            displayName: player.displayName,
            cohort: player.cohort,
            updatedAt,
        };
        await dynamo.send(
            new PutItemCommand({
                TableName: tacticsForgerLeaderboardTable,
                Item: marshall(row, { removeUndefinedValues: true }),
            }),
        );

        const response: SaveTacticsForgerProgressResponse = { version, updatedAt };
        return success(response);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Loads the display name and cohort shown on the leaderboard. A missing user falls back to the
 * username and no cohort.
 * @param username The player to load.
 * @returns The player's display name and Dojo cohort.
 */
async function loadPlayer(username: string): Promise<{ displayName: string; cohort?: string }> {
    const output = await dynamo.send(
        new GetItemCommand({
            TableName: USER_TABLE,
            Key: { username: { S: username } },
            ProjectionExpression: 'displayName, dojoCohort',
        }),
    );
    const user = output.Item
        ? (unmarshall(output.Item) as { displayName?: string; dojoCohort?: string })
        : {};
    return { displayName: user.displayName?.trim() || username, cohort: user.dojoCohort };
}
