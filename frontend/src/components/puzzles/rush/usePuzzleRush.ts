'use client';

import { getPuzzleRushPuzzle, submitPuzzleRushSession } from '@/api/puzzleApi';
import { Request, useRequest } from '@/api/Request';
import { logger } from '@/logging/logger';
import {
    PuzzleRushAttempt,
    PuzzleRushEndReason,
    PuzzleRushPuzzle,
    PuzzleRushResult,
    PuzzleRushSession,
    PuzzleRushStats,
} from '@jackstenglein/chess-dojo-common/src/puzzleRush/api';
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
} from '@jackstenglein/chess-dojo-common/src/puzzleRush/rating';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCountdown } from 'usehooks-ts';

/** The phase of a puzzle rush run. */
export type PuzzleRushPhase = 'idle' | 'loading' | 'running' | 'finished';

/** How long to show the result of a puzzle before advancing to the next one, in ms. */
const ADVANCE_DELAY_MS: Record<PuzzleRushResult, number> = {
    win: 500,
    loss: 800,
};

/** Mutable state of the current run. Kept in a ref so solitaire callbacks never go stale. */
interface RunState {
    /** Increments on every start, so async work from an old run can be ignored. */
    runId: number;
    /** Client-generated timestamp identifying the run. */
    createdAt: string;
    /** The attempts made so far. */
    attempts: PuzzleRushAttempt[];
    /** The rating ladder. */
    ladder: PuzzleRushLadder;
    /** The number of failed puzzles. */
    strikes: number;
    /** The ids of every puzzle served in this run. */
    seenIds: string[];
    /** The puzzle currently being solved. */
    current?: PuzzleRushPuzzle;
    /** The performance.now() timestamp when the current puzzle was shown. */
    puzzleStartedAt: number;
    /** Whether the current puzzle already has a result recorded. */
    resolved: boolean;
    /** Prefetched puzzles for each possible outcome of the current puzzle. */
    prefetch: Partial<Record<PuzzleRushResult, Promise<PuzzleRushPuzzle | undefined>>>;
}

export interface UsePuzzleRushResponse {
    /** The phase of the run. */
    phase: PuzzleRushPhase;
    /** The attempts made so far. */
    attempts: PuzzleRushAttempt[];
    /** The number of failed puzzles. */
    strikes: number;
    /** The current search rating. */
    rating: number;
    /** The number of consecutive correct puzzles. */
    streak: number;
    /** The number of seconds remaining in the run. */
    secondsRemaining: number;
    /** The puzzle currently being solved. */
    currentPuzzle?: PuzzleRushPuzzle;
    /** The result of the puzzle that was just completed, shown briefly before advancing. */
    flash?: PuzzleRushResult;
    /** The reason the run ended, if finished. */
    endReason?: PuzzleRushEndReason;
    /** The client-generated timestamp identifying the run. */
    createdAt: string;
    /** The locally computed statistics for the run. */
    stats: PuzzleRushStats;
    /** The request tracker for saving the run. Data is the server-saved session. */
    submitRequest: Request<PuzzleRushSession>;
    /** The request tracker for fetching puzzles. */
    fetchRequest: Request;
    /** Starts a new run. */
    start: () => void;
    /** Ends the current run early. */
    abort: () => void;
    /** Retries saving a finished run. */
    retrySubmit: () => void;
    /** Records a wrong move on the current puzzle. */
    onWrongMove: (pgn?: string) => void;
    /** Records the successful completion of the current puzzle. */
    onComplete: () => void;
}

/** Fetches a puzzle, retrying once on failure. Resolves to undefined if both attempts fail. */
async function fetchPuzzle(
    rating: number,
    excludeIds: string[],
): Promise<PuzzleRushPuzzle | undefined> {
    for (let i = 0; i < 2; i++) {
        try {
            const response = await getPuzzleRushPuzzle({ rating, excludeIds });
            return response.data.puzzle;
        } catch (err) {
            logger.error('Failed to fetch puzzle rush puzzle: ', err);
        }
    }
    return undefined;
}

/**
 * Manages the state machine of a puzzle rush run: the countdown, the strikes, the
 * rating ladder, puzzle prefetching and saving the finished run.
 */
