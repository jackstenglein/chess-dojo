import { z } from 'zod';
import { PuzzlebasePuzzle } from './api';
import type { AttemptScoring, MemberRating } from './scoring';

/**
 * How long someone can go without finishing a puzzle before their next one starts a new session.
 */
export const SESSION_GAP_MS = 30 * 60 * 1000;

/** The longest any single time can be, in ms. Anything longer is a forgotten tab, not thinking. */
const MAX_MS = 60 * 60 * 1000;

/** One move the solver tried on the board. */
export const TryRecordSchema = z.object({
    /** The move, in SAN. */
    move: z.string().min(1).max(12),
    /** Whether it was the move the puzzle wanted. */
    correct: z.boolean(),
    /** Time from the start of the solver's turn until this try, in ms. */
    ms: z.number().int().min(0).max(MAX_MS),
    /** Set when the trainer played the move for the solver after two misses. */
    revealed: z.boolean().optional(),
    /**
     * Set when the move was an alternate solution marked in the puzzle. ALT2 moves are good but
     * not the best, and ALT moves are also solutions. Neither is a wrong move. Once a solver
     * takes an ALT move and asks to try again, it is recorded with `correct: false`; if they
     * ask to see the next move instead, it is recorded with `correct: true` and settles the turn.
     */
    alt: z.enum(['alt', 'alt2']).optional(),
});
export type TryRecord = z.infer<typeof TryRecordSchema>;

/** One turn of the solver: every move they tried, wrong ones included, until it was settled. */
export const MoveRecordSchema = z.object({
    /** Which line of the puzzle this turn was in: 0 is the first defense, the last is the main line. */
    line: z.number().int().min(0).max(99),
    /** The move's position in the line, counting from 0. The solver's moves are the even ones. */
    ply: z.number().int().min(0).max(399),
    /** The move the puzzle wanted, in SAN. */
    expected: z.string().min(1).max(12),
    /** Everything they tried, in order. The last one is the right move, unless they gave up. */
    tries: z.array(TryRecordSchema).min(1).max(30),
    /** Time from the start of the turn until it was settled, in ms. */
    ms: z.number().int().min(0).max(MAX_MS),
});
export type MoveRecord = z.infer<typeof MoveRecordSchema>;

/** Verifies the record of one puzzle that the trainer sends when a puzzle ends. */
export const AttemptSubmissionSchema = z.object({
    puzzleId: z.string().min(1).max(20),
    /** When the solver first saw the puzzle, in ISO 8601. */
    startedAt: z.iso.datetime(),
    /** When they finished or left it, in ISO 8601. */
    finishedAt: z.iso.datetime(),
    /** Whether they left before finishing. */
    abandoned: z.boolean().default(false),
    moves: z.array(MoveRecordSchema).max(200),
});
export type AttemptSubmission = z.infer<typeof AttemptSubmissionSchema>;

/** How an attempt went. */
export type AttemptResult =
    /** Every move was right on the first try. */
    | 'clean'
    /** Finished, with at least one wrong try along the way. */
    | 'solved'
    /** Left before finishing. */
    | 'abandoned';

/** The numbers worked out from an attempt. */
export interface AttemptSummary {
    result: AttemptResult;
    /** The solver's moves that were settled with a right move. */
    moves: number;
    /** Of those, the ones that were right on the first try. */
    movesFirstTry: number;
    /** Wrong moves tried, across the whole attempt. */
    mistakes: number;
    /** Moves the trainer played for the solver after two misses. */
    revealed: number;
    /** Time from start to finish, in ms. */
    totalMs: number;
}

/** A move is settled once a right move has been played, by the solver or shown to them. */
const isSettled = (move: MoveRecord) => move.tries.some((t) => t.correct);

/** An alternate move that did not settle the turn: it costs the solver nothing. */
const isNeutral = (t: TryRecord) => t.alt !== undefined && !t.correct;

/**
 * A move is a first-try move if the first thing tried that was not a free alternate was right.
 * A solver who played a good ALT2 move and then the best one still got it right first time.
 */
const isFirstTry = (move: MoveRecord) => {
    const first = move.tries.find((t) => !isNeutral(t));
    return first !== undefined && first.correct && !first.revealed;
};

