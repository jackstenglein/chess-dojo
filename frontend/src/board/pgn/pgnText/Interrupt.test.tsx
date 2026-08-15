import { GameContext } from '@/context/useGame';
import { Game, PositionComment } from '@/database/game';
import { Chess } from '@jackstenglein/chess';
import { Grid } from '@mui/material';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShowInlineCommentsInPgn } from '../boardTools/underboard/settings/ViewerSettings';
import Interrupt from './Interrupt';

const mockChessContext: { chess?: Chess } = vi.hoisted(() => ({ chess: undefined }));

vi.mock('@/auth/Auth', () => ({
    useAuth: () => ({ user: { username: 'viewer' } }),
}));

vi.mock('../PgnBoard', () => ({
    useChess: () => ({ chess: mockChessContext.chess }),
}));

vi.mock('../boardTools/underboard/settings/ViewerSettings', () => ({
    ShowInlineCommentsInPgn: {
        key: 'showInlineCommentsInPgn',
        default: true,
    },
    ShowSuggestedVariations: {
        key: 'showSuggestedVariations',
        default: true,
    },
}));

vi.mock('@/profile/Avatar', () => ({
    default: ({ displayName }: { displayName?: string }) => (
        <span data-testid='inline-comment-avatar'>{displayName}</span>
    ),
}));

vi.mock('./Comment', () => ({
    default: () => null,
}));

vi.mock('./Ellipsis', () => ({
    Ellipsis: () => null,
}));

vi.mock('./Lines', () => ({
    default: () => null,
}));

afterEach(() => {
    cleanup();
    localStorage.clear();
});

function makeComment(overrides: Partial<PositionComment> = {}): PositionComment {
    return {
        id: 'comment-id',
        fen: '',
        ply: 1,
        san: 'e4',
        owner: {
            username: 'commenter',
            displayName: 'Commenter',
            cohort: '1500-1600',
            previousCohort: '1400-1500',
        },
        createdAt: '2026-06-01T10:00:00Z',
        updatedAt: '2026-06-01T10:00:00Z',
        content: 'Nice pawn push',
        parentIds: '',
        replies: {},
        ...overrides,
    };
}

function renderInterrupt(enabled: boolean) {
    localStorage.setItem(ShowInlineCommentsInPgn.key, JSON.stringify(enabled));

    const chess = new Chess({ pgn: '1. e4 e5' });
    const move = chess.history()[0];
    mockChessContext.chess = chess;
    const fen = chess.normalizedFen(move);
    const comment = makeComment({ fen, ply: move.ply, san: move.san });
    const game = {
        pgn: '1. e4 e5',
        positionComments: { [fen]: { [comment.id]: comment } },
    } as Game;

    return render(
        <GameContext.Provider value={{ game }}>
            <Grid container>
                <Interrupt move={move} handleScroll={() => null} />
            </Grid>
        </GameContext.Provider>,
    );
}

describe('Interrupt inline position comments', () => {
    it('renders position comments when the setting is enabled', () => {
        renderInterrupt(true);

        expect(screen.getByText('Nice pawn push')).toBeInTheDocument();
        expect(screen.getByTestId('inline-comment-avatar')).toHaveTextContent('Commenter');
    });

    it('does not render position comments when the setting is disabled', () => {
        renderInterrupt(false);

        expect(screen.queryByText('Nice pawn push')).not.toBeInTheDocument();
    });
});
