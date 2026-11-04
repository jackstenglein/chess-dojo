import { PuzzleRushBests, PuzzleRushScoreSlot, PuzzleRushStanding } from './api';

/** How many of the player's runs landed on each solved-puzzle count. Keys are decimal scores. */
export type PuzzleRushScoreCounts = Record<string, number>;

/** Histogram of solved-puzzle counts for one calendar period. */
export interface PuzzleRushPeriodCounts {
    /** The day (`YYYY-MM-DD`) or ISO week (`YYYY-Www`) these counts belong to. */
    period: string;
    /** Solved-puzzle count to the number of runs with that count. */
    counts: PuzzleRushScoreCounts;
}

/** A best score tagged with the calendar period it belongs to. */
export interface PuzzleRushPeriodBest extends PuzzleRushScoreSlot {
    /** The day or ISO week this best belongs to. */
    period: string;
}

/**
 * Per-user puzzle rush summary stored in DynamoDB.
 * Score is the number of puzzles solved in a run. Counts record how many of this
 * player's runs achieved each score, so an index can be computed without listing runs.
 */
export interface PuzzleRushSummaryRecord {
    /** The username this summary belongs to. */
    username: string;
    /** Incremented on every update and used as the optimistic-concurrency token. */
    version: number;
    /** The player's best run so far. */
    allTime?: PuzzleRushScoreSlot;
    /** The player's best run in `week.period`. */
    week?: PuzzleRushPeriodBest;
    /** The player's best run in `day.period`. */
    day?: PuzzleRushPeriodBest;
    /** Counts across every saved run. */
    allTimeCounts: PuzzleRushScoreCounts;
    /** Counts for the week in `weekCounts.period`. Replaced when a new week starts. */
    weekCounts?: PuzzleRushPeriodCounts;
    /** Counts for the day in `dayCounts.period`. Replaced when a new day starts. */
    dayCounts?: PuzzleRushPeriodCounts;
}

/** The calendar day and ISO week a run belongs to, in one timezone. */
export interface PuzzleRushPeriods {
    /** Calendar day as `YYYY-MM-DD`. */
    day: string;
    /** ISO week as `YYYY-Www`, with Monday as the first day. */
    week: string;
}

/** A run being added to a player's summary. */
export interface PuzzleRushSummaryUpdate {
    /** The player's username. */
    username: string;
    /** The number of puzzles solved in the run. */
    score: number;
    /** The createdAt timestamp of the run. */
    createdAt: string;
    /** The calendar day of the run in the player's timezone. */
    day: string;
    /** The ISO week of the run in the player's timezone. */
    week: string;
}

/**
 * Returns whether `timeZone` is an IANA timezone understood by `Intl`.
 * @param timeZone The timezone to check.
 * @returns True when the timezone can be used to place a run on a calendar day.
 */
export function isValidTimeZone(timeZone: string): boolean {
    try {
        Intl.DateTimeFormat('en-US', { timeZone });
        return true;
    } catch {
        return false;
    }
}

/**
 * Returns the calendar day and ISO week of `instant` in `timeZone`.
 * The week starts on Monday, matching ISO 8601.
 * @param instant The moment the run was created.
 * @param timeZone An IANA timezone.
 * @returns The day and week keys for that moment.
 */
export function puzzleRushPeriods(instant: Date, timeZone: string): PuzzleRushPeriods {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(instant);
    const year = numberPart(parts, 'year');
    const month = numberPart(parts, 'month');
    const day = numberPart(parts, 'day');
    const { weekYear, week } = isoWeek(year, month, day);

    return {
        day: `${year}-${pad(month)}-${pad(day)}`,
        week: `${weekYear}-W${pad(week)}`,
    };
}

/**
 * Returns the 1-based index of `score` among the given counts.
 * Tied scores share an index: the index is 1 plus the number of runs with a higher score.
 * @param counts Solved-puzzle count to the number of runs with that count.
 * @param score The score being ranked.
 * @returns The index of `score`.
 */
export function puzzleRushScoreIndex(counts: PuzzleRushScoreCounts, score: number): number {
    let ahead = 0;
    for (const [rawScore, count] of Object.entries(counts)) {
        const value = Number(rawScore);
        if (Number.isFinite(value) && value > score && Number.isFinite(count)) {
            ahead += count;
        }
    }
    return ahead + 1;
}

