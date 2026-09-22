import { Chess } from '@jackstenglein/chess';
import { describe, expect, it } from 'vitest';
import {
    commonPrefixLen,
    countUniqueUserMoves,
    countUserMoves,
    formatLine,
    isExpectedMove,
    normalizeSan,
    ratingForPuzzle,
    solutionPgns,
    TACTICS_PUZZLES,
} from './tacticsPuzzles';

describe('tactics puzzle data', () => {
    it('has at least one puzzle with one line', () => {
        expect(TACTICS_PUZZLES.length).toBeGreaterThan(0);
        for (const p of TACTICS_PUZZLES) {
            expect(p.lines.length).toBeGreaterThan(0);
        }
    });

    it('every line is legal from the puzzle start', () => {
        for (const puzzle of TACTICS_PUZZLES) {
            for (const line of puzzle.lines) {
                const chess = new Chess({ fen: puzzle.fen });
                for (const san of line) {
                    const move = chess.move(san);
                    expect(
                        move,
                        `Illegal move ${san} in line ${line.join(' ')} (${puzzle.id})`,
                    ).not.toBeNull();
                }
            }
        }
    });

    it('user moves alternate correctly (user is side to move)', () => {
        for (const puzzle of TACTICS_PUZZLES) {
            const chess = new Chess({ fen: puzzle.fen });
            const turn = chess.turn() === 'w' ? 'white' : 'black';
            expect(turn).toBe(puzzle.userColor);
        }
    });
});

describe('move matching', () => {
    it('ignores check and mate suffixes', () => {
        expect(normalizeSan('Qh5+')).toBe('Qh5');
        expect(normalizeSan('Qxf7#')).toBe('Qxf7');
        expect(normalizeSan('Nxe5')).toBe('Nxe5');
    });

    it('matches expected moves with suffix tolerance', () => {
        expect(isExpectedMove('Qh5+', 'Qh5+')).toBe(true);
        expect(isExpectedMove('Qh5', 'Qh5+')).toBe(true);
        expect(isExpectedMove('Qh4', 'Qh5+')).toBe(false);
    });
});

describe('stats helpers', () => {
    it('counts user plies as every other move starting at ply 0', () => {
        expect(countUserMoves(['Qxf7#'])).toBe(1);
        expect(countUserMoves(['Nxe5', 'd6', 'Nxf7'])).toBe(2);
        expect(countUserMoves(['Nxe5', 'd6'])).toBe(1);
    });

    it('rewards clean solves more', () => {
        expect(ratingForPuzzle(0)).toBeGreaterThan(ratingForPuzzle(3));
    });

    it('orders variations before the main line', () => {
        for (const puzzle of TACTICS_PUZZLES) {
            expect(puzzle.lines.length).toBeGreaterThanOrEqual(2);
        }
    });
});

describe('branch helpers', () => {
    it('finds the shared prefix of two lines', () => {
        expect(commonPrefixLen(['a', 'b'], ['a', 'c'])).toBe(1);
        expect(commonPrefixLen(['a'], ['a'])).toBe(1);
        expect(commonPrefixLen(['a'], ['b'])).toBe(0);
    });

    it('counts shared user plies once', () => {
        // Two lines sharing the first (user) ply: 2 + 1 unique user moves.
        expect(
            countUniqueUserMoves([
                ['Nxf2', 'Kxf2', 'Bxc3'],
                ['Nxf2', 'O-O', 'Nxd1'],
            ]),
        ).toBe(3);
    });

    it('numbers solution lines from the start FEN', () => {
        expect(
            formatLine('r1bq1rk1/ppp2pbp/3p2p1/2n5/2P3n1/1PN1PN2/PB1QBPPP/3RK2R b K - 0 1', [
                'Nxf2',
                'O-O',
                'Nxd1',
            ]),
        ).toBe('1... Nxf2 2. O-O 2... Nxd1');
        expect(
            formatLine('r1bqr1k1/p1R1bp1p/1p4p1/3pB2Q/3p4/3BP3/PP3PPP/5RK1 w - - 0 1', [
                'Bxg6',
                'hxg6',
                'Qh8#',
            ]),
        ).toBe('1. Bxg6 1... hxg6 2. Qh8#');
    });

    it('labels defenses before the main line', () => {
        const out = solutionPgns(
            [
                ['Bxg6', 'hxg6', 'Qh8#'],
                ['Bxg6', 'fxg6', 'Qh6'],
            ],
            'r1bqr1k1/p1R1bp1p/1p4p1/3pB2Q/3p4/3BP3/PP3PPP/5RK1 w - - 0 1',
        );
        expect(out.map((s) => s.label)).toEqual(['Defense 1', 'Main line']);
    });
});
