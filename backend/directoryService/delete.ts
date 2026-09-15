import { DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import {
    DeleteDirectoriesSchemaV2,
    Directory,
    DirectoryAccessRole,
    DirectoryItemTypes,
    isDefaultDirectory,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { checkAccess } from './access';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseEvent,
    requireUserInfo,
    success,
} from './api';
import { directoryTable, dynamo } from './database';
import { fetchDirectory } from './get';
import { removeDirectoryFromGames, removeDirectoryItems } from './removeItems';

/**
 * Handles requests to the delete directories API. Returns the directories as
 * they were before the delete. If a directory did not exist, returns undefined.
 * Note that only the specified directories are deleted. Subdirectories are deleted
 * asynchronously by the recursiveDelete stream handler. All directories in the
 * request must have the same parent.
 * @param event The API gateway event that triggered the request.
 * @returns The directory before the delete, or undefined if it did not exist.
 */
export const handlerV2: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        const request = parseEvent(event, DeleteDirectoriesSchemaV2);

        if (request.ids.length === 0) {
            throw new ApiError({
                statusCode: 400,
                publicMessage: `At least one id is required`,
            });
        }

        if (request.ids.some((id) => isDefaultDirectory(id))) {
            throw new ApiError({
                statusCode: 400,
                publicMessage: 'One or more directories cannot be deleted',
                privateMessage: `Request is for directories ${request.ids.toString()}`,
            });
        }

        let parentId: string | undefined = undefined;
        if (request.owner !== userInfo.username) {
            const directory = await fetchDirectory(request.owner, request.ids[0]);
            if (!directory) {
                throw new ApiError({
                    statusCode: 404,
                    publicMessage: `Directory ${request.owner}/${request.ids[0]} not found`,
                });
            }

            parentId = directory.parent;
            if (
                !(await checkAccess({
                    owner: request.owner,
                    id: parentId,
                    username: userInfo.username,
                    role: DirectoryAccessRole.Admin,
                }))
            ) {
                throw new ApiError({
                    statusCode: 403,
                    publicMessage: `Missing required Admin permissions on parent directory`,
                    privateMessage: `Parent: ${request.owner}/${parentId}`,
                });
            }
        }

        let parent: Directory | undefined = undefined;
        const directories = await deleteDirectories(request.owner, request.ids, parentId);
        if (directories.length > 0) {
            parent = await removeDirectoryItems(
                request.owner,
                directories[0].parent,
                request.ids,
                true,
            );
        }

        return success({ parent });
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Deletes the specified directories from DynamoDB. Subdirectories are not deleted
 * and must be explicitly deleted separately.
 * @param owner The owner of the directory.
 * @param ids The ids of the directories.
 * @param parent The required parent of the directory. If included, the delete will be conditional on this value.
 * @returns The directory objects as they were before deletion.
 */
export async function deleteDirectories(
    owner: string,
    ids: string[],
    parent?: string,
): Promise<Directory[]> {
    if (ids.length === 0) {
        return [];
    }

    const directories = [];

    for (const id of ids) {
        const output = await dynamo.send(
            new DeleteItemCommand({
                Key: {
                    owner: { S: owner },
                    id: { S: id },
                },
                ConditionExpression: parent ? `parent = :parent` : undefined,
                ExpressionAttributeValues: parent ? { ':parent': { S: parent } } : undefined,
                TableName: directoryTable,
                ReturnValues: 'ALL_OLD',
            }),
        );
        if (!output.Attributes) {
            continue;
        }

        const directory = unmarshall(output.Attributes) as Directory;
        await removeDirectoryFromGames(
            directory.owner,
            directory.id,
            Object.values(directory.items)
                .filter((item) => item.type !== DirectoryItemTypes.DIRECTORY)
                .map((item) => item.id),
        );
        directories.push(directory);
    }

    return directories;
}
