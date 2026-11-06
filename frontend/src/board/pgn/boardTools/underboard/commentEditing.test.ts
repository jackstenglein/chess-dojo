import { Chess, CommentType } from '@jackstenglein/chess';
import { describe, expect, it } from 'vitest';
import { getEditorComment, setEditorComment } from './commentEditing';

describe('mainline before-move comments', () => {
    it('displays and edits the same text before and after a PGN round trip', () => {
        const chess = new Chess({ pgn: '1. e4 { Existing text } e5 2. Nf3' });
        chess.seek(chess.firstMove()?.next ?? null);
        expect(getEditorComment(chess, CommentType.Before)).toBe('Existing text');
        setEditorComment(chess, 'Before e5', CommentType.Before);
        expect(chess.currentMove()?.san).toBe('e5');
        expect(chess.firstMove()?.commentAfter).toBe('Before e5');
        const restored = new Chess({ pgn: chess.renderPgn() });
        restored.seek(restored.firstMove()?.next ?? null);
        expect(getEditorComment(restored, CommentType.Before)).toBe('Before e5');
        setEditorComment(restored, '', CommentType.Before);
        expect(restored.renderPgn()).not.toContain('Before e5');
    });

    it('uses the introductory comment before the first move', () => {
        const chess = new Chess({ pgn: '1. e4 e5' });
        chess.seek(chess.firstMove());
        setEditorComment(chess, 'Introduction', CommentType.Before);
        const restored = new Chess({ pgn: chess.renderPgn() });
        restored.seek(restored.firstMove());
        expect(getEditorComment(restored, CommentType.Before)).toBe('Introduction');
    });

    it('preserves variation-opening comments and after-move text', () => {
        const chess = new Chess({ pgn: '1. e4 (1. d4 d5) e5' });
        chess.seek(chess.firstMove()?.variations[0][0] ?? null);
        setEditorComment(chess, 'Variation introduction', CommentType.Before);
        setEditorComment(chess, 'After d4', CommentType.After);
        const restored = new Chess({ pgn: chess.renderPgn() });
        restored.seek(restored.firstMove()?.variations[0][0] ?? null);
        expect(getEditorComment(restored, CommentType.Before)).toBe('Variation introduction');
        expect(getEditorComment(restored, CommentType.After)).toBe('After d4');
    });
});
