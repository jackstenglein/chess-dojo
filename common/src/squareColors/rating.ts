/** Configuration constants for the square color drill rating computation. */
export const SQUARE_COLOR_RATING_CONFIG = {
    /** Weight applied to the accuracy score when computing the rating. */
    accuracyWeight: 0.65,
    /** Weight applied to the time score when computing the rating. */
    timeWeight: 0.35,
    /** The maximum possible rating. */
    maxRating: 1500,
    /** Response time in milliseconds considered "fast" (full time score). */
    fastMs: 500,
    /** Response time in milliseconds considered "slow" (zero time score). */
    slowMs: 10000,
} as const;

/**
 * The minimum number of questions required before a rating is computed
 * and displayed to the user.
 */
export const MIN_QUESTIONS_FOR_RATING = 20;

/**
 * Clamps a value between a minimum and maximum.
 * @param value - The value to clamp.
 * @param min - The minimum allowed value.
 * @param max - The maximum allowed value.
 * @returns The clamped value.
 */
function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * Computes a square color drill rating from accuracy and average response time.
 *
 * The rating combines an accuracy score (proportion of correct answers) and a
 * time score (how quickly the user responded on average) using a weighted sum:
 *
 *   accuracyScore = clamp(accuracy / 100, 0, 1)
 *   timeScore     = clamp(1 - (avgResponseTimeMs - fastMs) / (slowMs - fastMs), 0, 1)
 *   rating        = round(maxRating * (accuracyWeight * accuracyScore + timeWeight * timeScore))
 *
 * @param accuracy - Percentage of correct answers (0–100).
 * @param avgResponseTimeMs - Average response time in milliseconds.
 * @returns An integer rating in the range [0, 1500].
 */
export function computeSquareColorRating(accuracy: number, avgResponseTimeMs: number): number {
    const { accuracyWeight, timeWeight, maxRating, fastMs, slowMs } = SQUARE_COLOR_RATING_CONFIG;

    const accuracyScore = clamp(accuracy / 100, 0, 1);
    const timeScore = clamp(1 - (avgResponseTimeMs - fastMs) / (slowMs - fastMs), 0, 1);

    return Math.round(maxRating * (accuracyWeight * accuracyScore + timeWeight * timeScore));
}
