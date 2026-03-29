import { PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import {
    SquareColorSessionResult,
    submitSquareColorSessionSchema,
} from '@jackstenglein/chess-dojo-common/src/squareColors/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { errToApiGatewayProxyResultV2, parseBody, requireUserInfo, success } from '../directoryService/api';
import { dynamo } from '../directoryService/database';

const squareColorResultsTable = `${process.env.stage}-square-color-results`;

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

        await dynamo.send(
            new PutItemCommand({
                TableName: squareColorResultsTable,
                Item: marshall(result, { removeUndefinedValues: true }),
            }),
        );

        return success({ message: 'Session saved' });
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
