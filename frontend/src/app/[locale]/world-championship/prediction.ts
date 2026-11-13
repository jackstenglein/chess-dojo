import { z } from 'zod';
import { MATCH, PlayerId, PLAYERS, Results } from './config';

/**
 * The prediction itself: its shape, which combinations of picks can happen in a
 * 14-game match, how an entry is scored, and where a visitor's picks are kept
 * between visits. Shared by the page and by /api/wc-prediction.
 */

export const DECISIVE_SCORES = ['7.5-6.5', '7.5-5.5', '7.5-4.5', '7.5-3.5+'] as const;
export const TIED_SCORE = '7-7' as const;

export type DecisiveScore = (typeof DECISIVE_SCORES)[number];
export type ScorePick = DecisiveScore | typeof TIED_SCORE;

export interface Picks {
    winner: PlayerId;
    tiebreaks: boolean;
    /** Always "7-7" when the visitor picked tiebreaks. */
    score: ScorePick;
    /** Classical games that end with a winner, 0 to 14. */
    decisiveGames: number;
    /** The first classical game with a winner, 1 to 14. */
    firstDecisiveGame: number | 'none';
    /** Tie-breaker: moves in Game 1. */
    game1Moves: number;
}

export type Draft = Partial<Picks>;

export type StepId = 'winner' | 'tiebreaks' | 'score' | 'decisive' | 'first' | 'moves' | 'email';

const ALL_STEPS: StepId[] = ['winner', 'tiebreaks', 'score', 'decisive', 'first', 'moves', 'email'];

/** A tiebreak pick fixes the classical score at 7-7, so that question is skipped. */
export function stepsFor(draft: Draft): StepId[] {
    return draft.tiebreaks ? ALL_STEPS.filter((step) => step !== 'score') : ALL_STEPS;
}

/** The first step the visitor still has to answer. */
export function firstOpenStep(draft: Draft): StepId {
    return stepsFor(draft).find((step) => !isAnswered(draft, step)) ?? 'email';
}

export function isAnswered(draft: Draft, step: StepId): boolean {
    switch (step) {
        case 'winner':
            return draft.winner !== undefined;
        case 'tiebreaks':
            return draft.tiebreaks !== undefined;
        case 'score':
            return draft.score !== undefined && draft.score !== TIED_SCORE;
        case 'decisive':
            return draft.decisiveGames !== undefined;
        case 'first':
            return draft.firstDecisiveGame !== undefined;
        case 'moves':
            return draft.game1Moves !== undefined;
        case 'email':
            return false;
    }
}

/** The classical score a draft implies, once the visitor has got that far. */
export function scoreOf(draft: Draft): ScorePick | undefined {
    if (draft.tiebreaks === undefined) {
        return undefined;
    }
    if (draft.tiebreaks) {
        return TIED_SCORE;
    }
    return draft.score === TIED_SCORE ? undefined : draft.score;
}

export function toPicks(draft: Draft): Picks | undefined {
    const score = scoreOf(draft);
    if (
        draft.winner === undefined ||
        draft.tiebreaks === undefined ||
        score === undefined ||
        draft.decisiveGames === undefined ||
        draft.firstDecisiveGame === undefined ||
        draft.game1Moves === undefined
    ) {
        return undefined;
    }
    return {
        winner: draft.winner,
        tiebreaks: draft.tiebreaks,
        score,
        decisiveGames: draft.decisiveGames,
        firstDecisiveGame: draft.firstDecisiveGame,
        game1Moves: draft.game1Moves,
    };
}

// ---------------------------------------------------------------------------
// Which picks can happen together
// ---------------------------------------------------------------------------

/**
 * A match that ends in the classical games is grouped by how many games it took.
 * A player on 7 points who wins finishes on 8, so 8-6 is the same pick as 7.5-6.5.
 */