/**
 * Returns where `update` sits given the summary currently stored for the player.
 * Week and day indexes use that period's histogram when it is still the one stored.
 * @param summary The stored summary, or undefined when the player has no summary yet.
 * @param update The run to describe.
 * @returns The score, indexes, bests, and new-best flags for the run.
 */
export function puzzleRushStanding(
    summary: PuzzleRushSummaryRecord | undefined,
    update: PuzzleRushSummaryUpdate,
): PuzzleRushStanding {
    const allTimeCounts = summary?.allTimeCounts ?? {};
    const weekCounts = summary?.weekCounts?.period === update.week ? summary.weekCounts.counts : {};
    const dayCounts = summary?.dayCounts?.period === update.day ? summary.dayCounts.counts : {};

    const fallback = { score: update.score, sessionCreatedAt: update.createdAt };
    const allTime = summary?.allTime ?? fallback;
    const week =
        summary?.week?.period === update.week
            ? { score: summary.week.score, sessionCreatedAt: summary.week.sessionCreatedAt }
            : fallback;
    const day =
        summary?.day?.period === update.day
            ? { score: summary.day.score, sessionCreatedAt: summary.day.sessionCreatedAt }
            : fallback;

    return {
        score: update.score,
        index: {
            allTime: puzzleRushScoreIndex(allTimeCounts, update.score),
            week: puzzleRushScoreIndex(weekCounts, update.score),
            day: puzzleRushScoreIndex(dayCounts, update.score),
        },
        bests: { allTime, week, day },
        newBest: {
            allTime: allTime.sessionCreatedAt === update.createdAt,
            week: week.sessionCreatedAt === update.createdAt,
            day: day.sessionCreatedAt === update.createdAt,
        },
    };
}

/**
 * Adds a run to the player's summary.
 * A strictly higher score replaces the best in a window. The first run of a new day or
 * week replaces that window even when its score is lower. Tied scores keep the earlier best.
 * @param current The stored summary, or undefined for the player's first run.
 * @param update The run to add.
 * @returns The summary to store and the standings for the run.
 */
export function applyPuzzleRushSummary(
    current: PuzzleRushSummaryRecord | undefined,
    update: PuzzleRushSummaryUpdate,
): { summary: PuzzleRushSummaryRecord; standing: PuzzleRushStanding } {
    const allTimeCounts = incrementCount(current?.allTimeCounts ?? {}, update.score);
    const weekCounts = incrementPeriod(current?.weekCounts, update.week, update.score);
    const dayCounts = incrementPeriod(current?.dayCounts, update.day, update.score);
    const slot = { score: update.score, sessionCreatedAt: update.createdAt };

    const summary: PuzzleRushSummaryRecord = {
        username: update.username,
        version: (current?.version ?? 0) + 1,
        allTime: higherScore(current?.allTime, slot),
        week: periodBest(current?.week, update.week, slot),
        day: periodBest(current?.day, update.day, slot),
        allTimeCounts,
        weekCounts,
        dayCounts,
    };

    return { summary, standing: puzzleRushStanding(summary, update) };
}

/** A saved run reduced to the fields the summary needs. */
export interface PuzzleRushSummaryRun {
    /** The number of puzzles solved in the run. */
    score: number;
    /** The createdAt timestamp of the run. */
    createdAt: string;
}

/**
 * Folds already-saved runs into a summary, oldest first.
 * Used when a player has runs from before summaries existed. The caller adds the new run after this.
 * @param username The player the runs belong to.
 * @param runs The saved runs, oldest first.
 * @param timeZone IANA timezone used to place each run on a day and week.
 * @returns The summary for those runs, or undefined when `runs` is empty.
 */
export function summarizePuzzleRushRuns(
    username: string,
    runs: PuzzleRushSummaryRun[],
    timeZone: string,
): PuzzleRushSummaryRecord | undefined {
    let summary: PuzzleRushSummaryRecord | undefined;
    for (const run of runs) {
        const periods = puzzleRushPeriods(new Date(run.createdAt), timeZone);
        summary = applyPuzzleRushSummary(summary, {
            username,
            score: run.score,
            createdAt: run.createdAt,
            day: periods.day,
            week: periods.week,
        }).summary;
    }
    return summary;
}

