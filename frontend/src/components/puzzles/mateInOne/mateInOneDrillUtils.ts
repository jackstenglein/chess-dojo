import { MateInOneAttempt } from '@jackstenglein/chess-dojo-common/src/mateInOne/api';
import {
    PUZZLES_PER_BLOCK,
    computeMateInOneRating,
} from '@jackstenglein/chess-dojo-common/src/mateInOne/rating';

/**
 * Strips check, checkmate, and promotion characters so answers like
 * "Qh7" match "Qh7#" and "a8Q" matches "a8=Q".
 *
 * @param san - A SAN move string.
 * @returns The normalised lowercase move.
 */
export function normalizeSan(san: string): string {
    return san
        .replace(/[x+#=-]/g, '')
        .replace(/[0]/g, 'O')
        .toLowerCase()
        .trim();
}

/**
 * Returns true when the user's input matches the correct mating move,
 * ignoring check/checkmate annotations and promotion `=` characters.
 *
 * @param userInput - The text the user typed.
 * @param correctSan - The puzzle's correct mating move in SAN.
 * @returns Whether the user's input matches the correct move.
 */
export function isCorrectAnswer(userInput: string, correctSan: string): boolean {
    return normalizeSan(userInput) === normalizeSan(correctSan);
}

/** Aggregate stats for a list of mate-in-one attempts. */
export interface SessionStats {
    /** Total active solve time across the attempts, in seconds. */
    totalTimeSeconds: number;
    /** Number of correct attempts. */
    correctCount: number;
    /** Average per-attempt response time in milliseconds. */
    avgResponseTimeMs: number;
    /** The block rating, present only when the block is exactly PUZZLES_PER_BLOCK long. */
    rating?: number;
}

/**
 * Computes summary statistics from a list of attempts.
 *
 * @param allAttempts - The attempts to summarize.
 * @param totalTimeMs - Total active solve time across the attempts (paused time excluded).
 * @returns The aggregate stats, including a rating when the block is exactly 10 puzzles.
 */
export function computeSessionStats(
    allAttempts: MateInOneAttempt[],
    totalTimeMs: number,
): SessionStats {
    const totalTimeSeconds = Math.round(totalTimeMs / 1000);
    const correctCount = allAttempts.filter((a) => a.isCorrect).length;
    const avgResponseTimeMs =
        allAttempts.length > 0
            ? Math.round(
                  allAttempts.reduce((sum, a) => sum + a.responseTimeMs, 0) / allAttempts.length,
              )
            : 0;

    const stats: SessionStats = { totalTimeSeconds, correctCount, avgResponseTimeMs };
    if (allAttempts.length === PUZZLES_PER_BLOCK) {
        stats.rating = computeMateInOneRating(correctCount, totalTimeSeconds);
    }
    return stats;
}
