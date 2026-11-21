import { Game, PositionComment } from '@/database/game';
import { Chess } from '@jackstenglein/chess';
import { describe, expect, it } from 'vitest';
import { mergeSuggestedVariations, removeEmptyVariations } from './mergeSuggestedVariations';

describe('removeEmptyVariations', () => {
    it('removes empty variation branches before PGN serialization', () => {
        const chess = new Chess({ pgn: '1. e4 e5 *' });
        chess.history()[0].variations.push([]);

        removeEmptyVariations(chess.history());

        const pgn = chess.renderPgn();
        expect(pgn).not.toContain('()');
        expect(() => new Chess({ pgn })).not.toThrow();
    });
});

describe('mergeSuggestedVariations', () => {
    it('preserves symbols and evaluations from a saved suggested variation', () => {
        const original = new Chess({ pgn: '1. e4 e5 *' });
        const e4 = original.history()[0];
        const c5 = original.move('c5', { previousMove: e4, skipSeek: true });
        original.setNags(['$1', '$13'], c5);
        const comment: PositionComment = {
            id: 'comment-1',
            fen: original.normalizedFen(e4),
            ply: e4.ply,
            san: e4.san,
            owner: {
                username: 'dojo-user',
                displayName: 'Dojo User',
                cohort: '1500-1600',
                previousCohort: '1400-1500',
            },
            createdAt: '2026-06-01T00:00:00Z',
            updatedAt: '2026-06-01T00:00:00Z',
            content: '',
            parentIds: '',
            replies: {},
            suggestedVariation: original.renderFrom(c5, { skipHeader: true, skipComments: true }),
        };
        const game = {
            pgn: '1. e4 e5 *',
            positionComments: { [comment.fen]: { [comment.id]: comment } },
        } as Game;

        mergeSuggestedVariations(game);

        expect(game.pgn).toContain('c5 $1 $13');
        expect(() => new Chess({ pgn: game.pgn })).not.toThrow();
    });
});
