import { Game, PositionComment } from '@/database/game';
import { Chess } from '@jackstenglein/chess';
import { describe, expect, it } from 'vitest';
import {
    getCommentsForFen,
    getInlineCommentsForMove,
    getInlineCommentsForStartingPosition,
    SortBy,
} from './positionComments';

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
        content: 'Interesting move',
        parentIds: '',
        replies: {},
        ...overrides,
    };
}

function makeGame(comments: Record<string, Record<string, PositionComment>>): Game {
    return {
        cohort: '1500-1600',
        id: 'game-id',
        owner: 'owner',
        ownerDisplayName: 'Owner',
        headers: {},
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
        unlisted: false,
        pgn: '1. e4 e5 2. Nf3',
        positionComments: comments,
    } as Game;
}

describe('position comment helpers', () => {
    it('matches comments by FEN, ply, and SAN', () => {
        const chess = new Chess({ pgn: '1. e4 e5 2. Nf3' });
        const move = chess.history()[0];
        const fen = chess.normalizedFen(move);
        const matching = makeComment({ id: 'matching', fen, ply: move.ply, san: move.san });
        const wrongSan = makeComment({ id: 'wrong-san', fen, ply: move.ply, san: 'd4' });
        const wrongPly = makeComment({ id: 'wrong-ply', fen, ply: 3, san: move.san });
        const game = makeGame({ [fen]: { matching, wrongSan, wrongPly } });

        expect(getCommentsForFen(game, fen, move, SortBy.Oldest).map((c) => c.id)).toEqual([
            'matching',
        ]);
    });

    it('sorts matched comments newest or oldest first', () => {
        const chess = new Chess({ pgn: '1. e4 e5 2. Nf3' });
        const move = chess.history()[0];
        const fen = chess.normalizedFen(move);
        const older = makeComment({
            id: 'older',
            fen,
            ply: move.ply,
            san: move.san,
            createdAt: '2026-06-01T10:00:00Z',
        });
        const newer = makeComment({
            id: 'newer',
            fen,
            ply: move.ply,
            san: move.san,
            createdAt: '2026-06-01T11:00:00Z',
        });
        const game = makeGame({ [fen]: { older, newer } });

        expect(getCommentsForFen(game, fen, move, SortBy.Newest).map((c) => c.id)).toEqual([
            'newer',
            'older',
        ]);
        expect(getCommentsForFen(game, fen, move, SortBy.Oldest).map((c) => c.id)).toEqual([
            'older',
            'newer',
        ]);
    });

    it('returns only top-level non-empty content comments for inline PGN display', () => {
        const chess = new Chess({ pgn: '1. e4 e5 2. Nf3' });
        const move = chess.history()[0];
        const fen = chess.normalizedFen(move);
        const older = makeComment({
            id: 'older',
            fen,
            ply: move.ply,
            san: move.san,
            content: 'First comment',
            createdAt: '2026-06-01T10:00:00Z',
        });
        const newer = makeComment({
            id: 'newer',
            fen,
            ply: move.ply,
            san: move.san,
            content: 'Second comment',
            createdAt: '2026-06-01T11:00:00Z',
        });
        const reply = makeComment({
            id: 'reply',
            fen,
            ply: move.ply,
            san: move.san,
            content: 'Reply text',
            parentIds: 'older',
        });
        const suggestionOnly = makeComment({
            id: 'suggestion-only',
            fen,
            ply: move.ply,
            san: move.san,
            content: '   ',
            suggestedVariation: '1. d4',
        });
        const game = makeGame({ [fen]: { newer, reply, suggestionOnly, older } });

        expect(getInlineCommentsForMove(game, chess, move).map((c) => c.id)).toEqual([
            'older',
            'newer',
        ]);
    });

    it('returns an empty list without game or chess context', () => {
        const chess = new Chess({ pgn: '1. e4' });
        const move = chess.history()[0];

        expect(getInlineCommentsForMove(undefined, chess, move)).toEqual([]);
        expect(getInlineCommentsForMove({ positionComments: {} } as Game, undefined, move)).toEqual(
            [],
        );
        expect(getInlineCommentsForMove({ positionComments: {} } as Game, chess, null)).toEqual([]);
    });

    it('returns top-level non-empty starting position comments oldest first', () => {
        const chess = new Chess({ pgn: '1. e4' });
        const fen = chess.setUpFen();
        const older = makeComment({
            id: 'older',
            fen,
            ply: 0,
            san: undefined,
            content: 'First starting position comment',
            createdAt: '2026-06-01T10:00:00Z',
        });
        const newer = makeComment({
            id: 'newer',
            fen,
            ply: 0,
            san: undefined,
            content: 'Second starting position comment',
            createdAt: '2026-06-01T11:00:00Z',
        });
        const reply = makeComment({
            id: 'reply',
            fen,
            ply: 0,
            san: undefined,
            parentIds: 'older',
            content: 'Reply text',
        });
        const empty = makeComment({
            id: 'empty',
            fen,
            ply: 0,
            san: undefined,
            content: '   ',
        });
        const game = makeGame({ [fen]: { newer, reply, empty, older } });

        expect(getInlineCommentsForStartingPosition(game, chess).map((c) => c.id)).toEqual([
            'older',
            'newer',
        ]);
    });
});