export function scoreForGames(gamesPlayed: number): DecisiveScore {
    if (gamesPlayed >= 14) {
        return '7.5-6.5';
    }
    if (gamesPlayed === 13) {
        return '7.5-5.5';
    }
    if (gamesPlayed === 12) {
        return '7.5-4.5';
    }
    return '7.5-3.5+';
}

function outcomeKey(score: ScorePick, decisive: number, first: number): string {
    return `${score}|${decisive}|${first}`;
}

/**
 * Plays out every possible match and records each combination of final score,
 * games with a winner and first game with a winner that can occur. The first
 * decisive game is 0 when every game is drawn.
 */
function buildOutcomes(): Set<string> {
    const outcomes = new Set<string>();
    const seen = new Set<string>();

    const play = (games: number, halfPoints: number, decisive: number, first: number) => {
        const state = `${games}|${halfPoints}|${decisive}|${first}`;
        if (seen.has(state)) {
            return;
        }
        seen.add(state);

        const otherHalfPoints = 2 * games - halfPoints;
        if (Math.max(halfPoints, otherHalfPoints) >= MATCH.winningHalfPoints) {
            outcomes.add(outcomeKey(scoreForGames(games), decisive, first));
            return;
        }
        if (games === MATCH.games) {
            outcomes.add(outcomeKey(TIED_SCORE, decisive, first));
            return;
        }

        const next = games + 1;
        play(next, halfPoints + 1, decisive, first);
        play(next, halfPoints + 2, decisive + 1, first || next);
        play(next, halfPoints, decisive + 1, first || next);
    };

    play(0, 0, 0, 0);
    return outcomes;
}

let outcomesCache: Set<string> | undefined;

function outcomes(): Set<string> {
    outcomesCache ??= buildOutcomes();
    return outcomesCache;
}

const GAME_NUMBERS = Array.from({ length: MATCH.games }, (_, index) => index + 1);
const DECISIVE_COUNTS = [0, ...GAME_NUMBERS];

function firstAsNumber(first: number | 'none'): number {
    return first === 'none' ? 0 : first;
}

/** How many games with a winner a final score allows. */
export function decisiveOptions(score: ScorePick | undefined): number[] {
    if (!score) {
        return DECISIVE_COUNTS;
    }
    return DECISIVE_COUNTS.filter((count) =>
        [0, ...GAME_NUMBERS].some((first) => outcomes().has(outcomeKey(score, count, first))),
    );
}

/** Which games can hold the first win. "none" is the only answer when every game is drawn. */
export function firstDecisiveOptions(
    score: ScorePick | undefined,
    decisive: number | undefined,
): (number | 'none')[] {
    const all: (number | 'none')[] = [...GAME_NUMBERS, 'none'];
    if (decisive === undefined) {
        return all;
    }
    if (!score) {
        return decisive === 0 ? ['none'] : GAME_NUMBERS;
    }
    return all.filter((first) => outcomes().has(outcomeKey(score, decisive, firstAsNumber(first))));
}

export interface Conflict {
    /** The step where the visitor can fix it. */
    step: 'decisive' | 'first';
    message: string;
}

function gamesWord(count: number): string {
    return count === 1 ? '1 game' : `${count} games`;
}

/**
 * Finds picks that cannot all come true and says which one to change, in plain
 * words. Returns undefined when the draft is consistent so far.
 */
