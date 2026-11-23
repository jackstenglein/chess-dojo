import { z } from 'zod';

/**
 * Shared code for the live World Championship page: the sensei eval bar and
 * "guess the move". The page, the API and the tests all read this file.
 */

/** The Lichess broadcast of the 2026 World Championship match. */
export const WC_LICHESS_TOUR_ID = 'qfkdt8mn';

/**
 * Twelve colors a sensei pin can take. The first three are the defaults of
 * Jesse, David and Kostya.
 */
export const WC_SENSEI_COLORS = [
    '#e53935', // red
    '#43a047', // green
    '#1e88e5', // blue
    '#fb8c00', // orange
    '#8e24aa', // purple
    '#00acc1', // cyan
    '#fdd835', // yellow
    '#d81b60', // pink
    '#6d4c41', // brown
    '#3949ab', // indigo
    '#7cb342', // lime
    '#546e7a', // slate
] as const;

/**
 * Dojo usernames of the senseis who run the bar. They score themselves, score
 * guests, and manage the roster. Adding one is a line here and a deploy.
 */
export const WC_SENSEIS: readonly { username: string; displayName: string; color: string }[] = [
    { username: 'jessekraai', displayName: 'Jesse', color: WC_SENSEI_COLORS[0] },
    { username: 'dpruess', displayName: 'David', color: WC_SENSEI_COLORS[1] },
    { username: 'hellokostya', displayName: 'Kostya', color: WC_SENSEI_COLORS[2] },
];

export function isWcSensei(username: string | undefined): boolean {
    return !!username && WC_SENSEIS.some((s) => s.username === username);
}

/** Sensei evals run from -10 (Black is winning) to +10 (White is winning). */
export const WC_EVAL_MIN = -10;
export const WC_EVAL_MAX = 10;

/** The chess symbols a sensei can tap instead of stepping. */
export const WC_EVAL_PRESETS: readonly { symbol: string; value: number; meaning: string }[] = [
    { symbol: '-+', value: -1.5, meaning: 'Black is winning' },
    { symbol: '-/+', value: -0.8, meaning: 'Black is much better' },
    { symbol: '=+', value: -0.3, meaning: 'Black is slightly better' },
    { symbol: '=', value: 0, meaning: 'Equal' },
    { symbol: '+=', value: 0.3, meaning: 'White is slightly better' },
    { symbol: '+/-', value: 0.8, meaning: 'White is much better' },
    { symbol: '+-', value: 1.5, meaning: 'White is winning' },
];

/** One pin on the bar: an account sensei or a guest added on the spot. */
export interface WcSensei {
    /** The username of an account sensei, or guest-xxxxxxxx for a guest. */
    id: string;
    name: string;
    color: string;
    /** Inactive senseis are left out of the average and off the bar. */
    active: boolean;
    guest: boolean;
}

export function senseiInitial(name: string): string {
    return (name.trim()[0] ?? '?').toUpperCase();
}

/**
 * The roster everyone sees: the account senseis, with any color or active
 * changes saved for them, followed by the guests in the order they were added.
 */
export function buildRoster(saved: (WcSensei & { addedAt?: string })[]): WcSensei[] {
    const accounts = WC_SENSEIS.map((s): WcSensei => {
        const override = saved.find((x) => x.id === s.username);
        return {
            id: s.username,
            name: s.displayName,
            color: override?.color ?? s.color,
            active: override?.active ?? true,
            guest: false,
        };
    });
    const guests = saved
        .filter((x) => x.guest)
        .sort((a, b) => (a.addedAt ?? '').localeCompare(b.addedAt ?? ''))
        .map(({ id, name, color, active }) => ({ id, name, color, active, guest: true }));
    return [...accounts, ...guests];
}

/** Lichess ids are 8 letters and digits. */
const roundId = z.string().regex(/^[A-Za-z0-9]{8}$/);

/** A ply is the number of half moves played: 0 is the starting position. */
const ply = z.number().int().min(0).max(600);