/** Works out how an attempt went. */
export function summarizeAttempt(
    attempt: Pick<AttemptSubmission, 'startedAt' | 'finishedAt' | 'abandoned' | 'moves'>,
): AttemptSummary {
    const settled = attempt.moves.filter(isSettled);
    const movesFirstTry = settled.filter(isFirstTry).length;
    const mistakes = attempt.moves.reduce(
        (total, move) => total + move.tries.filter((t) => !t.correct && !t.alt).length,
        0,
    );
    const revealed = settled.filter((m) => m.tries.some((t) => t.revealed)).length;
    const totalMs = Math.min(
        Math.max(0, Date.parse(attempt.finishedAt) - Date.parse(attempt.startedAt)),
        MAX_MS,
    );

    const result: AttemptResult = attempt.abandoned
        ? 'abandoned'
        : movesFirstTry === settled.length && mistakes === 0
          ? 'clean'
          : 'solved';

    return { result, moves: settled.length, movesFirstTry, mistakes, revealed, totalMs };
}

/** An attempt as stored: what the solver did, what came of it, and what the puzzle was like then. */
export interface PuzzleAttempt extends Omit<AttemptSubmission, 'abandoned'> {
    summary: AttemptSummary;
    /** The puzzle's starting position, its rating and its tags, as they were at the time. */
    fen: string;
    puzzleRating: number;
    buckets: string[];
    themes: string[];
    /** How the attempt was scored, and what it did to the member's rating. */
    scoring?: AttemptScoring;
}

/** Builds the stored form of an attempt. Everything about the puzzle comes from the server's copy. */
export function toPuzzleAttempt(
    submission: AttemptSubmission,
    puzzle: Pick<PuzzlebasePuzzle, 'fen' | 'rating' | 'buckets' | 'themes'>,
): PuzzleAttempt {
    const { abandoned: _abandoned, ...rest } = submission;
    return {
        ...rest,
        summary: summarizeAttempt(submission),
        fen: puzzle.fen,
        puzzleRating: puzzle.rating,
        buckets: puzzle.buckets,
        themes: puzzle.themes,
    };
}

/** Running totals, for a person overall or for one bucket, theme or session. */
export interface StatCounters {
    attempts: number;
    clean: number;
    solved: number;
    abandoned: number;
    /** The solver's settled moves, and how many were right first time. */
    moves: number;
    movesFirstTry: number;
    mistakes: number;
    totalMs: number;
}

export const emptyCounters = (): StatCounters => ({
    attempts: 0,
    clean: 0,
    solved: 0,
    abandoned: 0,
    moves: 0,
    movesFirstTry: 0,
    mistakes: 0,
    totalMs: 0,
});

/** The amounts one attempt adds to the running totals. */
export function countersForAttempt(summary: AttemptSummary): StatCounters {
    return {
        attempts: 1,
        clean: summary.result === 'clean' ? 1 : 0,
        solved: summary.result === 'solved' ? 1 : 0,
        abandoned: summary.result === 'abandoned' ? 1 : 0,
        moves: summary.moves,
        movesFirstTry: summary.movesFirstTry,
        mistakes: summary.mistakes,
        totalMs: summary.totalMs,
    };
}

export function addCounters(a: StatCounters, b: StatCounters): StatCounters {
    return {
        attempts: a.attempts + b.attempts,
        clean: a.clean + b.clean,
        solved: a.solved + b.solved,
        abandoned: a.abandoned + b.abandoned,
        moves: a.moves + b.moves,
        movesFirstTry: a.movesFirstTry + b.movesFirstTry,
        mistakes: a.mistakes + b.mistakes,
        totalMs: a.totalMs + b.totalMs,
    };
}

/** The share of moves that were right on the first try, or undefined if there are no moves yet. */
export const firstTryRate = (c: StatCounters): number | undefined =>
    c.moves === 0 ? undefined : c.movesFirstTry / c.moves;

/** The share of finished puzzles that had no wrong move at all, or undefined if none finished. */
export const cleanRate = (c: StatCounters): number | undefined => {
    const finished = c.clean + c.solved;
    return finished === 0 ? undefined : c.clean / finished;
};

/** The average time on a puzzle in ms, or undefined if there are none. */
export const averageMs = (c: StatCounters): number | undefined =>
    c.attempts === 0 ? undefined : c.totalMs / c.attempts;

/** The keys of the running totals an attempt counts towards: overall, and each bucket and theme. */
export function statKeys(attempt: Pick<PuzzleAttempt, 'buckets' | 'themes'>): string[] {
    return [
        'TOTAL',
        ...attempt.buckets.map((bucket) => `BUCKET#${bucket}`),
        ...attempt.themes.map((theme) => `THEME#${theme}`),
    ];
}

