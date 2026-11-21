import { dojoCohorts } from '../../database/cohort';
import { PuzzleRushLeaderboardRow } from './api';
import { PuzzleRushSummaryRecord, puzzleRushRunCount } from './summary';

/** A leaderboard row plus its 1-based rank. Tied scores share a rank. */
export interface RankedPuzzleRushLeaderboardRow extends PuzzleRushLeaderboardRow {
    /** 1-based rank. The next rank after a tie skips the tied places. */
    rank: number;
}

/** The name and cohort used to place a player on the leaderboard. */
export interface PuzzleRushLeaderboardPlayer {
    /** The player's display name. Blank names fall back to the username. */
    displayName?: string;
    /** The player's Dojo cohort. Values outside the Dojo cohorts are omitted. */
    cohort?: string;
}

/**
 * Returns `cohort` when it is one of the Dojo cohorts.
 * @param cohort The cohort stored on the player.
 * @returns The cohort, or undefined when the player is not in a Dojo cohort.
 */
export function puzzleRushCohort(cohort: string | undefined): string | undefined {
    if (!cohort) {
        return undefined;
    }
    return (dojoCohorts as readonly string[]).includes(cohort) ? cohort : undefined;
}

/**
 * Orders leaderboard rows by score descending, then by the earlier best, then by username.
 * @param a The first row.
 * @param b The second row.
 * @returns A negative number when `a` should appear first.
 */
export function comparePuzzleRushLeaderboardRows(
    a: PuzzleRushLeaderboardRow,
    b: PuzzleRushLeaderboardRow,
): number {
    if (a.score !== b.score) {
        return b.score - a.score;
    }
    if (a.sessionCreatedAt !== b.sessionCreatedAt) {
        return a.sessionCreatedAt < b.sessionCreatedAt ? -1 : 1;
    }
    return a.username.localeCompare(b.username);
}

/**
 * Sorts `rows` and assigns ranks. Tied scores share a rank, and the following rank skips ahead.
 * @param rows The players to rank. The input is not modified.
 * @returns The ranked rows, highest score first.
 */
export function rankPuzzleRushLeaderboard(
    rows: PuzzleRushLeaderboardRow[],
): RankedPuzzleRushLeaderboardRow[] {
    const sorted = [...rows].sort(comparePuzzleRushLeaderboardRows);
    let rank = 0;
    let previousScore: number | undefined;
    return sorted.map((row, index) => {
        if (previousScore !== row.score) {
            rank = index + 1;
            previousScore = row.score;
        }
        return { ...row, rank };
    });
}

/**
 * Builds the leaderboard rows stored for a player's summary.
 * The monthly row is included only when `month` is the summary's UTC month.
 * @param summary The player's summary after the run has been counted.
 * @param player The display name and cohort to show.
 * @param month The UTC month (`YYYY-MM`) to publish, usually the current month or the run's month.
 * @returns The all-time row, and the monthly row when the player has a run in `month`.
 */
export function puzzleRushLeaderboardRows(
    summary: PuzzleRushSummaryRecord,
    player: PuzzleRushLeaderboardPlayer,
    month: string,
): { allTime?: PuzzleRushLeaderboardRow; monthly?: PuzzleRushLeaderboardRow } {
    const monthlyCounts =
        summary.monthCounts?.period === month ? summary.monthCounts.counts : undefined;
    return {
        allTime: rowFor(summary, summary.allTime, summary.allTimeCounts, player),
        monthly:
            summary.month?.period === month
                ? rowFor(summary, summary.month, monthlyCounts, player)
                : undefined,
    };
}

/**
 * Returns the leaderboard writes for a summary: all-time, and the summary's UTC month when set.
 * @param summary The player's summary after the run has been counted.
 * @param player The display name and cohort to show.
 * @returns One entry per board the summary should update.
 */
export function puzzleRushLeaderboardWrites(
    summary: PuzzleRushSummaryRecord,
    player: PuzzleRushLeaderboardPlayer,
): { period: string; row: PuzzleRushLeaderboardRow }[] {
    const period = summary.month?.period;
    const rows = puzzleRushLeaderboardRows(summary, player, period ?? '');
    const writes: { period: string; row: PuzzleRushLeaderboardRow }[] = [];
    if (rows.allTime) {
        writes.push({ period: 'allTime', row: rows.allTime });
    }
    if (rows.monthly && period) {
        writes.push({ period, row: rows.monthly });
    }
    return writes;
}

/**
 * Copies a best score into a leaderboard row.
 * A best with no recorded counts still counts as one completed run.
 * @param summary The summary the best belongs to.
 * @param slot The best score, or undefined when the player has no best in this window.
 * @param counts The histogram for the window.
 * @param player The display name and cohort to show.
 * @returns The row to store, or undefined when there is no best.
 */
function rowFor(
    summary: PuzzleRushSummaryRecord,
    slot: { score: number; sessionCreatedAt: string } | undefined,
    counts: PuzzleRushSummaryRecord['allTimeCounts'] | undefined,
    player: PuzzleRushLeaderboardPlayer,
): PuzzleRushLeaderboardRow | undefined {
    if (!slot) {
        return undefined;
    }
    const cohort = puzzleRushCohort(player.cohort);
    const displayName = player.displayName?.trim() || summary.username;
    const runs = puzzleRushRunCount(counts);
    return {
        username: summary.username,
        displayName,
        ...(cohort ? { cohort } : {}),
        score: slot.score,
        runs: runs > 0 ? runs : 1,
        sessionCreatedAt: slot.sessionCreatedAt,
    };
}
