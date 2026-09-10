import { GameContext } from '@/context/useGame';
import { Game } from '@/database/game';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PgnBoard from './PgnBoard';

interface FakeCall {
    type: 'set' | 'toggle';
    fen?: string;
    orientation: string;
    animationEnabled?: boolean;
}

const fake = vi.hoisted(() => {
    const calls: FakeCall[] = [];
    const state = { orientation: 'white', animation: { enabled: true, duration: 200 } };
    const api = {
        state,
        set: vi.fn(
            (config: { fen?: string; orientation?: string; animation?: { enabled?: boolean } }) => {
                if (config.orientation && config.orientation !== state.orientation) {
                    state.orientation = config.orientation;
                }
                if (config.animation?.enabled !== undefined) {
                    state.animation.enabled = config.animation.enabled;
                }
                calls.push({
                    type: 'set',
                    fen: config.fen,
                    orientation: state.orientation,
                    animationEnabled: state.animation.enabled,
                });
            },
        ),
        toggleOrientation: vi.fn(() => {
            state.orientation = state.orientation === 'white' ? 'black' : 'white';
            calls.push({ type: 'toggle', orientation: state.orientation });
        }),
        redrawAll: vi.fn(),
        destroy: vi.fn(),
        getFen: vi.fn(() => ''),
        setShapes: vi.fn(),
        setAutoShapes: vi.fn(),
        cancelMove: vi.fn(),
        stop: vi.fn(),
    };
    const navigationGuard = {
        active: false,
        accept: vi.fn(),
        reject: vi.fn(),
    };
    const navigateToGame = vi.fn();
    const auth = { user: undefined as { username: string } | undefined };
    const suggestedVariationRoots: unknown[] = [];
    return {
        calls,
        state,
        api,
        navigationGuard,
        navigateToGame,
        auth,
        suggestedVariationRoots,
    };
});

vi.mock('@lichess-org/chessground', () => ({
    Chessground: (_el: HTMLElement, config?: { orientation?: string }) => {
        if (config?.orientation) {
            fake.state.orientation = config.orientation;
        }
        return fake.api;
    },
}));

vi.mock('@/style/useWindowSizeEffect', () => ({
    useWindowSizeEffect: () => undefined,
}));
vi.mock('@/auth/Auth', () => ({
    useAuth: () => fake.auth,
}));
vi.mock('@/api/Api', () => ({
    useApi: () => ({}),
}));
vi.mock('@/api/Request', () => ({
    useRequest: () => ({
        onStart: vi.fn(),
        onSuccess: vi.fn(),
        onFailure: vi.fn(),
        reset: vi.fn(),
        isLoading: () => false,
        isSent: () => false,
        isFailure: () => false,
    }),
    RequestSnackbar: () => null,
}));
vi.mock('@/loading/LoadingPage', () => ({
    default: () => null,
}));
vi.mock('@/board/sounds/useBoardSound', () => ({
    useBoardSound: () => ({ playSound: vi.fn() }),
}));
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
}));
vi.mock('next-navigation-guard', () => ({
    useNavigationGuard: () => fake.navigationGuard,
}));
vi.mock('./boardTools/underboard/comments/suggestVariation', async () => {
    const actual = await vi.importActual<
        typeof import('./boardTools/underboard/comments/suggestVariation')
    >('./boardTools/underboard/comments/suggestVariation');

    return {
        ...actual,
        getUnsavedSuggestedVariationRoots: () => fake.suggestedVariationRoots,
    };
});
vi.mock('./KeyboardHandler', () => ({
    default: () => null,
}));
vi.mock('./pgnText/PgnText', () => ({
    PgnTextBanners: () => null,
    ResizablePgnText: () => null,
}));
vi.mock('./boardTools/underboard/Underboard', () => ({
    default: () => null,
}));
// The board area and Board stay real; everything around them is mocked.
vi.mock('./PlayerHeader', () => ({
    default: () => null,
}));
vi.mock('./boardTools/boardButtons/BoardButtons', async () => {
    const { default: useGame } =
        await vi.importActual<typeof import('@/context/useGame')>('@/context/useGame');

    const MockBoardButtons = () => {
        const { onNavigateToGame, setHasUnsavedGameChanges } = useGame();
        return (
            <>
                <button
                    data-testid='set-game-dirty'
                    onClick={() => setHasUnsavedGameChanges?.(true)}
                />
                <button
                    data-testid='set-game-clean'
                    onClick={() => setHasUnsavedGameChanges?.(false)}
                />
                <button
                    data-testid='navigate-to-game'
                    onClick={() => onNavigateToGame?.('1500-1600', 'game-2')}
                />
            </>
        );
    };

    return {
        default: MockBoardButtons,
    };
});

const PGN_A = '[FEN "8/8/8/8/8/8/8/K6k w - - 0 1"]\n[SetUp "1"]\n\n*';
const PGN_B = '[FEN "k7/8/8/8/8/8/8/6K1 b - - 0 1"]\n[SetUp "1"]\n\n*';

const placement = (fen?: string) => fen?.split(' ')[0];

