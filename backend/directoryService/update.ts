import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import {
    Directory,
    DirectoryAccessRole,
    isDefaultDirectory,
    UpdateDirectoryRequestV2,
    UpdateDirectorySchemaV2,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { NIL as uuidNil } from 'uuid';
import { checkAccess } from './access';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseEvent,
    requireUserInfo,
    success,
} from './api';
import { attributeExists, directoryTable, dynamo, UpdateItemBuilder } from './database';

/**
 * Handles requests to the update directory API, which allows updating the name,
 * visibility and item order of a directory. Returns an error if the caller is
 * not the owner of the directory, or if the directory is a default directory
 * and name or visibility is provided. The updated directory is returned.
 * @param event The API gateway event triggering the request.
 */
export const handlerV2: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);

        const userInfo = requireUserInfo(event);
        const request = parseEvent(event, UpdateDirectorySchemaV2);

        if (!request.name && !request.visibility && !request.itemIds) {
            throw new ApiError({
                statusCode: 400,
                publicMessage: 'At least one of `name`, `visibility` and `itemIds` is required',
            });
        }

        if ((request.name || request.visibility) && isDefaultDirectory(request.id)) {
            throw new ApiError({
                statusCode: 400,
                publicMessage: "This directory's name/visibility cannot be updated",
                privateMessage: `Request is for default directory ${request.id}`,
            });
        }

        if (
            !(await checkAccess({
                owner: request.owner,
                id: request.id,
                username: userInfo.username,
                role: DirectoryAccessRole.Admin,
            }))
        ) {
            throw new ApiError({
                statusCode: 403,
                publicMessage: `Missing required admin permissions on the directory (or it does not exist)`,
            });
        }

        const result = await updateDirectory(request);
        return success(result);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Updates the given directory. Fails if the directory does not already exist.
 * @param request The update request.
 * @returns The updated directory.
 */
export async function updateDirectory(
    request: UpdateDirectoryRequestV2,
): Promise<{ directory: Directory; parent?: Directory }> {
    try {
        let parent: Directory | undefined = undefined;

        let input = new UpdateItemBuilder()
            .key('owner', request.owner)
            .key('id', request.id)
            .set('name', request.name)
            .set('visibility', request.visibility)
            .set('itemIds', request.itemIds)
            .set('updatedAt', new Date().toISOString())
            .condition(attributeExists('id'))
            .table(directoryTable)
            .return('ALL_NEW')
            .build();

        console.log('Sending update item: %j', input);
        let result = await dynamo.send(input);
        const directory = unmarshall(result.Attributes!) as Directory;

        if ((request.name || request.visibility) && directory.parent !== uuidNil) {
            input = new UpdateItemBuilder()
                .key('owner', request.owner)
                .key('id', directory.parent)
                .set(`items.${directory.id}.metadata.name`, directory.name)
                .set(`items.${directory.id}.metadata.visibility`, directory.visibility)
                .set(`items.${directory.id}.metadata.updatedAt`, directory.updatedAt)
                .condition(attributeExists(`items.${directory.id}`))
                .table(directoryTable)
                .return('ALL_NEW')
                .build();

            console.log('Sending parent update: %j', input);
            result = await dynamo.send(input);
            parent = unmarshall(result.Attributes!) as Directory;
        }

        return {
            directory,
            parent,
        };
    } catch (err) {
        if (err instanceof ConditionalCheckFailedException) {
            throw new ApiError({
                statusCode: 400,
                publicMessage:
                    'Invalid request: directory not found or you do not have permission to update it',
                privateMessage: 'DDB conditional check failed: attribute_exists(id)',
                cause: err,
            });
        }
        throw new ApiError({
            statusCode: 500,
            publicMessage: 'Temporary server error',
            privateMessage: 'DDB UpdateItem failure',
            cause: err,
        });
    }
}
