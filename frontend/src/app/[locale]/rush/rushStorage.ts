import { puzzleRushEndReasonSchema } from '@jackstenglein/chess-dojo-common/src/puzzles/rush/api';
import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import { RUSH_DEMO_RUN_LIMIT } from './content';

/**
 * The three-run limit lives in this browser's localStorage. It is a nudge toward
 * signing up, so a visitor who clears their storage simply gets three more runs.
 */
const RUNS_KEY = 'rushDemo.runs';

const missSchema = z.object({
    puzzleId: z.string(),
    fen: z.string(),
    moves: z.string().array().min(2),
    rating: z.number(),
});

const attemptSchema = z.object({
    puzzleId: z.string(),
    /** The puzzle's rating on the Dojo scale. */
    rating: z.number(),
    result: z.enum(['win', 'loss']),
    seconds: z.number(),
});

const runSchema = z.object({
    /** Puzzles solved. This is the run's score. */
    solved: z.number(),
    attempted: z.number(),
    /** Percentage of attempted puzzles that were solved, 0 to 100. */
    accuracy: z.number(),
    /** Rating of the hardest puzzle solved, or 0 if none was. */
    highestSolved: z.number(),
    timeSeconds: z.number(),
    endReason: puzzleRushEndReasonSchema,
    finishedAt: z.string(),
    /** The puzzles the visitor got wrong, kept so they can go through them afterward. */
    misses: missSchema.array(),
    /** Every puzzle served, so later runs can start with fresh ones. */
    puzzleIds: z.string().array(),
    /** Every attempt in order, for the chart of the run. Older saved runs have none. */
    attempts: attemptSchema.array().default([]),
});

export type RushDemoMiss = z.infer<typeof missSchema>;
export type RushDemoAttempt = z.infer<typeof attemptSchema>;
export type RushDemoRun = z.infer<typeof runSchema>;

const EMPTY_RUNS: RushDemoRun[] = [];
const listeners = new Set<() => void>();

/** Used when the browser blocks storage, so the limit still holds for this visit. */
let memoryValue: string | null = null;
let storageBlocked = false;

let cachedRaw: string | null | undefined;
let cachedRuns: RushDemoRun[] = EMPTY_RUNS;

function readRaw(): string | null {
    if (storageBlocked) {
        return memoryValue;
    }
    try {
        return window.localStorage.getItem(RUNS_KEY);
    } catch {
        storageBlocked = true;
        return memoryValue;
    }
}

function writeRaw(value: string) {
    memoryValue = value;
    try {
        window.localStorage.setItem(RUNS_KEY, value);
    } catch {
        storageBlocked = true;
    }
}

/** The finished runs in this browser, oldest first. Never more than the limit. */
export function readRuns(): RushDemoRun[] {
    const raw = readRaw();
    if (raw === cachedRaw) {
        return cachedRuns;
    }
    cachedRaw = raw;
    cachedRuns = parseRuns(raw);
    return cachedRuns;
}

function parseRuns(raw: string | null): RushDemoRun[] {
    if (!raw) {
        return EMPTY_RUNS;
    }
    try {
        const parsed = runSchema.array().safeParse(JSON.parse(raw));
        return parsed.success ? parsed.data.slice(0, RUSH_DEMO_RUN_LIMIT) : EMPTY_RUNS;
    } catch {
        return EMPTY_RUNS;
    }
}

/** Records a finished run. Does nothing once the limit is reached. */
export function saveRun(run: RushDemoRun): RushDemoRun[] {
    const runs = readRuns();
    if (runs.length >= RUSH_DEMO_RUN_LIMIT) {
        return runs;
    }
    writeRaw(JSON.stringify([...runs, run]));
    listeners.forEach((listener) => listener());
    return readRuns();
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    window.addEventListener('storage', listener);
    return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', listener);
    };
}

/** The finished runs. Empty during server rendering and for a first-time visitor. */
export function useRushRuns(): RushDemoRun[] {
    return useSyncExternalStore(subscribe, readRuns, () => EMPTY_RUNS);
}

export function bestSolved(runs: RushDemoRun[]): number {
    return runs.reduce((best, run) => Math.max(best, run.solved), 0);
}

export function hasRunsLeft(runs: RushDemoRun[]): boolean {
    return runs.length < RUSH_DEMO_RUN_LIMIT;
}

/** Clears the stored runs. Only tests use this. */
export function resetRunsForTest() {
    memoryValue = null;
    storageBlocked = false;
    cachedRaw = undefined;
    cachedRuns = EMPTY_RUNS;
    try {
        window.localStorage.removeItem(RUNS_KEY);
    } catch {
        // Nothing to clear.
    }
}
