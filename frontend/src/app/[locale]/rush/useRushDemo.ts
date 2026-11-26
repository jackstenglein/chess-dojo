'use client';

import {
    PuzzleRushAttempt,
    PuzzleRushEndReason,
    PuzzleRushPuzzle,
    PuzzleRushResult,
    PuzzleRushStats,
} from '@jackstenglein/chess-dojo-common/src/puzzles/rush/api';
import {
    applyRushResult,
    computePuzzleRushStats,
    currentRushRating,
    failedRushRating,
    initialRushLadder,
    nextRushRating,
    PUZZLE_RUSH_DURATION_SECONDS,
    PUZZLE_RUSH_MAX_STRIKES,
    PuzzleRushLadder,
} from '@jackstenglein/chess-dojo-common/src/puzzles/rush/rating';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCountdown } from 'usehooks-ts';
import { RushPuzzleSource } from './puzzleSource';

/** The phase of a demo run. */
export type RushDemoPhase = 'idle' | 'loading' | 'running' | 'finished';

/**
 * How long the result of a puzzle stays on screen before the next one, in ms.
 * The same pauses as the app's usePuzzleRush.
 */
export const RUSH_ADVANCE_DELAY_MS: Record<PuzzleRushResult, number> = {
    win: 500,
    loss: 800,
};

/** A finished run, handed to `onFinish`. */
export interface RushDemoResult {
    attempts: PuzzleRushAttempt[];
    stats: PuzzleRushStats;
    endReason: PuzzleRushEndReason;
    totalTimeSeconds: number;
}

export interface UseRushDemoOptions {
    /** Loads the puzzle source. Called once per run, when the run starts. */
    loadSource: () => Promise<RushPuzzleSource>;
    /** Runs this visitor has already finished. */
    runsCompleted: number;
    /** Runs a visitor may play. `start` does nothing once this many are finished. */
    runLimit: number;
    /** Called once when a run ends, however it ends. */
    onFinish?: (result: RushDemoResult) => void;
}

export interface UseRushDemoResponse {
    phase: RushDemoPhase;
    attempts: PuzzleRushAttempt[];
    strikes: number;
    /** The current search rating. */
    rating: number;
    /** The number of consecutive correct puzzles. */
    streak: number;
    secondsRemaining: number;
    currentPuzzle?: PuzzleRushPuzzle;
    /** The result of the puzzle just completed, shown briefly before advancing. */
    flash?: PuzzleRushResult;
    endReason?: PuzzleRushEndReason;
    stats: PuzzleRushStats;
    /** True when the puzzles could not be loaded for the run that was just started. */
    loadFailed: boolean;
    /** Starts a run. Returns false when the visitor has no runs left. */
    start: () => boolean;
    /** Ends the current run early. */
    abort: () => void;
    /** Records a wrong move on the current puzzle. */
    onWrongMove: () => void;
    /** Records the successful completion of the current puzzle. */
    onComplete: () => void;
}

/** Mutable state of the current run. Kept in a ref so board callbacks never go stale. */
interface RunState {
    /** Increments on every start, so async work from an old run can be ignored. */
    runId: number;
    source?: RushPuzzleSource;
    attempts: PuzzleRushAttempt[];
    ladder: PuzzleRushLadder;
    strikes: number;
    /** The ids of every puzzle served in this run. */
    seenIds: string[];
    current?: PuzzleRushPuzzle;
    /** The performance.now() timestamp when the current puzzle was shown. */
    puzzleStartedAt: number;
    /** Whether the current puzzle already has a result recorded. */
    resolved: boolean;
    /** Prefetched puzzles for each possible outcome of the current puzzle. */
    prefetch: Partial<Record<PuzzleRushResult, Promise<PuzzleRushPuzzle | undefined>>>;
}

function emptyRun(runId: number): RunState {
    return {
        runId,
        attempts: [],
        ladder: initialRushLadder(),
        strikes: 0,
        seenIds: [],
        puzzleStartedAt: 0,
        resolved: true,
        prefetch: {},
    };
}

