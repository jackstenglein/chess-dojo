import { Chess } from '@jackstenglein/chess';
import { describe, expect, it } from 'vitest';
import {
    addLine,
    buildTree,
    cursorIsCurrent,
    deleteFrom,
    findNode,
    isLegalPath,
    MainlineMove,
    normalizeLines,
} from './analysis';

const MAIN = ['e4', 'e5', 'Nf3', 'Nc6'];

function mainlineMoves(sans: string[]): MainlineMove[] {
    const chess = new Chess();
    return sans.map((s) => {
        const m = chess.move(s);
        if (!m) {
            throw new Error(s);
        }
        return { san: m.san, uci: m.uci, from: m.from, to: m.to, fen: m.fen };
    });
}

describe('lines', () => {
    it('ignores moves along the main line', () => {
        expect(addLine([], ['e4', 'e5'], MAIN)).toEqual([]);
    });

    it('adds a variation, and extends it in place', () => {
        let lines = addLine([], ['e4', 'c5'], MAIN);
        expect(lines).toEqual([['e4', 'c5']]);
        lines = addLine(lines, ['e4', 'c5', 'Nf3'], MAIN);
        expect(lines).toEqual([['e4', 'c5', 'Nf3']]);
        // Stepping back into a known variation adds nothing.
        expect(addLine(lines, ['e4', 'c5'], MAIN)).toEqual(lines);
    });

    it('keeps sub-variations next to their parent', () => {
        let lines = addLine([], ['e4', 'c5', 'Nf3', 'd6'], MAIN);
        lines = addLine(lines, ['e4', 'c5', 'Nf3', 'Nc6'], MAIN);
        expect(lines).toHaveLength(2);
    });

    it('deletes a variation from a move, keeping what came before it', () => {
        let lines = addLine([], ['e4', 'c5', 'Nf3', 'd6'], MAIN);
        lines = addLine(lines, ['e4', 'c5', 'Nf3', 'Nc6'], MAIN);
        expect(deleteFrom(lines, ['e4', 'c5', 'Nf3', 'd6'], MAIN)).toEqual([
            ['e4', 'c5', 'Nf3', 'Nc6'],
        ]);
        expect(deleteFrom(lines, ['e4', 'c5'], MAIN)).toEqual([]);
    });

    it('drops lines the main line has caught up with', () => {
        expect(normalizeLines([['e4', 'e5', 'Nf3']], MAIN)).toEqual([]);
    });

    it('checks legality', () => {
        expect(isLegalPath(['e4', 'e5', 'Nf3'])).toBe(true);
        expect(isLegalPath(['e4', 'e4'])).toBe(false);
    });
});

describe('buildTree', () => {
    const tree = buildTree(mainlineMoves(MAIN), [
        ['e4', 'c5', 'Nf3'],
        ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5'],
        ['e4', 'e5', 'Nf3', 'Nf6', 'd4'],
    ]);

    it('puts the main line first and variations after', () => {
        const afterE4 = findNode(tree, ['e4']);
        expect(afterE4?.children.map((c) => [c.san, c.mainline])).toEqual([
            ['e5', true],
            ['c5', false],
        ]);
        const afterNf6 = findNode(tree, ['e4', 'e5', 'Nf3', 'Nf6']);
        expect(afterNf6?.children.map((c) => c.san)).toEqual(['Nxe5', 'd4']);
        expect(afterNf6?.ply).toBe(4);
    });

    it('becomes main line when the game follows a variation', () => {
        const longer = buildTree(mainlineMoves([...MAIN, 'Bb5']), [
            ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'],
        ]);
        const a6 = findNode(longer, ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6']);
        expect(a6?.mainline).toBe(false);
        expect(findNode(longer, ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'])?.mainline).toBe(true);
    });
});

describe('cursorIsCurrent', () => {
    it('goes stale once a main line move arrives', () => {
        const cursor = { path: ['e4', 'c5'], mainPlies: 4, by: 'a', at: 't' };
        expect(cursorIsCurrent(cursor, 4)).toBe(true);
        expect(cursorIsCurrent(cursor, 5)).toBe(false);
        expect(cursorIsCurrent(undefined, 4)).toBe(false);
    });
});
