'use strict';

import { describe, expect, it } from 'vitest';
import { cleanupPgn, isValidResult, normalizeResult, splitPgns } from './pgn';

describe('normalizeResult', () => {
    it('converts 0.5-0.5 Result header to 1/2-1/2', () => {
        const pgn = '[Result "0.5-0.5"]';
        expect(normalizeResult(pgn)).toBe('[Result "1/2-1/2"]');
    });

    it('converts 0.5-0.5 in movetext to 1/2-1/2', () => {
        const pgn = '1. e4 e5 2. Nf3 Nc6 0.5-0.5';
        expect(normalizeResult(pgn)).toBe('1. e4 e5 2. Nf3 Nc6 1/2-1/2');
    });

    it('converts both Result header and movetext termination', () => {
        const pgn = '[Result "0.5-0.5"]\n\n1. e4 e5 0.5-0.5';
        expect(normalizeResult(pgn)).toBe('[Result "1/2-1/2"]\n\n1. e4 e5 1/2-1/2');
    });

    it('does not modify standard 1/2-1/2 results', () => {
        const pgn = '[Result "1/2-1/2"]\n\n1. e4 e5 1/2-1/2';
        expect(normalizeResult(pgn)).toBe(pgn);
    });

    it('does not modify 1-0 or 0-1 results', () => {
        const pgnWhiteWins = '[Result "1-0"]\n\n1. e4 e5 1-0';
        const pgnBlackWins = '[Result "0-1"]\n\n1. e4 e5 0-1';
        expect(normalizeResult(pgnWhiteWins)).toBe(pgnWhiteWins);
        expect(normalizeResult(pgnBlackWins)).toBe(pgnBlackWins);
    });

    it('handles Lichess study PGN with 0.5-0.5', () => {
        const pgn = `[Event "2025/2026: Cas van Noort (1682) - Sander Oude Wesselink (-)"]
[Result "0.5-0.5"]
[WhiteElo "1682"]

1. d4 d5 2. c4 e6 0.5-0.5`;
        const normalized = normalizeResult(pgn);
        expect(normalized).toContain('[Result "1/2-1/2"]');
        expect(normalized).toContain('1/2-1/2');
        expect(normalized).not.toContain('0.5-0.5');
    });
});

describe('isValidResult', () => {
    it('returns true for 1-0', () => {
        expect(isValidResult('1-0')).toBe(true);
    });

    it('returns true for 0-1', () => {
        expect(isValidResult('0-1')).toBe(true);
    });

    it('returns true for 1/2-1/2', () => {
        expect(isValidResult('1/2-1/2')).toBe(true);
    });

    it('returns true for 0.5-0.5', () => {
        expect(isValidResult('0.5-0.5')).toBe(true);
    });

    it('returns true for *', () => {
        expect(isValidResult('*')).toBe(true);
    });

    it('returns false for invalid results', () => {
        expect(isValidResult('invalid')).toBe(false);
        expect(isValidResult('')).toBe(false);
        expect(isValidResult(undefined)).toBe(false);
    });
});

describe('splitPgns', () => {
    it('splits multiple games with 0.5-0.5 terminators', () => {
        const pgns = `[Event "Game 1"]
[Result "0.5-0.5"]

1. e4 e5 0.5-0.5

[Event "Game 2"]
[Result "1-0"]

1. d4 d5 1-0`;
        const games = splitPgns(pgns);
        expect(games.length).toBe(2);
        expect(games[0]).toContain('Game 1');
        expect(games[1]).toContain('Game 2');
    });

    it('handles mix of standard and non-standard results', () => {
        const pgns = `[Event "Draw 1"]
[Result "1/2-1/2"]

1. e4 1/2-1/2

[Event "Draw 2"]
[Result "0.5-0.5"]

1. d4 0.5-0.5

[Event "White wins"]
[Result "1-0"]

1. e4 1-0`;
        const games = splitPgns(pgns);
        expect(games.length).toBe(3);
    });
});

describe('cleanupPgn', () => {
    it('normalizes 0.5-0.5 to 1/2-1/2', () => {
        const pgn = `[Event "Test"]
[Result "0.5-0.5"]

1. e4 e5 0.5-0.5`;
        const cleaned = cleanupPgn(pgn);
        expect(cleaned).toContain('[Result "1/2-1/2"]');
        expect(cleaned).toContain('1/2-1/2');
        expect(cleaned).not.toContain('0.5-0.5');
    });

    it('preserves standard results', () => {
        const pgn = `[Event "Test"]
[Result "1/2-1/2"]

1. e4 e5 1/2-1/2`;
        const cleaned = cleanupPgn(pgn);
        expect(cleaned).toContain('[Result "1/2-1/2"]');
    });
});
