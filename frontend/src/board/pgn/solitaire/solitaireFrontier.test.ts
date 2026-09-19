import { Chess } from '@jackstenglein/chess';
import { describe, expect, it } from 'vitest';
import { ShortcutAction } from '../boardTools/underboard/settings/ShortcutAction';
import { isBeyondSolitaireFrontier, solitaireBlocksAction } from './solitaireFrontier';

const PGN = '1. e4 e5 (1... c5 2. Nf3) 2. Nf3 (2. Bc4 Nf6 (2... Nc6 3. d3)) Nc6 3. Bb5 *';

const FORWARD_ACTIONS = [
    ShortcutAction.NextMove,
    ShortcutAction.FirstVariation,
    ShortcutAction.LastMove,
    ShortcutAction.LastMoveVariation,
    ShortcutAction.InsertEngineMove,
];

function load() {
    const chess = new Chess({ pgn: PGN });
    chess.seek(null);
    const [e4, e5, nf3, nc6, bb5] = chess.history();
    const c5 = e5.variations[0][0];
    const bc4 = nf3.variations[0][0];
    const nf6 = bc4.variation[1];
    const nestedNc6 = nf6.variations[0][0];
    const nestedD3 = nestedNc6.variation[1];
    return { chess, e4, e5, nf3, nc6, bb5, c5, bc4, nf6, nestedNc6, nestedD3 };
}

describe('isBeyondSolitaireFrontier', () => {
    it('treats a variation as revealed exactly when the mainline move it replaces is', () => {
        const { chess, e5, nf3, c5, bc4, nf6, nestedNc6, nestedD3 } = load();

        // Frontier at 1...e5: alternatives to e5 are revealed, alternatives to
        // 2.Nf3 are not, at any depth.
        expect(isBeyondSolitaireFrontier(chess, e5, c5)).toBe(false);
        expect(isBeyondSolitaireFrontier(chess, e5, bc4)).toBe(true);
        expect(isBeyondSolitaireFrontier(chess, e5, nf6)).toBe(true);
        expect(isBeyondSolitaireFrontier(chess, e5, nestedNc6)).toBe(true);
        expect(isBeyondSolitaireFrontier(chess, e5, nestedD3)).toBe(true);

        // Frontier at 2.Nf3: the whole 2.Bc4 tree is revealed.
        expect(isBeyondSolitaireFrontier(chess, nf3, bc4)).toBe(false);
        expect(isBeyondSolitaireFrontier(chess, nf3, nestedD3)).toBe(false);
    });

    it('treats everything as unrevealed while the frontier is the start', () => {
        const { chess, e4, c5 } = load();
        expect(isBeyondSolitaireFrontier(chess, null, e4)).toBe(true);
        expect(isBeyondSolitaireFrontier(chess, null, c5)).toBe(true);
        expect(isBeyondSolitaireFrontier(chess, null, null)).toBe(false);
    });
});

describe('solitaireBlocksAction', () => {
    it('never blocks when solitaire is off or complete', () => {
        const { chess, nf3 } = load();
        for (const action of FORWARD_ACTIONS) {
            expect(solitaireBlocksAction(action, chess, undefined)).toBe(false);
            expect(
                solitaireBlocksAction(action, chess, {
                    enabled: false,
                    complete: false,
                    currentMove: null,
                }),
            ).toBe(false);
            expect(
                solitaireBlocksAction(action, chess, {
                    enabled: true,
                    complete: true,
                    currentMove: nf3,
                }),
            ).toBe(false);
        }
    });

    it('blocks every forward seek from the start when nothing is revealed', () => {
        const { chess } = load();
        const solitaire = { enabled: true, complete: false, currentMove: null };
        expect(solitaireBlocksAction(ShortcutAction.NextMove, chess, solitaire)).toBe(true);
        expect(solitaireBlocksAction(ShortcutAction.FirstVariation, chess, solitaire)).toBe(true);
        expect(solitaireBlocksAction(ShortcutAction.LastMove, chess, solitaire)).toBe(true);
    });

    it('allows moving forward within the revealed region after stepping back', () => {
        const { chess, e4, nf3 } = load();
        const solitaire = { enabled: true, complete: false, currentMove: nf3 };

        chess.seek(null);
        expect(solitaireBlocksAction(ShortcutAction.NextMove, chess, solitaire)).toBe(false);
        expect(solitaireBlocksAction(ShortcutAction.LastMove, chess, solitaire)).toBe(true);

        chess.seek(e4);
        expect(solitaireBlocksAction(ShortcutAction.FirstVariation, chess, solitaire)).toBe(false);
    });

    it('blocks at the frontier regardless of how the frontier was reached', () => {
        const { chess, nf3 } = load();
        const solitaire = { enabled: true, complete: false, currentMove: nf3 };
        chess.seek(nf3);
        expect(solitaireBlocksAction(ShortcutAction.NextMove, chess, solitaire)).toBe(true);
        expect(solitaireBlocksAction(ShortcutAction.FirstVariation, chess, solitaire)).toBe(true);
        expect(solitaireBlocksAction(ShortcutAction.LastMove, chess, solitaire)).toBe(true);
        expect(solitaireBlocksAction(ShortcutAction.LastMoveVariation, chess, solitaire)).toBe(
            true,
        );
    });

    it('never blocks navigation inside an already revealed variation', () => {
        const { chess, c5, nf3 } = load();
        const solitaire = { enabled: true, complete: false, currentMove: nf3 };
        chess.seek(c5);
        expect(solitaireBlocksAction(ShortcutAction.NextMove, chess, solitaire)).toBe(false);
        expect(solitaireBlocksAction(ShortcutAction.LastMoveVariation, chess, solitaire)).toBe(
            false,
        );
    });

    it('blocks inside a variation of an unrevealed move', () => {
        const { chess, e5, bc4 } = load();
        const solitaire = { enabled: true, complete: false, currentMove: e5 };
        chess.seek(bc4);
        expect(solitaireBlocksAction(ShortcutAction.NextMove, chess, solitaire)).toBe(true);
        expect(solitaireBlocksAction(ShortcutAction.FirstVariation, chess, solitaire)).toBe(true);
        expect(solitaireBlocksAction(ShortcutAction.LastMoveVariation, chess, solitaire)).toBe(
            true,
        );
    });

    it('blocks engine move insertion for the whole run', () => {
        const { chess, e4, nf3 } = load();
        const solitaire = { enabled: true, complete: false, currentMove: nf3 };
        chess.seek(e4);
        expect(solitaireBlocksAction(ShortcutAction.InsertEngineMove, chess, solitaire)).toBe(true);
    });

    it('ignores actions that do not seek forward', () => {
        const { chess, nf3 } = load();
        const solitaire = { enabled: true, complete: false, currentMove: nf3 };
        chess.seek(nf3);
        expect(solitaireBlocksAction(ShortcutAction.PreviousMove, chess, solitaire)).toBe(false);
        expect(solitaireBlocksAction(ShortcutAction.FirstMove, chess, solitaire)).toBe(false);
    });
});