const senseiId = z.string().regex(/^[A-Za-z0-9_.@+-]{1,64}$/);
const senseiName = z.string().trim().min(1).max(20);
const senseiColor = z.enum(WC_SENSEI_COLORS);

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
    /** Whose eval it is. Defaults to the caller. A sensei may also score any guest. */
    senseiId: senseiId.optional(),
});
export type WcEvalRequest = z.input<typeof WcEvalRequestSchema>;

export const WcRosterRequestSchema = z.discriminatedUnion('action', [
    z.object({ action: z.literal('add'), name: senseiName, color: senseiColor }),
    z.object({
        action: z.literal('update'),
        id: senseiId,
        /** Guests only. */
        name: senseiName.optional(),
        color: senseiColor.optional(),
        active: z.boolean().optional(),
    }),
    /** Guests only. */
    z.object({ action: z.literal('remove'), id: senseiId }),
]);
export type WcRosterRequest = z.input<typeof WcRosterRequestSchema>;

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
    senseiId: string;
    ply: number;
    value: number;
    updatedAt: string;
    /** The account that set it, which for a guest is another sensei. */
    updatedBy: string;
}

/** What the page polls: the roster and every eval in the game. */
export interface WcEvalsResponse {
    roundId: string;
    roster: WcSensei[];
    evals: WcEval[];
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
        const current = latest.get(e.senseiId);
        if (
            !current ||
            e.ply > current.ply ||
            (e.ply === current.ply && e.updatedAt > current.updatedAt)
        ) {
            latest.set(e.senseiId, e);
        }
    }
    return [...latest.values()];
}

/** A sensei on the bar with the eval they have in force. */
export interface WcPin {
    sensei: WcSensei;
    value: number;
}

/**
 * Every active sensei on the bar with their eval at the given ply, and the
 * simple average, which is 0 when nobody is active. A sensei who has not set
 * an eval yet counts as 0.0, the value their input starts at, so switching
 * anyone on or off always moves the average.
 */
export function barState(
    roster: WcSensei[],
    evals: WcEval[],
    atPly: number,
): { pins: WcPin[]; average: number } {
    const latest = latestEvals(evals, atPly);
    const pins = roster
        .filter((s) => s.active)
        .flatMap((sensei) => {
            const e = latest.find((x) => x.senseiId === sensei.id);
            return [{ sensei, value: e?.value ?? 0 }];
        });
    const average = pins.length ? pins.reduce((sum, p) => sum + p.value, 0) / pins.length : 0;
    return { pins, average };
}

/**
 * How steep the bar's curve is. 0.6 puts ±0.4 at 56/44, ±0.8 at 62/38,
 * ±1.5 at 71/29, ±5 at 95/5 and ±10 at 99.8/0.2, so small edges are easy to see.
 */
const CURVE = 0.6;

/** The share of the bar that is White, from 0 to 1, for an eval from -10 to +10. */
export function evalToWhiteShare(value: number): number {
    const v = Math.max(WC_EVAL_MIN, Math.min(WC_EVAL_MAX, value));
    return 1 / (1 + Math.exp(-CURVE * v));
}

/** Pins closer than this share of the bar fan out side by side. */
const PIN_OVERLAP = 0.03;

/**
 * Where each pin goes: its height on the bar, and a column so that pins
 * within 3% of each other sit side by side instead of on top of each other.
 */
export function layoutPins<T extends { id: string; share: number }>(
    pins: T[],
): (T & { column: number; columns: number })[] {
    const sorted = [...pins].sort((a, b) => a.share - b.share || a.id.localeCompare(b.id));
    const clusters: T[][] = [];
    for (const pin of sorted) {
        const last = clusters[clusters.length - 1];
        if (last && pin.share - last[last.length - 1].share < PIN_OVERLAP) {
            last.push(pin);
        } else {
            clusters.push([pin]);
        }
    }
    return clusters.flatMap((cluster) =>
        cluster.map((pin, column) => ({ ...pin, column, columns: cluster.length })),
    );
}

/** Formats an eval with one decimal, for example +1.5, -3.0 or 0.0. */
export function formatEval(value: number): string {
    const rounded = Math.round(value * 10) / 10;
    if (rounded === 0) {
        return '0.0';
    }
    return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}`;
}
