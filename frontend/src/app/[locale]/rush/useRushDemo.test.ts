import { PuzzleRushPuzzle } from '@jackstenglein/chess-dojo-common/src/puzzles/rush/api';
import {
    PUZZLE_RUSH_DURATION_SECONDS,
    PUZZLE_RUSH_START_RATING,
} from '@jackstenglein/chess-dojo-common/src/puzzles/rush/rating';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RushPuzzleSource } from './puzzleSource';
import { RUSH_ADVANCE_DELAY_MS, RushDemoResult, useRushDemo } from './useRushDemo';

/**
 * A source with a fixed pool that always hands out the first puzzle the caller has
 * not excluded. If the hook forgot to exclude a puzzle, that puzzle would come back.
 */
function fakeSource(size = 200) {
    const pool: PuzzleRushPuzzle[] = Array.from({ length: size }, (_, index) => ({
        id: `p${index}`,
        fen: 'fen',
        moves: ['e2e4', 'e7e5'],
        rating: 1000 + index,
        themes: [],
    }));
    const requests: { rating: number; excludeIds: string[] }[] = [];
    const source: RushPuzzleSource = {
        next(rating, excludeIds) {
            requests.push({ rating, excludeIds: [...excludeIds] });
            return Promise.resolve(pool.find((puzzle) => !excludeIds.includes(puzzle.id)));
        },
    };
    return { source, requests };
}

function setup({
    runsCompleted = 0,
    loadSource,
}: { runsCompleted?: number; loadSource?: () => Promise<RushPuzzleSource> } = {}) {
    const fake = fakeSource();
    const onFinish = vi.fn<(result: RushDemoResult) => void>();
    const load = vi.fn(loadSource ?? (() => Promise.resolve(fake.source)));
    const hook = renderHook(() =>
        useRushDemo({ loadSource: load, runsCompleted, runLimit: 3, onFinish }),
    );
    return { ...fake, onFinish, load, result: hook.result };
}

async function flush(ms = 0) {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
    });
}

type Hook = ReturnType<typeof setup>['result'];

async function start(result: Hook) {
    act(() => {
        result.current.start();
    });
    await flush();
}

async function solve(result: Hook) {
    act(() => result.current.onComplete());
    await flush(RUSH_ADVANCE_DELAY_MS.win);
}