describe('PgnBoard (re)initialization', () => {
    beforeEach(() => {
        fake.calls.length = 0;
        fake.state.orientation = 'white';
        fake.state.animation.enabled = true;
        fake.navigationGuard.active = false;
        fake.navigationGuard.accept.mockReset();
        fake.navigationGuard.reject.mockReset();
        fake.navigateToGame.mockReset();
        fake.auth.user = undefined;
        fake.suggestedVariationRoots.length = 0;
        Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
            configurable: true,
            value: () => ({ width: 1200, height: 800, top: 0, left: 0, right: 1200, bottom: 800 }),
        });
    });

    afterEach(() => {
        cleanup();
    });

    it('applies a new position and orientation in one set, without a separate toggle', () => {
        const { rerender } = render(
            <div id='resize-container'>
                <PgnBoard pgn={PGN_A} startOrientation='black' underboardTabs={[]} />
            </div>,
        );

        const initA = fake.calls.find((c) => c.type === 'set' && c.fen);
        expect(initA).toBeDefined();
        expect(placement(initA?.fen)).toBe('8/8/8/8/8/8/8/K6k');
        expect(initA?.orientation).toBe('black');
        expect(initA?.animationEnabled).toBe(false);
        expect(fake.calls.filter((c) => c.type === 'toggle')).toHaveLength(0);
        expect(fake.state.animation.enabled).toBe(true);

        const before = fake.calls.length;
        rerender(
            <div id='resize-container'>
                <PgnBoard pgn={PGN_B} startOrientation='white' underboardTabs={[]} />
            </div>,
        );
        const after = fake.calls.slice(before);

        // A toggle before the set would show the old position flipped for a frame.
        expect(after[0]?.type).toBe('set');
        expect(placement(after[0]?.fen)).toBe('k7/8/8/8/8/8/8/6K1');
        expect(after[0]?.orientation).toBe('white');
        expect(after[0]?.animationEnabled).toBe(false);
        expect(after.filter((c) => c.type === 'toggle')).toHaveLength(0);
        expect(fake.state.animation.enabled).toBe(true);
    });

    it('flips the board without reloading the position when only the orientation changes', () => {
        const { rerender } = render(
            <div id='resize-container'>
                <PgnBoard pgn={PGN_A} startOrientation='white' underboardTabs={[]} />
            </div>,
        );
        const before = fake.calls.length;
        rerender(
            <div id='resize-container'>
                <PgnBoard pgn={PGN_A} startOrientation='black' underboardTabs={[]} />
            </div>,
        );
        const after = fake.calls.slice(before);
        expect(after.filter((c) => c.type === 'toggle')).toHaveLength(1);
        expect(after.filter((c) => c.type === 'set' && c.fen)).toHaveLength(0);
        expect(fake.state.orientation).toBe('black');
    });
});

describe('PgnBoard navigation guard', () => {
    const game = {
        cohort: '1500-1600',
        id: 'game-1',
        owner: 'dojo-user',
    } as Game;

    const getBoard = (currentGame = game) => (
        <GameContext.Provider value={{ game: currentGame, onNavigateToGame: fake.navigateToGame }}>
            <div id='resize-container'>
                <PgnBoard pgn={PGN_A} underboardTabs={[]} />
            </div>
        </GameContext.Provider>
    );

    beforeEach(() => {
        fake.navigationGuard.active = false;
        fake.navigationGuard.accept.mockReset();
        fake.navigationGuard.reject.mockReset();
        fake.navigateToGame.mockReset();
        fake.auth.user = undefined;
        fake.suggestedVariationRoots.length = 0;
    });

    afterEach(() => {
        cleanup();
    });

    it('resumes pending game navigation when unsaved game changes are cleared', async () => {
        render(getBoard());

        fireEvent.click(screen.getByTestId('set-game-dirty'));
        fireEvent.click(screen.getByTestId('navigate-to-game'));

        expect(fake.navigateToGame).not.toHaveBeenCalled();
        expect(screen.getByTestId('unsaved-board-nav-guard')).toBeInTheDocument();
        expect(screen.getByText('gameWarning')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('set-game-clean'));

        await waitFor(() => {
            expect(fake.navigateToGame).toHaveBeenCalledWith('1500-1600', 'game-2');
        });
        expect(screen.queryByText('suggestedVariationWarning')).not.toBeInTheDocument();
        await waitFor(() => {
            expect(screen.queryByTestId('unsaved-board-nav-guard')).not.toBeInTheDocument();
        });
    });

    it('accepts a guarded Next.js navigation only after the game becomes clean', async () => {
        const { rerender } = render(getBoard());
        fireEvent.click(screen.getByTestId('set-game-dirty'));

        fake.navigationGuard.active = true;
        rerender(getBoard());

        expect(fake.navigationGuard.accept).not.toHaveBeenCalled();
        expect(screen.getByText('gameWarning')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('set-game-clean'));

        await waitFor(() => {
            expect(fake.navigationGuard.accept).toHaveBeenCalledOnce();
        });
    });

    it('does not resume navigation after the user cancels', async () => {
        render(getBoard());

        fireEvent.click(screen.getByTestId('set-game-dirty'));
        fireEvent.click(screen.getByTestId('navigate-to-game'));
        fireEvent.click(screen.getByRole('button', { name: 'cancel' }));

        await waitFor(() => {
            expect(screen.queryByTestId('unsaved-board-nav-guard')).not.toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId('set-game-clean'));
        expect(fake.navigateToGame).not.toHaveBeenCalled();
    });

    it('resumes pending game navigation when suggested variations are cleared', async () => {
        fake.auth.user = { username: 'dojo-user' };
        fake.suggestedVariationRoots.push({});
        const suggestedGame = { ...game, owner: 'another-user' };
        const { rerender } = render(getBoard(suggestedGame));

        fireEvent.click(screen.getByTestId('navigate-to-game'));

        expect(fake.navigateToGame).not.toHaveBeenCalled();
        expect(screen.getByText('suggestedVariationWarning')).toBeInTheDocument();

        fake.suggestedVariationRoots.length = 0;
        rerender(getBoard({ ...suggestedGame }));

        await waitFor(() => {
            expect(fake.navigateToGame).toHaveBeenCalledWith('1500-1600', 'game-2');
        });
        expect(screen.queryByText('suggestedVariationWarning')).not.toBeInTheDocument();
    });
});
