import { Chess, EventType } from '@jackstenglein/chess';
import { describe, expect, it } from 'vitest';
import { forceVariation } from './variationEditing';

describe('forceVariation', () => {
    for (const index of [0, 1]) {
        it(`nests move ${index} inside a variation and preserves the main line`, () => {
            const chess = new Chess({ pgn: '1. e4 (1. d4 d5 2. c4) e5' });
            const main = chess.pgn.history.moves[0];
            const move = main.variations[0][index];
            let structureChanged = false;
            chess.addObserver({
                types: [EventType.PromoteVariation],
                handler: () => {
                    structureChanged = true;
                },
            });
            forceVariation(chess, move);
            expect(structureChanged).toBe(true);
            expect(chess.pgn.history.moves[0]).toBe(main);
            expect(main.next?.san).toBe('e5');
            const replacement = main.variations[0][index];
            expect(replacement.san).toBe(move.san);
            expect(replacement.variations[0][0]).toBe(move);
            expect(replacement.next).toBeFalsy();
            const reloaded = new Chess({ pgn: chess.renderPgn() });
            expect(reloaded.pgn.history.moves[0].variations[0][index].variations[0][0].san).toBe(
                move.san,
            );
        });
    }
});
