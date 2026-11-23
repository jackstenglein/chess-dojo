import { z } from 'zod';

/**
 * Shared code for the live World Championship page: the sensei eval bar and
 * "guess the move". The page, the API and the tests all read this file.
 */

/** The Lichess broadcast of the 2026 World Championship match. */
export const WC_LICHESS_TOUR_ID = 'qfkdt8mn';

/**
 * Dojo usernames that may put an eval on the bar. Adding a sensei is one line
 * here and a deploy of the page and the wcLive service.
 */
export const WC_SENSEIS: readonly { username: string; displayName: string }[] = [
    { username: 'jessekraai', displayName: 'Jesse' },
    { username: 'dpruess', displayName: 'David' },
    { username: 'hellokostya', displayName: 'Kostya' },
];

export function isWcSensei(username: string | undefined): boolean {
    return !!username && WC_SENSEIS.some((s) => s.username === username);
}

/** Sensei evals run from -10 (Black is winning) to +10 (White is winning). */
export const WC_EVAL_MIN = -10;
export const WC_EVAL_MAX = 10;

/** Lichess ids are 8 letters and digits. */
const roundId = z.string().regex(/^[A-Za-z0-9]{8}$/);

/** A ply is the number of half moves played: 0 is the starting position. */
const ply = z.number().int().min(0).max(600);

export const WcEvalRequestSchema = z.object({
    roundId,
    /** The position the eval is for, as the number of half moves played to reach it. */
    ply,
    /** Rounded to one decimal place. */
    value: z
        .number()
        .min(WC_EVAL_MIN)
        .max(WC_EVAL_MAX)
        .transform((v) => Math.round(v * 10) / 10),
});
export type WcEvalRequest = z.infer<typeof WcEvalRequestSchema>;

export const WcGuessRequestSchema = z.object({
    roundId,
    /** The ply of the move being guessed: 1 is White's first move. */
    ply: ply.min(1),
    /** The guessed move in UCI, for example e2e4 or e7e8q. */
    uci: z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/),
});
export type WcGuessRequest = z.infer<typeof WcGuessRequestSchema>;

export const WcRoundRequestSchema = z.object({ roundId });

/** One sensei's eval of one position. */
export interface WcEval {
    username: string;
    displayName: string;
    ply: number;
    value: number;
    updatedAt: string;
}

/** One user's guesses for one game, keyed by ply. */
export interface WcGuesses {
    username: string;
    displayName: string;
    /** Ply to the guessed move in UCI. */
    guesses: Record<string, string>;
}

export interface WcLeaderboardEntry {
    username: string;
    displayName: string;
    /** Moves guessed right. */
    correct: number;
    /** Moves guessed at all, among the moves played so far. */
    guessed: number;
}

export interface WcLeaderboard {
    roundId: string;
    /** Half moves played when the leaderboard was counted. */
    plies: number;
    entries: WcLeaderboardEntry[];
    updatedAt: string;
}

/**
 * Counts the right guesses of each user against the moves played so far.
 * @param played The UCI of each move played, in order. played[0] is ply 1.
 */
export function scoreGuesses(played: string[], all: WcGuesses[]): WcLeaderboardEntry[] {
    const entries = all.map((g) => {
        let correct = 0;
        let guessed = 0;
        for (const [plyKey, uci] of Object.entries(g.guesses)) {
            const p = parseInt(plyKey);
            if (p >= 1 && p <= played.length) {
                guessed++;
                if (played[p - 1] === uci) {
                    correct++;
                }
            }
        }
        return { username: g.username, displayName: g.displayName, correct, guessed };
    });
    return entries
        .filter((e) => e.guessed > 0)
        .sort(
            (a, b) =>
                b.correct - a.correct ||
                a.guessed - b.guessed ||
                a.displayName.localeCompare(b.displayName),
        );
}

/**
 * The latest eval of each sensei at or before the given ply. A sensei's eval
 * stays on the bar until they give a new one.
 */
export function latestEvals(evals: WcEval[], atPly: number): WcEval[] {
    const latest = new Map<string, WcEval>();
    for (const e of evals) {
        if (e.ply > atPly) {
            continue;
        }
        const current = latest.get(e.username);
        if (
            !current ||
            e.ply > current.ply ||
            (e.ply === current.ply && e.updatedAt > current.updatedAt)
        ) {
            latest.set(e.username, e);
        }
    }
    return [...latest.values()];
}

/** Rows of the board on each side of the middle. */
const HALF_ROWS = 4;
/** Up to this eval, every point moves the bar one row. */
const LINEAR_LIMIT = 3;
/** How fast the last row fills past LINEAR_LIMIT. Larger is slower. */
const TAIL_SOFTNESS = 2.5;
/** The losing side always keeps this much of the last row, as on engine bars. */
const MIN_SLIVER = 0.1;

/**
 * The share of the bar that is White, from 0 to 1, for an eval from -10 to +10.
 * +1, +2 and +3 move the bar one, two and three rows of the board up from the
 * middle. Past +3 the last row fills gradually and never quite closes.
 */
export function evalToWhiteShare(value: number): number {
    const v = Math.max(WC_EVAL_MIN, Math.min(WC_EVAL_MAX, value));
    const abs = Math.abs(v);
    let rows: number;
    if (abs <= LINEAR_LIMIT) {
        rows = abs;
    } else {
        const tail = 1 - Math.exp(-(abs - LINEAR_LIMIT) / TAIL_SOFTNESS);
        rows = LINEAR_LIMIT + tail * (HALF_ROWS - LINEAR_LIMIT - MIN_SLIVER);
    }
    return 0.5 + (Math.sign(v) * rows) / (2 * HALF_ROWS);
}

/** Formats an eval the way the bar shows it, for example +1.5, -3 or 0. */
export function formatEval(value: number): string {
    const rounded = Math.round(value * 10) / 10;
    if (rounded === 0) {
        return '0';
    }
    return `${rounded > 0 ? '+' : ''}${rounded}`;
}
