import { TimeControl } from '@jackstenglein/chess';

/** Minimal clock datum needed for time management calculation. */
export interface ClockDatum {
    /** The number of seconds remaining on the clock at this move. */
    seconds: number;
}

/** The move number that clock data begins calculating from. */
export const MIN_MOVE = 5;
/** The final move of the initial curve and the length of each later curve. */
export const MAX_MOVE = 50;
/** The minimum initial time in seconds that the clock must start with to have a clock rating. */
export const MIN_TIME_CONTROL = 30 * 60; // 30 minutes

const PERFECT_TIME_AT_MAX_MOVE = 120; // Expected to have 2 minutes at the end of each curve
const MAX_RATING = 3000; // The rating given if the player has zero area

/**
 * Returns the final move covered by the time management curve.
 * @param timeControls The time controls of the game.
 * @returns Move 50, or 50 moves after the last reachable time control begins.
 */
export function getTimeRatingMaxMove(timeControls: TimeControl[]): number {
    let moveCount = 0;
    for (let i = 1; i < timeControls.length; i++) {
        const moves = timeControls[i - 1].moves;
        if (!moves) break;
        moveCount += moves;
    }
    return moveCount + MAX_MOVE;
}

function getCurveSeconds(seconds: number, startMove: number, endMove: number, move: number) {
    const coefficient = (seconds - PERFECT_TIME_AT_MAX_MOVE) / (endMove - startMove) ** 2;
    const remainingMoves = endMove - Math.min(endMove, Math.max(startMove, move));
    return coefficient * remainingMoves ** 2 + PERFECT_TIME_AT_MAX_MOVE;
}

function getPerfectLineState(timeControls: TimeControl[], move: number) {
    let seconds = timeControls[0].seconds ?? 0;
    let availableSeconds = seconds;
    let startMove = MIN_MOVE;
    let endMove = MAX_MOVE;
    let moveCount = 0;

    for (let i = 1; i < timeControls.length; i++) {
        const moves = timeControls[i - 1].moves;
        if (!moves) break;
        moveCount += moves;
        if (move < moveCount) break;

        const addedSeconds = timeControls[i].seconds ?? 0;
        seconds = getCurveSeconds(seconds, startMove, endMove, moveCount) + addedSeconds;
        availableSeconds += addedSeconds;
        startMove = moveCount;
        endMove = startMove + MAX_MOVE;
    }

    return {
        seconds: Math.round(getCurveSeconds(seconds, startMove, endMove, move)),
        availableSeconds,
    };
}

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
    const maxMove = getTimeRatingMaxMove(timeControls);
    if (move > maxMove) {
        throw new Error(`Provided move ${move} must be less than or equal to max move ${maxMove}`);
    }

    return getPerfectLineState(timeControls, move).seconds;
}

/**
 * Calculates the approximate area between the player's clock graph and the perfect
 * clock graph. This function approximates the value ∫[a, b] |f(x) - g(x)| dx. The
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

    const maxMove = getTimeRatingMaxMove(timeControls);

    for (let i = MIN_MOVE; i < Math.min(dataset.length - 1, maxMove); i++) {
        const player1 = dataset[i].seconds;
        const player2 = dataset[i + 1].seconds;

        const state1 = getPerfectLineState(timeControls, i);
        const state2 = getPerfectLineState(timeControls, i + 1);
        const perfect1 = state1.seconds;
        const perfect2 = state2.seconds;

        const pointArea = (Math.abs(player1 - perfect1) + Math.abs(player2 - perfect2)) / 2;

        if (player1 > perfect1 || player2 > perfect2) {
            playerArea += pointArea;
        } else {
            playerArea -= pointArea;
        }

        absolutePlayerArea += pointArea;
        zeroRatingArea +=
            (state1.availableSeconds - perfect1 + (state2.availableSeconds - perfect2)) / 2;
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
    if (dataset.length < MIN_MOVE + 2) {
        // We require at least MIN_MOVE moves, plus 2 for both players to play one turn afterward.
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
    if (zeroRatingArea <= 0) {
        return;
    }
    const playerRating = ((-1 * MAX_RATING) / zeroRatingArea) * absolutePlayerArea + MAX_RATING;
    return { rating: Math.round(Math.max(0, playerRating)), area: playerArea };
}
