import { Chess } from '@jackstenglein/chess';
import { describe, expect, it } from 'vitest';
import practicePuzzles from './practicePuzzles.json';

describe('generated blindfold mates', () => {
    it('has unique IDs and positions across both sets', () => {
        const puzzles = [...practicePuzzles[3], ...practicePuzzles[4]];
        expect(new Set(puzzles.map((puzzle) => puzzle.id)).size).toBe(puzzles.length);
        expect(new Set(puzzles.map((puzzle) => puzzle.fen)).size).toBe(puzzles.length);
    });

    for (const pieceCount of [3, 4] as const) {
        it(`contains 200 legal ${pieceCount}-piece positions with a unique mate`, () => {
            const puzzles = practicePuzzles[pieceCount];
            expect(puzzles).toHaveLength(200);
            expect(puzzles.filter((puzzle) => puzzle.fen.split(' ')[1] === 'w')).toHaveLength(100);

            for (const puzzle of puzzles) {
                const chess = new Chess({ fen: puzzle.fen, disableNullMoves: true });
                const pieces = chess
                    .board()
                    .flat()
                    .filter((piece) => piece !== null);
                expect(pieces, puzzle.id).toHaveLength(pieceCount);
                expect(
                    pieces.filter((piece) => piece.type === 'k' && piece.color === 'w'),
                ).toHaveLength(1);
                expect(
                    pieces.filter((piece) => piece.type === 'k' && piece.color === 'b'),
                ).toHaveLength(1);
                expect(chess.isCheck(), puzzle.id).toBe(false);

                const defender = pieces.find(
                    (piece) => piece.type === 'k' && piece.color !== chess.turn(),
                );
                if (!defender) throw new Error(`Missing defending king: ${puzzle.id}`);
                expect(chess.isAttacked(defender.square, chess.turn()), puzzle.id).toBe(false);
                for (const piece of pieces.filter((piece) => piece.type === 'p')) {
                    expect(['1', '8']).not.toContain(piece.square[1]);
                }

                const mates = chess
                    .moves({ disableNullMoves: true })
                    .filter((move) => move.san.endsWith('#'));
                expect(mates, puzzle.id).toHaveLength(1);
                expect(puzzle.moves, puzzle.id).toEqual([mates[0].lan]);
                expect(chess.move(puzzle.moves[0]), puzzle.id).toBeTruthy();
                expect(chess.isCheckmate(), puzzle.id).toBe(true);
            }
        });
    }
});
