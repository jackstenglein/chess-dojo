'use strict';

import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import {
    Blog,
    UpdateBlogRequest,
    updateBlogRequestSchema,
} from '@jackstenglein/chess-dojo-common/src/blog/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseEvent,
    requireUserInfo,
    success,
} from '../directoryService/api';
import { attributeExists, blogTable, dynamo, getUser, UpdateItemBuilder } from './database';

/**
 * Handles requests to update a blog post. The caller must be the owner or an admin.
 * Path parameters: owner, id. Body: optional title, subtitle, date, content, status.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);

        const userInfo = requireUserInfo(event);
        const user = await getUser(userInfo.username);
        const request = parseEvent(event, updateBlogRequestSchema);

        const hasUpdates =
            request.title !== undefined ||
            request.subtitle !== undefined ||
            request.description !== undefined ||
            request.coverImage !== undefined ||
            request.date !== undefined ||
            request.content !== undefined ||
            request.status !== undefined;
        if (!hasUpdates) {
            throw new ApiError({
                statusCode: 400,
                publicMessage:
                    'At least one of title, subtitle, description, coverImage, date, content, or status is required',
            });
        }

        if (request.owner !== user.username && !user.isAdmin) {
            throw new ApiError({
                statusCode: 403,
                publicMessage: 'You do not have permission to update this blog post',
            });
        }

        const blog = await updateBlog(request);
        return success(blog);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Updates a blog post in DynamoDB. Only provided fields are updated.
 * @param request The update request (owner, id, and optional fields).
 * @returns The updated blog.
 */
async function updateBlog(request: UpdateBlogRequest): Promise<Blog> {
    const updatedAt = new Date().toISOString();

    try {
        const input = new UpdateItemBuilder()
            .key('owner', request.owner)
            .key('id', request.id)
            .set('title', request.title)
            .set('subtitle', request.subtitle)
            .set('description', request.description)
            .set('coverImage', request.coverImage)
            .set('date', request.date)
            .set('content', request.content)
            .set('status', request.status)
            .set('updatedAt', updatedAt)
            .condition(attributeExists('id'))
            .table(blogTable)
            .return('ALL_NEW')
            .build();

        const output = await dynamo.send(input);
        return unmarshall(output.Attributes || {}) as Blog;
    } catch (err) {
        if (err instanceof ConditionalCheckFailedException) {
            throw new ApiError({
                statusCode: 404,
                publicMessage: 'Blog post not found',
                cause: err,
            });
        }
        throw new ApiError({
            statusCode: 500,
            publicMessage: 'Internal server error',
            cause: err,
        });
    }
}