export function usePuzzleRush(): UsePuzzleRushResponse {
    const [phase, setPhase] = useState<PuzzleRushPhase>('idle');
    const [attempts, setAttempts] = useState<PuzzleRushAttempt[]>([]);
    const [strikes, setStrikes] = useState(0);
    const [ladder, setLadder] = useState<PuzzleRushLadder>(initialRushLadder);
    const [currentPuzzle, setCurrentPuzzle] = useState<PuzzleRushPuzzle>();
    const [flash, setFlash] = useState<PuzzleRushResult>();
    const [endReason, setEndReason] = useState<PuzzleRushEndReason>();
    const [createdAt, setCreatedAt] = useState('');
    const submitRequest = useRequest<PuzzleRushSession>();
    const fetchRequest = useRequest();

    const [secondsRemaining, { startCountdown, stopCountdown, resetCountdown }] = useCountdown({
        countStart: PUZZLE_RUSH_DURATION_SECONDS,
        countStop: 0,
        intervalMs: 1000,
    });
    const secondsRef = useRef(secondsRemaining);
    secondsRef.current = secondsRemaining;

    const phaseRef = useRef<PuzzleRushPhase>('idle');
    const run = useRef<RunState>({
        runId: 0,
        createdAt: '',
        attempts: [],
        ladder: initialRushLadder(),
        strikes: 0,
        seenIds: [],
        puzzleStartedAt: 0,
        resolved: true,
        prefetch: {},
    });

    const setPhaseSynced = useCallback((next: PuzzleRushPhase) => {
        phaseRef.current = next;
        setPhase(next);
    }, []);

    const submit = useCallback(
        (state: RunState, reason: PuzzleRushEndReason) => {
            submitRequest.onStart();
            submitPuzzleRushSession({
                attempts: state.attempts,
                totalTimeSeconds: PUZZLE_RUSH_DURATION_SECONDS - secondsRef.current,
                endReason: reason,
                createdAt: state.createdAt,
            })
                .then((response) => submitRequest.onSuccess(response.data.session))
                .catch((err: unknown) => submitRequest.onFailure(err));
        },
        [submitRequest],
    );

    const finish = useCallback(
        (reason: PuzzleRushEndReason) => {
            if (phaseRef.current !== 'running' && phaseRef.current !== 'loading') {
                return;
            }
            stopCountdown();
            run.current.resolved = true;
            run.current.prefetch = {};
            setEndReason(reason);
            setFlash(undefined);
            setPhaseSynced('finished');
            submit(run.current, reason);
        },
        [stopCountdown, submit, setPhaseSynced],
    );

    /** Displays the given puzzle and prefetches a puzzle for each possible outcome. */
    const showPuzzle = useCallback((puzzle: PuzzleRushPuzzle) => {
        const state = run.current;
        state.current = puzzle;
        state.seenIds = [...state.seenIds, puzzle.id];
        state.resolved = false;
        state.puzzleStartedAt = performance.now();

        const rating = currentRushRating(state.ladder);
        state.prefetch = {
            win: fetchPuzzle(nextRushRating(rating, state.ladder.streak + 1), state.seenIds),
            loss: fetchPuzzle(failedRushRating(state.ladder), state.seenIds),
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
                next = await fetchPuzzle(rating, excludeIds);
            }
            if (phaseRef.current !== 'running' || run.current.runId !== runId) {
                return;
            }
            if (!next) {
                fetchRequest.onFailure(new Error('Could not load the next puzzle'));
                finish('aborted');
                return;
            }
            showPuzzle(next);
        },
        [fetchRequest, finish, showPuzzle],
    );

    const recordResult = useCallback(
        (result: PuzzleRushResult, pgn?: string) => {
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
                pgn: result === 'loss' ? pgn : undefined,
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
            }, ADVANCE_DELAY_MS[result]);
        },
        [advance, finish],
    );

    const start = useCallback(() => {
        const runId = run.current.runId + 1;
        const timestamp = new Date().toISOString();
        run.current = {
            runId,
            createdAt: timestamp,
            attempts: [],
            ladder: initialRushLadder(),
            strikes: 0,
            seenIds: [],
            puzzleStartedAt: 0,
            resolved: true,
            prefetch: {},
        };
        setAttempts([]);
        setLadder(run.current.ladder);
        setStrikes(0);
        setCurrentPuzzle(undefined);
        setFlash(undefined);
        setEndReason(undefined);
        setCreatedAt(timestamp);
        submitRequest.reset();
        fetchRequest.reset();
        resetCountdown();
        setPhaseSynced('loading');

        void fetchPuzzle(currentRushRating(run.current.ladder), []).then((puzzle) => {
            if (run.current.runId !== runId || phaseRef.current !== 'loading') {
                return;
            }
            if (!puzzle) {
                fetchRequest.onFailure(new Error('Could not load the first puzzle'));
                setPhaseSynced('idle');
                return;
            }
            setPhaseSynced('running');
            showPuzzle(puzzle);
            startCountdown();
        });
    }, [submitRequest, fetchRequest, resetCountdown, startCountdown, setPhaseSynced, showPuzzle]);

    useEffect(() => {
        if (phase === 'running' && secondsRemaining <= 0) {
            finish('time');
        }
    }, [phase, secondsRemaining, finish]);

    const abort = useCallback(() => finish('aborted'), [finish]);

    const retrySubmit = useCallback(() => {
        if (phaseRef.current === 'finished' && endReason) {
            submit(run.current, endReason);
        }
    }, [submit, endReason]);

    const onWrongMove = useCallback((pgn?: string) => recordResult('loss', pgn), [recordResult]);
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
        createdAt,
        stats,
        submitRequest,
        fetchRequest,
        start,
        abort,
        retrySubmit,
        onWrongMove,
        onComplete,
    };
}
