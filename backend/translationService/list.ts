'use strict';

import { QueryCommand, QueryCommandInput } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
    ListTranslationsRequest,
    ListTranslationsRequestSchema,
} from '@jackstenglein/chess-dojo-common/src/translation/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseEvent,
    success,
} from '../directoryService/api';
import { dynamo, translationsTable } from './database';

/**
 * Handles requests to list translations for a given locale and content type.
 * Returns translations sorted by content key. Supports pagination via startKey.
 * This is a public endpoint (no auth required) so unauthenticated visitors can
 * see translated content.
 * @param event The API Gateway event.
 * @returns The list of translations and an optional pagination token.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);

        const request = parseEvent(event, ListTranslationsRequestSchema);
        const result = await listTranslations(request);
        return success(result);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Lists translations for the given locale and content type.
 * @param request The list request (locale, contentType, optional startKey).
 * @returns The list of translations and an optional pagination token.
 */
async function listTranslations(
    request: ListTranslationsRequest,
): Promise<{ translations: Record<string, unknown>[]; lastEvaluatedKey?: string }> {
    const input: QueryCommandInput = {
        TableName: translationsTable,
        KeyConditionExpression: '#locale = :locale AND begins_with(#contentKey, :prefix)',
        ExpressionAttributeNames: {
            '#locale': 'locale',
            '#contentKey': 'contentKey',
        },
        ExpressionAttributeValues: {
            ':locale': { S: request.locale },
            ':prefix': { S: request.contentType + '#' },
        },
    };

    if (request.limit) {
        input.Limit = request.limit;
    }

    if (request.startKey) {
        try {
            input.ExclusiveStartKey = marshall(JSON.parse(request.startKey));
        } catch (err) {
            throw new ApiError({
                statusCode: 400,
                publicMessage: 'Invalid request: startKey is not valid',
                privateMessage: 'startKey could not be unmarshaled',
                cause: err,
            });
        }
    }

    const output = await dynamo.send(new QueryCommand(input));
    const translations = (output.Items?.map((item) => unmarshall(item)) ?? []) as Record<
        string,
        unknown
    >[];
    const lastEvaluatedKey = output.LastEvaluatedKey
        ? JSON.stringify(unmarshall(output.LastEvaluatedKey))
        : undefined;

    return { translations, lastEvaluatedKey };
}
