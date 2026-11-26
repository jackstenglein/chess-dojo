'use strict';

import { BatchGetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { ratingToCohort } from '@jackstenglein/chess-dojo-common/src/database/cohort';
import {
    CohortPerformanceStats,
    compareRoles,
    Directory,
    DirectoryAccessRole,
    DirectoryItemTypes,
    DirectoryVisibility,
    GetDirectoryStatsRequestSchema,
    PerformanceStats,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { RatingSystem } from '@jackstenglein/chess-dojo-common/src/database/user';
import { fideDpTable } from '@jackstenglein/chess-dojo-common/src/ratings/performanceRating';
import { getNormalizedRating } from '@jackstenglein/chess-dojo-common/src/ratings/ratings';
import {
    newTimeManagementRating,
    TimeManagementRating,
} from '@jackstenglein/chess-dojo-common/src/ratings/timeManagement';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { fetchSubscriptionTier, getAccessRole } from './access';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseEvent,
    requireUserInfo,
    success,
} from './api';
import { dynamo, gameTable } from './database';
import { fetchDirectory } from './get';

/**
 * Handles requests to the get directory API. Returns an error if the directory does
 * not exist or is private and the caller does not have viewer access. Calculates and
 * returns the performance rating and time management rating for the given username
 * and rating system.
 * @param event The API gateway event that triggered the request.
 * @returns The performance stats and time management rating.
 */
export const handlerV2: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);

        const userInfo = requireUserInfo(event);
        const request = parseEvent(event, GetDirectoryStatsRequestSchema);
        const ratingSystem = toRatingSystem(request.ratingSystem);

        const directory = await fetchDirectory(request.owner, request.id);
        if (!directory) {
            throw new ApiError({
                statusCode: 404,
                publicMessage: 'Directory not found',
            });
        }

        if (directory.visibility !== DirectoryVisibility.PUBLIC) {
            const subscriptionTier =
                userInfo.username === directory.owner
                    ? undefined
                    : await fetchSubscriptionTier(userInfo.username);
            const accessRole = await getAccessRole({
                owner: directory.owner,
                id: directory.id,
                username: userInfo.username,
                directory,
                subscriptionTier,
            });
            const isViewer = compareRoles(DirectoryAccessRole.Viewer, accessRole);
            if (!isViewer) {
                throw new ApiError({
                    statusCode: 403,
                    publicMessage:
                        'Missing required viewer permission to generate performance rating for this directory.',
                });
            }
        }

        const stats = getPerformanceStats(request.username, directory, ratingSystem);
        const timeManagementRating = await getDirectoryTimeManagementRating(
            request.username,
            directory,
        );
        return success({ stats, timeManagementRating });
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Converts the given string into a RatingSystem enum.
 * @param query The string to convert.
 * @returns The RatingSystem that corresponds to the string.
 */
function toRatingSystem(query: string): RatingSystem {
    for (const rs of Object.values(RatingSystem)) {
        if (query === rs) {
            return rs;
        }
    }
    throw new ApiError({ statusCode: 400, publicMessage: `Unknown rating system ${query}` });
}

/**
 * Returns the performance stats for the given username, directory and rating system.
 * @param username The username to calculate the performance rating for, as recorded in the PGN.
 * @param directory The directory to calculate the performance rating for.
 * @param ratingSystem The rating system to calculate the performance rating for.
 * @returns The performance stats.
 */
