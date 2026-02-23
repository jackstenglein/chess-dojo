'use strict';

import {
    AttributeValue,
    BatchExecuteStatementCommand,
    BatchStatementRequest,
    ConditionalCheckFailedException,
    DeleteItemCommand,
    UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { DirectoryGameMetadata } from '@jackstenglein/chess-dojo-common/src/database/directory';
import {
    UpdateGameRequest,
    UpdateGameSchema,
} from '@jackstenglein/chess-dojo-common/src/database/game';
import {
    APIGatewayProxyEventV2,
    APIGatewayProxyHandlerV2,
    APIGatewayProxyResultV2,
} from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { ApiError, errToApiGatewayProxyResultV2, parseEvent } from '../../directoryService/api';
import { directoryTable } from '../../directoryService/database';
import {
    createTimelineEntry,
    dynamo,
    gamesTable,
    getGame,
    getPgnTexts,
    getUserInfo,
    success,
    timelineTable,
} from './create';
import { Game, GameUpdate, isMissingData } from './types';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        return await updateGame(event);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

async function updateGame(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
    const userInfo = getUserInfo(event);
    if (!userInfo.username) {
        throw new ApiError({
            statusCode: 400,
            publicMessage: 'Invalid request: username is required',
        });
    }

    const request = parseEvent(event, UpdateGameSchema);
    const update = await getGameUpdate(request);

    const result = await applyUpdate(userInfo.username, request.cohort, request.id, update);
    if (update.timelineId) {
        await createTimelineEntry(result.new);
    } else if (update.unlisted && request.timelineId) {
        await deleteTimelineEntry(result.new, request.timelineId);
    }

    await updateDirectories(result.new, result.old);

    return success(result.new);
}

/**
 * Returns a GameUpdate based on the given request.
 * @param request The UpdateGameRequest to process.
 * @returns A GameUpdate based on the given request.
 */
async function getGameUpdate(request: UpdateGameRequest): Promise<GameUpdate> {
    const update: GameUpdate = {
        updatedAt: new Date().toISOString(),
    };

    if (request.unlisted !== undefined) {
        update.unlisted = request.unlisted;

        if (request.unlisted) {
            update.publishedAt = '';
            update.timelineId = '';
        } else {
            update.publishedAt = new Date().toISOString();
            update.timelineId = `${update.publishedAt?.split('T')[0]}_${uuidv4()}`;
        }
    }

    if (request.orientation) {
        update.orientation = request.orientation;
    }

    if (request.type) {
        const pgnText = (await getPgnTexts(request))[0];
        const game = getGame(undefined, pgnText, request.headers);

        update.white = game.white;
        update.black = game.black;
        update.date = game.date;
        update.pgn = game.pgn;
        update.headers = game.headers;
        update.timeManagementRatingWhite = game.timeManagementRatingWhite;
        update.timeManagementRatingBlack = game.timeManagementRatingBlack;

        const result = game.headers['Result'];
        const missingDataErr = isMissingData({ ...update, result });
        if (missingDataErr && update.unlisted !== undefined && !update.unlisted) {
            throw new ApiError({
                statusCode: 400,
                publicMessage: `Published games can not be missing data: ${missingDataErr}`,
                privateMessage: 'update requested, but game was missing data',
            });
        }
    }

    return update;
}

/**
 * Saves the provided GameUpdate in the database.
 * @param owner The user making the update request.
 * @param cohort The cohort the Game is in.
 * @param id The id of the Game.
 * @param update The update to apply.
 * @returns The updated Game.
 */
async function applyUpdate(
    owner: string,
    cohort: string,
    id: string,
    update: GameUpdate,
): Promise<{ old: Game; new: Game }> {
    const updateParams = getUpdateParams(update);
    updateParams.ExpressionAttributeNames['#owner'] = 'owner';
    updateParams.ExpressionAttributeValues[':owner'] = { S: owner };

    const input = new UpdateItemCommand({
        ConditionExpression: 'attribute_exists(id) AND #owner = :owner',
        Key: {
            cohort: { S: cohort },
            id: { S: id },
        },
        TableName: gamesTable,
        ...updateParams,
        ReturnValues: 'ALL_OLD',
    });

    try {
        const response = await dynamo.send(input);
        if (response.Attributes) {
            const oldGame = unmarshall(response.Attributes) as Game;
            oldGame.directories = [...(oldGame.directories ?? [])];
            const newGame = { ...oldGame, ...update };
            return { old: oldGame, new: newGame };
        } else {
            throw new ApiError({
                statusCode: 500,
                publicMessage: 'Temporary server error',
                privateMessage: 'DDB update completed but returned no attributes',
            });
        }
    } catch (err) {
        if (err instanceof ConditionalCheckFailedException) {
            throw new ApiError({
                statusCode: 400,
                publicMessage:
                    'Invalid request: game not found or you do not have permission to update it',
                privateMessage: 'DDB conditional check failed',
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

function getUpdateParams(params: { [key: string]: any }) {
    return {
        UpdateExpression: `set ${Object.entries(params)
            .map(([key]) => `#${key} = :${key}, `)
            .reduce((acc, str) => acc + str)
            .slice(0, -2)}`,
        ExpressionAttributeNames: Object.keys(params).reduce(
            (acc, key) => ({ ...acc, [`#${key}`]: key }),
            {} as Record<string, string>,
        ),
        ExpressionAttributeValues: marshall(
            Object.entries(params).reduce(
                (acc, [key, value]) => ({ ...acc, [`:${key}`]: value }),
                {},
            ),
            { removeUndefinedValues: true },
        ),
    };
}

/**
 * Deletes the timeline entry associated with the given Game.
 * @param game The Game to delete the timeline entry for.
 * @param id The id of the timeline entry.
 */
async function deleteTimelineEntry(game: Game, id: string) {
    try {
        await dynamo.send(
            new DeleteItemCommand({
                Key: {
                    owner: { S: game.owner },
                    id: { S: id },
                },
                TableName: timelineTable,
            }),
        );
    } catch (err) {
        console.error('Failed to delete timeline entry: ', err);
    }
}

async function updateDirectories(newGame: Game, oldGame: Game) {
    if (!newGame.directories?.length) {
        console.log('No directories to update.');
        return;
    }

    if (
        newGame.headers.White === oldGame.headers.White &&
        newGame.headers.Black === oldGame.headers.Black &&
        newGame.headers.WhiteElo === oldGame.headers.WhiteElo &&
        newGame.headers.BlackElo === oldGame.headers.BlackElo &&
        newGame.headers.Result === oldGame.headers.Result &&
        newGame.unlisted === oldGame.unlisted
    ) {
        console.log('No changes to game directory information, skipping update of directories.');
        return;
    }

    console.log('Updating %d directories', newGame.directories.length);

    const gameId = `${newGame.cohort}/${newGame.id}`;
    const gameInfo: DirectoryGameMetadata = {
        owner: newGame.owner,
        ownerDisplayName: newGame.ownerDisplayName,
        createdAt: newGame.createdAt || newGame.date.replaceAll('.', '-'),
        id: newGame.id,
        cohort: newGame.cohort,
        white: newGame.headers.White,
        black: newGame.headers.Black,
        whiteElo: newGame.headers.WhiteElo,
        blackElo: newGame.headers.BlackElo,
        result: newGame.headers.Result,
        unlisted: newGame.unlisted,
    };

    for (let i = 0; i < newGame.directories.length; i += 25) {
        const statements: BatchStatementRequest[] = [];

        for (let j = i; j < newGame.directories.length && j < i + 25; j++) {
            const item = newGame.directories[j];

            const tokens = item.split('/');
            const owner = tokens[0];
            const id = tokens[1];
            if (!owner || !id) {
                continue;
            }

            const params = marshall([gameInfo, owner, id], {
                removeUndefinedValues: true,
            }) as unknown as AttributeValue[];
            statements.push({
                Statement: `UPDATE "${directoryTable}" SET items."${gameId}".metadata=? WHERE owner=? AND id=?`,
                Parameters: params,
            });
        }

        if (statements.length > 0) {
            console.log('Sending BatchExecuteStatements: %j', statements);
            const input = new BatchExecuteStatementCommand({ Statements: statements });
            const result = await dynamo.send(input);
            console.log('BatchExecuteResult: %j', result);
        }
    }
}
