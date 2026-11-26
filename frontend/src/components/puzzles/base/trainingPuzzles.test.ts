import { PuzzlebasePuzzle } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { SAMPLE_PGNS } from '@jackstenglein/chess-dojo-common/src/puzzlebase/samplePgns';
import { describe, expect, it } from 'vitest';
import { defaultRatingWindow, toTacticsPuzzle, toTacticsPuzzles } from './trainingPuzzles';

const FEN = 'r1bqr1k1/p1R1bp1p/1p4p1/3pB2Q/3p4/3BP3/PP3PPP/5RK1 w - - 0 1';
const puzzle = (over: Partial<PuzzlebasePuzzle> = {}): PuzzlebasePuzzle => ({
    id: '002',
    fen: FEN,
    solutionPgn: `[SetUp "1"]\n[FEN "${FEN}"]\n\n1. Bxg6 hxg6 (1... fxg6 2. Qh6) 2. Qh8#`,
    annotator: 'a',
    annotatorDisplayName: 'A',
    rating: 1900,
    buckets: [],
    themes: [],
    createdAt: 'T0',
    updatedAt: 'T0',
    ...over,
});

describe('defaultRatingWindow', () => {
    it('goes 200 either side of the member’s rating, rounded to 50', () => {
        expect(defaultRatingWindow(1500)).toEqual([1300, 1700]);
        expect(defaultRatingWindow(1523)).toEqual([1300, 1700]);
        expect(defaultRatingWindow(1540)).toEqual([1350, 1750]);
    });

    it('stays within the slider at both ends', () => {
        expect(defaultRatingWindow(100)).toEqual([0, 300]);
        expect(defaultRatingWindow(2950)).toEqual([2750, 3000]);
    });

    it('offers a middling range to someone with no rating', () => {
        expect(defaultRatingWindow(0)).toEqual([800, 1200]);
        expect(defaultRatingWindow(NaN)).toEqual([800, 1200]);
    });
});

describe('toTacticsPuzzle', () => {
    it('gives the trainer the position, the side and every line', () => {
        expect(toTacticsPuzzle(puzzle())).toMatchObject({
            id: '002',
            fen: FEN,
            userColor: 'white',
            lines: [
                ['Bxg6', 'fxg6', 'Qh6'],
                ['Bxg6', 'hxg6', 'Qh8#'],
            ],
            description: 'White to play.',
        });
    });

    it('titles a puzzle by its game when it has one, otherwise by its source', () => {
        expect(
            toTacticsPuzzle(puzzle({ white: 'Schlechter', black: 'Przepiorka', year: 1906 }))
                ?.title,
        ).toBe('#002 · Schlechter – Przepiorka, 1906');
        expect(toTacticsPuzzle(puzzle({ composer: 'A book' }))?.title).toBe('#002 · A book');
        expect(toTacticsPuzzle(puzzle())?.title).toBe('#002');
    });

    it('gives up on a puzzle that cannot be played, rather than throwing', () => {
        expect(toTacticsPuzzle(puzzle({ solutionPgn: 'not a puzzle' }))).toBeUndefined();
    });
});

describe('toTacticsPuzzles', () => {
    it('drops the puzzles that cannot be played and keeps the rest in order', () => {
        const result = toTacticsPuzzles([
            puzzle({ id: '001' }),
            puzzle({ id: '002', solutionPgn: 'broken' }),
            puzzle({ id: '003' }),
        ]);
        expect(result.map((p) => p.id)).toEqual(['001', '003']);
    });
});

describe('toTacticsPuzzle alternates', () => {
    it('hands the trainer the ALT and ALT2 moves marked in the solution', () => {
        const sample = SAMPLE_PGNS[1];
        const result = toTacticsPuzzle(puzzle({ solutionPgn: sample.pgn }));
        expect(result?.lines).toEqual([['Bxg6', 'fxg6', 'Rb8', 'Kxb8', 'f7']]);
        expect(result?.alternates).toHaveLength(1);
        expect(result?.alternates?.[0]).toMatchObject({ kind: 'alt', ply: 2 });
    });
});

describe('toTacticsPuzzle details', () => {
    it('keeps the PuzzleBase puzzle, so its details can be shown when it ends', () => {
        const source = puzzle({ rating: 1234, white: 'Fischer', black: 'Spassky', year: 1972 });
        const result = toTacticsPuzzle(source);
        expect(result?.info).toEqual(source);
        expect(result?.buckets).toEqual(source.buckets);
        expect(result?.themes).toEqual(source.themes);
    });
});
