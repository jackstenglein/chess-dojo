import { Chess, CommentType, EventType } from '@jackstenglein/chess';
import { describe, expect, it, vi } from 'vitest';
import { CitationSource, citeGame, insertGame } from './gameActions';

const source = {
    cohort: 'masters',
    id: 'source?',
    headers: { White: 'White', Black: 'Black', WhiteElo: '2500', Date: '2026.09.21' },
} as CitationSource;
const origin = 'https://www.chessdojo.club';

describe('database game actions', () => {
    it('merges only played moves, preserves the target, and cites an existing endpoint once', () => {
        const target = new Chess({
            pgn: '[White "Owner"]\n[Result "1-0"]\n\n1. d4 {my note} d5 (1... Nf6) 2. c4 e6 1-0',
        });
        const selected = target.history()[1];
        target.seek(selected);
        const handler = vi.fn();
        target.addObserver({ types: [EventType.NewVariation, EventType.UpdateComment], handler });
        const pgn = '1. d4 {source note} Nf6 $1 (1... f5) 2. c4 e6 *';
        insertGame(target, pgn, source, origin);
        const once = target.renderPgn();
        insertGame(target, pgn, source, origin);
        expect(target.renderPgn()).toBe(once);
        expect(target.currentMove()).toBe(selected);
        expect(target.header().getRawValue('White')).toBe('Owner');
        expect(target.header().getRawValue('Result')).toBe('1-0');
        expect(once).toContain('my note');
        expect(once).not.toContain('source note');
        expect(once).not.toContain('$1');
        expect(once).not.toContain('f5');
        expect(once).toContain('[White (2500) - Black 2026.09.21]');
        expect(handler).toHaveBeenCalled();
        expect(target.history().map((m) => m.san)).toEqual(['d4', 'd5', 'c4', 'e6']);
        // A shorter source is cited at its endpoint, not the target's final move.
        insertGame(target, '1. d4 d5 *', source, origin);
        expect(selected.commentAfter).toContain('/source%3F');
    });

    it('keeps transposed move orders in separate branches', () => {
        const target = new Chess({ pgn: '1. Nf3 d5 2. d4 Nf6 *' });
        insertGame(target, '1. d4 d5 2. Nf3 Nf6 3. c4 *', source, origin);
        expect(target.history()).toHaveLength(4);
        const branch = target.history()[0].variations[0];
        expect(branch.map((m) => m.san)).toEqual(['d4', 'd5', 'Nf3', 'Nf6', 'c4']);
        expect(target.normalizedFen(branch[3])).toBe(target.normalizedFen(target.history()[3]));
    });

    it.each([true, false])('cites without moves at starting position=%s', (starting) => {
        const target = new Chess({ pgn: '{intro} 1. e4 {existing} *' });
        target.seek(starting ? null : target.history()[0]);
        const selected = target.currentMove();
        citeGame(target, source, origin);
        const once = target.renderPgn();
        citeGame(target, source, origin);
        expect(target.renderPgn()).toBe(once);
        expect(target.plyCount()).toBe(1);
        expect(target.currentMove()).toBe(selected);
        expect(target.getComment(CommentType.After, selected)).toContain(
            `${starting ? 'intro' : 'existing'}\n\n[`,
        );
    });

    it.each([
        '1. e4 e5 2. Nf3 Qh4 3. e5 *',
        '1. e4 e5 2.',
        '*',
        '[FEN "8/8/8/8/8/4k3/8/4K3 w - - 0 1"]\n\n1. Kd1 *',
    ])('rejects invalid or incompatible input without changes: %s', (pgn) => {
        const target = new Chess({ pgn: '1. d4 d5 *' });
        target.seek(target.history()[0]);
        const before = target.renderPgn();
        const selected = target.currentMove();
        const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        try {
            expect(() => insertGame(target, pgn, source, origin)).toThrow();
        } finally {
            log.mockRestore();
        }
        expect(target.renderPgn()).toBe(before);
        expect(target.currentMove()).toBe(selected);
    });

    it('supports matching custom starting positions', () => {
        const fen = '8/8/8/8/8/4k3/8/4K3 w - - 0 1';
        const target = new Chess({ fen });
        insertGame(target, `[FEN "${fen}"]\n\n1. Kd1 *`, source, origin);
        expect(target.history().map((m) => m.san)).toEqual(['Kd1']);
        expect(target.currentMove()).toBeNull();
    });
});
