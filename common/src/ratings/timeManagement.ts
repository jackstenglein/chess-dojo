/** The minimum number of games required before using Elo adjustments. */
export const MIN_GAMES_FOR_ELO = 10;

/** The K-factor used for USCF-style Elo draw calculations. */
const K_FACTOR = 32;

/** The score assigned to a draw in the Elo system. */
const DRAW_SCORE = 0.5;

/** The current state of a user's time management aggregate. */
export interface TimeManagementRating {
    /** The current aggregate rating. */
    currentRating: number;
    /** The number of games included in the aggregate. */
    numGames: number;
    /** The average signed clock area. Positive means too fast, negative means too slow. */
    area?: number;
}

/**
 * Calculates the expected score for a player using the Elo formula.
 * @param playerRating The player's current rating.
 * @param opponentRating The opponent's rating (in this case, the new game's time management rating).
 * @returns The expected score between 0 and 1.
 */
function expectedScore(playerRating: number, opponentRating: number): number {
    return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

/**
 * Calculates the updated time management rating after a new game, treating it
 * as a draw against the new game's time management rating using the USCF Elo system.
 * @param currentRating The player's current time management rating.
 * @param gameRating The time management rating from the new game.
 * @returns The updated rating, rounded to the nearest integer.
 */
function calculateRating(currentRating: number, gameRating: number): number {
    const expected = expectedScore(currentRating, gameRating);
    return Math.round(currentRating + K_FACTOR * (DRAW_SCORE - expected));
}

function calculateAverageArea(
    current: TimeManagementRating | undefined,
    gameArea: number,
    newCount: number,
): number {
    const currentArea = current?.area ?? 0;
    return currentArea + (gameArea - currentArea) / newCount;
}

/**
 * Incrementally updates the time management aggregate with a new game rating
 * and returns the new rating. The current rating is left unchanged.
 * - If fewer than MIN_GAMES_FOR_ELO games: uses a running average.
 * - If MIN_GAMES_FOR_ELO or more games: applies a USCF Elo draw adjustment.
 *
 * @param current The current aggregate, or undefined if this is the user's first game.
 * @param gameRating The time management rating from the new game.
 * @param gameArea The signed clock area from the new game.
 * @returns The new aggregate rating.
 */
export function newTimeManagementRating(
    current: TimeManagementRating | undefined,
    gameRating: number,
    gameArea = 0,
): TimeManagementRating {
    if (!current || current.numGames <= 0) {
        return { currentRating: gameRating, numGames: 1, area: gameArea };
    }

    const newCount = current.numGames + 1;
    const area = calculateAverageArea(current, gameArea, newCount);

    if (newCount <= MIN_GAMES_FOR_ELO) {
        // Running average: newAvg = oldAvg + (gameRating - oldAvg) / newCount
        const newRating = Math.round(
            current.currentRating + (gameRating - current.currentRating) / newCount,
        );
        return { currentRating: newRating, numGames: newCount, area };
    }

    // Elo draw adjustment
    return {
        currentRating: calculateRating(current.currentRating, gameRating),
        numGames: newCount,
        area,
    };
}