export function findConflict(draft: Draft): Conflict | undefined {
    const score = scoreOf(draft);
    const decisive = draft.decisiveGames;
    const first = draft.firstDecisiveGame;

    if (score && decisive !== undefined) {
        const allowed = decisiveOptions(score);
        if (!allowed.includes(decisive)) {
            if (score === TIED_SCORE) {
                return {
                    step: 'decisive',
                    message:
                        'In a 7-7 match both players win the same number of games, so the count is even. Pick an even number, or go back and change your tiebreak pick.',
                };
            }
            const min = allowed[0];
            const max = allowed[allowed.length - 1];
            return {
                step: 'decisive',
                message:
                    decisive < min
                        ? `A ${scoreLabel(score)} finish needs at least ${gamesWord(min)} with a winner. Raise this number, or go back and change the score.`
                        : `A ${scoreLabel(score)} finish has at most ${gamesWord(max)} with a winner. Lower this number, or go back and change the score.`,
            };
        }
    }

    if (decisive !== undefined && first !== undefined) {
        if (decisive === 0 && first !== 'none') {
            return {
                step: 'first',
                message:
                    'You picked 0 games with a winner, so there is no first one. Choose None, or go back and raise the count.',
            };
        }
        if (decisive > 0 && first === 'none') {
            return {
                step: 'first',
                message: `You picked ${gamesWord(decisive)} with a winner, so one of them comes first. Pick its game number, or go back and set the count to 0.`,
            };
        }
        const allowed = firstDecisiveOptions(score, decisive);
        if (first !== 'none' && !allowed.includes(first)) {
            const latest = Math.max(...allowed.filter((option) => option !== 'none'));
            return {
                step: 'first',
                message: `With ${gamesWord(decisive)} with a winner in a ${scoreLabel(score)} match, the first win comes by game ${latest}. Pick game ${latest} or earlier, or go back and lower the count.`,
            };
        }
    }

    return undefined;
}

// ---------------------------------------------------------------------------
// Words for picks
// ---------------------------------------------------------------------------

export function scoreLabel(score: ScorePick | undefined): string {
    if (!score) {
        return '';
    }
    return score === '7.5-3.5+' ? '7.5-3.5 or bigger' : score;
}

export interface PickLine {
    label: string;
    value: string;
}

