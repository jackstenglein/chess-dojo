import { useApi } from '@/api/Api';
import { useChess } from '@/board/pgn/PgnBoard';
import useGame from '@/context/useGame';
import { useRouter } from '@/hooks/useRouter';
import { Chess } from '@jackstenglein/chess';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUnsavedGame } from './useUnsavedGame';

vi.mock('@/analytics/events', () => ({
    EventType: { SubmitGame: 'SubmitGame' },
    trackEvent: vi.fn(),
}));
vi.mock('@/api/Api', () => ({ useApi: vi.fn() }));
vi.mock('@/board/pgn/PgnBoard', () => ({ useChess: vi.fn() }));
vi.mock('@/context/useGame', () => ({ default: vi.fn() }));
vi.mock('@/hooks/useRouter', () => ({ useRouter: vi.fn() }));

const form = {
    white: 'White',
    black: 'Black',
    date: null,
    result: '*',
    orientation: 'white' as const,
};

describe('useUnsavedGame', () => {
    const createGame = vi.fn();
    const push = vi.fn();
    const chess = {
        setHeader: vi.fn(),
        pgn: { render: vi.fn(() => '1. e4 e5 *') },
    } as unknown as Chess;

    beforeEach(() => {
        sessionStorage.clear();
        vi.mocked(useApi).mockReturnValue({ createGame } as unknown as ReturnType<typeof useApi>);
        vi.mocked(useChess).mockReturnValue({ chess: undefined });
        vi.mocked(useGame).mockReturnValue({});
        vi.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('keeps the save dialog open when creating the game fails', async () => {
        createGame.mockRejectedValue(new Error('Internal server error'));
        const onNavigate = vi.fn();
        const { result } = renderHook(() => useUnsavedGame(chess));

        act(() => result.current.setShowDialog(true));

        await act(async () => {
            await result.current.onSubmit(form, onNavigate);
        });

        expect(result.current.showDialog).toBe(true);
        expect(result.current.request.isFailure()).toBe(true);
        expect(onNavigate).not.toHaveBeenCalled();
    });

    it('closes the save dialog and navigates after creating the game', async () => {
        createGame.mockResolvedValue({
            data: { id: 'game-id', cohort: '1500-1600' },
        });
        const onNavigate = vi.fn();
        const { result } = renderHook(() => useUnsavedGame(chess));

        act(() => result.current.setShowDialog(true));

        await act(async () => {
            await result.current.onSubmit(form, onNavigate);
        });

        expect(result.current.showDialog).toBe(false);
        expect(result.current.request.isFailure()).toBe(false);
        expect(onNavigate).toHaveBeenCalledOnce();
    });
});
