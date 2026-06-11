'use strict';

import { DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import {
    DeleteGamesRequest,
    DeleteGamesSchema,
} from '@jackstenglein/chess-dojo-common/src/database/game';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    errToApiGatewayProxyResultV2,
    parseBody,
    requireUserInfo,
    success,
} from '../../directoryService/api';
import { dynamo } from '../../directoryService/database';
import { gamesTable } from './create';
import { rebuildUserTimeManagementRating } from './timeManagement';

/**
 * Handles batch deleting up to 100 games. The caller must be the owner
 * of each game.
 * @param event The API Gateway event that triggered the request.
 * @returns A list of the cohorts and ids of the deleted games.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        const request = parseBody(event, DeleteGamesSchema);
        const deleted = await deleteGames({ username: userInfo.username, request });
        await rebuildUserTimeManagementRating(userInfo.username);
        return success(deleted);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Sends DynamoDB requests to delete the specified games.
 * @param username The username of the caller. Must match the owner of the games.
 * @param request The list of games to delete.
 * @returns The list of games successfully deleted.
 */
async function deleteGames({
    username,
    request,
}: {
    username: string;
    request: DeleteGamesRequest;
}): Promise<DeleteGamesRequest> {
    const promises = [];

    for (const { cohort, id } of request) {
        promises.push(
            dynamo.send(
                new DeleteItemCommand({
                    ConditionExpression: '#owner = :owner',
                    Key: {
                        cohort: { S: cohort },
                        id: { S: id },
                    },
                    ExpressionAttributeNames: {
                        '#owner': 'owner',
                    },
                    ExpressionAttributeValues: {
                        ':owner': { S: username },
                    },
                    TableName: gamesTable,
                    ReturnValues: 'NONE',
                }),
            ),
        );
    }

    const results = await Promise.allSettled(promises);
    const deleted = [];

    for (let i = 0; i < results.length; i++) {
        if (results[i].status === 'fulfilled') {
            deleted.push(request[i]);
        }
    }

    return deleted;
}