/**
 * Returns the bests that are still current in `periods`.
 * A stored week or day best from an earlier period is omitted.
 * @param summary The stored summary, or undefined when the player has no runs.
 * @param periods The current day and week in the player's timezone.
 * @returns The bests to show.
 */
export function visiblePuzzleRushBests(
    summary: PuzzleRushSummaryRecord | undefined,
    periods: PuzzleRushPeriods,
): PuzzleRushBests {
    return {
        allTime: summary?.allTime,
        week: summary?.week?.period === periods.week ? scoreSlot(summary.week) : undefined,
        day: summary?.day?.period === periods.day ? scoreSlot(summary.day) : undefined,
    };
}

/**
 * Reads one numeric field from `Intl` date parts.
 * @param parts The parts returned by `formatToParts`.
 * @param type The part to read.
 * @returns The numeric value of that part.
 */
function numberPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
    const value = parts.find((part) => part.type === type)?.value;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        throw new Error(`Missing date part ${type}`);
    }
    return parsed;
}

/**
 * Returns the ISO week year and week number of a calendar date.
 * @param year The full year.
 * @param month The month, from 1 to 12.
 * @param day The day of the month.
 * @returns The ISO week-year and week number.
 */
function isoWeek(year: number, month: number, day: number): { weekYear: number; week: number } {
    const date = new Date(Date.UTC(year, month - 1, day));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const weekYear = date.getUTCFullYear();
    const yearStart = new Date(Date.UTC(weekYear, 0, 1));
    const days = (date.getTime() - yearStart.getTime()) / 86400000;
    const week = Math.ceil((days + 1) / 7);
    return { weekYear, week };
}

/**
 * Keeps the stored best when its score is at least as high as `next`.
 * @param current The stored best, if the player has one.
 * @param next The run being added.
 * @returns The best to store.
 */
function higherScore(
    current: PuzzleRushScoreSlot | undefined,
    next: PuzzleRushScoreSlot,
): PuzzleRushScoreSlot {
    if (current !== undefined && current.score >= next.score) {
        return current;
    }
    return next;
}

/**
 * Keeps the stored best when it is from `period` and its score is at least as high as `next`.
 * A new period replaces the stored best.
 * @param current The stored best for this window.
 * @param period The period of the run being added.
 * @param next The run being added.
 * @returns The best to store.
 */
function periodBest(
    current: PuzzleRushPeriodBest | undefined,
    period: string,
    next: PuzzleRushScoreSlot,
): PuzzleRushPeriodBest {
    if (current?.period === period && current.score >= next.score) {
        return current;
    }
    return { ...next, period };
}

/**
 * Returns `counts` with one more run at `score`.
 * @param counts The existing counts.
 * @param score The score to increment.
 * @returns A new counts object.
 */
function incrementCount(counts: PuzzleRushScoreCounts, score: number): PuzzleRushScoreCounts {
    const key = String(score);
    return { ...counts, [key]: (counts[key] ?? 0) + 1 };
}

/**
 * Returns `current` with one more run at `score`, or a new histogram when the period changed.
 * @param current The stored histogram for this window.
 * @param period The period of the run being added.
 * @param score The score to increment.
 * @returns The histogram to store.
 */
function incrementPeriod(
    current: PuzzleRushPeriodCounts | undefined,
    period: string,
    score: number,
): PuzzleRushPeriodCounts {
    if (current?.period !== period) {
        return { period, counts: { [String(score)]: 1 } };
    }
    return { period, counts: incrementCount(current.counts, score) };
}

/**
 * Copies the score fields off a period best.
 * @param best The stored best.
 * @returns The score and the run that set it.
 */
function scoreSlot(best: PuzzleRushPeriodBest): PuzzleRushScoreSlot {
    return { score: best.score, sessionCreatedAt: best.sessionCreatedAt };
}

/**
 * Formats a positive integer as a two-digit string.
 * @param value The number to format.
 * @returns The zero-padded value.
 */
function pad(value: number): string {
    return String(value).padStart(2, '0');
}
