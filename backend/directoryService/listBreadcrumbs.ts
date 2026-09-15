import { GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import {
    Directory,
    ListBreadcrumbsSchema,
    SHARED_DIRECTORY_ID,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { NIL as uuidNil } from 'uuid';
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
        const breadcrumbs = await fetchBreadcrumbs({
            owner: request.owner,
            id: request.id,
            shared: request.shared,
            viewer: userInfo.username,
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
async function fetchBreadcrumbs({
    owner,
    id,
    shared,
    viewer,
}: {
    owner: string;
    id: string;
    shared?: boolean;
    viewer: string;
}) {
    const results: Record<string, { owner: string; id: string; name: string; parent: string }> = {};

    while (id && id !== uuidNil) {
        const getItemOutput = await dynamo.send(
            new GetItemCommand({
                Key: {
                    owner: { S: owner },
                    id: { S: id },
                },
                ProjectionExpression: '#name, #parent, #access',
                ExpressionAttributeNames: {
                    '#name': 'name',
                    '#parent': 'parent',
                    '#access': 'access',
                },
                TableName: directoryTable,
            }),
        );
        if (!getItemOutput.Item) {
            return results;
        }

        const directory = unmarshall(getItemOutput.Item) as Directory;
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
            break;
        }

        results[`${owner}/${id}`] = {
            id,
            owner,
            name: directory.name,
            parent: directory.parent,
        };
        id = directory.parent;
    }

    return results;
}
