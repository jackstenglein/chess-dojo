import { describe, expect, it } from 'vitest';
import { matchesFilters } from './api';
import { parsePuzzlePgn } from './parse';

const FEN = 'r1bq1rk1/ppp2pbp/3p2p1/2n5/2P3n1/1PN1PN2/PB1QBPPP/3RK2R b K - 0 1';

describe('parsePuzzlePgn', () => {
    it('extracts fen and metadata', () => {
        const parsed = parsePuzzlePgn(
            `[Event "Amsterdam"]\n[Site "Amsterdam NED"]\n[Date "1973.??.??"]\n[White "Ljubojevic"]\n[Black "Stein"]\n[Result "0-1"]\n[SetUp "1"]\n[FEN "${FEN}"]\n\n1... Nxf2 2. Kxf2 Bxc3 0-1`,
        );
        expect(parsed.fen).toBe(FEN);
        expect(parsed.white).toBe('Ljubojevic');
        expect(parsed.black).toBe('Stein');
        expect(parsed.result).toBe('0-1');
        expect(parsed.event).toBe('Amsterdam');
        expect(parsed.site).toBe('Amsterdam NED');
        expect(parsed.year).toBe(1973);
        expect(parsed.solutionPgn).toContain('Nxf2');
    });

    it('rejects full games', () => {
        expect(() => parsePuzzlePgn('[White "A"]\n[Black "B"]\n\n1. e4 e5 2. Nf3 *')).toThrow(
            /full game/,
        );
    });

    it('rejects puzzles without moves', () => {
        expect(() => parsePuzzlePgn(`[SetUp "1"]\n[FEN "${FEN}"]\n\n*`)).toThrow(/no moves/);
    });

    it('treats placeholder headers as missing', () => {
        const parsed = parsePuzzlePgn(
            `[Event "?"]\n[Date "????.??.??"]\n[Result "*"]\n[SetUp "1"]\n[FEN "${FEN}"]\n\n1... Nxf2 *`,
        );
        expect(parsed.event).toBeUndefined();
        expect(parsed.year).toBeUndefined();
        expect(parsed.result).toBeUndefined();
    });
});

describe('matchesFilters', () => {
    const puzzle = { buckets: ['Tactics', 'Endgame'], themes: ['Passed pawn', 'Pin'] };

    it('matches an empty filter', () => {
        expect(matchesFilters(puzzle, { buckets: [], themes: [] })).toBe(true);
    });

    it('requires every selected bucket', () => {
        expect(matchesFilters(puzzle, { buckets: ['Tactics', 'Endgame'], themes: [] })).toBe(true);
        expect(matchesFilters(puzzle, { buckets: ['Tactics', 'Opening'], themes: [] })).toBe(false);
    });

    it('requires every selected theme', () => {
        expect(matchesFilters(puzzle, { buckets: [], themes: ['Passed pawn', 'Pin'] })).toBe(true);
        expect(matchesFilters(puzzle, { buckets: [], themes: ['Passed pawn', 'Fork'] })).toBe(
            false,
        );
    });
});

describe('parsePuzzlePgn move validation', () => {
    const fen = '3q3k/8/8/4N3/8/8/8/6K1 w - - 0 1';
    const pgn = (moves: string) => `[SetUp "1"]\n[FEN "${fen}"]\n\n${moves}`;

    it('accepts comments, NAGs, and variations', () => {
        const parsed = parsePuzzlePgn(pgn('1. Nf7+! {fork} Kg8 $1 (1... Kh7 2. Nxd8) 2. Nxd8 *'));
        expect(parsed.fen).toBe(fen);
    });

    it('rejects an illegal move after a legal one instead of dropping it', () => {
        expect(() => parsePuzzlePgn(pgn('1. Nf7+ Qh5'))).toThrow(/only 1 of 2 moves/);
        expect(() => parsePuzzlePgn(pgn('1. Nf7+ Kg8 2. Qh5'))).toThrow(/only 2 of 3 moves/);
    });

    it('rejects an illegal move inside a variation', () => {
        expect(() => parsePuzzlePgn(pgn('1. Nf7+ (1. Qh5) Kg8'))).toThrow(/not legal/);
    });

    it('explains when no move is legal', () => {
        expect(() => parsePuzzlePgn(pgn('1. Qh5'))).toThrow(/None of those moves are legal/);
    });
});