/** Asks the source for a puzzle. Resolves to undefined if the source throws. */
async function fetchPuzzle(
    source: RushPuzzleSource | undefined,
    rating: number,
    excludeIds: string[],
): Promise<PuzzleRushPuzzle | undefined> {
    try {
        return await source?.next(rating, excludeIds);
    } catch {
        return undefined;
    }
}

/**
 * Runs Dojo Rush for a visitor without an account: the countdown, the strikes, the
 * rating ladder and puzzle prefetching. It plays by the rules of the app's
 * usePuzzleRush and uses the same ladder and stats functions. Two things differ:
 * the puzzles come from a RushPuzzleSource, and a finished run is handed to
 * `onFinish` and never sent to the server.
 */
export function useRushDemo({
    loadSource,
    runsCompleted,
    runLimit,
    onFinish,
}: UseRushDemoOptions): UseRushDemoResponse {
    const [phase, setPhase] = useState<RushDemoPhase>('idle');
    const [attempts, setAttempts] = useState<PuzzleRushAttempt[]>([]);
    const [strikes, setStrikes] = useState(0);
    const [ladder, setLadder] = useState<PuzzleRushLadder>(initialRushLadder);
    const [currentPuzzle, setCurrentPuzzle] = useState<PuzzleRushPuzzle>();
    const [flash, setFlash] = useState<PuzzleRushResult>();
    const [endReason, setEndReason] = useState<PuzzleRushEndReason>();
    const [loadFailed, setLoadFailed] = useState(false);

    const [secondsRemaining, { startCountdown, stopCountdown, resetCountdown }] = useCountdown({
        countStart: PUZZLE_RUSH_DURATION_SECONDS,
        countStop: 0,
        intervalMs: 1000,
    });

    const secondsRef = useRef(secondsRemaining);
    const phaseRef = useRef<RushDemoPhase>('idle');
    const run = useRef<RunState>(emptyRun(0));
    const options = useRef({ loadSource, runsCompleted, runLimit, onFinish });
    useEffect(() => {
        secondsRef.current = secondsRemaining;
        options.current = { loadSource, runsCompleted, runLimit, onFinish };
    });

    const setPhaseSynced = useCallback((next: RushDemoPhase) => {
        phaseRef.current = next;
        setPhase(next);
    }, []);

    const finish = useCallback(
        (reason: PuzzleRushEndReason) => {
            if (phaseRef.current !== 'running') {
                return;
            }

            const state = run.current;
            // A puzzle left unsolved when the run ends counts as a miss.
            if (state.current && !state.resolved) {
                const attempt: PuzzleRushAttempt = {
                    puzzleId: state.current.id,
                    fen: state.current.fen,
                    moves: state.current.moves,
                    puzzleRating: state.current.rating,
                    searchRating: currentRushRating(state.ladder),
                    result: 'loss',
                    timeSpentSeconds: Math.round(
                        (performance.now() - state.puzzleStartedAt) / 1000,
                    ),
                };
                state.attempts = [...state.attempts, attempt];
                state.ladder = applyRushResult(state.ladder, 'loss');
            }

            stopCountdown();
            state.resolved = true;
            state.prefetch = {};
            setEndReason(reason);
            setFlash(undefined);
            setAttempts(state.attempts);
            setPhaseSynced('finished');
            options.current.onFinish?.({
                attempts: state.attempts,
                stats: computePuzzleRushStats(state.attempts),
                endReason: reason,
                totalTimeSeconds: PUZZLE_RUSH_DURATION_SECONDS - secondsRef.current,
            });
        },
        [stopCountdown, setPhaseSynced],
    );

    /** Displays the given puzzle and prefetches a puzzle for each possible outcome. */
    const showPuzzle = useCallback((puzzle: PuzzleRushPuzzle) => {
        const state = run.current;
        state.current = puzzle;
        state.seenIds = [...state.seenIds, puzzle.id];
        state.resolved = false;
        state.puzzleStartedAt = performance.now();

        state.prefetch = {
            win: fetchPuzzle(state.source, nextRushRating(state.ladder), state.seenIds),
            loss: fetchPuzzle(state.source, failedRushRating(state.ladder), state.seenIds),
        };

        setCurrentPuzzle(puzzle);
        setFlash(undefined);
    }, []);

    const advance = useCallback(
        async (result: PuzzleRushResult) => {
            const state = run.current;
            const runId = state.runId;
            const rating = currentRushRating(state.ladder);
            const excludeIds = state.seenIds;

            let next = await state.prefetch[result];
            if (!next && phaseRef.current === 'running' && run.current.runId === runId) {
                next = await fetchPuzzle(state.source, rating, excludeIds);
            }
            if (phaseRef.current !== 'running' || run.current.runId !== runId) {
                return;
            }
            if (!next) {
                finish('aborted');
                return;
            }
            showPuzzle(next);
        },
        [finish, showPuzzle],
    );

    const recordResult = useCallback(
        (result: PuzzleRushResult) => {
            const state = run.current;
            if (phaseRef.current !== 'running' || state.resolved || !state.current) {
                return;
            }
            state.resolved = true;

            const attempt: PuzzleRushAttempt = {
                puzzleId: state.current.id,
                fen: state.current.fen,
                moves: state.current.moves,
                puzzleRating: state.current.rating,
                searchRating: currentRushRating(state.ladder),
                result,
                timeSpentSeconds: Math.round((performance.now() - state.puzzleStartedAt) / 1000),
            };
            state.attempts = [...state.attempts, attempt];
            state.ladder = applyRushResult(state.ladder, result);
            if (result === 'loss') {
                state.strikes += 1;
            }

            setAttempts(state.attempts);
            setLadder(state.ladder);
            setStrikes(state.strikes);
            setFlash(result);

            const runId = state.runId;
            const outOfStrikes = state.strikes >= PUZZLE_RUSH_MAX_STRIKES;
            setTimeout(() => {
                if (run.current.runId !== runId) {
                    return;
                }
                if (outOfStrikes) {
                    finish('strikes');
                } else {
                    void advance(result);
                }
            }, RUSH_ADVANCE_DELAY_MS[result]);
        },
        [advance, finish],
    );

    const start = useCallback(() => {
        if (options.current.runsCompleted >= options.current.runLimit) {
            return false;
        }
        if (phaseRef.current === 'loading' || phaseRef.current === 'running') {
            return true;
        }

        const runId = run.current.runId + 1;
        run.current = emptyRun(runId);
        setAttempts([]);
        setLadder(run.current.ladder);
        setStrikes(0);
        setCurrentPuzzle(undefined);
        setFlash(undefined);
        setEndReason(undefined);
        setLoadFailed(false);
        resetCountdown();
        setPhaseSynced('loading');

        const load = async () => {
            let source: RushPuzzleSource | undefined;
            try {
                source = await options.current.loadSource();
            } catch {
                source = undefined;
            }
            const puzzle = await fetchPuzzle(source, currentRushRating(run.current.ladder), []);
            if (run.current.runId !== runId || phaseRef.current !== 'loading') {
                return;
            }
            if (!source || !puzzle) {
                setLoadFailed(true);
                setPhaseSynced('idle');
                return;
            }
            run.current.source = source;
            setPhaseSynced('running');
            showPuzzle(puzzle);
            startCountdown();
        };
        void load();
        return true;
    }, [resetCountdown, startCountdown, setPhaseSynced, showPuzzle]);

    useEffect(() => {
        if (phase === 'running' && secondsRemaining <= 0) {
            finish('time');
        }
    }, [phase, secondsRemaining, finish]);

    const abort = useCallback(() => finish('aborted'), [finish]);
    const onWrongMove = useCallback(() => recordResult('loss'), [recordResult]);
    const onComplete = useCallback(() => recordResult('win'), [recordResult]);

    const stats = useMemo(() => computePuzzleRushStats(attempts), [attempts]);

    return {
        phase,
        attempts,
        strikes,
        rating: currentRushRating(ladder),
        streak: ladder.streak,
        secondsRemaining,
        currentPuzzle,
        flash,
        endReason,
        stats,
        loadFailed,
        start,
        abort,
        onWrongMove,
        onComplete,
    };
}
