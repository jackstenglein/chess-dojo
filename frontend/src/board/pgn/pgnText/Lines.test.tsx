import { GameContext } from '@/context/useGame';
import { Game, PositionComment } from '@/database/game';
import { Chess } from '@jackstenglein/chess';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShowInlineCommentsInPgn } from '../boardTools/underboard/settings/ViewerSettings';
import { Line } from './Lines';

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

vi.mock('./MoveButton', () => ({
    default: ({ move }: { move: { san: string } }) => (
        <span data-testid='variation-move'>{move.san}</span>
    ),
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
        san: 'd4',
        owner: {
            username: 'commenter',
            displayName: 'Commenter',
            cohort: '1500-1600',
            previousCohort: '1400-1500',
        },
        createdAt: '2026-06-01T10:00:00Z',
        updatedAt: '2026-06-01T10:00:00Z',
        content: 'Variation position note',
        parentIds: '',
        replies: {},
        ...overrides,
    };
}

function renderVariationLine(enabled: boolean, showInlinePositionComments = true) {
    localStorage.setItem(ShowInlineCommentsInPgn.key, JSON.stringify(enabled));

    const chess = new Chess({ pgn: '1. e4 (1. d4 d5) e5' });
    mockChessContext.chess = chess;
    const line = chess.history()[0].variations[0];
    const move = line[0];
    const fen = chess.normalizedFen(move);
    const comment = makeComment({ fen, ply: move.ply, san: move.san });
    const game = {
        pgn: '1. e4 (1. d4 d5) e5',
        positionComments: { [fen]: { [comment.id]: comment } },
    } as Game;

    return render(
        <GameContext.Provider value={{ game }}>
            <Line
                line={line}
                depth={0}
                handleScroll={() => null}
                onExpand={() => null}
                showInlinePositionComments={showInlinePositionComments}
            />
        </GameContext.Provider>,
    );
}

describe('Line inline position comments', () => {
    it('renders comments attached to variation moves when the setting is enabled', () => {
        renderVariationLine(true);

        expect(screen.getByText('Variation position note')).toBeInTheDocument();
        expect(screen.getByTestId('inline-comment-avatar')).toHaveTextContent('Commenter');
    });

    it('does not render comments attached to variation moves when the setting is disabled', () => {
        renderVariationLine(false);

        expect(screen.queryByText('Variation position note')).not.toBeInTheDocument();
    });

    it('does not render comments when the line consumer disables inline position comments', () => {
        renderVariationLine(true, false);

        expect(screen.queryByText('Variation position note')).not.toBeInTheDocument();
    });
});
