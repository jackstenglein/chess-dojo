import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import {
    Directory,
    DirectoryAccessRole,
    DirectoryItem,
    DirectoryItemTypes,
    DirectoryVisibility,
    isDefaultDirectory,
    SHARED_DIRECTORY_ID,
    ShareDirectoryRequest,
    ShareDirectoryResponse,
    ShareDirectorySchema,
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
import { createDirectory } from './create';
import { attributeExists, directoryTable, dynamo, UpdateItemBuilder } from './database';
import { fetchDirectory } from './get';
import { updateDirectory } from './update';

/**
 * Handles requests to the share directory API. Returns the updated directory.
 * @param event The API gateway event that triggered the request.
 * @returns The updated directory after the access is changed.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);

        const userInfo = requireUserInfo(event);
        const request = parseEvent(event, ShareDirectorySchema);

        const existingDirectory = await fetchDirectory(request.owner, request.id);
        const hasAccess =
            existingDirectory !== undefined &&
            (await checkAccess({
                owner: request.owner,
                id: request.id,
                username: userInfo.username,
                role: DirectoryAccessRole.Admin,
                directory: existingDirectory,
            }));
        if (!hasAccess) {
            throw new ApiError({
                statusCode: 403,
                publicMessage: `Missing required admin permissions on the directory (or it does not exist)`,
            });
        }

        if (request.subscriptionTiers?.length && isDefaultDirectory(request.id)) {
            throw new ApiError({
                statusCode: 400,
                publicMessage: 'Default directories cannot be shared with subscription tiers',
            });
        }

        let parent: Directory | undefined;
        if (
            request.subscriptionTiers?.length &&
            existingDirectory.visibility === DirectoryVisibility.PUBLIC
        ) {
            const updateResult = await updateDirectory({
                owner: request.owner,
                id: request.id,
                visibility: DirectoryVisibility.PRIVATE,
            });
            parent = updateResult.parent;
        }

        const directory = await shareDirectory(request);
        return success({ directory, parent } satisfies ShareDirectoryResponse);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Sets the access on the given directory.
 * @param request The owner, id and new access of the directory.
 * @returns The updated directory.
 */
export async function shareDirectory(request: ShareDirectoryRequest) {
    const updatedAt = new Date().toISOString();
    const input = new UpdateItemBuilder()
        .key('owner', request.owner)
        .key('id', request.id)
        .set('updatedAt', updatedAt)
        .set('access', request.access)
        .set('subscriptionTiers', request.subscriptionTiers)
        .condition(attributeExists('id'))
        .table(directoryTable)
        .return('ALL_OLD')
        .build();

    console.log('Input: %j', input);
    const result = await dynamo.send(input);
    const directory = unmarshall(result.Attributes!) as Directory;

    await updateSharedWithMeDirectories(directory, request.access);

    directory.updatedAt = updatedAt;
    directory.access = request.access;
    if (request.subscriptionTiers !== undefined) {
        directory.subscriptionTiers = request.subscriptionTiers;
    }
    return directory;
}

/**
 * Updates the other users' shared with me directories to match the
 * access update implied by directory and newAccess.
 * @param directory The directory before the access update.
 * @param newAccess The new access of the directory.
 */
async function updateSharedWithMeDirectories(
    directory: Directory,
    newAccess: Record<string, DirectoryAccessRole>,
) {
    // Remove from users who are present in the old directory's
    // access but not in the new access
    for (const username of Object.keys(directory.access || {})) {
        if (!newAccess[username]) {
            await removeFromSharedWithMe(directory, username);
        }
    }

    // Add to users who are present in the new access but
    // not in the old directory's access
    for (const username of Object.keys(newAccess)) {
        if (!directory.access?.[username]) {
            await addToSharedWithMe(directory, username);
        }
    }
}

/**
 * Removes the given directory from the shared with me folder of the given username.
 * @param directory The directory to remove.
 * @param username The username of the shared with me owner.
 */
async function removeFromSharedWithMe(directory: Directory, username: string) {
    try {
        const input = new UpdateItemBuilder()
            .key('owner', username)
            .key('id', SHARED_DIRECTORY_ID)
            .remove(['items', directory.id])
            .set('updatedAt', new Date().toISOString())
            .condition(attributeExists('id'))
            .table(directoryTable)
            .return('NONE')
            .build();
        await dynamo.send(input);
    } catch (err) {
        if (!(err instanceof ConditionalCheckFailedException)) {
            throw err;
        }
    }
}

/**
 * Adds the given directory to the shared with me folder of the given username.
 * If the shared with me folder doesn't exist, it is created.
 * @param directory The directory to add.
 * @param username The username of the shared with me owner.
 */
async function addToSharedWithMe(directory: Directory, username: string) {
    const item: DirectoryItem = {
        type: DirectoryItemTypes.DIRECTORY,
        id: directory.id,
        addedBy: directory.owner,
        metadata: {
            createdAt: directory.createdAt,
            updatedAt: directory.updatedAt,
            visibility: directory.visibility,
            name: directory.name,
        },
    };

    const updatedAt = new Date().toISOString();
    const input = new UpdateItemBuilder()
        .key('owner', username)
        .key('id', SHARED_DIRECTORY_ID)
        .set('updatedAt', updatedAt)
        .set(['items', directory.id], item)
        .appendToList('itemIds', [directory.id])
        .condition(attributeExists('id'))
        .table(directoryTable)
        .return('NONE')
        .build();

    try {
        await dynamo.send(input);
    } catch (err) {
        if (!(err instanceof ConditionalCheckFailedException)) {
            throw err;
        }

        await createDirectory({
            owner: username,
            id: SHARED_DIRECTORY_ID,
            parent: uuidNil,
            name: 'Shared with Me',
            visibility: DirectoryVisibility.PRIVATE,
            createdAt: updatedAt,
            updatedAt,
            items: {
                [directory.id]: item,
            },
            itemIds: [directory.id],
        });
    }
}
