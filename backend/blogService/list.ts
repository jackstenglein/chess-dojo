'use strict';

import { QueryCommand, QueryCommandInput } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
    Blog,
    BlogStatuses,
    DOJO_BLOG_OWNER,
    ListBlogsRequest,
    listBlogsRequestSchema,
} from '@jackstenglein/chess-dojo-common/src/blog/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    errToApiGatewayProxyResultV2,
    getUserInfo,
    parseEvent,
    success,
} from '../directoryService/api';
import { blogTable, dynamo, getUser } from './database';

const GSI_NAME = 'OwnerDateIndex';

/**
 * Handles requests to list blog posts by owner in descending order of date.
 * Returns blogs sorted by date (newest first). If the caller is not authenticated,
 * only published blogs are returned. If the caller is authenticated and is the owner,
 * all blogs are returned. If the caller is authenticated and is not the owner, only
 * published blogs are returned.
 * @param event The API Gateway event.
 * @returns The list of blogs and an optional pagination token.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);

        const request = parseEvent(event, listBlogsRequestSchema);
        const userInfo = getUserInfo(event);

        let includeDrafts = userInfo.username === request.owner;
        if (!includeDrafts && userInfo.username && request.owner === DOJO_BLOG_OWNER) {
            const user = await getUser(userInfo.username);
            if (user.isAdmin) {
                includeDrafts = true;
            }
        }

        const result = await listBlogs(request, includeDrafts);
        return success(result);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Lists blog posts for the given owner, sorted by date descending.
 * @param request The list request (owner, optional limit, optional startKey).
 * @param includeDrafts Whether to include draft blogs in the result.
 * @returns The list of blogs and an optional pagination token.
 */
export async function listBlogs(
    request: ListBlogsRequest,
    includeDrafts: boolean,
): Promise<{ blogs: Blog[]; lastEvaluatedKey?: string }> {
    const input: QueryCommandInput = {
        TableName: blogTable,
        IndexName: GSI_NAME,
        KeyConditionExpression: '#owner = :owner',
        ExpressionAttributeNames: { '#owner': 'owner' },
        ExpressionAttributeValues: { ':owner': { S: request.owner } },
        ScanIndexForward: false,
    };

    if (!includeDrafts) {
        input.FilterExpression = '#status = :published';
        input.ExpressionAttributeValues![':published'] = { S: BlogStatuses.PUBLISHED };
        input.ExpressionAttributeNames!['#status'] = 'status';
    }

    if (request.limit) {
        input.Limit = request.limit;
    }

    if (request.startKey) {
        try {
            input.ExclusiveStartKey = marshall(JSON.parse(request.startKey));
        } catch {
            // Ignore invalid startKey
        }
    }

    const output = await dynamo.send(new QueryCommand(input));
    const blogs = (output.Items?.map((item) => unmarshall(item)) ?? []) as Blog[];
    const lastEvaluatedKey = output.LastEvaluatedKey
        ? JSON.stringify(unmarshall(output.LastEvaluatedKey))
        : undefined;

    return { blogs, lastEvaluatedKey };
}
