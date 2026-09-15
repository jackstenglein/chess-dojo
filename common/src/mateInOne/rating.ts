/** Number of mate-in-one puzzles in a single rating block. */
export const PUZZLES_PER_BLOCK = 10;

/**
 * One band row of the mate-in-one rating table. The rating returned for a
 * given (score, t) is: floor when t > slowMin, cap when t < fastMin, and a
 * linear interpolation between (slowMin, slowRating) and (fastMin, fastRating)
 * inside the band.
 */
interface BandRow {
    /** Score (number correct out of 10) this row applies to. */
    score: number;
    /** The slow edge of the band (in minutes). */
    slowMin: number;
    /** The fast edge of the band (in minutes). */
    fastMin: number;
    /** Rating at the slow edge of the band. */
    slowRating: number;
    /** Rating at the fast edge of the band. */
    fastRating: number;
    /** Rating returned when t > slowMin (clamped floor). */
    floor: number;
    /** Rating returned when t < fastMin (clamped cap). */
    cap: number;
}

/**
 * Per-score band rows. Boundary inclusivity (pinned by tests):
 * - Score 1-5: at t=40 the floor wins; at t=10 the cap wins.
 * - Score 6: at t=40 → 1800; at t=15 → 1900 (slow band wins); below t=15 is the
 *   second band starting at 2000; at t=5 → 2099 (cap).
 * - Score 7-9: at t=15 → 2100/2200/2300 (interp band wins); above t=15 is floor;
 *   at t=5 → 2199/2299/2399 (cap).
 * - Score 10: at t=15 → 2400 (interp band wins); at t=10 → 2500 (cap).
 *
 * Score 6 has two bands stacked, so it is handled specially in the function.
 * All other scores have a single linear band.
 */
const BAND_TABLE: Record<number, BandRow[]> = {
    1: [
        {
            score: 1,
            slowMin: 40,
            fastMin: 10,
            slowRating: 300,
            fastRating: 600,
            floor: 300,
            cap: 600,
        },
    ],
    2: [
        {
            score: 2,
            slowMin: 40,
            fastMin: 10,
            slowRating: 600,
            fastRating: 900,
            floor: 600,
            cap: 900,
        },
    ],
    3: [
        {
            score: 3,
            slowMin: 40,
            fastMin: 10,
            slowRating: 900,
            fastRating: 1200,
            floor: 900,
            cap: 1200,
        },
    ],
    4: [
        {
            score: 4,
            slowMin: 40,
            fastMin: 10,
            slowRating: 1200,
            fastRating: 1500,
            floor: 1200,
            cap: 1500,
        },
    ],
    5: [
        {
            score: 5,
            slowMin: 40,
            fastMin: 10,
            slowRating: 1500,
            fastRating: 1800,
            floor: 1500,
            cap: 1800,
        },
    ],
    6: [
        {
            score: 6,
            slowMin: 40,
            fastMin: 15,
            slowRating: 1800,
            fastRating: 1900,
            floor: 1800,
            cap: 1900,
        },
        {
            score: 6,
            slowMin: 15,
            fastMin: 5,
            slowRating: 2000,
            fastRating: 2099,
            floor: 2000,
            cap: 2099,
        },
    ],
    7: [
        {
            score: 7,
            slowMin: 15,
            fastMin: 5,
            slowRating: 2100,
            fastRating: 2199,
            floor: 2000,
            cap: 2199,
        },
    ],
    8: [
        {
            score: 8,
            slowMin: 15,
            fastMin: 5,
            slowRating: 2200,
            fastRating: 2299,
            floor: 2100,
            cap: 2299,
        },
    ],
    9: [
        {
            score: 9,
            slowMin: 15,
            fastMin: 5,
            slowRating: 2300,
            fastRating: 2399,
            floor: 2200,
            cap: 2399,
        },
    ],
    10: [
        {
            score: 10,
            slowMin: 15,
            fastMin: 10,
            slowRating: 2400,
            fastRating: 2500,
            floor: 2300,
            cap: 2500,
        },
    ],
};

/**
 * Linearly interpolates a rating within a band between (slowMin, slowRating)
 * and (fastMin, fastRating). Caller must ensure t is within the band.
 *
 * @param t Time in minutes.
 * @param row The band row.
 * @returns The interpolated rating (not yet rounded).
 */
function interpolate(t: number, row: BandRow): number {
    const span = row.slowMin - row.fastMin;
    if (span === 0) return row.slowRating;
    const fraction = (row.slowMin - t) / span;
    return row.slowRating + fraction * (row.fastRating - row.slowRating);
}

/**
 * Computes the mate-in-one rating for a single 10-problem block.
 *
 * The rating follows a fixed lookup table keyed by score (number correct out
 * of 10) and total active solve time, with linear interpolation inside each
 * time band. Outside bands the rating is clamped to the band floor or cap.
 * Score 0 is always 0. See the rating section of the mate-in-one drill spec
 * for the full table and boundary tie-breaks.
 *
 * @param correct Number of correctly solved problems (0-10).
 * @param totalTimeSeconds Total active solve time for the block in seconds (excluding paused time).
 * @returns Integer rating, floor 0.
 */
export function computeMateInOneRating(correct: number, totalTimeSeconds: number): number {
    if (correct <= 0) return 0;
    const score = Math.min(10, Math.max(0, Math.round(correct)));
    if (score === 0) return 0;

    const t = totalTimeSeconds / 60;
    const rows = BAND_TABLE[score];

    if (score >= 1 && score <= 5) {
        const row = rows[0];
        if (t >= row.slowMin) return row.floor;
        if (t < row.fastMin) return row.cap;
        return Math.round(interpolate(t, row));
    }

    if (score === 6) {
        const slow = rows[0];
        const fast = rows[1];
        if (t > slow.slowMin) return slow.floor;
        if (t >= fast.slowMin) return Math.round(interpolate(t, slow));
        if (t >= fast.fastMin) return Math.round(interpolate(t, fast));
        return fast.cap;
    }

    if (score >= 7 && score <= 9) {
        const row = rows[0];
        if (t > row.slowMin) return row.floor;
        if (t < row.fastMin) return row.cap;
        return Math.round(interpolate(t, row));
    }

    // score === 10
    const row = rows[0];
    if (t > row.slowMin) return row.floor;
    if (t < row.fastMin) return row.cap;
    return Math.round(interpolate(t, row));
}
