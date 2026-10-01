'use strict';

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
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { fetchSubscriptionTier, getAccessRole } from './access';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseEvent,
    requireUserInfo,
    success,
} from './api';
import { fetchDirectory } from './get';

/**
 * Handles requests to the get directory API. Returns an error if the directory does
 * not exist or is private and the caller does not have viewer access. Calculates and
 * returns the performance rating for the given username and rating system.
 * @param event The API gateway event that triggered the request.
 * @returns The performance rating object.
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
        return success({ stats });
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
