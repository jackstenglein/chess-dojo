import { describe, expect, it } from 'vitest';
import { PuzzlebasePuzzle } from './api';
import { findDuplicates, positionKey, splitPuzzleMoves } from './duplicates';

const FEN = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';
const puzzle = (id: string, fen: string, moves: string): PuzzlebasePuzzle =>
    ({ id, fen, solutionPgn: `[SetUp "1"]\n[FEN "${fen}"]\n\n${moves}` }) as PuzzlebasePuzzle;

describe('positionKey', () => {
    it('keeps the pieces and the side to move, and ignores the rest', () => {
        expect(positionKey(FEN)).toBe(positionKey('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w K - 12 40'));
        expect(positionKey(FEN)).not.toBe(positionKey('6k1/5ppp/8/8/8/8/5PPP/3R2K1 b - - 0 1'));
    });
});

describe('splitPuzzleMoves', () => {
    it('reads the main line, without numbers, comments, variations or marks', () => {
        expect(
            splitPuzzleMoves(
                '[FEN "x"]\n\n1... Nxf2! (1... Bxc3 {no} 2. Qxc3) 2. Kxf2 { main } $1 Bxc3 *',
            ),
        ).toEqual(['Nxf2', 'Kxf2', 'Bxc3']);
    });
});

describe('findDuplicates', () => {
    it('groups puzzles with the same position, the same answer first', () => {
        const other = '8/8/8/8/8/8/k7/K7 w - - 0 1';
        const groups = findDuplicates([
            puzzle('004', other, '1. Kb1'),
            puzzle('001', FEN, '1. Rd8#'),
            // Rd8+ and Rd8# are the same answer.
            puzzle('002', '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 5 30', '1. Rd8+! Kh7'),
            puzzle('003', '7k/8/8/8/8/8/8/K7 w - - 0 1', '1. Kb1'),
            puzzle('005', other, '1. Kb2'),
        ]);
        expect(groups.map((g) => [g.puzzles.map((p) => p.id), g.sameFirstMove])).toEqual([
            [['001', '002'], true],
            [['004', '005'], false],
        ]);
    });

    it('marks a group whose answers start the same', () => {
        const [group] = findDuplicates([
            puzzle('001', FEN, '1. Rd8#'),
            puzzle('002', FEN, '1. Rd8# 1-0'),
        ]);
        expect(group.sameFirstMove).toBe(true);
    });

    it('finds nothing when every position is different', () => {
        expect(findDuplicates([puzzle('001', FEN, '1. Rd8#')])).toEqual([]);
    });
});
