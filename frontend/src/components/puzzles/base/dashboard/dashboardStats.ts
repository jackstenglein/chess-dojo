import {
    DashboardAttempt,
    firstTryRate,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/runs';
import { dayKey } from '../../stats/statsView';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The stretches of time the dashboard can show. */
export const RANGES = [
    { value: '7d', label: 'Last 7 days', days: 7 },
    { value: '30d', label: 'Last 30 days', days: 30 },
    { value: '90d', label: 'Last 90 days', days: 90 },
    { value: '365d', label: 'Last year', days: 365 },
] as const;
export type RangeValue = (typeof RANGES)[number]['value'];

/** Returns the start and end of a range that ends now. */
export function rangeFor(value: RangeValue, now = Date.now()): { from: string; to: string } {
    const days = RANGES.find((r) => r.value === value)?.days ?? 30;
    return {
        from: new Date(now - days * DAY_MS).toISOString(),
        to: new Date(now).toISOString(),
    };
}

/** Short names for the rating systems on members' profiles. */
const SYSTEM_LABELS: Record<string, string> = {
    CHESSCOM: 'Chess.com',
    LICHESS: 'Lichess',
    FIDE: 'FIDE',
    USCF: 'USCF',
    ECF: 'ECF',
    CFC: 'CFC',
    DWZ: 'DWZ',
    ACF: 'ACF',
    KNSB: 'KNSB',
    CUSTOM: 'Custom',
    CUSTOM_2: 'Custom 2',
    CUSTOM_3: 'Custom 3',
};
export const systemLabel = (system: string) => SYSTEM_LABELS[system] ?? system;

/** The name to show for whoever made an attempt. */
export const solverName = (a: DashboardAttempt) => a.solver?.displayName || a.username;

/** Time from the start until the solver's first move was settled, in ms. */
export const firstMoveMs = (a: DashboardAttempt): number | undefined => a.moves[0]?.ms;

/** Time spent after the solver's first move was settled, in ms. */
export function afterFirstMoveMs(a: DashboardAttempt): number | undefined {
    const first = firstMoveMs(a);
    return first === undefined ? undefined : Math.max(0, a.summary.totalMs - first);
}

/** The average of the numbers that are there, or undefined if there are none. */
function average(values: (number | undefined)[]): number | undefined {
    const present = values.filter((v): v is number => v !== undefined && Number.isFinite(v));
    return present.length === 0 ? undefined : present.reduce((a, b) => a + b, 0) / present.length;
}

/** The share of finished attempts with no wrong move, or undefined if none finished. */
function cleanShare(attempts: DashboardAttempt[]): number | undefined {
    const finished = attempts.filter((a) => a.summary.result !== 'abandoned');
    return finished.length === 0
        ? undefined
        : finished.filter((a) => a.summary.result === 'clean').length / finished.length;
}

/** The share of solver moves that were right first time. */
function firstTryShare(attempts: DashboardAttempt[]): number | undefined {
    return firstTryRate({
        attempts: 0,
        clean: 0,
        solved: 0,
        abandoned: 0,
        mistakes: 0,
        totalMs: 0,
        moves: attempts.reduce((n, a) => n + a.summary.moves, 0),
        movesFirstTry: attempts.reduce((n, a) => n + a.summary.movesFirstTry, 0),
    });
}

/** What happened on one day. */
export interface DayCount {
    /** YYYY-MM-DD in the viewer's time zone. */
    day: string;
    attempts: number;
    solvers: number;
}

/** The headline numbers for a stretch of time. */
export interface Overview {
    attempts: number;
    solvers: number;
    puzzles: number;
    clean: number;
    solved: number;
    abandoned: number;
    cleanRate?: number;
    firstTryRate?: number;
    averageMs?: number;
    averageAfterFirstMs?: number;
    averageScore?: number;
    /** Every day in the range, oldest first, including days with nothing. */
    days: DayCount[];
}

/** Works out the headline numbers and the attempts per day. */
export function overview(
    attempts: DashboardAttempt[],
    range: { from: string; to: string },
    timeZone?: string,
): Overview {
    const byDay = new Map<string, { attempts: number; solvers: Set<string> }>();
    for (const a of attempts) {
        const key = dayKey(a.finishedAt, timeZone);
        const day = byDay.get(key) ?? { attempts: 0, solvers: new Set<string>() };
        day.attempts++;
        day.solvers.add(a.username);
        byDay.set(key, day);
    }

    const days: DayCount[] = [];
    const last = dayKey(range.to, timeZone);
    // Step half a day at a time and skip repeats, so no day is missed when the clocks change.
    for (let t = Date.parse(range.from); ; t += DAY_MS / 2) {
        const key = dayKey(new Date(t).toISOString(), timeZone);
        if (days.at(-1)?.day !== key) {
            const day = byDay.get(key);
            days.push({ day: key, attempts: day?.attempts ?? 0, solvers: day?.solvers.size ?? 0 });
        }
        if (key >= last || days.length > 800) break;
    }

    const count = (result: string) => attempts.filter((a) => a.summary.result === result).length;
    return {
        attempts: attempts.length,
        solvers: new Set(attempts.map((a) => a.username)).size,
        puzzles: new Set(attempts.map((a) => a.puzzleId)).size,
        clean: count('clean'),
        solved: count('solved'),
        abandoned: count('abandoned'),
        cleanRate: cleanShare(attempts),
        firstTryRate: firstTryShare(attempts),
        averageMs: average(attempts.map((a) => a.summary.totalMs)),
        averageAfterFirstMs: average(attempts.map(afterFirstMoveMs)),
        averageScore: average(attempts.map((a) => a.scoring?.score)),
        days,
    };
}

/** How one puzzle went for everyone who played it. */
export interface PuzzleRow {
    puzzleId: string;
    /** The puzzle's rating at its most recent attempt. */
    puzzleRating: number;
    attempts: number;
    solvers: number;
    cleanRate?: number;
    firstTryRate?: number;
    averageMs?: number;
    averageAfterFirstMs?: number;
    averageScore?: number;
    /** The average normalized Dojo rating of those who played it. */
    averageSolverRating?: number;
    /** The average change to solvers' PuzzleBase rating, over attempts that counted. */
    averageDelta?: number;
}

/** Works out how each puzzle went, most played first. */
export function puzzleRows(attempts: DashboardAttempt[]): PuzzleRow[] {
    const byPuzzle = new Map<string, DashboardAttempt[]>();
    for (const a of attempts) {
        byPuzzle.set(a.puzzleId, [...(byPuzzle.get(a.puzzleId) ?? []), a]);
    }
    return [...byPuzzle.entries()]
        .map(([puzzleId, list]) => {
            const latest = list.reduce((a, b) => (a.finishedAt > b.finishedAt ? a : b));
            return {
                puzzleId,
                puzzleRating: latest.puzzleRating,
                attempts: list.length,
                solvers: new Set(list.map((a) => a.username)).size,
                cleanRate: cleanShare(list),
                firstTryRate: firstTryShare(list),
                averageMs: average(list.map((a) => a.summary.totalMs)),
                averageAfterFirstMs: average(list.map(afterFirstMoveMs)),
                averageScore: average(list.map((a) => a.scoring?.score)),
                averageSolverRating: average(list.map((a) => a.solver?.normalizedRating)),
                averageDelta: average(
                    list.map((a) => (a.scoring?.counted ? a.scoring.delta : undefined)),
                ),
            };
        })
        .sort((a, b) => b.attempts - a.attempts || a.puzzleId.localeCompare(b.puzzleId));
}

/** Quotes a value for a CSV file. */
function csvCell(value: string | number | undefined): string {
    if (value === undefined) return '';
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** The rating systems that appear in any of the attempts, in a fixed order. */
export function ratingSystemsIn(attempts: DashboardAttempt[]): string[] {
    const seen = new Set(attempts.flatMap((a) => Object.keys(a.solver?.ratings ?? {})));
    const known = Object.keys(SYSTEM_LABELS).filter((s) => seen.has(s));
    return [...known, ...[...seen].filter((s) => !(s in SYSTEM_LABELS)).sort()];
}

/** Every attempt as a CSV file, one row per attempt, for a spreadsheet. */
export function attemptsCsv(attempts: DashboardAttempt[]): string {
    const systems = ratingSystemsIn(attempts);
    const header = [
        'Finished at',
        'Username',
        'Name',
        'Cohort',
        'Puzzle',
        'Puzzle rating',
        'Result',
        'Total seconds',
        'First move seconds',
        'After first move seconds',
        'Moves right',
        'Moves right first try',
        'Mistakes',
        'Moves shown',
        'Accuracy',
        'Speed',
        'Score',
        'Counted',
        'PuzzleBase rating before',
        'PuzzleBase rating after',
        'PuzzleBase rating change',
        'Normalized Dojo rating',
        'Main rating system',
        ...systems.map(systemLabel),
    ];
    const round = (value: number | undefined, factor = 1) =>
        value === undefined ? undefined : Math.round(value * factor) / factor;
    const seconds = (ms: number | undefined) =>
        ms === undefined ? undefined : Math.round(ms / 100) / 10;
    const rows = attempts.map((a) => [
        a.finishedAt,
        a.username,
        a.solver?.displayName,
        a.solver?.cohort,
        a.puzzleId,
        a.puzzleRating,
        a.summary.result,
        seconds(a.summary.totalMs),
        seconds(firstMoveMs(a)),
        seconds(afterFirstMoveMs(a)),
        a.summary.moves,
        a.summary.movesFirstTry,
        a.summary.mistakes,
        a.summary.revealed,
        round(a.scoring?.accuracy, 100),
        round(a.scoring?.speed, 100),
        round(a.scoring?.score, 100),
        a.scoring ? (a.scoring.counted ? 'yes' : 'no') : undefined,
        round(a.scoring?.ratingBefore),
        round(a.scoring?.ratingAfter),
        round(a.scoring?.delta, 10),
        a.solver?.normalizedRating,
        a.solver?.ratingSystem ? systemLabel(a.solver.ratingSystem) : undefined,
        ...systems.map((s) => a.solver?.ratings[s]),
    ]);
    return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}
