import { ConditionalCheckFailedException, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { getBlogRequestSchema } from '@jackstenglein/chess-dojo-common/src/blog/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parsePathParameters,
    requireUserInfo,
    success,
} from '../directoryService/api';
import { blogTable, dynamo, getUser } from './database';

/** Permanently deletes a stored blog and its comments. Only admins may delete posts. */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const user = await getUser(requireUserInfo(event).username);
        if (!user.isAdmin) {
            throw new ApiError({
                statusCode: 403,
                publicMessage: 'You must be an admin to delete a blog post',
            });
        }
        const { owner, id } = parsePathParameters(event, getBlogRequestSchema);
        await dynamo.send(
            new DeleteItemCommand({
                TableName: blogTable,
                Key: { owner: { S: owner }, id: { S: id } },
                ConditionExpression: 'attribute_exists(id)',
            }),
        );
        return success({ owner, id });
    } catch (err) {
        if (err instanceof ConditionalCheckFailedException) {
            return errToApiGatewayProxyResultV2(
                new ApiError({ statusCode: 404, publicMessage: 'Blog post not found' }),
            );
        }
        return errToApiGatewayProxyResultV2(err);
    }
};
