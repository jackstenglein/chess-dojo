import { fideDpTable } from '../../ratings/performanceRating';
import { PuzzleRushAttempt, PuzzleRushResult, PuzzleRushStats } from './api';

/** The duration of a puzzle rush run, in seconds. */
export const PUZZLE_RUSH_DURATION_SECONDS = 10 * 60;

/** The number of failed puzzles that ends a puzzle rush run. */
export const PUZZLE_RUSH_MAX_STRIKES = 3;

/** The search rating at the start of a puzzle rush run. */
export const PUZZLE_RUSH_START_RATING = 300;

/** Puzzles are sampled from within +/- this many points of the search rating. */
export const PUZZLE_RUSH_RATING_WINDOW = 50;

/** The base rating increase after a correct puzzle. */
const BASE_RATING_INCREASE = 50;

/** The additional rating increase per puzzle in the current streak. */
const STREAK_RATING_INCREASE = 10;

/**
 * The state of the puzzle rush rating ladder. Each correct puzzle pushes a new
 * rating onto the stack, and each failed puzzle pops back to the previous rating.
 */
export interface PuzzleRushLadder {
    /** The ratings reached so far. The last entry is the current search rating. */
    stack: number[];
    /** The number of consecutive correct puzzles. */
    streak: number;
}

/** Returns the ladder state at the start of a run. */
export function initialRushLadder(): PuzzleRushLadder {
    return { stack: [PUZZLE_RUSH_START_RATING], streak: 0 };
}

/** Returns the current search rating of the given ladder. */
export function currentRushRating(ladder: PuzzleRushLadder): number {
    return ladder.stack[ladder.stack.length - 1] ?? PUZZLE_RUSH_START_RATING;
}

/**
 * Returns the search rating after a correct puzzle.
 * @param current The current search rating.
 * @param streak The streak length after including the correct puzzle.
 * @returns The new search rating.
 */
export function nextRushRating(current: number, streak: number): number {
    return current + BASE_RATING_INCREASE + STREAK_RATING_INCREASE * streak;
}

/**
 * Returns the search rating that would be in effect after a failed puzzle.
 * @param ladder The current ladder.
 * @returns The search rating after popping the ladder.
 */
export function failedRushRating(ladder: PuzzleRushLadder): number {
    if (ladder.stack.length <= 1) {
        return PUZZLE_RUSH_START_RATING;
    }
    return ladder.stack[ladder.stack.length - 2];
}

/**
 * Applies a puzzle result to the ladder.
 * @param ladder The current ladder.
 * @param result The result of the puzzle.
 * @returns The updated ladder. The original is not modified.
 */
export function applyRushResult(
    ladder: PuzzleRushLadder,
    result: PuzzleRushResult,
): PuzzleRushLadder {
    if (result === 'win') {
        const streak = ladder.streak + 1;
        return {
            stack: [...ladder.stack, nextRushRating(currentRushRating(ladder), streak)],
            streak,
        };
    }
    return {
        stack: ladder.stack.length <= 1 ? [PUZZLE_RUSH_START_RATING] : ladder.stack.slice(0, -1),
        streak: 0,
    };
}

/**
 * Computes the statistics for a puzzle rush run.
 *
 * The performance rating uses the FIDE rating difference table: the average rating
 * of the attempted puzzles plus the dp value for the percentage of puzzles solved.
 * The peak rating is the highest search rating reached by replaying the results
 * from the start rating, including the rating reached after the final puzzle.
 *
 * @param attempts The attempts made during the run, in order.
 * @returns The statistics for the run.
 */
export function computePuzzleRushStats(attempts: PuzzleRushAttempt[]): PuzzleRushStats {
    const totalCount = attempts.length;
    const correctCount = attempts.filter((a) => a.result === 'win').length;

    let peakRating = PUZZLE_RUSH_START_RATING;
    for (const attempt of attempts) {
        peakRating = Math.max(peakRating, attempt.searchRating);
    }

    if (totalCount === 0) {
        return { correctCount, totalCount, percentage: 0, peakRating };
    }

    const percentage = Math.round((100 * correctCount) / totalCount);
    const avgPuzzleRating = Math.round(
        attempts.reduce((sum, a) => sum + a.puzzleRating, 0) / totalCount,
    );
    const performanceRating = Math.max(0, avgPuzzleRating + fideDpTable[percentage]);

    return { correctCount, totalCount, percentage, performanceRating, peakRating };
}
