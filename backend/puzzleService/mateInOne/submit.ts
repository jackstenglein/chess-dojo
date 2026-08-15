import { ConditionalCheckFailedException, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import {
    MateInOneSessionResult,
    SubmitMateInOneSessionResponse,
    submitMateInOneSessionSchema,
} from '@jackstenglein/chess-dojo-common/src/mateInOne/api';
import {
    PUZZLES_PER_BLOCK,
    computeMateInOneRating,
} from '@jackstenglein/chess-dojo-common/src/mateInOne/rating';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    errToApiGatewayProxyResultV2,
    parseBody,
    requireUserInfo,
    success,
} from '../../directoryService/api';
import {
    UpdateItemBuilder,
    attributeNotExists,
    dynamo,
    lessThan,
    or,
} from '../../directoryService/database';

const mateInOneResultsTable = `${process.env.stage}-mate-in-one-results`;
const usersTable = `${process.env.stage}-users`;

/**
 * Handles POST /puzzle/mate-in-one/session.
 *
 * Validates and persists a mate-in-one drill block result to DynamoDB. When the
 * submission represents a complete 10-puzzle block, computes the server-side
 * rating and conditionally updates the user's best-ever mate-in-one rating only
 * if the new rating exceeds the previous PR. Partial-block submissions (aborts)
 * are persisted without a rating and do not touch the user record.
 *
 * @param event - The API Gateway proxy event.
 * @returns A response with the computed rating on full blocks, otherwise empty.
 */
export const submitSessionHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        const request = parseBody(event, submitMateInOneSessionSchema);

        const correctCount = request.attempts.filter((a) => a.isCorrect).length;
        const isFullBlock = request.attempts.length === PUZZLES_PER_BLOCK;

        const result: MateInOneSessionResult = {
            ...request,
            username: userInfo.username,
            createdAt: request.createdAt ?? new Date().toISOString(),
        };

        const response: SubmitMateInOneSessionResponse = {};

        if (isFullBlock) {
            const rating = computeMateInOneRating(correctCount, request.totalTimeSeconds);
            result.rating = rating;
            response.rating = rating;
        }

        await dynamo.send(
            new PutItemCommand({
                TableName: mateInOneResultsTable,
                Item: marshall(result, { removeUndefinedValues: true }),
            }),
        );

        if (isFullBlock && response.rating !== undefined) {
            try {
                const builder = new UpdateItemBuilder()
                    .key('username', userInfo.username)
                    .table(usersTable)
                    .set('mateInOneRating', response.rating)
                    .condition(
                        or(
                            attributeNotExists('mateInOneRating'),
                            lessThan('mateInOneRating', response.rating),
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
