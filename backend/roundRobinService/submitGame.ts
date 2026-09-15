'use strict';

import { GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import {
    RoundRobin,
    RoundRobinSubmitGameRequest,
    RoundRobinSubmitGameSchema,
} from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseEvent,
    requireUserInfo,
    success,
} from '../directoryService/api';
import { attributeExists, dynamo, UpdateItemBuilder } from '../directoryService/database';
import { GameData, parseGame } from './gameUtils';
import { tournamentsTable } from './register';

/**
 * Handles requests to submit a game for a round robin tournament.
 * @param event The API Gateway event that triggered the request.
 * @returns The updated tournament.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: ', event);
        const request = parseEvent(event, RoundRobinSubmitGameSchema);
        const { username } = requireUserInfo(event);
        const tournament = await submitGame({ username, request });
        return success(tournament);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Submits a game into the given round robin.
 * @param username The username of the person submitting the game.
 * @param request The request to submit the game.
 * @returns The updated tournament.
 */
async function submitGame({
    username,
    request,
}: {
    username: string;
    request: RoundRobinSubmitGameRequest;
}) {
    const data = await parseGame(request.url);
    const { path, white, black } = await findPairingPath({ username, request, data });

    const input = new UpdateItemBuilder()
        .key('type', `ROUND_ROBIN_${request.cohort}`)
        .key('startsAt', request.startsAt)
        .set([...path, 'result'], data.result)
        .set([...path, 'url'], request.url)
        .set([...path, 'white'], white)
        .set([...path, 'black'], black)
        .set([...path, 'submittedAt'], new Date().toISOString())
        .condition(attributeExists(path))
        .table(tournamentsTable)
        .return('ALL_NEW')
        .build();
    console.log('Input: %j', input);
    const output = await dynamo.send(input);
    return unmarshall(output.Attributes!) as RoundRobin;
}

/**
 * Finds the DynamoDB attribute path to the pairing for the given game.
 * @param username The username of the person submitting the game.
 * @param request The request to submit the game.
 * @param data The data of the game.
 * @returns The DynamoDB attribute path for the pairing.
 */
async function findPairingPath({
    username,
    request,
    data,
}: {
    username: string;
    request: RoundRobinSubmitGameRequest;
    data: GameData;
}): Promise<{ path: (string | number)[]; white: string; black: string }> {
    const output = await dynamo.send(
        new GetItemCommand({
            Key: {
                type: { S: `ROUND_ROBIN_${request.cohort}` },
                startsAt: { S: request.startsAt },
            },
            TableName: tournamentsTable,
        }),
    );

    if (!output.Item) {
        throw new ApiError({
            statusCode: 404,
            publicMessage: 'Tournament not found',
        });
    }

    const tournament = unmarshall(output.Item) as RoundRobin;
    const field = data.type === 'chesscom' ? 'chesscomUsername' : 'lichessUsername';

    const whiteUsername = data.white.trim().toLowerCase();
    const blackUsername = data.black.trim().toLowerCase();

    for (let round = 0; round < tournament.pairings.length; round++) {
        for (let i = 0; i < tournament.pairings[round].length; i++) {
            const pairing = tournament.pairings[round][i];

            if (
                (pairing.white === username || pairing.black === username) &&
                pairing.white &&
                pairing.black
            ) {
                const white = tournament.players[pairing.white ?? '']?.[field] ?? '';
                const black = tournament.players[pairing.black ?? '']?.[field] ?? '';

                const wUsername = white.trim().toLowerCase();
                const bUsername = black.trim().toLowerCase();

                if (
                    (wUsername === whiteUsername && bUsername === blackUsername) ||
                    (wUsername === blackUsername && bUsername === whiteUsername)
                ) {
                    return {
                        path: ['pairings', round, i],
                        // The players might have played with the wrong colors
                        white: wUsername === whiteUsername ? pairing.white : pairing.black,
                        black: wUsername === whiteUsername ? pairing.black : pairing.white,
                    };
                }
            }
        }
    }

    throw new ApiError({
        statusCode: 400,
        publicMessage: `No pairing found for this game. Make sure you play all games under the usernames in the tournament. Contact support if you are sure the game is correct.`,
        privateMessage: `Game data: ${JSON.stringify(data, undefined, 2)}`,
    });
}