/** A stretch of solving that ends after a break of half an hour or more. */
export interface PuzzleSession extends StatCounters {
    /** When the first puzzle of the session was started, in ISO 8601. */
    startedAt: string;
    /** When the latest puzzle of the session was finished, in ISO 8601. */
    lastActiveAt: string;
}

/** Whether an attempt finished soon enough after a session's last one to belong to it. */
export function continuesSession(lastActiveAt: string, finishedAt: string): boolean {
    return Date.parse(finishedAt) - Date.parse(lastActiveAt) < SESSION_GAP_MS;
}

/** A person's totals overall and by bucket and theme. */
export interface PuzzleStatsResponse {
    /** The member's tactics rating, once they have solved a puzzle that counts. */
    rating?: MemberRating;
    total: StatCounters;
    buckets: Record<string, StatCounters>;
    themes: Record<string, StatCounters>;
}

/** A person's sessions and attempts in a stretch of time. */
export interface PuzzleRunsResponse {
    sessions: PuzzleSession[];
    attempts: PuzzleAttempt[];
}

/** Verifies a request for someone's sessions and attempts. */
export const RunsRequestSchema = z.object({
    username: z.string().min(1),
    /** Only runs at or after this time. Defaults to 30 days ago. */
    from: z.iso.datetime().optional(),
    /** Only runs before this time. Defaults to now. */
    to: z.iso.datetime().optional(),
});
export type RunsRequest = z.infer<typeof RunsRequestSchema>;

/** Verifies a request for puzzles to train on. Numbers arrive as text in a query string. */
export const TrainRequestSchema = z.object({
    /** Only puzzles with this bucket. Several, separated by commas, means all of them. */
    bucket: z.string().optional(),
    /** Only puzzles with one of these buckets, separated by commas: Tactics, Strategy, or both. */
    types: z.string().optional(),
    /** Only puzzles in one of these phases of the game, separated by commas. */
    phases: z.string().optional(),
    /** Only puzzles with this theme. */
    theme: z.string().optional(),
    minRating: z.coerce.number().int().min(0).max(3500).optional(),
    maxRating: z.coerce.number().int().min(0).max(3500).optional(),
    count: z.coerce.number().int().min(1).max(30).default(10),
    /** Puzzle ids to leave out, separated by commas. */
    exclude: z.string().optional(),
});
export type TrainRequest = z.infer<typeof TrainRequestSchema>;

/** A set of tags that some puzzles have, and how many do. */
export interface TrainingTagSet {
    buckets: string[];
    themes: string[];
    count: number;
}

/**
 * The tags the puzzles have, for the screen where a member chooses what to train on, so it only
 * offers what there are puzzles for. Puzzles with the same tags are counted together, and nothing
 * else about a puzzle is given away.
 */
export function trainingTagSets(
    puzzles: Pick<PuzzlebasePuzzle, 'buckets' | 'themes'>[],
): TrainingTagSet[] {
    const sets = new Map<string, TrainingTagSet>();
    for (const { buckets, themes } of puzzles) {
        const sortedBuckets = [...buckets].sort();
        const sortedThemes = [...themes].sort();
        const key = JSON.stringify([sortedBuckets, sortedThemes]);
        const set = sets.get(key) ?? { buckets: sortedBuckets, themes: sortedThemes, count: 0 };
        set.count += 1;
        sets.set(key, set);
    }
    return [...sets.values()];
}

/**
 * Whether any puzzle has all the given buckets and the theme, if there is one. Used to leave out
 * choices that would find nothing.
 */
export function hasPuzzles(
    sets: TrainingTagSet[],
    wanted: {
        /** The puzzle must have all of these. */
        buckets?: string[];
        /** The puzzle must have at least one of these, if any are given. */
        types?: string[];
        /** The puzzle must have at least one of these, if any are given. */
        phases?: string[];
        theme?: string;
    },
): boolean {
    const hasAny = (set: TrainingTagSet, any?: string[]) =>
        !any || any.length === 0 || any.some((bucket) => set.buckets.includes(bucket));
    return sets.some(
        (set) =>
            (wanted.buckets ?? []).every((bucket) => set.buckets.includes(bucket)) &&
            hasAny(set, wanted.types) &&
            hasAny(set, wanted.phases) &&
            (wanted.theme === undefined || set.themes.includes(wanted.theme)),
    );
}

