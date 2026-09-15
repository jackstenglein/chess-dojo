import { ChessDBService } from '@/api/chessdbService';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChessDB } from './useChessDb';

const { getChessDbCache, setChessDbCacheEntry } = vi.hoisted(() => ({
    getChessDbCache: vi.fn(),
    setChessDbCacheEntry: vi.fn(),
}));

vi.mock('@/api/cache/chessdb', () => ({ getChessDbCache, setChessDbCacheEntry }));
vi.mock('@/board/pgn/PgnBoard', () => ({ useChess: () => ({ chess: undefined }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const otherFen = 'rnbqkbnr/pppp1ppp/8/4p3/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 2';

describe('useChessDB queue analysis', () => {
    beforeEach(() => {
        getChessDbCache.mockReset();
        getChessDbCache.mockResolvedValue(undefined);
        setChessDbCacheEntry.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('does not queue when an analysis lookup is unavailable', async () => {
        vi.spyOn(ChessDBService.prototype, 'getAnalysis').mockResolvedValue({
            error: 'Position evaluation not available: unknown',
        });
        const queueAnalysis = vi
            .spyOn(ChessDBService.prototype, 'queueAnalysis')
            .mockResolvedValue({ success: true });
        const { result } = renderHook(() => useChessDB({ enableMoves: false, enablePv: false }));

        await act(async () => {
            await result.current.fetchChessDBData(fen, true);
        });

        expect(queueAnalysis).not.toHaveBeenCalled();
        expect(result.current.error).toBe('Position evaluation not available: unknown');
    });

    it('shows queueing until an explicit queue request succeeds', async () => {
        let resolveQueue!: (value: { success: boolean }) => void;
        const response = new Promise<{ success: boolean }>((resolve) => {
            resolveQueue = resolve;
        });
        vi.spyOn(ChessDBService.prototype, 'queueAnalysis').mockReturnValue(response);
        const { result } = renderHook(() => useChessDB({ enableMoves: false, enablePv: false }));
        let request!: Promise<void>;

        act(() => {
            request = result.current.queueAnalysis(fen);
        });

        expect(result.current.queueing).toBe(true);
        expect(result.current.queued).toBe(false);

        await act(async () => {
            resolveQueue({ success: true });
            await request;
        });

        expect(result.current.queueing).toBe(false);
        expect(result.current.queued).toBe(true);
        expect(result.current.error).toBeNull();
    });

    it('surfaces a returned queue error and remains retryable', async () => {
        vi.spyOn(ChessDBService.prototype, 'queueAnalysis').mockResolvedValue({
            error: 'Failed to queue position: limit',
        });
        const { result } = renderHook(() => useChessDB({ enableMoves: false, enablePv: false }));

        await act(async () => {
            await result.current.queueAnalysis(fen);
        });

        expect(result.current.queueing).toBe(false);
        expect(result.current.queued).toBe(false);
        expect(result.current.error).toBe('Failed to queue position: limit');
    });

    it('clears queued confirmation before fetching another position', async () => {
        vi.spyOn(ChessDBService.prototype, 'queueAnalysis').mockResolvedValue({ success: true });
        vi.spyOn(ChessDBService.prototype, 'getAnalysis').mockResolvedValue({
            error: 'Position evaluation not available: unknown',
        });
        const { result } = renderHook(() => useChessDB({ enableMoves: false, enablePv: false }));

        await act(async () => {
            await result.current.queueAnalysis(fen);
        });
        expect(result.current.queued).toBe(true);

        await act(async () => {
            await result.current.fetchChessDBData(otherFen, true);
        });

        expect(result.current.queued).toBe(false);
    });
});
