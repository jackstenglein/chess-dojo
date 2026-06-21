import { useApi } from '@/api/Api';
import { useAuth } from '@/auth/Auth';
import { useChess } from '@/board/pgn/PgnBoard';
import useGame from '@/context/useGame';
import { Game } from '@/database/game';
import { User } from '@/database/user';
import { Chess, Move } from '@jackstenglein/chess';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SaveAllVariationsButton } from './SaveAllVariationsButton';
import { getUnsavedSuggestedVariationRoots, saveAllSuggestedVariations } from './suggestVariation';

vi.mock('@/api/Api', () => ({ useApi: vi.fn() }));
vi.mock('@/auth/Auth', () => ({ useAuth: vi.fn() }));
vi.mock('@/board/pgn/PgnBoard', () => ({ useChess: vi.fn() }));
vi.mock('@/context/useGame', () => ({ default: vi.fn() }));
vi.mock('./suggestVariation', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./suggestVariation')>();
    return {
        ...actual,
        getUnsavedSuggestedVariationRoots: vi.fn(),
        saveAllSuggestedVariations: vi.fn(),
    };
});

const user = {
    username: 'dojo-user',
    displayName: 'Dojo User',
    dojoCohort: '1500-1600',
    previousCohort: '1400-1500',
} as User;

const game = {
    cohort: '1500-1600',
    id: 'game-id',
    pgn: '[Event "?"]\n\n1. e4 e5 *',
    positionComments: {},
} as Game;

const chess = {
    addObserver: vi.fn(),
    removeObserver: vi.fn(),
} as unknown as Chess;

describe('SaveAllVariationsButton', () => {
    const onUpdateGame = vi.fn();
    const api = {};

    beforeEach(() => {
        vi.mocked(useAuth).mockReturnValue({ user } as ReturnType<typeof useAuth>);
        vi.mocked(useApi).mockReturnValue(api as ReturnType<typeof useApi>);
        vi.mocked(useChess).mockReturnValue({ chess });
        vi.mocked(useGame).mockReturnValue({
            game,
            onUpdateGame,
        });
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('renders nothing when there are no unsaved variations', () => {
        vi.mocked(getUnsavedSuggestedVariationRoots).mockReturnValue([]);

        const { container } = render(<SaveAllVariationsButton />);

        expect(container).toBeEmptyDOMElement();
    });

    it('renders the unsaved variation count', () => {
        vi.mocked(getUnsavedSuggestedVariationRoots).mockReturnValue([{} as Move, {} as Move]);

        render(<SaveAllVariationsButton />);

        expect(screen.getByText('2 unsaved variations')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Save All' })).toBeEnabled();
    });

    it('saves all variations and updates the game without showing a success snackbar', async () => {
        const updatedGame = { ...game, positionComments: { updated: {} } } as unknown as Game;
        vi.mocked(getUnsavedSuggestedVariationRoots).mockReturnValue([{} as Move, {} as Move]);
        vi.mocked(saveAllSuggestedVariations).mockResolvedValue({
            game: updatedGame,
            savedCount: 2,
        });

        render(<SaveAllVariationsButton />);
        fireEvent.click(screen.getByRole('button', { name: 'Save All' }));

        await waitFor(() => {
            expect(saveAllSuggestedVariations).toHaveBeenCalledWith(user, game, api, chess);
        });
        expect(onUpdateGame).toHaveBeenCalledWith(updatedGame);
        expect(screen.queryByText('Saved 2 variations as comments')).not.toBeInTheDocument();
    });
});
