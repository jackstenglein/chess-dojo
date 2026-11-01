'use strict';

import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { Chess } from '@jackstenglein/chess';
import { ExplorerPositionFollower } from '@jackstenglein/chess-dojo-common/src/explorer/follower';
import {
    LichessTablebasePosition,
    isInTablebase,
} from '@jackstenglein/chess-dojo-common/src/explorer/types';
import { APIGatewayProxyHandlerV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import axios from 'axios';
import { ApiError } from '../../directoryService/api';
import { ExplorerPosition, LichessExplorerPosition } from './types';

const dynamo = new DynamoDBClient({ region: 'us-east-1' });
const explorerTable = `${process.env.stage}-explorer`;
const mastersTable = process.env.stage === 'prod' ? 'prod-masters-explorer' : explorerTable;

const secretsManager = new SecretsManagerClient({ region: 'us-east-1' });
let lichessToken: string | undefined;

/**
 * Gets an ExplorerPosition for the provided FEN.
 * @param event The HTTP request that invoked this handler.
 * @returns The Dojo ExplorerPosition and the LichessExplorerPosition for the given FEN.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    console.log('Event: %j', event);

    const fen = event.queryStringParameters?.fen;
    if (!fen) {
        return handleError(400, { publicMessage: 'Invalid request: FEN is required' });
    }

    try {
        const chess = new Chess({ fen });
        const normalizedFen = chess.normalizedFen();

        const results = await Promise.all([
            fetchFromDojo(normalizedFen),
            fetchFromMasters(normalizedFen),
            fetchFromLichess(normalizedFen),
            fetchFromTablebase(normalizedFen),
            fetchFollower(normalizedFen, event),
        ]);

        return {
            statusCode: 200,
            body: JSON.stringify({
                normalizedFen,
                dojo: results[0],
                masters: results[1],
                lichess: results[2],
                tablebase: results[3],
                follower: results[4],
            }),
        };
    } catch (err) {
        console.error(`Failed to fetch FEN ${fen}:`, err);
        return handleError(500, err);
    }
};

/**
 * Fetches the ExplorerPosition associated with the given FEN from the Dojo database.
 * @param fen The normalized FEN to fetch.
 * @returns An ExplorerPosition for the provided FEN.
 */
async function fetchFromDojo(fen: string): Promise<ExplorerPosition | null> {
    const getItemOutput = await dynamo.send(
        new GetItemCommand({
            Key: {
                normalizedFen: { S: fen },
                id: { S: 'POSITION' },
            },
            TableName: explorerTable,
        }),
    );
    if (!getItemOutput.Item) {
        return null;
    }

    const position = unmarshall(getItemOutput.Item);
    return position as ExplorerPosition;
}

/**
 * Fetches the ExplorerPosition associated with the given FEN from the Dojo masters database.
 * @param fen The normalized FEN to fetch.
 * @returns An ExplorerPosition for the provided FEN.
 */
async function fetchFromMasters(fen: string): Promise<ExplorerPosition | null> {
    const getItemOutput = await dynamo.send(
        new GetItemCommand({
            Key: {
                normalizedFen: { S: fen },
                id: { S: 'POSITION' },
            },
            TableName: mastersTable,
        }),
    );
    if (!getItemOutput.Item) {
        return null;
    }

    const position = unmarshall(getItemOutput.Item);
    return position as ExplorerPosition;
}

/**
 * Fetches the data from the Lichess API for the provided FEN.
 * @param fen The FEN to fetch from Lichess.
 * @returns A LichessExplorerPosition for the provided FEN.
 */
async function fetchFromLichess(fen: string): Promise<LichessExplorerPosition | null> {
    try {
        const token = await getLichessToken();
        const response = await axios.get<LichessExplorerPosition>(
            'https://explorer.lichess.ovh/lichess',
            {
                params: { fen, topGames: 0, recentGames: 0 },
                headers: { Authorization: `Bearer ${token}` },
            },
        );
        return response.data;
    } catch (err) {
        console.error('Failed to get explorer position from Lichess: ', err);
        return null;
    }
}

/**
 * Fetches the tablebase data from the Lichess API for the provided FEN.
 * @param fen The FEN to fetch from Lichess.
 * @returns A LichessTablebasePosition for the provided FEN.
 */
async function fetchFromTablebase(fen: string): Promise<LichessTablebasePosition | null> {
    if (!isInTablebase(fen)) {
        return null;
    }

    try {
        const token = await getLichessToken();
        const response = await axios.get<LichessTablebasePosition>(
            'https://tablebase.lichess.ovh/standard',
            {
                params: { fen: fen.replaceAll(' ', '_') },
                headers: { Accept: '*/*', Authorization: `Bearer ${token}` },
            },
        );
        return response.data;
    } catch (err) {
        console.error('Failed to get Lichess tablebase position: ', err);
        return null;
    }
}

/**
 * Fetches and caches the Lichess API token from secrets manager.
 */
async function getLichessToken(): Promise<string> {
    if (lichessToken) {
        return lichessToken;
    }

    lichessToken = await secretsManager
        .send(
            new GetSecretValueCommand({
                SecretId: `chess-dojo-${process.env.stage}-lichessApiToken`,
            }),
        )
        .then((output) => output.SecretString || undefined)
        .catch((err: unknown) => {
            console.error('Failed to get the Lichess API token: ', err);
            return undefined;
        });
    if (!lichessToken) {
        throw new ApiError({
            statusCode: 500,
            publicMessage: 'Internal server error',
            privateMessage: 'Failed to fetch Lichess API token (or it was empty)',
        });
    }
    return lichessToken;
}

/**
 * Fetches the ExplorerPositionFollower for the provided FEN and caller.
 * @param fen The FEN of the position to fetch.
 * @param event The Lambda HTTP event containing the caller's username.
 */
async function fetchFollower(fen: string, event: any): Promise<ExplorerPositionFollower | null> {
    const claims = event.requestContext?.authorizer?.jwt?.claims;
    if (!claims || !claims['cognito:username']) {
        return null;
    }
    const username = claims['cognito:username'];

    try {
        const getItemOutput = await dynamo.send(
            new GetItemCommand({
                Key: {
                    normalizedFen: { S: fen },
                    id: { S: `FOLLOWER#${username}` },
                },
                TableName: explorerTable,
            }),
        );
        if (!getItemOutput.Item) {
            return null;
        }

        const follower = unmarshall(getItemOutput.Item);
        return follower as ExplorerPositionFollower;
    } catch (err) {
        console.error(`Failed to fetch follower: `, err);
        return null;
    }
}

function handleError(code: number, err: any): APIGatewayProxyResultV2 {
    console.error(err);

    return {
        statusCode: code,
        isBase64Encoded: false,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(err),
    };
}
