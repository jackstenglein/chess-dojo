'use strict';

import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import {
    Blog,
    createBlogCommentRequestSchema,
} from '@jackstenglein/chess-dojo-common/src/blog/api';
import { Comment } from '@jackstenglein/chess-dojo-common/src/database/timeline';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { v4 as uuid } from 'uuid';
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
 * Resolves the root top-level comment id for a reply. If the target comment
 * is itself a reply, returns its parentId (the root). Otherwise returns the
 * target's own id.
 */
function resolveParentId(
    comments: Comment[] | null | undefined,
    parentId: string | undefined,
): string | undefined {
    if (!parentId) return undefined;

    const target = (comments ?? []).find((c) => c.id === parentId);
    if (!target) {
        throw new ApiError({
            statusCode: 404,
            publicMessage: 'Parent comment not found',
        });
    }
    return target.parentId ?? target.id;
}

/**
 * Handles requests to create a comment on a blog post.
 * Path parameters: owner, id. Body: content, optional parentId.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);

        const userInfo = requireUserInfo(event);
        const user = await getUser(userInfo.username);
        const request = parseEvent(event, createBlogCommentRequestSchema);

        let resolvedParentId: string | undefined;
        if (request.parentId) {
            const blog = await getBlog(request.owner, request.id);
            if (!blog) {
                throw new ApiError({
                    statusCode: 404,
                    publicMessage: `Blog post not found: ${request.owner}/${request.id}`,
                });
            }
            resolvedParentId = resolveParentId(blog.comments, request.parentId);
        }

        const now = new Date().toISOString();
        const comment: Comment = {
            id: uuid(),
            owner: userInfo.username,
            ownerDisplayName: user.displayName,
            ownerCohort: user.dojoCohort,
            ownerPreviousCohort: user.previousCohort,
            content: request.content,
            createdAt: now,
            updatedAt: now,
            ...(resolvedParentId && { parentId: resolvedParentId }),
        };

        const input = new UpdateItemBuilder()
            .key('owner', request.owner)
            .key('id', request.id)
            .appendToList('comments', [comment])
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
        const blog = unmarshall(output.Attributes) as Blog;
        return success(blog);
    } catch (err) {
        if (err instanceof ConditionalCheckFailedException) {
            return errToApiGatewayProxyResultV2(
                new ApiError({
                    statusCode: 404,
                    publicMessage: 'Blog post not found',
                    cause: err,
                }),
            );
        }
        return errToApiGatewayProxyResultV2(err);
    }
};
