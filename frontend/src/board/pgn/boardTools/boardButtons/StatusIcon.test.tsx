import { useApi } from '@/api/Api';
import { useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { useReconcile } from '@/board/Board';
import { useChess } from '@/board/pgn/PgnBoard';
import useGame from '@/context/useGame';
import { Game } from '@/database/game';
import { EventType as ChessEventType, Observer } from '@jackstenglein/chess';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StatusIcon from './StatusIcon';

vi.mock('@/analytics/events', () => ({
    EventType: { UpdateGame: 'UpdateGame' },
    trackEvent: vi.fn(),
}));
vi.mock('@/api/Api', () => ({ useApi: vi.fn() }));
vi.mock('@/api/Request', () => ({
    RequestSnackbar: () => null,
    useRequest: vi.fn(),
}));
vi.mock('@/auth/Auth', () => ({ useAuth: vi.fn() }));
vi.mock('@/board/Board', () => ({ useReconcile: vi.fn() }));
vi.mock('@/board/pgn/PgnBoard', () => ({ useChess: vi.fn() }));
vi.mock('@/components/calendar/displayDate', () => ({
    toDojoDateString: vi.fn(() => 'date'),
    toDojoTimeString: vi.fn(() => 'time'),
}));
vi.mock('@/context/useGame', () => ({ default: vi.fn() }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

interface Deferred<T> {
    promise: Promise<T>;
    resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((res) => {
        resolve = res;
    });
    return { promise, resolve };
}

const game = {
    cohort: '1500-1600',
    id: 'game-id',
    updatedAt: '2026-08-26T12:00:00Z',
} as Game;

describe('StatusIcon autosave', () => {
    let pgn: string;
    let observer: Observer;
    let requests: Deferred<{ data: { updatedAt: string } }>[];
    const updateGame = vi.fn();
    const setHasUnsavedGameChanges = vi.fn();
    const updatedAtRef = { current: game.updatedAt };
    const request = {
        data: undefined,
        onStart: vi.fn(),
        onSuccess: vi.fn(),
        onFailure: vi.fn(),
        isLoading: vi.fn(() => false),
        isFailure: vi.fn(() => false),
    };

    beforeEach(() => {
        vi.useFakeTimers();
        pgn = 'PGN 0';
        requests = [];
        updatedAtRef.current = game.updatedAt;
        updateGame.mockImplementation(() => {
            const result = deferred<{ data: { updatedAt: string } }>();
            requests.push(result);
            return result.promise;
        });

        vi.mocked(useApi).mockReturnValue({ updateGame } as unknown as ReturnType<typeof useApi>);
        vi.mocked(useRequest).mockReturnValue(request as unknown as ReturnType<typeof useRequest>);
        vi.mocked(useAuth).mockReturnValue({ user: undefined } as ReturnType<typeof useAuth>);
        vi.mocked(useReconcile).mockReturnValue(vi.fn());
        vi.mocked(useChess).mockReturnValue({
            chess: {
                renderPgn: () => pgn,
                addObserver: vi.fn((value: Observer) => {
                    observer = value;
                }),
                removeObserver: vi.fn(),
            } as unknown as ReturnType<typeof useChess>['chess'],
        });
        vi.mocked(useGame).mockReturnValue({
            updatedAtRef,
            setHasUnsavedGameChanges,
        });
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    const editGame = (nextPgn: string) => {
        pgn = nextPgn;
        act(() => observer.handler({ type: ChessEventType.UpdateComment }));
    };

    const runDebounce = () => {
        act(() => {
            vi.advanceTimersByTime(6000);
        });
    };

    it('remains dirty when the board changes while an autosave is in progress', async () => {
        render(<StatusIcon game={game} />);

        editGame('PGN A');
        runDebounce();
        expect(updateGame).toHaveBeenCalledTimes(1);

        editGame('PGN B');
        await act(async () => {
            requests[0].resolve({ data: { updatedAt: 'timestamp-a' } });
            await Promise.resolve();
        });

        expect(setHasUnsavedGameChanges).toHaveBeenLastCalledWith(true);
        expect(updateGame).toHaveBeenCalledTimes(1);
    });

    it('waits for the active autosave before saving the latest PGN', async () => {
        render(<StatusIcon game={game} />);

        editGame('PGN A');
        runDebounce();
        editGame('PGN B');
        runDebounce();

        expect(updateGame).toHaveBeenCalledTimes(1);

        await act(async () => {
            requests[0].resolve({ data: { updatedAt: 'timestamp-a' } });
            await Promise.resolve();
        });

        expect(updateGame).toHaveBeenCalledTimes(2);
        expect(updateGame).toHaveBeenLastCalledWith(game.cohort, game.id, {
            type: 'editor',
            pgnText: 'PGN B',
            updatedAt: 'timestamp-a',
        });

        await act(async () => {
            requests[1].resolve({ data: { updatedAt: 'timestamp-b' } });
            await Promise.resolve();
        });
        expect(setHasUnsavedGameChanges).toHaveBeenLastCalledWith(false);
    });
});
