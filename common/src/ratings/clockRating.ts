import { TimeControl } from '@jackstenglein/chess';

/** Minimal clock datum needed for time management calculation. */
export interface ClockDatum {
    /** The number of seconds remaining on the clock at this move. */
    seconds: number;
}

export const MIN_MOVE = 5;
export const MAX_MOVE = 50;
const PERFECT_TIME_AT_MAX_MOVE = 120; // Expected to have 2 minutes at move 50
const MAX_RATING = 3000; // The rating given if the player has zero area
export const MIN_TIME_CONTROL = 30 * 60; // 30 minutes

/**
 * Returns the number of seconds the perfect line would have on the clock for the given
 * time control and move.
 * @param timeControls The time controls of the game.
 * @param move The move to calculate the number of seconds for.
 * @returns The number of seconds the perfect line would have on the clock at the given move.
 */
export function getPerfectLineSeconds(timeControls: TimeControl[], move: number): number {
    if (move < MIN_MOVE) {
        throw new Error(
            `Provided move ${move} must be greater than or equal to min move ${MIN_MOVE}`,
        );
    }
    if (move > MAX_MOVE) {
        throw new Error(
            `Provided move ${move} must be less than or equal to max move ${MAX_MOVE}`,
        );
    }

    const initialTime = timeControls[0].seconds ?? 0;
    const coefficient = (initialTime - PERFECT_TIME_AT_MAX_MOVE) / (MAX_MOVE - MIN_MOVE) ** 2;
    let expectedTime = coefficient * (move - MAX_MOVE) ** 2 + PERFECT_TIME_AT_MAX_MOVE;

    if (timeControls[0].moves && move >= timeControls[0].moves) {
        expectedTime += timeControls[1]?.seconds ?? 0;
    }

    return Math.round(expectedTime);
}

/**
 * Calculates the approximate area between the player's clock graph and the perfect
 * clock graph. This function approximates the value integral[a, b] |f(x) - g(x)| dx. The
 * approximation is calculated using the trapezoidal method, where each trapezoid has
 * a height of 1.
 * @param dataset The player's clock at each move.
 * @param timeControls The time controls for the game.
 * @returns The player's area and the zero rating area.
 */
function calculateAreas(
    dataset: ClockDatum[],
    timeControls: TimeControl[],
): { playerArea: number; absolutePlayerArea: number; zeroRatingArea: number } {
    let playerArea = 0;
    let absolutePlayerArea = 0;
    let zeroRatingArea = 0;

    const initialSeconds = timeControls[0].seconds ?? 0;

    for (let i = MIN_MOVE; i < Math.min(dataset.length, MAX_MOVE) - 1; i++) {
        const player1 = dataset[i].seconds;
        const player2 = dataset[i + 1].seconds;

        const perfect1 = getPerfectLineSeconds(timeControls, i);
        const perfect2 = getPerfectLineSeconds(timeControls, i + 1);

        const pointArea = (Math.abs(player1 - perfect1) + Math.abs(player2 - perfect2)) / 2;

        if (player1 > perfect1 || player2 > perfect2) {
            playerArea += pointArea;
        } else {
            playerArea -= pointArea;
        }

        absolutePlayerArea += pointArea;
        zeroRatingArea += (initialSeconds - perfect1 + (initialSeconds - perfect2)) / 2;
    }

    return { playerArea, absolutePlayerArea, zeroRatingArea };
}

/**
 * Calculates the time management rating for the given dataset.
 * @param timeControls The time controls for the game.
 * @param dataset The player's clock at each move.
 * @returns The time management rating and area for the given dataset, or undefined if it cannot be calculated.
 */
export function calculateTimeRating(
    timeControls: TimeControl[],
    dataset: ClockDatum[],
): { rating: number; area: number } | undefined {
    if (dataset.length < MIN_MOVE) {
        return;
    }
    if ((timeControls[0].seconds ?? 0) < MIN_TIME_CONTROL) {
        return;
    }

    // The player's rating is calculated as a point on the line between (0, MAX_RATING) and (zeroRatingArea, 0).
    const { playerArea, absolutePlayerArea, zeroRatingArea } = calculateAreas(
        dataset,
        timeControls,
    );
    const playerRating = ((-1 * MAX_RATING) / zeroRatingArea) * absolutePlayerArea + MAX_RATING;
    return { rating: Math.round(Math.max(0, playerRating)), area: playerArea };
}
