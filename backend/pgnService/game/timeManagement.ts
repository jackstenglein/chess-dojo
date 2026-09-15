import { BatchGetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Chess } from '@jackstenglein/chess';
import {
    Directory,
    DirectoryItemTypes,
    MY_GAMES_DIRECTORY_ID,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { Game, GameKey } from '@jackstenglein/chess-dojo-common/src/database/game';
import { clockToSeconds } from '@jackstenglein/chess-dojo-common/src/pgn/clock';
import {
    calculateTimeRating,
    ClockDatum,
} from '@jackstenglein/chess-dojo-common/src/ratings/clockRating';
import {
    newTimeManagementRating,
    TimeManagementRating,
} from '@jackstenglein/chess-dojo-common/src/ratings/timeManagement';
import { GetItemBuilder, UpdateItemBuilder } from '../../directoryService/database';
import { directoriesTable, dynamo, gamesTable, usersTable } from './database';

interface TimeManagementGameRating {
    rating: number;
    area: number;
}

export interface TimeManagementRatings {
    white?: TimeManagementGameRating;
    black?: TimeManagementGameRating;
}

/**
 * Extracts clock data from a parsed Chess instance and calculates
 * time management ratings for both sides.
 * @param chess The parsed Chess instance with move history.
 * @returns An object with optional white and black time management ratings.
 */
export function rateGameTimeManagement(chess: Chess): TimeManagementRatings {
    const timeControls = chess.header().tags.TimeControl?.items;
    if (!timeControls?.length) {
        return {};
    }

    const initialSeconds = timeControls[0].seconds ?? 0;
    const moves = chess.history();

    const whiteClock: ClockDatum[] = [{ seconds: initialSeconds }];
    const blackClock: ClockDatum[] = [{ seconds: initialSeconds }];
    let hasClockData = false;

    for (let i = 0; i < moves.length; i += 2) {
        const whiteSeconds = clockToSeconds(moves[i]?.commentDiag?.clk);
        if (whiteSeconds !== undefined) {
            hasClockData = true;
        }
        whiteClock.push({
            seconds: whiteSeconds ?? whiteClock[whiteClock.length - 1].seconds,
        });

        const blackSeconds = clockToSeconds(moves[i + 1]?.commentDiag?.clk);
        if (blackSeconds !== undefined) {
            hasClockData = true;
        }
        blackClock.push({
            seconds: blackSeconds ?? blackClock[blackClock.length - 1].seconds,
        });
    }

    if (!hasClockData) {
        return {};
    }

    const whiteResult = calculateTimeRating(timeControls, whiteClock);
    const blackResult = calculateTimeRating(timeControls, blackClock);

    return {
        white: whiteResult,
        black: blackResult,
    };
}

/**
 * Rebuilds a user's aggregate time management rating from games in their
 * mygames directory. Only games the user has saved to their personal folder
 * are included in the aggregate.
 * Used when a game is edited and its TM rating changes, since the incremental
 * aggregate model is not reversible.
 * @param owner The username of the game owner.
 */
export async function rebuildUserTimeManagementRating(owner: string): Promise<void> {
    try {
        const gameKeys = await getGameKeys(owner);
        if (gameKeys.length === 0) {
            return;
        }

        const rating = await rateAllGamesTimeManagement(gameKeys);
        await saveUserTimeManagementRating(owner, rating);
    } catch (err) {
        console.error('Failed to rebuild user time management rating: ', err);
    }
}

/**
 * Returns the game keys (cohort + id) from a user's My Games directory and
 * any subdirectories. Duplicate game keys are removed.
 * @param owner The username to get the game keys for.
 */
async function getGameKeys(owner: string): Promise<GameKey[]> {
    const queue = [MY_GAMES_DIRECTORY_ID];
    const keys = new Set<string>();

    while (queue.length) {
        const id = queue.pop();
        console.debug(`getGameKeys: fetching directory ${owner}/${id}`);
        if (!id) {
            break;
        }
        const directory = await new GetItemBuilder<Directory>()
            .key('owner', owner)
            .key('id', id)
            .table(directoriesTable)
            .send();
        if (!directory) {
            continue;
        }

        for (const item of Object.values(directory.items)) {
            if (item.type === DirectoryItemTypes.DIRECTORY) {
                queue.push(item.id);
            } else {
                keys.add(item.id);
            }
        }
    }

    const gameKeys: GameKey[] = [];
    for (const key of keys.values()) {
        console.debug(`getGameKeys: checking gameKey ${key}`);
        const parts = key.split('/');
        if (parts.length === 2) {
            gameKeys.push({ cohort: parts[0], id: parts[1] });
        }
    }
    return gameKeys;
}

type PartialGame = Pick<
    Game,
    | 'date'
    | 'createdAt'
    | 'orientation'
    | 'timeManagementRatingWhite'
    | 'timeManagementRatingBlack'
    | 'timeManagementAreaWhite'
    | 'timeManagementAreaBlack'
>;

/**
 * Gets time management ratings for the given games and computes the aggregate. The time
 * management ratings for individual games are taken from the cached values on the game objects,
 * rather than being recalculated on the fly here.
 * @param gameKeys The games to get the time management ratings for.
 * @returns The aggregate time management rating.
 */
async function rateAllGamesTimeManagement(gameKeys: GameKey[]): Promise<TimeManagementRating> {
    const games: PartialGame[] = [];

    for (let i = 0; i < gameKeys.length; i += 100) {
        let keys = gameKeys.slice(i, i + 100).map((k) => marshall(k));

        while (keys.length > 0) {
            const result = await dynamo.send(
                new BatchGetItemCommand({
                    RequestItems: {
                        [gamesTable]: {
                            Keys: keys,
                            ProjectionExpression:
                                '#date, createdAt, orientation, timeManagementRatingWhite, timeManagementRatingBlack, timeManagementAreaWhite, timeManagementAreaBlack',
                            ExpressionAttributeNames: { '#date': 'date' },
                        },
                    },
                }),
            );
            for (const item of result.Responses?.[gamesTable] ?? []) {
                const game = unmarshall(item) as PartialGame;
                games.push(game);
            }
            keys = result.UnprocessedKeys?.[gamesTable]?.Keys ?? [];
        }
    }

    games.sort((lhs, rhs) => (lhs.date || lhs.createdAt).localeCompare(rhs.date || rhs.createdAt));
    let aggregate: TimeManagementRating = { currentRating: 0, numGames: 0 };
    for (const game of games) {
        const ownerRating =
            game.orientation === 'black'
                ? game.timeManagementRatingBlack
                : game.timeManagementRatingWhite;
        const ownerArea =
            game.orientation === 'black'
                ? game.timeManagementAreaBlack
                : game.timeManagementAreaWhite;

        if (ownerRating !== undefined && ownerRating >= 0) {
            aggregate = newTimeManagementRating(aggregate, ownerRating, ownerArea ?? 0);
        }
    }

    return aggregate;
}

/**
 * Updates the given user to set their time management rating in the database.
 * @param username The user to set the time management rating for.
 * @param aggregate The aggregate time management rating to save on the user.
 */
async function saveUserTimeManagementRating(
    username: string,
    aggregate: TimeManagementRating,
): Promise<void> {
    await new UpdateItemBuilder()
        .key('username', username)
        .set('timeManagementRating', aggregate)
        .table(usersTable)
        .send();
}
