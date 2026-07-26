'use strict';

import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import {
    RoundRobin,
    RoundRobinAdminUpdatePlayerRequest,
    RoundRobinAdminUpdatePlayerSchema,
    RoundRobinWaitlist,
} from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseEvent,
    requireUserInfo,
    success,
} from '../../directoryService/api';
import { attributeExists, getUser, UpdateItemBuilder } from '../../directoryService/database';
import { tournamentsTable } from '../register';

/**
 * Handles admin requests to update a player's identity fields in a round robin.
 * @param event The API Gateway event that triggered the request.
 * @returns The updated tournament or waitlist.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: ', event);
        const userInfo = requireUserInfo(event);
        const user = await getUser(userInfo.username);
        if (!user.isAdmin && !user.isTournamentAdmin) {
            throw new ApiError({
                statusCode: 403,
                publicMessage: 'You must be an admin to perform this action',
            });
        }

        const request = parseEvent(event, RoundRobinAdminUpdatePlayerSchema);
        const tournament = await updatePlayer(request);
        return success(tournament);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Updates a player's identity fields for the given admin request.
 * @param request The admin update-player request.
 * @returns The updated tournament or waitlist.
 */
async function updatePlayer(
    request: RoundRobinAdminUpdatePlayerRequest,
): Promise<RoundRobin | RoundRobinWaitlist> {
    const playerPath = ['players', request.username];

    try {
        const output = await new UpdateItemBuilder<RoundRobin | RoundRobinWaitlist>()
            .key('type', `ROUND_ROBIN_${request.cohort}`)
            .key('startsAt', request.startsAt)
            .set([...playerPath, 'displayName'], request.displayName)
            .set([...playerPath, 'lichessUsername'], request.lichessUsername)
            .set([...playerPath, 'chesscomUsername'], request.chesscomUsername)
            .set([...playerPath, 'discordUsername'], request.discordUsername)
            .set([...playerPath, 'discordId'], request.discordId)
            .set('updatedAt', new Date().toISOString())
            .condition(attributeExists(playerPath))
            .table(tournamentsTable)
            .return('ALL_NEW')
            .send();
        if (!output) {
            throw new ApiError({
                statusCode: 500,
                publicMessage: 'Failed to update player',
                privateMessage: 'No return value from DDB update',
            });
        }
        return output;
    } catch (err) {
        if (err instanceof ConditionalCheckFailedException) {
            throw new ApiError({
                statusCode: 404,
                publicMessage: 'Player not found in tournament',
                cause: err,
            });
        }
        throw err;
    }
}