/**
 * Chooses puzzles to train on from the ones that match the request. Puzzles the person has never
 * attempted come first, in random order. After those come the ones they have attempted, the
 * longest ago first, so a person works through the whole collection before seeing a puzzle again.
 * @param random Returns a number from 0 up to but not including 1. Pass a fixed one to test.
 * @param lastSeen When the person last attempted each puzzle they have, by puzzle id, in ISO 8601.
 */
export function pickTrainingPuzzles(
    puzzles: PuzzlebasePuzzle[],
    request: TrainRequest,
    random: () => number = Math.random,
    lastSeen: Record<string, string> = {},
): PuzzlebasePuzzle[] {
    const excluded = new Set((request.exclude ?? '').split(',').filter(Boolean));
    const buckets = (request.bucket ?? '').split(',').filter(Boolean);
    const types = (request.types ?? '').split(',').filter(Boolean);
    const phases = (request.phases ?? '').split(',').filter(Boolean);
    const matches = puzzles.filter(
        (p) =>
            !excluded.has(p.id) &&
            buckets.every((bucket) => p.buckets.includes(bucket)) &&
            (types.length === 0 || types.some((type) => p.buckets.includes(type))) &&
            (phases.length === 0 || phases.some((phase) => p.buckets.includes(phase))) &&
            (request.theme === undefined || p.themes.includes(request.theme)) &&
            (request.minRating === undefined || p.rating >= request.minRating) &&
            (request.maxRating === undefined || p.rating <= request.maxRating),
    );

    // Fisher-Yates shuffle, so puzzles that tie below come in random order.
    for (let i = matches.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [matches[i], matches[j]] = [matches[j], matches[i]];
    }

    // Never seen sorts first (an empty string is before any date). The sort is stable.
    matches.sort((a, b) => (lastSeen[a.id] ?? '').localeCompare(lastSeen[b.id] ?? ''));
    return matches.slice(0, request.count);
}

/** What a person asks for when they start training. Every part is optional. */
export interface TrainQuery {
    /** Only puzzles with this bucket. Several, separated by commas, means all of them. */
    bucket?: string;
    /** Only puzzles with one of these buckets, separated by commas: Tactics, Strategy, or both. */
    types?: string;
    /** Only puzzles in one of these phases of the game, separated by commas. */
    phases?: string;
    /** Only puzzles with this theme. */
    theme?: string;
    minRating?: number;
    maxRating?: number;
    /** How many puzzles, up to 30. Defaults to 10. */
    count?: number;
    /** Ids of puzzles to leave out, such as ones just played. */
    exclude?: string[];
}

/**
 * Groups attempts into sessions the same way the server does: an attempt that finishes less than
 * 30 minutes after the previous one belongs to the same session. Sessions come back newest first.
 */
export function groupIntoSessions(attempts: PuzzleAttempt[]): PuzzleSession[] {
    const sorted = [...attempts].sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));
    const sessions: PuzzleSession[] = [];
    for (const attempt of sorted) {
        const counters = countersForAttempt(attempt.summary);
        const current = sessions[sessions.length - 1];
        if (current && continuesSession(current.lastActiveAt, attempt.finishedAt)) {
            Object.assign(current, addCounters(current, counters));
            current.lastActiveAt = attempt.finishedAt;
        } else {
            sessions.push({
                startedAt: attempt.startedAt,
                lastActiveAt: attempt.finishedAt,
                ...counters,
            });
        }
    }
    return sessions.reverse();
}

/** Adds up attempts into running totals: overall, and by bucket and theme. */
export function statsFromAttempts(attempts: PuzzleAttempt[]): PuzzleStatsResponse {
    const stats: PuzzleStatsResponse = { total: emptyCounters(), buckets: {}, themes: {} };
    for (const attempt of attempts) {
        const counters = countersForAttempt(attempt.summary);
        stats.total = addCounters(stats.total, counters);
        for (const bucket of attempt.buckets) {
            stats.buckets[bucket] = addCounters(stats.buckets[bucket] ?? emptyCounters(), counters);
        }
        for (const theme of attempt.themes) {
            stats.themes[theme] = addCounters(stats.themes[theme] ?? emptyCounters(), counters);
        }
    }
    return stats;
}
