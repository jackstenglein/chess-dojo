'use strict';

import {
    ConditionalCheckFailedException,
    UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import {
    Blog,
    DOJO_BLOG_OWNER,
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
import { sendBlogPublishedEvent } from './notification';

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

        if (request.status === 'PUBLISHED') {
            try {
                await sendBlogPublishedEventIfFirst(blog);
            } catch (err) {
                console.error('Failed to send blog published event for %s:', blog.id, err);
            }
        }

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

/**
 * Sends a BLOG_PUBLISHED SQS event if this is the first time the blog is published.
 * Uses a DynamoDB conditional update to set discordPosted=true only if it was not already set.
 * If the blog was already posted, the conditional check fails and the event is skipped.
 * @param blog The blog that was just updated.
 */
async function sendBlogPublishedEventIfFirst(blog: Blog): Promise<void> {
    try {
        await dynamo.send(
            new UpdateItemCommand({
                TableName: blogTable,
                Key: {
                    owner: { S: DOJO_BLOG_OWNER },
                    id: { S: blog.id },
                },
                UpdateExpression: 'SET discordPosted = :true',
                ConditionExpression:
                    'attribute_not_exists(discordPosted) OR discordPosted = :false',
                ExpressionAttributeValues: {
                    ':true': { BOOL: true },
                    ':false': { BOOL: false },
                },
            }),
        );
    } catch (err) {
        if (err instanceof ConditionalCheckFailedException) {
            console.log('Blog %s already posted to Discord, skipping', blog.id);
            return;
        }
        throw err;
    }

    await sendBlogPublishedEvent(blog);
}
