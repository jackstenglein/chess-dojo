// Run from frontend: node scripts/generate-blindfold-mates.mjs
import { Chess, Color } from '@jackstenglein/chess';
import { writeFileSync } from 'node:fs';
import process from 'node:process';
import { format, resolveConfig } from 'prettier';

const puzzlesPerSet = 200;
let seed = 2763;
const random = (max) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return Math.floor((seed / 2 ** 32) * max);
};
const squareName = (square) => 'abcdefgh'[square % 8] + (8 - Math.floor(square / 8));

function makeFen(pieces, turn) {
    const board = Array(64).fill('');
    for (const [square, piece] of pieces) board[square] = piece;
    const ranks = [];
    for (let rank = 0; rank < 8; rank++) {
        let result = '';
        let empty = 0;
        for (const piece of board.slice(rank * 8, rank * 8 + 8)) {
            if (!piece) empty++;
            else {
                if (empty) result += empty;
                empty = 0;
                result += piece;
            }
        }
        ranks.push(result + (empty || ''));
    }
    return `${ranks.join('/')} ${turn} - - 0 1`;
}

function generateSet(pieceCount) {
    const puzzles = [];
    const seen = new Set();
    const materials = pieceCount === 3 ? ['Q', 'R'] : ['QR', 'QB', 'QN', 'Qp', 'Rp'];
    for (let attempts = 0; puzzles.length < puzzlesPerSet && attempts < 200000; attempts++) {
        const turn = puzzles.length % 2 === 0 ? 'w' : 'b';
        const material = materials[Math.floor(puzzles.length / 2) % materials.length];
        const squares = new Set();
        while (squares.size < pieceCount) squares.add(random(64));
        const [attackerKing, defenderKing, ...otherSquares] = [...squares];
        // Sparse beginner mates are concentrated near an edge, with the king supporting.
        const file = defenderKing % 8;
        const rank = Math.floor(defenderKing / 8);
        if (file !== 0 && file !== 7 && rank !== 0 && rank !== 7) continue;
        const kingDistance = Math.max(
            Math.abs((attackerKing % 8) - file),
            Math.abs(Math.floor(attackerKing / 8) - rank),
        );
        if (kingDistance < 2 || kingDistance > 3) continue;
        if (material.includes('p') && (otherSquares[1] < 8 || otherSquares[1] >= 56)) continue;
        let pieces = [
            [attackerKing, 'K'],
            [defenderKing, 'k'],
        ];
        pieces.push(...otherSquares.map((square, i) => [square, material[i]]));
        if (turn === 'b') {
            pieces = pieces.map(([square, piece]) => [
                63 - square,
                piece === piece.toUpperCase() ? piece.toLowerCase() : piece.toUpperCase(),
            ]);
        }
        const fen = makeFen(pieces, turn);
        if (seen.has(fen)) continue;
        const chess = new Chess({ fen, disableNullMoves: true });
        const defendingSquare = squareName(turn === 'w' ? defenderKing : 63 - defenderKing);
        if (
            chess.isCheck() ||
            chess.isAttacked(defendingSquare, turn === 'w' ? Color.white : Color.black)
        )
            continue;
        const mates = chess
            .moves({ disableNullMoves: true })
            .filter((move) => move.san.endsWith('#'));
        if (mates.length !== 1) continue;
        seen.add(fen);
        puzzles.push({
            id: `blindfold-${pieceCount}-${puzzles.length + 1}`,
            fen,
            moves: [mates[0].lan],
        });
    }
    if (puzzles.length !== puzzlesPerSet)
        throw new Error(`Only found ${puzzles.length} ${pieceCount}-piece mates`);
    return puzzles;
}

const sets = { 3: generateSet(3), 4: generateSet(4) };
const output = new URL('../src/components/puzzles/mateInOne/practicePuzzles.json', import.meta.url);
writeFileSync(
    output,
    await format(JSON.stringify(sets), { ...(await resolveConfig(output)), parser: 'json' }),
);
process.stdout.write(`Generated ${puzzlesPerSet} puzzles per set (seed 2763).\n`);