export function getPerformanceStats(
    username: string,
    directory: Directory,
    ratingSystem: RatingSystem,
): PerformanceStats {
    const stats: PerformanceStats = {
        wins: { total: 0, white: 0, black: 0 },
        draws: { total: 0, white: 0, black: 0 },
        losses: { total: 0, white: 0, black: 0 },
        rating: { total: 0, white: 0, black: 0 },
        normalizedRating: { total: 0, white: 0, black: 0 },
        avgOppRating: { total: 0, white: 0, black: 0 },
        normalizedAvgOppRating: { total: 0, white: 0, black: 0 },
        cohortRatings: {},
    };

    const playerName = username.toLowerCase();

    for (const currentId of directory.itemIds) {
        const currentItem = directory.items[currentId];
        if (
            currentItem.type !== DirectoryItemTypes.OWNED_GAME ||
            !currentItem.metadata.result ||
            currentItem.metadata.result === '*'
        ) {
            continue;
        }

        const { white, black, result, whiteElo, blackElo } = currentItem.metadata;

        let opponentElo = 0;
        let resultKey: 'wins' | 'draws' | 'losses' = 'draws';
        let color: 'white' | 'black';

        if (white.toLowerCase().includes(playerName)) {
            opponentElo = blackElo ? parseInt(blackElo) : 0;
            resultKey = result === '1-0' ? 'wins' : result === '0-1' ? 'losses' : 'draws';
            color = 'white';
        } else if (black.toLowerCase().includes(playerName)) {
            opponentElo = whiteElo ? parseInt(whiteElo) : 0;
            resultKey = result === '1-0' ? 'losses' : result === '0-1' ? 'wins' : 'draws';
            color = 'black';
        } else {
            continue;
        }

        if (opponentElo <= 0 || isNaN(opponentElo)) {
            continue;
        }

        const oppCohort = ratingToCohort(opponentElo, ratingSystem);
        if (!oppCohort) {
            continue;
        }
        if (!stats.cohortRatings[oppCohort]) {
            stats.cohortRatings[oppCohort] = {
                wins: { total: 0, white: 0, black: 0 },
                draws: { total: 0, white: 0, black: 0 },
                losses: { total: 0, white: 0, black: 0 },
                rating: { total: 0, white: 0, black: 0 },
                normalizedRating: { total: 0, white: 0, black: 0 },
                avgOppRating: { total: 0, white: 0, black: 0 },
                normalizedAvgOppRating: { total: 0, white: 0, black: 0 },
            };
        }
        updateStats(stats, resultKey, color, opponentElo);
        updateStats(stats.cohortRatings[oppCohort], resultKey, color, opponentElo);
    }

    const totalGames = stats.wins.total + stats.draws.total + stats.losses.total;
    if (totalGames === 0) {
        return stats;
    }

    calculatePerformanceRatings(stats, ratingSystem);
    for (const metric of Object.values(stats.cohortRatings)) {
        calculatePerformanceRatings(metric, ratingSystem);
    }

    return stats;
}

/**
 * Updates the given stats object for the given result key and color.
 * The average opponent's elo is added to the total/color and the result's
 * total/color is incremented.
 * @param stats The stats to update.
 * @param resultKey The result to update.
 * @param color The color to update.
 * @param opponentElo The ELO of the opponent.
 */
function updateStats(
    stats: PerformanceStats | CohortPerformanceStats,
    resultKey: 'wins' | 'draws' | 'losses',
    color: 'white' | 'black',
    opponentElo: number,
) {
    stats.avgOppRating.total += opponentElo;
    stats.avgOppRating[color] += opponentElo;
    stats[resultKey].total++;
    stats[resultKey][color]++;
}

/**
 * Calculates and saves the performance ratings on the given stats object.
 * @param stats The stats object to use and update when calculating.
 * @param ratingSystem The rating system to use when normalizing ratings.
 */
function calculatePerformanceRatings(
    stats: PerformanceStats | CohortPerformanceStats,
    ratingSystem: RatingSystem,
) {
    for (const color of ['total', 'white', 'black'] as const) {
        const numGames = stats.wins[color] + stats.draws[color] + stats.losses[color];
        if (numGames === 0) {
            continue;
        }
        const score = Math.round((100 * (stats.wins[color] + 0.5 * stats.draws[color])) / numGames);
        stats.avgOppRating[color] = Math.round(stats.avgOppRating[color] / numGames);
        stats.normalizedAvgOppRating[color] = getNormalizedRating(
            stats.avgOppRating[color],
            ratingSystem,
        );
        stats.rating[color] = stats.avgOppRating[color] + fideDpTable[score];
        stats.normalizedRating[color] = getNormalizedRating(stats.rating[color], ratingSystem);
    }
}

/** A game's cached time management rating for one player. */
export interface DirectoryTimeManagementGame {
    /** The PGN date, in YYYY.MM.DD format. */
    date?: string | null;
    /** The datetime the game was uploaded, in ISO format. */
    createdAt?: string;
    /** The time management rating for the selected player. */
    rating?: number;
    /** The signed clock area for the selected player. */
    area?: number;
}

const PGN_DATE = /^\d{4}\.\d{2}\.\d{2}$/;

interface StoredTimeManagement {
    cohort: string;
    id: string;
    timeManagementRatingWhite?: number;
    timeManagementRatingBlack?: number;
    timeManagementAreaWhite?: number;
    timeManagementAreaBlack?: number;
}

/**
 * Returns the date used to order time management games. Valid PGN dates are
 * preferred. Other dates fall back to the upload date.
 * @param date The PGN date.
 * @param createdAt The upload datetime.
 * @returns A YYYY-MM-DD string, or an empty string when neither date is usable.
 */
