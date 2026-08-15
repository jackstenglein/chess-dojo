import { GameContext } from '@/context/useGame';
import { Game, PositionComment } from '@/database/game';
import { Chess } from '@jackstenglein/chess';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShowInlineCommentsInPgn } from '../boardTools/underboard/settings/ViewerSettings';
import StartingPositionComments from './StartingPositionComments';

const mockChessContext: { chess?: Chess } = vi.hoisted(() => ({ chess: undefined }));

vi.mock('../PgnBoard', () => ({
    useChess: () => ({ chess: mockChessContext.chess }),
}));

vi.mock('../boardTools/underboard/settings/ViewerSettings', () => ({
    ShowInlineCommentsInPgn: {
        key: 'showInlineCommentsInPgn',
        default: true,
    },
}));

vi.mock('@/profile/Avatar', () => ({
    default: ({ displayName }: { displayName?: string }) => (
        <span data-testid='inline-comment-avatar'>{displayName}</span>
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
        ply: 0,
        owner: {
            username: 'commenter',
            displayName: 'Commenter',
            cohort: '1500-1600',
            previousCohort: '1400-1500',
        },
        createdAt: '2026-06-01T10:00:00Z',
        updatedAt: '2026-06-01T10:00:00Z',
        content: 'Starting position note',
        parentIds: '',
        replies: {},
        ...overrides,
    };
}

function renderStartingPositionComments(enabled: boolean) {
    localStorage.setItem(ShowInlineCommentsInPgn.key, JSON.stringify(enabled));

    const chess = new Chess({ pgn: '1. e4 e5' });
    mockChessContext.chess = chess;
    const fen = chess.setUpFen();
    const comment = makeComment({ fen });
    const game = {
        pgn: '1. e4 e5',
        positionComments: { [fen]: { [comment.id]: comment } },
    } as Game;

    return render(
        <GameContext.Provider value={{ game }}>
            <StartingPositionComments />
        </GameContext.Provider>,
    );
}

describe('StartingPositionComments', () => {
    it('renders starting position comments when the setting is enabled', () => {
        renderStartingPositionComments(true);

        expect(screen.getByText('Starting position note')).toBeInTheDocument();
        expect(screen.getByTestId('inline-comment-avatar')).toHaveTextContent('Commenter');
    });

    it('does not render starting position comments when the setting is disabled', () => {
        renderStartingPositionComments(false);

        expect(screen.queryByText('Starting position note')).not.toBeInTheDocument();
    });
});
