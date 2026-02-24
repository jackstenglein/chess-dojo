'use strict';

import {
    BatchWriteItemCommand,
    DynamoDBClient,
    GetItemCommand,
    PutItemCommand,
    UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Chess } from '@jackstenglein/chess';
import {
    DirectoryAccessRole,
    DirectoryItem,
    DirectoryItemTypes,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import {
    CreateGameRequest,
    CreateGameSchema,
    GameImportTypes,
    GameOrientation,
    GameOrientations,
} from '@jackstenglein/chess-dojo-common/src/database/game';
import { User } from '@jackstenglein/chess-dojo-common/src/database/user';
import { cleanupPgn, splitPgns } from '@jackstenglein/chess-dojo-common/src/pgn/pgn';
import {
    TimeManagementAggregate,
    updateTimeManagementAggregate,
} from '@jackstenglein/chess-dojo-common/src/ratings/timeManagement';
import {
    APIGatewayProxyEventV2,
    APIGatewayProxyHandlerV2,
    APIGatewayProxyResultV2,
} from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { checkAccess } from '../../directoryService/access';
import { addDirectoryItems } from '../../directoryService/addItems';
import { ApiError, errToApiGatewayProxyResultV2, parseBody } from '../../directoryService/api';
import { getChesscomAnalysis, getChesscomGame } from './chesscom';
import { getLichessChapter, getLichessGame, getLichessStudy } from './lichess';
import { calculateTimeManagementRatings } from './timeManagement';
import { Game, GameImportHeaders, isMissingData, isValidDate, isValidResult } from './types';

export const dynamo = new DynamoDBClient({ region: 'us-east-1' });
const usersTable = process.env.stage + '-users';
export const gamesTable = process.env.stage + '-games';
export const timelineTable = process.env.stage + '-timeline';
const MAX_GAMES_PER_IMPORT = 100;

export function success(value: any): APIGatewayProxyResultV2 {
    if (process.env.stage !== 'prod') {
        console.log('Response: %j', value);
    }
    return {
        statusCode: 200,
        body: JSON.stringify(value),
    };
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    console.log('Event: %j', event);

    try {
        const user = await getUser(event);
        const request = parseBody(event, CreateGameSchema);

        const pgnTexts = await getPgnTexts(request);
        if (pgnTexts.length > MAX_GAMES_PER_IMPORT) {
            throw new ApiError({
                statusCode: 400,
                publicMessage: `Invalid request: number of games in PGN (${pgnTexts.length}) is greater than limit of ${MAX_GAMES_PER_IMPORT} games at a time`,
            });
        }

        console.log('PGN texts length: ', pgnTexts.length);

        if (request.directory) {
            const hasAccess = await checkAccess({
                owner: request.directory.owner,
                id: request.directory.id,
                username: user.username,
                role: DirectoryAccessRole.Editor,
            });
            if (!hasAccess) {
                throw new ApiError({
                    statusCode: 403,
                    publicMessage: `Missing required editor permissions to add games to this directory`,
                    privateMessage: `Directory ${request.directory.owner}/${request.directory.id}. User ${user.username}`,
                });
            }
        }

        const games = getGames(
            user,
            pgnTexts,
            request.directory ? `${request.directory.owner}/${request.directory.id}` : undefined,
            request.publish,
            request.orientation,
        );
        if (games.length === 0) {
            throw new ApiError({
                statusCode: 400,
                publicMessage: 'Invalid request: no games found',
            });
        }

        const updated = await batchPutGames(games);

        await updateUserTimeManagementRating(user, games);

        if (request.directory) {
            await addGamesToDirectory(request.directory.owner, request.directory.id, games);
        }

        if (request.publish) {
            for (const game of games) {
                await createTimelineEntry(game);
            }
        }

        if (games.length === 1) {
            return success(games[0]);
        }
        return success({ count: updated });
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

async function getUser(event: APIGatewayProxyEventV2): Promise<User> {
    const userInfo = getUserInfo(event);
    if (!userInfo.username) {
        throw new ApiError({
            statusCode: 400,
            publicMessage: 'Invalid request: username is required',
        });
    }

    let getItemOutput = await dynamo.send(
        new GetItemCommand({
            Key: {
                username: { S: userInfo.username },
            },
            TableName: usersTable,
        }),
    );
    if (!getItemOutput.Item) {
        throw new ApiError({
            statusCode: 404,
            publicMessage: 'Invalid request: user not found',
        });
    }

    return unmarshall(getItemOutput.Item) as User;
}

export function getUserInfo(event: any): { username: string; email: string } {
    const claims = event.requestContext?.authorizer?.jwt?.claims;
    if (!claims) {
        return {
            username: '',
            email: '',
        };
    }

    return {
        username: claims['cognito:username'] || '',
        email: claims['email'] || '',
    };
}

/**
 * Returns a list of PGN texts for the given request.
 * @param request The request to get the PGN texts for.
 * @returns A list of PGN texts.
 */
export async function getPgnTexts(request: CreateGameRequest): Promise<string[]> {
    switch (request.type) {
        case GameImportTypes.lichessChapter:
            return [await getLichessChapter(request.url)];
        case GameImportTypes.lichessGame:
            return request.pgnText ? [request.pgnText] : [await getLichessGame(request.url)];
        case GameImportTypes.lichessStudy:
            return await getLichessStudy(request.url);
        case GameImportTypes.chesscomGame:
            return request.pgnText ? [request.pgnText] : [await getChesscomGame(request.url)];
        case GameImportTypes.chesscomAnalysis:
            return [await getChesscomAnalysis(request.url)];

        case GameImportTypes.editor:
        case GameImportTypes.startingPosition:
        case GameImportTypes.fen:
        case GameImportTypes.clone:
            if (request.pgnText === undefined) {
                throw new ApiError({
                    statusCode: 400,
                    publicMessage: 'Invalid request: pgnText is required for this import method',
                });
            }
            return [request.pgnText];

        case GameImportTypes.manual:
            if (request.pgnText === undefined) {
                throw new ApiError({
                    statusCode: 400,
                    publicMessage: 'Invalid request: pgnText is required for this import method',
                });
            }
            return splitPgns(request.pgnText).map(cleanupPgn);
    }
}

/**
 * Converts the list of PGNs into a list of Games.
 * @param user The user owning the new Games.
 * @param pgnTexts The PGNs to convert.
 * @param directory The directory to place the Games into.
 * @param publish Whether the game should be published or not.
 * @returns A list of new Games.
 */
function getGames(
    user: User,
    pgnTexts: string[],
    directory?: string,
    publish?: boolean,
    orientation?: GameOrientation,
): Game[] {
    const games: Game[] = [];
    for (let i = 0; i < pgnTexts.length; i++) {
        console.log('Parsing game %d: %s', i + 1, pgnTexts[i]);
        games.push(getGame(user, pgnTexts[i], undefined, directory, publish, orientation));
    }
    return games;
}

/**
 * Returns true if the given PGN text has a Variant header containing a value other than
 * `Standard`.
 * @param pgnText The PGN to test.
 * @returns True if the PGN is a variant.
 */
export function isFairyChess(pgnText: string) {
    return (
        /^\[Variant .*\]$/gim.test(pgnText) &&
        !/^\[Variant\s+['"]?Standard['"]?\s*\]$/gim.test(pgnText) &&
        !/^\[Variant\s+['"]?From Position['"]?\s*\]$/gim.test(pgnText)
    );
}

/**
 * Converts the given PGN into a Game.
 * @param user The user owning the new Game.
 * @param pgnText The PGN to convert.
 * @param headers The import headers which will be applied to the Game's headers.
 * @param directory The directory to place the Game into.
 * @param publish Whether the game should be published or not.
 * @param orientation The default orientation of the game. If excluded, it is inferred from the player names.
 * @returns A new Game object.
 */
export function getGame(
    user: User | undefined,
    pgnText: string,
    headers?: GameImportHeaders,
    directory?: string,
    publish?: boolean,
    orientation?: GameOrientation,
): Game {
    // We do not support variants due to current limitations with
    // @JackStenglein/pgn-parser
    if (isFairyChess(pgnText)) {
        throw new ApiError({
            statusCode: 400,
            publicMessage: 'Chess variants are not supported',
            privateMessage: 'Variant header found in PGN text',
        });
    }

    try {
        const chess = new Chess({ pgn: pgnText });
        if (headers?.white) {
            chess.setHeader('White', headers.white);
        }
        if (headers?.black) {
            chess.setHeader('Black', headers.black);
        }
        if (headers?.date) {
            chess.setHeader('Date', headers.date);
        }
        if (headers?.result) {
            chess.setHeader('Result', headers.result);
        }

        chess.setHeader('White', chess.header().tags.White?.trim() || '?');
        chess.setHeader('Black', chess.header().tags.Black?.trim() || '??');
        chess.setHeader('Result', chess.header().tags.Result?.trim() || '*');
        chess.setHeader('PlyCount', `${chess.plyCount()}`);

        if (!isValidDate(chess.header().tags.Date?.value)) {
            chess.setHeader('Date', '');
        }
        if (!isValidResult(chess.header().tags.Result)) {
            chess.setHeader('Result', '*');
        }

        if (publish) {
            const missingDataErr = isMissingData({
                white: chess.header().tags.White,
                black: chess.header().tags.Black,
                result: chess.header().tags.Result,
                date: chess.header().tags.Date?.value,
            });
            if (missingDataErr) {
                throw new ApiError({
                    statusCode: 400,
                    publicMessage: `Published games can not be missing data: ${missingDataErr}`,
                    privateMessage: 'publish requested, but game was missing data',
                });
            }
        }

        const now = new Date();
        const uploadDate = now.toISOString().slice(0, '2024-01-01'.length);

        const game: Game = {
            cohort: user?.dojoCohort || '',
            id: `${uploadDate.replaceAll('-', '.')}_${uuidv4()}`,
            white: chess.header().tags.White?.toLowerCase() || '?',
            black: chess.header().tags.Black?.toLowerCase() || '?',
            date: chess.header().tags.Date?.value || '',
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            owner: user?.username || '',
            ownerDisplayName: user?.displayName || '',
            ownerPreviousCohort: user?.previousCohort || '',
            headers: chess.header().valueMap(),
            pgn: chess.renderPgn(),
            orientation: orientation || getDefaultOrientation(chess, user),
            comments: [],
            positionComments: {},
            unlisted: !publish,
            directories: directory ? [directory] : undefined,
        };

        if (publish) {
            game.publishedAt = game.createdAt;
            game.timelineId = `${game.publishedAt.split('T')[0]}_${uuidv4()}`;
        }

        const tmRatings = calculateTimeManagementRatings(chess);
        if (tmRatings.white !== undefined) {
            game.timeManagementRatingWhite = tmRatings.white;
        }
        if (tmRatings.black !== undefined) {
            game.timeManagementRatingBlack = tmRatings.black;
        }

        return game;
    } catch (err) {
        throw new ApiError({
            statusCode: 400,
            publicMessage: 'Invalid PGN',
            privateMessage: 'Failed to get game',
            cause: err,
        });
    }
}

/**
 * Gets the default orientation for the given chess instance and user. If any of
 * the user's usernames match the White/Black header in the chess instance, that
 * color is returned. If not, white is used as the default orientation.
 * @param chess The chess instance to get the default orientation for.
 * @param user The user to get the default orientation for.
 * @returns The default orientation of the game.
 */
function getDefaultOrientation(chess: Chess, user?: User): GameOrientation {
    if (!user) {
        return GameOrientations.white;
    }

    for (const rating of Object.values(user.ratings)) {
        if (rating.username?.toLowerCase() === chess.header().tags.White?.toLowerCase()) {
            return GameOrientations.white;
        }
        if (rating.username?.toLowerCase() === chess.header().tags.Black?.toLowerCase()) {
            return GameOrientations.black;
        }
    }

    if (user?.displayName.toLowerCase() === chess.header().tags.Black?.toLowerCase()) {
        return GameOrientations.black;
    }

    return GameOrientations.white;
}

async function batchPutGames(games: Game[]): Promise<number> {
    const writeRequests = games.map((g) => {
        return {
            PutRequest: {
                Item: marshall(
                    {
                        ...g,
                        directories: g.directories ? new Set(g.directories) : undefined,
                    },
                    { removeUndefinedValues: true },
                ),
            },
        };
    });

    let updated = 0;
    for (let i = 0; i < writeRequests.length; i += 25) {
        const batch = writeRequests.slice(i, i + 25);
        const result = await dynamo.send(
            new BatchWriteItemCommand({
                RequestItems: {
                    [gamesTable]: batch,
                },
                ReturnConsumedCapacity: 'NONE',
            }),
        );
        if (result.UnprocessedItems && Object.values(result.UnprocessedItems).length > 0) {
            throw new ApiError({
                statusCode: 500,
                publicMessage: 'Temporary server error',
                privateMessage: 'DynamoDB BatchWriteItem failed to process',
            });
        }

        updated += batch.length;
    }

    return updated;
}

/**
 * Adds the given games to the given directory.
 * @param owner The owner of the directory.
 * @param id The id of the directory.
 * @param games The games to add. Must all have the same owner.
 */
async function addGamesToDirectory(owner: string, id: string, games: Game[]) {
    try {
        console.log('Adding %d games to directory %s/%s', games.length, owner, id);
        const directoryItems: DirectoryItem[] = games.map((g) => ({
            type: owner === g.owner ? DirectoryItemTypes.OWNED_GAME : DirectoryItemTypes.DOJO_GAME,
            id: `${g.cohort}/${g.id}`,
            metadata: {
                cohort: g.cohort,
                id: g.id,
                owner: g.owner,
                ownerDisplayName: g.ownerDisplayName || '',
                createdAt: g.createdAt,
                white: g.headers.White,
                black: g.headers.Black,
                whiteElo: g.headers.WhiteElo,
                blackElo: g.headers.BlackElo,
                result: g.headers.Result,
                unlisted: g.unlisted,
            },
        }));

        await addDirectoryItems(owner, id, directoryItems);
    } catch (err) {
        console.error('Failed to add games to directory: ', err);
    }
}

/**
 * Creates a timeline entry for the given Game.
 * @param game The game to create the timeline entry for.
 */
export async function createTimelineEntry(game: Game) {
    try {
        await dynamo.send(
            new PutItemCommand({
                Item: marshall({
                    owner: game.owner,
                    id: game.timelineId,
                    ownerDisplayName: game.ownerDisplayName,
                    requirementId: 'GameSubmission',
                    requirementName: 'GameSubmission',
                    scoreboardDisplay: 'HIDDEN',
                    cohort: game.cohort,
                    createdAt: game.publishedAt,
                    gameInfo: {
                        id: game.id,
                        headers: game.headers,
                    },
                    dojoPoints: 1,
                    reactions: {},
                }),
                TableName: timelineTable,
            }),
        );
    } catch (err) {
        console.error('Failed to create timeline entry: ', err);
    }
}

/**
 * Updates the user's aggregate time management rating based on newly created games.
 * Uses an incremental model: stores only currentRating + numGames on the user record.
 * - Provisional (< 10 games): running average
 * - Established (>= 10 games): USCF Elo draw adjustment (K=32)
 * @param user The user who created the games.
 * @param games The newly created games.
 */
async function updateUserTimeManagementRating(user: User, games: Game[]): Promise<void> {
    const newRatings: number[] = [];

    for (const game of games) {
        const ownerRating =
            game.orientation === 'black'
                ? game.timeManagementRatingBlack
                : game.timeManagementRatingWhite;

        if (ownerRating !== undefined) {
            newRatings.push(ownerRating);
        }
    }

    if (newRatings.length === 0) {
        return;
    }

    try {
        // Build the current aggregate from the user's existing TM rating
        let aggregate: TimeManagementAggregate | undefined = user.timeManagementRating;

        // Incrementally apply each new game rating
        for (const gameRating of newRatings) {
            aggregate = updateTimeManagementAggregate(aggregate, gameRating);
        }

        await dynamo.send(
            new UpdateItemCommand({
                Key: { username: { S: user.username } },
                TableName: usersTable,
                UpdateExpression: 'SET #tmr = :tmRating',
                ExpressionAttributeNames: {
                    '#tmr': 'timeManagementRating',
                },
                ExpressionAttributeValues: marshall(
                    {
                        ':tmRating': {
                            currentRating: aggregate.currentRating,
                            numGames: aggregate.numGames,
                        },
                    },
                    { removeUndefinedValues: true },
                ),
            }),
        );
    } catch (err) {
        console.error('Failed to update user time management rating: ', err);
    }
}