function timeManagementSortDate(date?: string | null, createdAt?: string): string {
    if (date && PGN_DATE.test(date)) {
        const parsed = Date.parse(date.replaceAll('.', '-'));
        if (!Number.isNaN(parsed)) {
            return date.replaceAll('.', '-');
        }
    }
    return createdAt?.slice(0, 10) ?? '';
}

/**
 * Replays the time management aggregate for games in one directory. Games are
 * applied in chronological order, matching the profile aggregate. Games without
 * a time management rating are skipped.
 * @param games The selected player's per-game ratings.
 * @returns The aggregate time management rating.
 */
export function aggregateDirectoryTimeManagement(
    games: DirectoryTimeManagementGame[],
): TimeManagementRating {
    const ordered = games
        .filter((game) => game.rating !== undefined && game.rating >= 0)
        .map((game) => ({
            game,
            date: timeManagementSortDate(game.date, game.createdAt),
        }))
        .sort(
            (lhs, rhs) =>
                lhs.date.localeCompare(rhs.date) ||
                (lhs.game.createdAt ?? '').localeCompare(rhs.game.createdAt ?? ''),
        );

    let rating: TimeManagementRating = { currentRating: 0, numGames: 0 };
    for (const { game } of ordered) {
        rating = newTimeManagementRating(rating, game.rating ?? 0, game.area ?? 0);
    }
    return rating;
}

/**
 * Returns the owned games in the directory where the given player name appears,
 * along with the color they played.
 * @param username The player name as recorded in the PGN.
 * @param directory The directory to search.
 * @returns Matching games in directory order.
 */
function playerTimeManagementGames(username: string, directory: Directory) {
    const playerName = username.toLowerCase();
    const games: {
        cohort: string;
        id: string;
        color: 'white' | 'black';
        date?: string | null;
        createdAt?: string;
    }[] = [];

    for (const itemId of directory.itemIds) {
        const item = directory.items[itemId];
        if (item?.type !== DirectoryItemTypes.OWNED_GAME) {
            continue;
        }

        const { white, black, cohort, id, date, createdAt } = item.metadata;
        let color: 'white' | 'black' | undefined;
        if (white.toLowerCase().includes(playerName)) {
            color = 'white';
        } else if (black.toLowerCase().includes(playerName)) {
            color = 'black';
        }
        if (!color) {
            continue;
        }

        games.push({ cohort, id, color, date, createdAt });
    }

    return games;
}

/**
 * Loads cached time management ratings for the given games.
 * @param keys The cohort and id of each game.
 * @returns The stored ratings, keyed by cohort/id.
 */
async function fetchStoredTimeManagement(keys: { cohort: string; id: string }[]) {
    const byId = new Map<string, StoredTimeManagement>();

    for (let i = 0; i < keys.length; i += 100) {
        let pending = keys
            .slice(i, i + 100)
            .map((key) => marshall({ cohort: key.cohort, id: key.id }));
        while (pending.length > 0) {
            const result = await dynamo.send(
                new BatchGetItemCommand({
                    RequestItems: {
                        [gameTable]: {
                            Keys: pending,
                            ProjectionExpression:
                                'cohort, id, timeManagementRatingWhite, timeManagementRatingBlack, timeManagementAreaWhite, timeManagementAreaBlack',
                        },
                    },
                }),
            );
            for (const item of result.Responses?.[gameTable] ?? []) {
                const game = unmarshall(item) as StoredTimeManagement;
                byId.set(`${game.cohort}/${game.id}`, game);
            }
            pending = result.UnprocessedKeys?.[gameTable]?.Keys ?? [];
        }
    }

    return byId;
}

/**
 * Calculates the time management rating for a player from the owned games in a
 * directory. Ratings are read from the cached values on each game.
 * @param username The player name as recorded in the PGN.
 * @param directory The directory to calculate the rating for.
 * @returns The aggregate time management rating. numGames is 0 when no game has a rating.
 */
export async function getDirectoryTimeManagementRating(
    username: string,
    directory: Directory,
): Promise<TimeManagementRating> {
    const games = playerTimeManagementGames(username, directory);
    if (games.length === 0) {
        return { currentRating: 0, numGames: 0 };
    }

    const stored = await fetchStoredTimeManagement(games);
    return aggregateDirectoryTimeManagement(
        games.map((game) => {
            const record = stored.get(`${game.cohort}/${game.id}`);
            const rating =
                game.color === 'black'
                    ? record?.timeManagementRatingBlack
                    : record?.timeManagementRatingWhite;
            const area =
                game.color === 'black'
                    ? record?.timeManagementAreaBlack
                    : record?.timeManagementAreaWhite;
            return {
                date: game.date,
                createdAt: game.createdAt,
                rating,
                area,
            };
        }),
    );
}
