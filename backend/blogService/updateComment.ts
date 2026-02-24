'use strict';

import { unmarshall } from '@aws-sdk/util-dynamodb';
import {
    Blog,
    updateBlogCommentRequestSchema,
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
import { getBlog } from './get';

/**
 * Handles requests to update a comment on a blog post.
 * The caller must be the comment owner or an admin.
 * Path parameters: owner, id. Body: commentId, content.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);

        const userInfo = requireUserInfo(event);
        const user = await getUser(userInfo.username);
        const request = parseEvent(event, updateBlogCommentRequestSchema);

        const blog = await getBlog(request.owner, request.id);
        if (!blog) {
            throw new ApiError({
                statusCode: 404,
                publicMessage: `Blog post not found: ${request.owner}/${request.id}`,
            });
        }

        const commentIndex = (blog.comments ?? []).findIndex(
            (c) => c.id === request.commentId,
        );
        if (commentIndex < 0) {
            throw new ApiError({
                statusCode: 404,
                publicMessage: 'Comment not found',
            });
        }

        const comment = blog.comments![commentIndex];
        if (comment.owner !== userInfo.username && !user.isAdmin) {
            throw new ApiError({
                statusCode: 403,
                publicMessage: 'You do not have permission to edit this comment',
            });
        }

        const now = new Date().toISOString();
        const input = new UpdateItemBuilder()
            .key('owner', request.owner)
            .key('id', request.id)
            .set(['comments', commentIndex, 'content'], request.content)
            .set(['comments', commentIndex, 'updatedAt'], now)
            .condition(attributeExists('id'))
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
        return errToApiGatewayProxyResultV2(err);
    }
};