async function miss(result: Hook) {
    act(() => result.current.onWrongMove());
    await flush(RUSH_ADVANCE_DELAY_MS.loss);
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('useRushDemo', () => {
    it('starts a run at the start rating with a full clock', async () => {
        const { result, load } = setup();
        expect(result.current.phase).toBe('idle');

        await start(result);

        expect(load).toHaveBeenCalledTimes(1);
        expect(result.current.phase).toBe('running');
        expect(result.current.rating).toBe(PUZZLE_RUSH_START_RATING);
        expect(result.current.secondsRemaining).toBe(PUZZLE_RUSH_DURATION_SECONDS);
        expect(result.current.currentPuzzle?.id).toBe('p0');
        expect(result.current.strikes).toBe(0);
    });

    it('prefetches a puzzle for a solve and for a miss as soon as one is shown', async () => {
        const { result, requests } = setup();
        await start(result);

        // The first request is the opening puzzle. The next two are the prefetches.
        expect(requests.map((request) => request.rating)).toEqual([300, 350, 300]);
        expect(requests[1].excludeIds).toEqual(['p0']);
        expect(requests[2].excludeIds).toEqual(['p0']);
    });

    it('climbs with each solve and drops back to the previous rating on a miss', async () => {
        const { result } = setup();
        await start(result);

        await solve(result);
        expect(result.current.rating).toBe(350);
        await solve(result);
        expect(result.current.rating).toBe(410);
        expect(result.current.streak).toBe(2);

        await miss(result);
        expect(result.current.rating).toBe(350);
        expect(result.current.streak).toBe(0);
        expect(result.current.strikes).toBe(1);
        expect(result.current.phase).toBe('running');
    });

    it('shows the result briefly before the next puzzle', async () => {
        const { result } = setup();
        await start(result);

        act(() => result.current.onComplete());
        expect(result.current.flash).toBe('win');
        expect(result.current.currentPuzzle?.id).toBe('p0');

        await flush(RUSH_ADVANCE_DELAY_MS.win);
        expect(result.current.flash).toBeUndefined();
        expect(result.current.currentPuzzle?.id).toBe('p1');
    });

    it('ends the run on the third strike', async () => {
        const { result, onFinish } = setup();
        await start(result);

        await solve(result);
        await miss(result);
        await miss(result);
        expect(result.current.phase).toBe('running');
        await miss(result);

        expect(result.current.phase).toBe('finished');
        expect(result.current.endReason).toBe('strikes');
        expect(onFinish).toHaveBeenCalledTimes(1);
        const finished = onFinish.mock.calls[0][0];
        expect(finished.endReason).toBe('strikes');
        expect(finished.attempts.map((attempt) => attempt.result)).toEqual([
            'win',
            'loss',
            'loss',
            'loss',
        ]);
        expect(finished.stats.correctCount).toBe(1);
        expect(finished.stats.percentage).toBe(25);
    });

    it('ends the run when the clock runs out, and counts the open puzzle as a miss', async () => {
        const { result, onFinish } = setup();
        await start(result);
        await solve(result);

        await flush(PUZZLE_RUSH_DURATION_SECONDS * 1000);

        expect(result.current.phase).toBe('finished');
        expect(result.current.endReason).toBe('time');
        expect(result.current.secondsRemaining).toBe(0);
        expect(onFinish).toHaveBeenCalledTimes(1);
        const finished = onFinish.mock.calls[0][0];
        expect(finished.totalTimeSeconds).toBe(PUZZLE_RUSH_DURATION_SECONDS);
        expect(finished.attempts.map((attempt) => attempt.result)).toEqual(['win', 'loss']);
    });

    it('ends early on request and ignores moves after the run is over', async () => {
        const { result, onFinish } = setup();
        await start(result);
        await solve(result);

        act(() => result.current.abort());
        expect(result.current.phase).toBe('finished');
        expect(result.current.endReason).toBe('aborted');

        act(() => result.current.onComplete());
        await flush(5000);
        expect(onFinish).toHaveBeenCalledTimes(1);
        expect(result.current.stats.correctCount).toBe(1);
    });

    it('records one result per puzzle, however often the board reports it', async () => {
        const { result } = setup();
        await start(result);

        act(() => {
            result.current.onWrongMove();
            result.current.onWrongMove();
            result.current.onComplete();
        });
        await flush(RUSH_ADVANCE_DELAY_MS.loss);

        expect(result.current.attempts).toHaveLength(1);
        expect(result.current.strikes).toBe(1);
    });

    it('never repeats a puzzle inside a run', async () => {
        const { result, requests } = setup();
        await start(result);

        const shown = [result.current.currentPuzzle?.id];
        const pattern = ['win', 'win', 'loss', 'win', 'win', 'win', 'loss', 'win'] as const;
        for (let round = 0; round < 3 && result.current.phase === 'running'; round++) {
            for (const outcome of pattern) {
                if (result.current.strikes === 2 && outcome === 'loss') {
                    continue;
                }
                await (outcome === 'win' ? solve(result) : miss(result));
                shown.push(result.current.currentPuzzle?.id);
            }
        }

        expect(shown.length).toBeGreaterThan(15);
        expect(new Set(shown).size).toBe(shown.length);
        // Every request excluded every puzzle that had been shown by then.
        for (const request of requests.slice(1)) {
            expect(request.excludeIds.length).toBeGreaterThan(0);
            expect(new Set(request.excludeIds).size).toBe(request.excludeIds.length);
        }
    });

    it('does not start a run once three are finished', async () => {
        const { result, load } = setup({ runsCompleted: 3 });

        let started = true;
        act(() => {
            started = result.current.start();
        });
        await flush();

        expect(started).toBe(false);
        expect(result.current.phase).toBe('idle');
        expect(load).not.toHaveBeenCalled();
    });

    it('starts the third run but not a fourth', async () => {
        const third = setup({ runsCompleted: 2 });
        await start(third.result);
        expect(third.result.current.phase).toBe('running');
    });

    it('goes back to idle and says so when the puzzles cannot be loaded', async () => {
        const { result, onFinish } = setup({
            loadSource: () => Promise.reject(new Error('offline')),
        });
        await start(result);

        expect(result.current.phase).toBe('idle');
        expect(result.current.loadFailed).toBe(true);
        expect(onFinish).not.toHaveBeenCalled();
    });

    it('ends the run if the source has nothing left to give', async () => {
        const empty: RushPuzzleSource = {
            next: (_rating, excludeIds) =>
                Promise.resolve(
                    excludeIds.length === 0
                        ? {
                              id: 'only',
                              fen: 'fen',
                              moves: ['e2e4', 'e7e5'],
                              rating: 300,
                              themes: [],
                          }
                        : undefined,
                ),
        };
        const { result, onFinish } = setup({ loadSource: () => Promise.resolve(empty) });
        await start(result);
        await solve(result);

        expect(result.current.phase).toBe('finished');
        expect(result.current.endReason).toBe('aborted');
        expect(onFinish).toHaveBeenCalledTimes(1);
    });

    it('starts a second run from a clean slate', async () => {
        const { result, onFinish } = setup();
        await start(result);
        await solve(result);
        await miss(result);
        await miss(result);
        await miss(result);
        expect(result.current.phase).toBe('finished');

        await start(result);

        expect(result.current.phase).toBe('running');
        expect(result.current.attempts).toEqual([]);
        expect(result.current.strikes).toBe(0);
        expect(result.current.rating).toBe(PUZZLE_RUSH_START_RATING);
        expect(result.current.secondsRemaining).toBe(PUZZLE_RUSH_DURATION_SECONDS);
        expect(onFinish).toHaveBeenCalledTimes(1);
    });
});
