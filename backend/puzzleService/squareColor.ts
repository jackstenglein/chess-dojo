import { ConditionalCheckFailedException, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import {
    SquareColorSessionResult,
    SubmitSquareColorSessionResponse,
    submitSquareColorSessionSchema,
} from '@jackstenglein/chess-dojo-common/src/squareColors/api';
import {
    computeSquareColorRating,
    MIN_QUESTIONS_FOR_RATING,
} from '@jackstenglein/chess-dojo-common/src/squareColors/rating';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    errToApiGatewayProxyResultV2,
    parseBody,
    requireUserInfo,
    success,
} from '../directoryService/api';
import {
    UpdateItemBuilder,
    attributeNotExists,
    dynamo,
    lessThan,
    or,
} from '../directoryService/database';

const squareColorResultsTable = `${process.env.stage}-square-color-results`;
const usersTable = `${process.env.stage}-users`;

/**
 * Handles submission of a square color drill session. Saves the session result
 * and, if enough questions were answered, computes a rating and conditionally
 * updates the user's best rating.
 *
 * @param event - The API Gateway proxy event.
 * @returns A response containing the computed rating if applicable, or an empty object.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        const request = parseBody(event, submitSquareColorSessionSchema);

        const result: SquareColorSessionResult = {
            ...request,
            username: userInfo.username,
            createdAt: request.createdAt ?? new Date().toISOString(),
        };

        const response: SubmitSquareColorSessionResponse = {};

        if (request.totalQuestions >= MIN_QUESTIONS_FOR_RATING) {
            const accuracy =
                (request.correctCount / request.totalQuestions) * 100;
            const rating = computeSquareColorRating(
                accuracy,
                request.avgResponseTimeMs,
            );
            result.rating = rating;
            response.rating = rating;
        }

        await dynamo.send(
            new PutItemCommand({
                TableName: squareColorResultsTable,
                Item: marshall(result, { removeUndefinedValues: true }),
            }),
        );

        if (response.rating !== undefined && request.isFinal) {
            try {
                const builder = new UpdateItemBuilder()
                    .key('username', userInfo.username)
                    .table(usersTable)
                    .set('squareColorRating', response.rating)
                    .condition(
                        or(
                            attributeNotExists('squareColorRating'),
                            lessThan('squareColorRating', response.rating),
                        ),
                    );
                await builder.send();
            } catch (err) {
                if (!(err instanceof ConditionalCheckFailedException)) {
                    throw err;
                }

            }
        }

        return success(response);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
