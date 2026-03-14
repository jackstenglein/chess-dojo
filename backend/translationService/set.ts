'use strict';

import { PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { SetTranslationRequestSchema } from '@jackstenglein/chess-dojo-common/src/translation/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseBody,
    requireUserInfo,
    success,
} from '../directoryService/api';
import { dynamo, getUser, translationsTable } from './database';

/**
 * Handles requests to create or update a translation.
 * The caller must be an admin. Sets updatedAt and updatedBy automatically.
 * @param event The API Gateway event.
 * @returns The saved translation object.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);

        const userInfo = requireUserInfo(event);
        const user = await getUser(userInfo.username);
        if (!user.isAdmin) {
            throw new ApiError({
                statusCode: 403,
                publicMessage: 'You must be an admin to set translations',
            });
        }

        const request = parseBody(event, SetTranslationRequestSchema);
        const translation = {
            ...request,
            updatedAt: new Date().toISOString(),
            updatedBy: userInfo.username,
        };

        await dynamo.send(
            new PutItemCommand({
                TableName: translationsTable,
                Item: marshall(translation, { removeUndefinedValues: true }),
            }),
        );

        return success(translation);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