/** The five picks, in the order they were asked. */
export function describePicks(picks: Picks): PickLine[] {
    return [
        { label: 'Match winner', value: PLAYERS[picks.winner].name },
        { label: 'Decided in', value: picks.tiebreaks ? 'Tiebreaks' : 'Classical games' },
        { label: 'Classical score', value: scoreLabel(picks.score) },
        { label: 'Games with a winner', value: String(picks.decisiveGames) },
        {
            label: 'First game with a winner',
            value: picks.firstDecisiveGame === 'none' ? 'None' : `Game ${picks.firstDecisiveGame}`,
        },
    ];
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export const POINTS = {
    winner: 3,
    tiebreaks: 2,
    score: 5,
    decisiveExact: 3,
    decisiveOffByOne: 1,
    first: 3,
} as const;

export const MAX_POINTS =
    POINTS.winner + POINTS.tiebreaks + POINTS.score + POINTS.decisiveExact + POINTS.first;

/** The score pick that a finished match pays out on. */
export function resultScore(results: Results): ScorePick {
    return results.tiebreaks ? TIED_SCORE : scoreForGames(results.classicalGames);
}

export function scorePicks(picks: Picks, results: Results): number {
    const off = Math.abs(picks.decisiveGames - results.decisiveGames);
    return (
        (picks.winner === results.winner ? POINTS.winner : 0) +
        (picks.tiebreaks === results.tiebreaks ? POINTS.tiebreaks : 0) +
        (picks.score === resultScore(results) ? POINTS.score : 0) +
        (off === 0 ? POINTS.decisiveExact : off === 1 ? POINTS.decisiveOffByOne : 0) +
        (firstAsNumber(picks.firstDecisiveGame) === (results.firstDecisiveGame ?? 0)
            ? POINTS.first
            : 0)
    );
}

// ---------------------------------------------------------------------------
// What the page sends to /api/wc-prediction
// ---------------------------------------------------------------------------

export const MAX_GAME_1_MOVES = 200;
export const MAX_DISPLAY_NAME = 30;

const picksShape = z.object({
    winner: z.enum(['gukesh', 'sindarov']),
    tiebreaks: z.boolean(),
    score: z.enum([...DECISIVE_SCORES, TIED_SCORE]),
    decisiveGames: z.number().int().min(0).max(MATCH.games),
    firstDecisiveGame: z.union([z.literal('none'), z.number().int().min(1).max(MATCH.games)]),
    game1Moves: z.number().int().min(1).max(MAX_GAME_1_MOVES),
});

const draftSchema = picksShape.partial();

export const picksSchema = picksShape.superRefine((picks, context) => {
    if (picks.tiebreaks !== (picks.score === TIED_SCORE)) {
        context.addIssue({
            code: 'custom',
            path: ['score'],
            message: 'The score does not match the tiebreak pick.',
        });
        return;
    }
    const conflict = findConflict(picks);
    if (conflict) {
        context.addIssue({
            code: 'custom',
            path: [conflict.step === 'decisive' ? 'decisiveGames' : 'firstDecisiveGame'],
            message: conflict.message,
        });
    }
});

const contact = {
    email: z.email().max(254),
    consent: z.literal(true),
    attribution: z.record(z.string(), z.string().max(200)).optional(),
    /** Honeypot field. Hidden from people, so only bots fill it in. */
    website: z.string().max(0).optional(),
};

export const wcPredictionSchema = z.object({
    kind: z.literal('prediction'),
    ...contact,
    displayName: z.string().trim().max(MAX_DISPLAY_NAME).optional(),
    picks: picksSchema,
});

/** A visitor who arrives after the lock and only wants the results by email. */
export const wcResultsSignupSchema = z.object({
    kind: z.literal('results'),
    ...contact,
});

export const wcEntrySchema = z.discriminatedUnion('kind', [
    wcPredictionSchema,
    wcResultsSignupSchema,
]);

export type WcPrediction = z.infer<typeof wcPredictionSchema>;
export type WcEntry = z.infer<typeof wcEntrySchema>;

// ---------------------------------------------------------------------------
// Picks kept in the browser
// ---------------------------------------------------------------------------

const DRAFT_KEY = 'wcContest.draft';
const ENTRY_KEY = 'wcContest.entry';
const RESULTS_SIGNUP_KEY = 'wcContest.resultsSignup';

export interface StoredDraft {
    picks: Draft;
    step: StepId;
    started: boolean;
}

export interface StoredEntry {
    picks: Picks;
    displayName: string;
    submittedAt: string;
}

const listeners = new Set<() => void>();
/** Used when the browser refuses to store anything, as some private windows do. */
const memory = new Map<string, string>();
let storageBlocked = false;

function read(key: string): string | null {
    if (storageBlocked) {
        return memory.get(key) ?? null;
    }
    try {
        return window.localStorage.getItem(key);
    } catch {
        return memory.get(key) ?? null;
    }
}

function write(key: string, value: string | null) {
    if (value === null) {
        memory.delete(key);
    } else {
        memory.set(key, value);
    }
    try {
        if (value === null) {
            window.localStorage.removeItem(key);
        } else {
            window.localStorage.setItem(key, value);
        }
    } catch {
        // The page still works for this visit, from memory.
        storageBlocked = true;
    }
    listeners.forEach((listener) => listener());
}

export function subscribeToStorage(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/** Parses once per stored value, so useSyncExternalStore gets the same object back. */
function cached<T>(key: string, parse: (raw: string | null) => T): () => T {
    let last: { raw: string | null; value: T } | undefined;
    return () => {
        const raw = read(key);
        if (last?.raw !== raw) {
            last = { raw, value: parse(raw) };
        }
        return last.value;
    };
}

export const EMPTY_DRAFT: StoredDraft = { picks: {}, step: 'winner', started: false };

function parseDraft(raw: string | null): StoredDraft {
    if (!raw) {
        return EMPTY_DRAFT;
    }
    try {
        const stored = JSON.parse(raw) as Partial<StoredDraft>;
        const picks = draftSchema.safeParse(stored.picks ?? {});
        if (!picks.success) {
            return EMPTY_DRAFT;
        }
        const draft: Draft = picks.data;
        // The email step is only offered once every pick is in.
        const step =
            stored.step && stored.step !== 'email' && stepsFor(draft).includes(stored.step)
                ? stored.step
                : firstOpenStep(draft);
        return { picks: draft, step, started: stored.started === true };
    } catch {
        return EMPTY_DRAFT;
    }
}

/** The picks in progress. They survive a reload. */
export const loadDraft = cached(DRAFT_KEY, parseDraft);

export function saveDraft(draft: StoredDraft) {
    write(DRAFT_KEY, JSON.stringify(draft));
}

function parseEntry(raw: string | null): StoredEntry | undefined {
    try {
        const stored = JSON.parse(raw ?? 'null') as Partial<StoredEntry> | null;
        const picks = picksSchema.safeParse(stored?.picks);
        if (!picks.success) {
            return undefined;
        }
        const { displayName, submittedAt } = stored ?? {};
        return {
            picks: picks.data,
            displayName:
                typeof displayName === 'string' ? displayName.slice(0, MAX_DISPLAY_NAME) : '',
            submittedAt: typeof submittedAt === 'string' ? submittedAt : '',
        };
    } catch {
        return undefined;
    }
}

/** The picks this browser has submitted, if any. */
export const loadEntry = cached(ENTRY_KEY, parseEntry);

export function saveEntry(entry: StoredEntry) {
    write(DRAFT_KEY, null);
    write(ENTRY_KEY, JSON.stringify(entry));
}

/** Puts a submitted entry back into the flow so the visitor can change it. */
export function reopenEntry(entry: StoredEntry) {
    write(ENTRY_KEY, null);
    saveDraft({ picks: entry.picks, step: 'winner', started: true });
}

export function hasResultsSignup(): boolean {
    return read(RESULTS_SIGNUP_KEY) !== null;
}

export function saveResultsSignup() {
    write(RESULTS_SIGNUP_KEY, new Date().toISOString());
}

// ---------------------------------------------------------------------------
// The clock
// ---------------------------------------------------------------------------

const NARROW_NO_BREAK_SPACE = String.fromCharCode(0x202f);

function pad(value: number): string {
    return String(value).padStart(2, '0');
}

/** "4d 06h 12m" with a day or more to go, "06h 12m 09s" inside the last day. */
export function formatCountdown(msLeft: number): string {
    const totalSeconds = Math.max(0, Math.floor(msLeft / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return days > 0
        ? `${days}d ${pad(hours)}h ${pad(minutes)}m`
        : `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

/** "Tuesday, November 24 at 9:00 AM EST" in the given zone, or the browser's zone. */
export function formatLockMoment(lockAt: number, timeZone?: string): string {
    const date = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        timeZone,
    }).format(lockAt);
    const time = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
        timeZone,
    }).format(lockAt);
    // Newer browsers put a narrow no-break space before AM and PM.
    return `${date} at ${time}`.replaceAll(NARROW_NO_BREAK_SPACE, ' ');
}

function calendarDay(time: number, timeZone?: string): number {
    const parts = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        timeZone,
    }).formatToParts(time);
    const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
    return Date.UTC(part('year'), part('month') - 1, part('day')) / 86400000;
}

/** "today", "tomorrow", a weekday inside the coming week, otherwise "November 24". */
export function lockDayLabel(now: number, lockAt: number, timeZone?: string): string {
    const daysAway = calendarDay(lockAt, timeZone) - calendarDay(now, timeZone);
    if (daysAway <= 0) {
        return 'today';
    }
    if (daysAway === 1) {
        return 'tomorrow';
    }
    if (daysAway < 7) {
        return new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone }).format(lockAt);
    }
    return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', timeZone }).format(
        lockAt,
    );
}
