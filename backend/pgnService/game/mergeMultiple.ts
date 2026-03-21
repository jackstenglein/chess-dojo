import { BatchGetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Chess } from '@jackstenglein/chess';
import { MergeMultipleSchema } from '@jackstenglein/chess-dojo-common/src/pgn/merge';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseBody,
    requireUserInfo,
} from '../../directoryService/api';
import { dynamo, gamesTable, success } from './create';
import { recursiveMergeLine } from './mergeUtils';
import { Game } from './types';

/**
 * Lambda handler that merges multiple games into a single new game.
 * @param event The event that triggered the Lambda.
 * @returns The cohort and id of the newly created game.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);

        const userInfo = requireUserInfo(event);
        const request = parseBody(event, MergeMultipleSchema);

        // Fetch all games
        const games = await fetchGames(request.games);

        // Verify the caller can access all games (must be owner or game must be public)
        for (const game of games) {
            if (game.owner !== userInfo.username && game.unlisted) {
                throw new ApiError({
                    statusCode: 403,
                    publicMessage:
                        'Permission denied: you can only merge your own games or public games',
                });
            }
        }

        // Find the header source game
        const headerSourceGame = games.find(
            (g) =>
                g.cohort === request.headerSource.cohort &&
                g.id === request.headerSource.id,
        );
        if (!headerSourceGame) {
            throw new ApiError({
                statusCode: 400,
                publicMessage:
                    'Invalid request: headerSource must be one of the games in the list',
            });
        }

        // Start with the header source game as the base
        const target = new Chess({ pgn: headerSourceGame.pgn });
        target.seek(null);

        // Merge all other games into the target
        for (const game of games) {
            if (game.cohort === headerSourceGame.cohort && game.id === headerSourceGame.id) {
                continue;
            }

            const source = new Chess({ pgn: game.pgn });
            source.seek(null);

            if (source.normalizedFen() !== target.normalizedFen()) {
                throw new ApiError({
                    statusCode: 400,
                    publicMessage: `Unable to merge: game ${game.cohort}/${game.id} does not start from the same position as the header source game`,
                });
            }

            const citation = request.citeSource
                ? { source, cohort: game.cohort, id: game.id }
                : undefined;

            recursiveMergeLine(source.history(), target, null, {
                commentMergeType: request.commentMergeType,
                nagMergeType: request.nagMergeType,
                drawableMergeType: request.drawableMergeType,
                citation,
            });
        }

        // Create a new game with the merged PGN
        const mergedPgn = target.renderPgn();
        const now = new Date();
        const uploadDate = now.toISOString().slice(0, '2024-01-01'.length);
        const headers = target.header().valueMap();

        const newGame: Game = {
            cohort: headerSourceGame.cohort,
            id: `${uploadDate.replaceAll('-', '.')}_${uuidv4()}`,
            white: headers.White?.toLowerCase() || '?',
            black: headers.Black?.toLowerCase() || '?',
            date: headers.Date || '',
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            owner: userInfo.username,
            ownerDisplayName: headerSourceGame.ownerDisplayName || '',
            ownerPreviousCohort: headerSourceGame.ownerPreviousCohort || '',
            headers,
            pgn: mergedPgn,
            orientation: headerSourceGame.orientation || 'white',
            comments: [],
            positionComments: {},
            unlisted: true,
        };

        await putGame(newGame);

        return success({ cohort: newGame.cohort, id: newGame.id });
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Fetches all games with the provided keys from DynamoDB using BatchGetItem.
 * @param gameKeys The cohort/id pairs to fetch.
 * @returns The fetched games.
 */
async function fetchGames(
    gameKeys: { cohort: string; id: string }[],
): Promise<Game[]> {
    const games: Game[] = [];
    const allKeys: Record<string, { S: string }>[] = gameKeys.map(({ cohort, id }) => ({
        cohort: { S: cohort },
        id: { S: id },
    }));

    for (let i = 0; i < allKeys.length; i += 100) {
        let keys = allKeys.slice(i, i + 100);

        while (keys.length > 0) {
            const response = await dynamo.send(
                new BatchGetItemCommand({
                    RequestItems: {
                        [gamesTable]: {
                            Keys: keys,
                        },
                    },
                }),
            );

            const items = response.Responses?.[gamesTable] ?? [];
            for (const item of items) {
                games.push(unmarshall(item) as Game);
            }

            keys = (response.UnprocessedKeys?.[gamesTable]?.Keys ?? []) as typeof keys;
        }
    }

    if (games.length !== gameKeys.length) {
        const foundKeys = new Set(games.map((g) => `${g.cohort}/${g.id}`));
        const missing = gameKeys.find(
            ({ cohort, id }) => !foundKeys.has(`${cohort}/${id}`),
        );
        throw new ApiError({
            statusCode: 404,
            publicMessage: `Game ${missing?.cohort}/${missing?.id} not found`,
        });
    }

    return games;
}

/**
 * Saves a game to DynamoDB.
 * @param game The game to save.
 */
async function putGame(game: Game) {
    await dynamo.send(
        new PutItemCommand({
            Item: marshall(game, { removeUndefinedValues: true }),
            TableName: gamesTable,
        }),
    );
}


