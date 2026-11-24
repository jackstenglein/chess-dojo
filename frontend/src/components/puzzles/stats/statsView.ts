import { PUZZLEBASE_BUCKETS } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import {
    addCounters,
    averageMs,
    cleanRate,
    emptyCounters,
    firstTryRate,
    PuzzleAttempt,
    PuzzleSession,
    StatCounters,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/runs';

/** A session and the attempts made during it. */
export interface SessionView {
    session: PuzzleSession;
    /** Oldest first. */
    attempts: PuzzleAttempt[];
}

/** One calendar day of solving. */
export interface DayView {
    /** The day in the viewer's time zone, like 2026-09-29. */
    key: string;
    /** The sessions that started that day, newest first. */
    sessions: SessionView[];
    /** Everything solved that day, added up. */
    totals: StatCounters;
}

/** The calendar day a moment falls on in a time zone, like 2026-09-29. */
export function dayKey(iso: string, timeZone?: string): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date(iso));
}

/**
 * Groups sessions by the day they started, in the viewer's time zone, and puts each attempt in
 * the session it happened in. Days and sessions come back newest first. An attempt that fits no
 * session (it would be odd) is left out rather than shown in the wrong place.
 */
export function groupByDay(
    sessions: PuzzleSession[],
    attempts: PuzzleAttempt[],
    timeZone?: string,
): DayView[] {
    const days = new Map<string, DayView>();

    const ordered = [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    for (const session of ordered) {
        const inSession = attempts
            .filter(
                (a) => a.finishedAt >= session.startedAt && a.finishedAt <= session.lastActiveAt,
            )
            .sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));

        const key = dayKey(session.startedAt, timeZone);
        const day = days.get(key) ?? { key, sessions: [], totals: emptyCounters() };
        day.sessions.push({ session, attempts: inSession });
        day.totals = addCounters(day.totals, session);
        days.set(key, day);
    }
    return [...days.values()];
}

/** Formats a length of time like 45s, 1m 23s or 1h 05m. */
export function formatDuration(ms: number | undefined): string {
    if (ms === undefined || !Number.isFinite(ms)) {
        return '–';
    }
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) {
        return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`;
    }
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

/** Formats a share from 0 to 1 as a whole percent, or a dash if there is nothing to show. */
export function formatPercent(rate: number | undefined): string {
    return rate === undefined ? '–' : `${Math.round(rate * 100)}%`;
}

/** Formats a time of day for the viewer, like 9:05 AM. */
export function formatTime(iso: string, timeZone?: string): string {
    return new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(iso));
}

/** Formats a day key like 2026-09-29 as Tue, Sep 29. */
export function formatDay(key: string): string {
    const [year, month, day] = key.split('-').map(Number);
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** A tag with its numbers, ready for a table. */
export interface TagRow {
    name: string;
    counters: StatCounters;
    firstTryRate?: number;
    cleanRate?: number;
    averageMs?: number;
}

/** How the table of tags is ordered. */
export type TagSort = 'played' | 'weakest' | 'name';

/** Puzzles a tag needs before a low score on it counts as a weakness rather than bad luck. */
export const MIN_ATTEMPTS_FOR_WEAKNESS = 3;

/** Adds every bucket that has no puzzles played yet, with zeros, so none is missing from the table. */
export function withAllBuckets(byTag: Record<string, StatCounters>): Record<string, StatCounters> {
    const all = { ...byTag };
    for (const bucket of PUZZLEBASE_BUCKETS) {
        all[bucket] ??= emptyCounters();
    }
    return all;
}

/** Turns a set of running totals by tag into rows, in the order asked for. */
export function tagRows(byTag: Record<string, StatCounters>, sort: TagSort): TagRow[] {
    const rows = Object.entries(byTag).map(([name, counters]) => ({
        name,
        counters,
        firstTryRate: firstTryRate(counters),
        cleanRate: cleanRate(counters),
        averageMs: averageMs(counters),
    }));

    if (sort === 'name') {
        return rows.sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sort === 'played') {
        return rows.sort(
            (a, b) => b.counters.attempts - a.counters.attempts || a.name.localeCompare(b.name),
        );
    }
    // Weakest first: lowest first-try rate among tags played enough to mean something, then the
    // tags with too few puzzles to judge, most played first.
    const judged = (r: TagRow) =>
        r.counters.attempts >= MIN_ATTEMPTS_FOR_WEAKNESS && r.firstTryRate !== undefined;
    return rows.sort((a, b) => {
        if (judged(a) !== judged(b)) return judged(a) ? -1 : 1;
        if (judged(a)) {
            return (
                (a.firstTryRate ?? 0) - (b.firstTryRate ?? 0) ||
                b.counters.attempts - a.counters.attempts ||
                a.name.localeCompare(b.name)
            );
        }
        return b.counters.attempts - a.counters.attempts || a.name.localeCompare(b.name);
    });
}
