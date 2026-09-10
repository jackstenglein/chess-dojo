import { GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import {
    Directory,
    ListBreadcrumbsSchema,
    SHARED_DIRECTORY_ID,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { NIL as uuidNil } from 'uuid';
import { canViewDirectory, fetchSubscriptionTier } from './access';
import { errToApiGatewayProxyResultV2, parseEvent, requireUserInfo, success } from './api';
import { directoryTable, dynamo } from './database';

/**
 * Handles requests to the list breadcrumbs API. This API fetches the name, id and
 * parent for the given directory, as well as all parent directories above it.
 * @param event The API gateway event that triggered the request.
 * @returns The breadcrumb data for the requested directory.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        const request = parseEvent(event, ListBreadcrumbsSchema);
        const subscriptionTier =
            userInfo.username === request.owner
                ? undefined
                : await fetchSubscriptionTier(userInfo.username);
        const breadcrumbs = await fetchBreadcrumbs({
            owner: request.owner,
            id: request.id,
            shared: request.shared,
            viewer: userInfo.username,
            subscriptionTier,
        });
        return success(breadcrumbs);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Fetches the breadcrumb data for the given directory, as well as all of its
 * parent directories.
 * @param owner The owner of the directory to fetch the breadcrumbs for.
 * @param id The id of the directory to fetch the breadcrumbs for.
 * @param shared Whether the viewer is looking at a shared directory.
 * @param viewer The username of the viewer.
 * @returns A map from the owner/id of each directory to its breadcrumb data.
 */
export async function fetchBreadcrumbs({
    owner,
    id,
    shared,
    viewer,
    subscriptionTier,
}: {
    owner: string;
    id: string;
    shared?: boolean;
    viewer: string;
    subscriptionTier?: SubscriptionTier;
}) {
    const results: Record<string, { owner: string; id: string; name: string; parent: string }> = {};
    let previousKey: string | undefined;

    while (id && id !== uuidNil) {
        const getItemOutput = await dynamo.send(
            new GetItemCommand({
                Key: {
                    owner: { S: owner },
                    id: { S: id },
                },
                ProjectionExpression: '#name, #parent, #access, #visibility, subscriptionTiers',
                ExpressionAttributeNames: {
                    '#name': 'name',
                    '#parent': 'parent',
                    '#access': 'access',
                    '#visibility': 'visibility',
                },
                TableName: directoryTable,
            }),
        );
        if (!getItemOutput.Item) {
            return results;
        }

        const directory = unmarshall(getItemOutput.Item) as Directory;
        const canView = await canViewDirectory({
            owner,
            id,
            username: viewer,
            directory,
            subscriptionTier,
        });
        if (!canView) {
            if (previousKey) {
                results[previousKey].parent = uuidNil;
            }
            return results;
        }

        if (shared && directory.access?.[viewer]) {
            results[`${owner}/${id}`] = {
                id,
                owner,
                name: directory.name,
                parent: SHARED_DIRECTORY_ID,
            };
            results[`${viewer}/${SHARED_DIRECTORY_ID}`] = {
                id: SHARED_DIRECTORY_ID,
                owner: viewer,
                name: 'Shared with Me',
                parent: uuidNil,
            };
            return results;
        }

        const key = `${owner}/${id}`;
        results[key] = {
            id,
            owner,
            name: directory.name,
            parent: directory.parent,
        };
        previousKey = key;
        id = directory.parent;
    }

    return results;
}
