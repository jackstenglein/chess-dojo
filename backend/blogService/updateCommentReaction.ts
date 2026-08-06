'use strict';

import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import {
    Blog,
    BlogStatuses,
    updateBlogCommentReactionRequestSchema,
} from '@jackstenglein/chess-dojo-common/src/blog/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseEvent,
    requireUserInfo,
    success,
} from '../directoryService/api';
import {
    and,
    attributeExists,
    attributeNotExists,
    blogTable,
    dynamo,
    equal,
    getUser,
    or,
    UpdateItemBuilder,
} from './database';
import { getBlog } from './get';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);

        const userInfo = requireUserInfo(event);
        const request = parseEvent(event, updateBlogCommentReactionRequestSchema);
        const [user, blog] = await Promise.all([
            getUser(userInfo.username),
            getBlog(request.owner, request.id),
        ]);

        if (!blog) {
            throw new ApiError({
                statusCode: 404,
                publicMessage: `Blog post not found: ${request.owner}/${request.id}`,
            });
        }
        if (blog.status !== BlogStatuses.PUBLISHED) {
            throw new ApiError({
                statusCode: 403,
                publicMessage: 'Reactions are not allowed on unpublished posts',
            });
        }

        const commentIndex = (blog.comments ?? []).findIndex(
            (comment) => comment.id === request.commentId,
        );
        if (commentIndex < 0) {
            throw new ApiError({
                statusCode: 404,
                publicMessage: 'Comment not found',
            });
        }

        const comment = blog.comments![commentIndex];
        const reactionsPath = ['comments', commentIndex, 'reactions'];
        const userReactionPath = [...reactionsPath, userInfo.username];
        const existingReaction = comment.reactions?.[userInfo.username];
        const isRemoving = existingReaction?.types?.includes(request.reactionType) ?? false;

        const builder = new UpdateItemBuilder().key('owner', request.owner).key('id', request.id);
        let reactionCondition = attributeNotExists(userReactionPath);

        if (comment.reactions == null) {
            const reaction = {
                username: userInfo.username,
                displayName: user.displayName,
                cohort: user.dojoCohort,
                updatedAt: new Date().toISOString(),
                types: [request.reactionType],
            };
            builder.set(reactionsPath, { [userInfo.username]: reaction });
            reactionCondition = or(attributeNotExists(reactionsPath), equal(reactionsPath, null));
        } else if (isRemoving) {
            builder.remove(userReactionPath);
            reactionCondition = equal(userReactionPath, existingReaction);
        } else {
            const reaction = {
                username: userInfo.username,
                displayName: user.displayName,
                cohort: user.dojoCohort,
                updatedAt: new Date().toISOString(),
                types: [request.reactionType],
            };
            builder.set(userReactionPath, reaction);
            if (existingReaction) {
                reactionCondition = equal(userReactionPath, existingReaction);
            }
        }

        const input = builder
            .condition(
                and(
                    attributeExists('id'),
                    equal(['comments', commentIndex, 'id'], request.commentId),
                    reactionCondition,
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

        return success(unmarshall(output.Attributes) as Blog);
    } catch (err) {
        if (err instanceof ConditionalCheckFailedException) {
            return errToApiGatewayProxyResultV2(
                new ApiError({
                    statusCode: 409,
                    publicMessage:
                        'Comment reactions were modified by another request. Please try again.',
                    cause: err,
                }),
            );
        }
        return errToApiGatewayProxyResultV2(err);
    }
};
