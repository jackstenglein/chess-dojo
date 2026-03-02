'use strict';

import {
    Blog,
    BlogStatuses,
    getBlogRequestSchema,
} from '@jackstenglein/chess-dojo-common/src/blog/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    getUserInfo,
    parsePathParameters,
    success,
} from '../directoryService/api';
import { blogTable, GetItemBuilder, getUser } from './database';

/**
 * Handles requests to get a blog post by owner and id.
 * Returns 404 if the blog does not exist. If the blog is not published,
 * the caller must be the owner or an admin. Otherwise, a 403 is returned.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);

        const request = parsePathParameters(event, getBlogRequestSchema);

        const blog = await getBlog(request.owner, request.id);
        if (!blog) {
            throw new ApiError({
                statusCode: 404,
                publicMessage: `Blog post not found: ${request.owner}/${request.id}`,
            });
        }

        if (blog.status !== BlogStatuses.PUBLISHED) {
            const userInfo = getUserInfo(event);
            if (!userInfo.username) {
                throw new ApiError({
                    statusCode: 403,
                    publicMessage:
                        'You do not have permission to view this blog post (must be owner or admin)',
                });
            }

            if (blog.owner === userInfo.username) {
                return success(blog);
            }

            const user = await getUser(userInfo.username);
            if (blog.owner === 'chessdojo' && user.isAdmin) {
                return success(blog);
            }

            throw new ApiError({
                statusCode: 403,
                publicMessage:
                    'You do not have permission to view this blog post (must be owner or admin)',
            });
        }

        return success(blog);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Fetches the blog with the given owner and id from DynamoDB.
 * @param owner The username of the blog owner.
 * @param id The id of the blog post.
 * @returns The blog if it exists, or undefined.
 */
export async function getBlog(owner: string, id: string): Promise<Blog | undefined> {
    return new GetItemBuilder<Blog>().key('owner', owner).key('id', id).table(blogTable).send();
}
