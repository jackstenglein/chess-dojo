'use strict';

import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import {
    Blog,
    deleteBlogCommentRequestSchema,
} from '@jackstenglein/chess-dojo-common/src/blog/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseEvent,
    requireUserInfo,
    success,
} from '../directoryService/api';
import { and, attributeExists, blogTable, dynamo, equal, getUser, UpdateItemBuilder } from './database';
import { getBlog } from './get';

/**
 * Handles requests to delete a comment on a blog post.
 * The caller must be the comment owner or an admin.
 * If the comment is a top-level comment with replies, the replies are also deleted.
 * Path parameters: owner, id. Body: commentId.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);

        const userInfo = requireUserInfo(event);
        const user = await getUser(userInfo.username);
        const request = parseEvent(event, deleteBlogCommentRequestSchema);

        const blog = await getBlog(request.owner, request.id);
        if (!blog) {
            throw new ApiError({
                statusCode: 404,
                publicMessage: `Blog post not found: ${request.owner}/${request.id}`,
            });
        }

        const comments = blog.comments ?? [];
        const commentIndex = comments.findIndex((c) => c.id === request.commentId);
        if (commentIndex < 0) {
            throw new ApiError({
                statusCode: 404,
                publicMessage: 'Comment not found',
            });
        }

        const comment = comments[commentIndex];
        if (comment.owner !== userInfo.username && !user.isAdmin) {
            throw new ApiError({
                statusCode: 403,
                publicMessage: 'You do not have permission to delete this comment',
            });
        }

        // Collect indices to remove: the target comment + any replies to it
        const indicesToRemove = [commentIndex];
        if (!comment.parentId) {
            // This is a top-level comment — also remove its replies
            for (let i = 0; i < comments.length; i++) {
                if (comments[i].parentId === comment.id) {
                    indicesToRemove.push(i);
                }
            }
        }

        const builder = new UpdateItemBuilder()
            .key('owner', request.owner)
            .key('id', request.id);

        // DynamoDB REMOVE evaluates all paths against the original item atomically,
        // so index order does not matter within a single update expression.
        for (const idx of indicesToRemove) {
            builder.remove(['comments', idx]);
        }

        const input = builder
            .condition(
                and(
                    attributeExists('id'),
                    equal(['comments', commentIndex, 'id'], request.commentId),
                ),
            )
            .table(blogTable)
            .return('ALL_NEW')
            .build();

        const output = await dynamo.send(input);
        if (!output.Attributes) {
            throw new ApiError({
                statusCode: 500,
                publicMessage: 'Failed to retrieve updated blog post',
            });
        }
        const updatedBlog = unmarshall(output.Attributes) as Blog;
        return success(updatedBlog);
    } catch (err) {
        if (err instanceof ConditionalCheckFailedException) {
            return errToApiGatewayProxyResultV2(
                new ApiError({
                    statusCode: 409,
                    publicMessage:
                        'Comment was modified by another request. Please refresh and try again.',
                    cause: err,
                }),
            );
        }
        return errToApiGatewayProxyResultV2(err);
    }
};
