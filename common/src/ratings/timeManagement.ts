/** The minimum number of games required before using Elo adjustments. */
export const MIN_GAMES_FOR_ELO = 10;

/** The K-factor used for USCF-style Elo draw calculations. */
const K_FACTOR = 32;

/** The current state of a user's time management aggregate. */
export interface TimeManagementAggregate {
    /** The current aggregate rating. */
    currentRating: number;
    /** The number of games included in the aggregate. */
    numGames: number;
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
export function calculateDrawEloAdjustment(
    currentRating: number,
    gameRating: number,
): number {
    const expected = expectedScore(currentRating, gameRating);
    // A draw scores 0.5
    return Math.round(currentRating + K_FACTOR * (0.5 - expected));
}

/**
 * Incrementally updates the time management aggregate with a new game rating.
 * - If fewer than MIN_GAMES_FOR_ELO games: uses a running average.
 * - If MIN_GAMES_FOR_ELO or more games: applies a USCF Elo draw adjustment.
 *
 * @param current The current aggregate, or undefined if this is the user's first game.
 * @param gameRating The time management rating from the new game.
 * @returns The updated aggregate.
 */
export function updateTimeManagementAggregate(
    current: TimeManagementAggregate | undefined,
    gameRating: number,
): TimeManagementAggregate {
    if (!current) {
        return { currentRating: gameRating, numGames: 1 };
    }

    const newCount = current.numGames + 1;

    if (newCount <= MIN_GAMES_FOR_ELO) {
        // Running average: newAvg = oldAvg + (gameRating - oldAvg) / newCount
        const newRating = Math.round(
            current.currentRating + (gameRating - current.currentRating) / newCount,
        );
        return { currentRating: newRating, numGames: newCount };
    }

    // Elo draw adjustment
    return {
        currentRating: calculateDrawEloAdjustment(current.currentRating, gameRating),
        numGames: newCount,
    };
}
