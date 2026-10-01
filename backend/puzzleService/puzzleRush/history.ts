import { GetItemCommand, QueryCommand, QueryCommandInput } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import {
    GetPuzzleRushSessionResponse,
    ListPuzzleRushSessionsResponse,
    PuzzleRushSession,
    getPuzzleRushSessionSchema,
    listPuzzleRushSessionsSchema,
} from '@jackstenglein/chess-dojo-common/src/puzzleRush/api';
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

/**
 * Handles GET /puzzle/rush/history. Returns the calling user's puzzle rush runs,
 * most recent first, with pagination.
 *
 * @param event The API Gateway proxy event.
 * @returns A response containing the runs and the pagination key.
 */
export const listHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        const request = parseEvent(event, listPuzzleRushSessionsSchema);

        const input: QueryCommandInput = {
            KeyConditionExpression: `#username = :username`,
            ExpressionAttributeNames: { '#username': 'username' },
            ExpressionAttributeValues: { ':username': { S: userInfo.username } },
            TableName: puzzleRushResultsTable,
            ScanIndexForward: false,
        };
        if (request.startKey) {
            input.ExclusiveStartKey = JSON.parse(request.startKey);
        }

        const output = await dynamo.send(new QueryCommand(input));
        const response: ListPuzzleRushSessionsResponse = {
            sessions: output.Items?.map((item) => unmarshall(item) as PuzzleRushSession) ?? [],
            lastEvaluatedKey: output.LastEvaluatedKey
                ? JSON.stringify(output.LastEvaluatedKey)
                : undefined,
        };
        return success(response);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Handles GET /puzzle/rush/session/{createdAt}. Returns a single puzzle rush run
 * belonging to the calling user.
 *
 * @param event The API Gateway proxy event.
 * @returns A response containing the run.
 */
export const getHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        const request = parseEvent(event, getPuzzleRushSessionSchema);

        const output = await dynamo.send(
            new GetItemCommand({
                Key: {
                    username: { S: userInfo.username },
                    createdAt: { S: request.createdAt },
                },
                TableName: puzzleRushResultsTable,
            }),
        );
        if (!output.Item) {
            throw new ApiError({
                statusCode: 404,
                publicMessage: 'Puzzle rush session not found',
            });
        }

        const response: GetPuzzleRushSessionResponse = {
            session: unmarshall(output.Item) as PuzzleRushSession,
        };
        return success(response);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
