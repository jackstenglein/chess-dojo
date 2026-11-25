import type { BoardApi } from '@/board/Board';
import { Chess } from '@jackstenglein/chess';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSolitaireChess } from './useSolitaireChess';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
}));

const PGN = '1. e4 e5 2. Nf3 *';

function fakeBoard(): BoardApi {
    return { set: vi.fn(), state: { orientation: 'white' } } as unknown as BoardApi;
}

describe('useSolitaireChess timers', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        vi.stubGlobal(
            'Audio',
            class {
                play() {
                    return Promise.resolve();
                }
            },
        );
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('does not play the opponent reply after solitaire stops', () => {
        const chess = new Chess({ pgn: PGN });
        const board = fakeBoard();
        const { result } = renderHook(() => useSolitaireChess(chess, board));

        act(() => {
            result.current.start(null, { playAs: 'black', firstMoveDelayMs: 500 });
        });
        act(() => {
            result.current.stop();
        });
        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(chess.currentMove()?.san).toBeUndefined();
    });

    it('does not play the opponent reply after unmount', () => {
        const chess = new Chess({ pgn: PGN });
        const board = fakeBoard();
        const { result, unmount } = renderHook(() => useSolitaireChess(chess, board));

        act(() => {
            result.current.start(null, { playAs: 'black', firstMoveDelayMs: 500 });
        });
        unmount();
        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(chess.currentMove()?.san).toBeUndefined();
    });

    it('does not snap the board back after unmount following a wrong move', () => {
        const chess = new Chess({ pgn: PGN });
        const board = fakeBoard();
        const { result, unmount } = renderHook(() => useSolitaireChess(chess, board));

        act(() => {
            result.current.start(null, { addWrongMoves: false });
        });
        act(() => {
            result.current.onMove(board, chess, { orig: 'a2', dest: 'a3' });
        });
        const set = vi.mocked(board.set);
        set.mockClear();
        unmount();
        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(set).not.toHaveBeenCalled();
    });
});
