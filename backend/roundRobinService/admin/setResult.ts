'use strict';

import {
    RoundRobin,
    RoundRobinAdminSetResultRequest,
    RoundRobinAdminSetResultSchema,
} from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseEvent,
    requireUserInfo,
    success,
} from '../../directoryService/api';
import {
    attributeExists,
    GetItemBuilder,
    getUser,
    UpdateItemBuilder,
} from '../../directoryService/database';
import { parseGame } from '../gameUtils';
import { tournamentsTable } from '../register';

/**
 * Handles admin requests to set or clear a round robin pairing result.
 * @param event The API Gateway event that triggered the request.
 * @returns The updated tournament.
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

        const request = parseEvent(event, RoundRobinAdminSetResultSchema);
        const tournament = await setResult(request);
        if (!tournament) {
            throw new ApiError({
                statusCode: 500,
                publicMessage: 'Failed to set result',
            });
        }
        return success(tournament);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Sets or clears a pairing result for the given admin request.
 * @param request The admin set-result request.
 * @returns The updated tournament.
 */
async function setResult(
    request: RoundRobinAdminSetResultRequest,
): Promise<RoundRobin | undefined> {
    const tournament = await new GetItemBuilder<RoundRobin>()
        .key('type', `ROUND_ROBIN_${request.cohort}`)
        .key('startsAt', request.startsAt)
        .table(tournamentsTable)
        .send();
    if (!tournament) {
        throw new ApiError({
            statusCode: 404,
            publicMessage: 'Tournament not found',
        });
    }

    const roundIndex = request.round - 1;
    const roundPairings = tournament.pairings?.[roundIndex];
    if (!roundPairings) {
        throw new ApiError({
            statusCode: 400,
            publicMessage: `Round ${request.round} not found`,
        });
    }

    const pairingIndex = roundPairings.findIndex(
        (pairing) => pairing.white === request.white && pairing.black === request.black,
    );
    if (pairingIndex < 0) {
        throw new ApiError({
            statusCode: 400,
            publicMessage: 'Pairing not found for the given players and round',
        });
    }

    const path = ['pairings', roundIndex, pairingIndex];
    const builder = new UpdateItemBuilder<RoundRobin>()
        .key('type', `ROUND_ROBIN_${request.cohort}`)
        .key('startsAt', request.startsAt)
        .condition(attributeExists(path))
        .table(tournamentsTable)
        .return('ALL_NEW');

    if (request.result === '') {
        builder
            .remove([...path, 'result'])
            .remove([...path, 'url'])
            .remove([...path, 'submittedAt']);
    } else {
        let result = request.result;
        const url = request.url?.trim();

        if (url && !result) {
            const data = await parseGame(url);
            result = data.result;
        }

        if (!result) {
            throw new ApiError({
                statusCode: 400,
                publicMessage: 'Either result or url is required',
            });
        }

        builder
            .set([...path, 'result'], result)
            .set([...path, 'submittedAt'], new Date().toISOString());

        if (url) {
            builder.set([...path, 'url'], url);
        }
    }
    return builder.send();
}
