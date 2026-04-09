import {
    BatchGetItemCommand,
    GetItemCommand,
    UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Chess } from '@jackstenglein/chess';
import { clockToSeconds } from '@jackstenglein/chess-dojo-common/src/pgn/clock';
import {
    calculateTimeRating,
    ClockDatum,
} from '@jackstenglein/chess-dojo-common/src/ratings/clockRating';
import {
    TimeManagementRating,
    applyGameRatingToTimeManagementRating,
} from '@jackstenglein/chess-dojo-common/src/ratings/timeManagement';
import { dynamo, directoriesTable, gamesTable, usersTable } from './database';

export interface TimeManagementRatings {
    white?: number;
    black?: number;
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
        white: whiteResult?.rating,
        black: blackResult?.rating,
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
/**
 * Returns the game keys (cohort + id) from a user's mygames directory.
 */
async function getGameKeys(owner: string): Promise<{ cohort: string; id: string }[]> {
    const dirResult = await dynamo.send(
        new GetItemCommand({
            TableName: directoriesTable,
            Key: marshall({ owner, id: 'mygames' }),
            ProjectionExpression: 'itemIds',
        }),
    );

    // itemIds may be stored as SS (String Set) or L (List of Strings)
    const rawIds = dirResult.Item?.itemIds;
    const itemIds: string[] =
        rawIds?.SS ?? rawIds?.L?.map((item) => item.S!).filter(Boolean) ?? [];

    return itemIds
        .map((id) => id.split('/'))
        .filter((parts) => parts.length === 2)
        .map(([cohort, id]) => ({ cohort, id }));
}

/**
 * Batch-gets TM ratings for the given games and computes the aggregate.
 */
async function rateAllGamesTimeManagement(
    gameKeys: { cohort: string; id: string }[],
): Promise<TimeManagementRating | undefined> {
    let aggregate: TimeManagementRating | undefined;

    for (let i = 0; i < gameKeys.length; i += 100) {
        const result = await dynamo.send(
            new BatchGetItemCommand({
                RequestItems: {
                    [gamesTable]: {
                        Keys: gameKeys
                            .slice(i, i + 100)
                            .map((k) => marshall({ cohort: k.cohort, id: k.id })),
                        ProjectionExpression:
                            'orientation, timeManagementRatingWhite, timeManagementRatingBlack',
                    },
                },
            }),
        );

        for (const item of result.Responses?.[gamesTable] ?? []) {
            const game = unmarshall(item) as {
                orientation?: string;
                timeManagementRatingWhite?: number;
                timeManagementRatingBlack?: number;
            };
            const ownerRating =
                game.orientation === 'black'
                    ? game.timeManagementRatingBlack
                    : game.timeManagementRatingWhite;

            if (ownerRating !== undefined && ownerRating >= 0) {
                aggregate = applyGameRatingToTimeManagementRating(aggregate, ownerRating);
            }
        }
    }

    return aggregate;
}

export async function rebuildUserTimeManagementRating(owner: string): Promise<void> {
    try {
        const gameKeys = await getGameKeys(owner);
        if (gameKeys.length === 0) {
            return;
        }

        const rating = await rateAllGamesTimeManagement(gameKeys);
        if (rating) {
            await saveUserTimeManagementRating(owner, rating);
        } else {
            await removeUserTimeManagementRating(owner);
        }
    } catch (err) {
        console.error('Failed to rebuild user time management rating: ', err);
    }
}

async function saveUserTimeManagementRating(
    owner: string,
    aggregate: TimeManagementRating,
): Promise<void> {
    await dynamo.send(
        new UpdateItemCommand({
            Key: { username: { S: owner } },
            TableName: usersTable,
            UpdateExpression: 'SET #tmr = :tmRating',
            ExpressionAttributeNames: { '#tmr': 'timeManagementRating' },
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
}

async function removeUserTimeManagementRating(owner: string): Promise<void> {
    await dynamo.send(
        new UpdateItemCommand({
            Key: { username: { S: owner } },
            TableName: usersTable,
            UpdateExpression: 'REMOVE #tmr',
            ExpressionAttributeNames: { '#tmr': 'timeManagementRating' },
        }),
    );
}
