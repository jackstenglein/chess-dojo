import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExplorerDatabaseType } from './Explorer';
import { usePositionGames } from './usePositionGames';

const mocks = vi.hoisted(() => ({
    listGamesByPosition:
        vi.fn<
            (
                fen: string,
                masters: boolean,
                startKey?: string,
                options?: { timeControls: string[] },
            ) => Promise<MockResponse>
        >(),
}));

vi.mock('@/api/Api', () => ({
    useApi: () => ({ listGamesByPosition: mocks.listGamesByPosition }),
}));

const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

function renderMasters(timeControls: string[]) {
    return renderHook(
        (props: { timeControls: string[] }) =>
            usePositionGames({
                fen,
                type: ExplorerDatabaseType.Masters,
                minCohort: '',
                maxCohort: '',
                timeControls: props.timeControls,
            }),
        { initialProps: { timeControls } },
    );
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((r) => {
        resolve = r;
    });
    return { promise, resolve };
}

interface MockResponse {
    data: { games: { id: string }[]; lastEvaluatedKey: undefined };
}

function response(prefix: string, count: number): MockResponse {
    return {
        data: {
            games: Array.from({ length: count }, (_, i) => ({ id: `${prefix}${i}` })),
            lastEvaluatedKey: undefined,
        },
    };
}

/** Makes each time control's first request wait until the returned resolver is called. */
function deferByTimeControl() {
    const requests = {
        standard: deferred<MockResponse>(),
        blitz: deferred<MockResponse>(),
    };
    const byTimeControl: Record<string, Promise<MockResponse>> = {
        standard: requests.standard.promise,
        blitz: requests.blitz.promise,
    };
    mocks.listGamesByPosition.mockImplementation((_fen, _masters, _startKey, options) =>
        options ? byTimeControl[options.timeControls[0]] : Promise.reject(new Error('no options')),
    );
    return requests;
}

describe('usePositionGames', () => {
    beforeEach(() => {
        mocks.listGamesByPosition.mockReset();
        mocks.listGamesByPosition.mockResolvedValue({
            data: { games: [], lastEvaluatedKey: undefined },
        });
    });

    afterEach(() => {
        cleanup();
    });

    it('fetches masters games for the selected time controls and again when they change', async () => {
        const { rerender } = renderMasters(['standard', 'unknown']);
        await waitFor(() =>
            expect(mocks.listGamesByPosition).toHaveBeenCalledWith(fen, true, undefined, {
                timeControls: ['standard', 'unknown'],
            }),
        );

        rerender({ timeControls: ['blitz'] });

        await waitFor(() =>
            expect(mocks.listGamesByPosition).toHaveBeenLastCalledWith(fen, true, undefined, {
                timeControls: ['blitz'],
            }),
        );
    });

    it('does not fetch masters games when no time control is selected', async () => {
        const { result } = renderMasters([]);

        await waitFor(() => expect(result.current.data).toEqual([]));
        expect(mocks.listGamesByPosition).not.toHaveBeenCalled();
    });

    it('does not request a page twice when the filters change back while it is loading', async () => {
        const requests = deferByTimeControl();
        const { result, rerender } = renderMasters(['standard']);
        rerender({ timeControls: ['blitz'] });
        rerender({ timeControls: ['standard'] });

        await act(async () => {
            requests.blitz.resolve(response('b', 1));
            requests.standard.resolve(response('s', 3));
            await Promise.all([requests.blitz.promise, requests.standard.promise]);
        });

        await waitFor(() =>
            expect(result.current.data.map((g) => g.id)).toEqual(['s0', 's1', 's2']),
        );
        const standardCalls = mocks.listGamesByPosition.mock.calls.filter(
            (call) => call[3]?.timeControls[0] === 'standard',
        );
        expect(standardCalls).toHaveLength(1);
    });

    it('keeps loading when a response arrives for filters that are no longer selected', async () => {
        const requests = deferByTimeControl();
        const { result, rerender } = renderMasters(['standard']);
        rerender({ timeControls: ['blitz'] });

        await act(async () => {
            requests.standard.resolve(response('s', 3));
            await requests.standard.promise;
        });
        expect(result.current.request.isLoading()).toBe(true);
        expect(result.current.data).toEqual([]);

        await act(async () => {
            requests.blitz.resolve(response('b', 2));
            await requests.blitz.promise;
        });
        await waitFor(() => expect(result.current.request.isLoading()).toBe(false));
        expect(result.current.data.map((g) => g.id)).toEqual(['b0', 'b1']);
    });
});
