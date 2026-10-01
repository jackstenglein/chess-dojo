import { PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import {
    PuzzleRushSession,
    SubmitPuzzleRushSessionResponse,
    submitPuzzleRushSessionSchema,
} from '@jackstenglein/chess-dojo-common/src/puzzleRush/api';
import { computePuzzleRushStats } from '@jackstenglein/chess-dojo-common/src/puzzleRush/rating';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    errToApiGatewayProxyResultV2,
    parseBody,
    requireUserInfo,
    success,
} from '../../directoryService/api';
import { dynamo } from '../../directoryService/database';

const puzzleRushResultsTable = `${process.env.stage}-puzzle-rush-results`;

/**
 * Handles POST /puzzle/rush/session. Validates a completed puzzle rush run,
 * computes its statistics server-side and persists it to DynamoDB. Puzzle rush
 * runs are unrated, so the user record is not modified.
 *
 * @param event The API Gateway proxy event.
 * @returns A response containing the saved run.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        const request = parseBody(event, submitPuzzleRushSessionSchema);

        const session: PuzzleRushSession = {
            ...request,
            ...computePuzzleRushStats(request.attempts),
            username: userInfo.username,
            createdAt: request.createdAt ?? new Date().toISOString(),
        };

        await dynamo.send(
            new PutItemCommand({
                TableName: puzzleRushResultsTable,
                Item: marshall(session, { removeUndefinedValues: true }),
            }),
        );

        const response: SubmitPuzzleRushSessionResponse = { session };
        return success(response);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
