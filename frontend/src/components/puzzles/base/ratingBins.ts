/**
 * Lower edges of the rating bands: 400 points wide up to 1200, then 200 points wide.
 * The last band is open-ended.
 */
export const RATING_BIN_EDGES = [
    0, 400, 800, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800,
] as const;

/** Returns the index of the band containing the given rating. */
export function ratingBinIndex(rating: number): number {
    for (let i = RATING_BIN_EDGES.length - 1; i >= 0; i--) {
        if (rating >= RATING_BIN_EDGES[i]) {
            return i;
        }
    }
    return 0;
}

/** Returns a display label for the given band, e.g. 1200–1400 or 2800+. */
export function ratingBinLabel(index: number): string {
    const low = RATING_BIN_EDGES[index];
    const high = RATING_BIN_EDGES[index + 1];
    return high === undefined ? `${low}+` : `${low}–${high}`;
}

/** Counts how many of the given ratings fall in each band. */
export function countRatingBins(ratings: number[]): number[] {
    const counts = RATING_BIN_EDGES.map(() => 0);
    for (const rating of ratings) {
        counts[ratingBinIndex(rating)]++;
    }
    return counts;
}

/** The highest rating a puzzle can have. Matches the puzzlebase API schema. */
export const MAX_PUZZLE_RATING = 3500;

/**
 * Parses a user-entered puzzle rating. Returns undefined unless it is a whole number from 0 to
 * MAX_PUZZLE_RATING.
 */
export function parseRating(input: string): number | undefined {
    const trimmed = input.trim();
    if (!/^\d+$/.test(trimmed)) {
        return undefined;
    }
    const rating = parseInt(trimmed, 10);
    return rating <= MAX_PUZZLE_RATING ? rating : undefined;
}
