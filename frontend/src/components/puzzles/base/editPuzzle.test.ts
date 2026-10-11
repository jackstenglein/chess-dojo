import { describe, expect, it } from 'vitest';
import { buildPuzzlePgn, checkPuzzlePgn, splitPuzzlePgn, validatePuzzleEdit } from './editPuzzle';

const FEN = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';
const PGN = `[White "A"]\n[Black "B"]\n[SetUp "1"]\n[FEN "${FEN}"]\n\n1. Rd8#`;

describe('splitPuzzlePgn', () => {
    it('separates headers from movetext and drops SetUp and FEN', () => {
        expect(splitPuzzlePgn(PGN)).toEqual({
            headers: [
                ['White', 'A'],
                ['Black', 'B'],
            ],
            movetext: '1. Rd8#',
        });
    });

    it('keeps variations on later lines', () => {
        const { movetext } = splitPuzzlePgn(`[FEN "${FEN}"]\n\n1. Rd8+ (1. Rd7)\nKf8`);
        expect(movetext).toBe('1. Rd8+ (1. Rd7)\nKf8');
    });
});

describe('buildPuzzlePgn', () => {
    it('round-trips through split', () => {
        const { headers, movetext } = splitPuzzlePgn(PGN);
        const rebuilt = buildPuzzlePgn(FEN, headers, movetext);
        expect(splitPuzzlePgn(rebuilt)).toEqual({ headers, movetext });
        expect(rebuilt).toContain(`[FEN "${FEN}"]`);
    });
});

describe('validatePuzzleEdit', () => {
    it('accepts a legal edit and keeps other headers', () => {
        const result = validatePuzzleEdit(FEN, '1. Rd8#', PGN);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.fen).toBe(FEN);
            expect(result.solutionPgn).toContain('[White "A"]');
        }
    });

    it('accepts a new position with new moves', () => {
        const fen = '3q3k/8/8/4N3/8/8/8/6K1 w - - 0 1';
        expect(validatePuzzleEdit(fen, '1. Nf7+ Kg8 2. Nxd8', PGN).ok).toBe(true);
    });

    it('rejects an empty FEN or solution', () => {
        expect(validatePuzzleEdit('', '1. Rd8#', PGN).ok).toBe(false);
        expect(validatePuzzleEdit(FEN, '  ', PGN).ok).toBe(false);
    });

    it('rejects an illegal move', () => {
        expect(validatePuzzleEdit(FEN, '1. Rd9#', PGN).ok).toBe(false);
        expect(validatePuzzleEdit(FEN, '1. Qh5', PGN).ok).toBe(false);
    });

    it('rejects a solution with an illegal move partway through', () => {
        const fen = '3q3k/8/8/4N3/8/8/8/6K1 w - - 0 1';
        const result = validatePuzzleEdit(fen, '1. Nf7+ Kg8 2. Qh5', PGN);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toMatch(/only 2 of 3 moves/);
        }
    });

    it('rejects a malformed FEN', () => {
        expect(validatePuzzleEdit('not a fen', '1. Rd8#', PGN).ok).toBe(false);
    });
});

describe('checkPuzzlePgn', () => {
    it('accepts a puzzle and reports its position and players', () => {
        expect(checkPuzzlePgn(PGN)).toEqual({
            ok: true,
            fen: FEN,
            players: 'A – B',
            tagNames: [],
            rating: undefined,
            problems: [],
        });
    });

    it('asks for a PGN when there is none', () => {
        const result = checkPuzzlePgn('   ');
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toMatch(/Paste/);
    });

    it('rejects a full game', () => {
        const result = checkPuzzlePgn('[White "A"]\n\n1. e4 e5 2. Nf3 *');
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toMatch(/full game/);
    });

    it('rejects an illegal move anywhere in the solution', () => {
        expect(checkPuzzlePgn(`[FEN "${FEN}"]\n\n1. Rd8+ Qh5`)).toMatchObject({ ok: false });
    });

    it('reports the tags and rating the PGN asks for', () => {
        const result = checkPuzzlePgn(
            `[SetUp "1"]\n[FEN "${FEN}"]\n\n{ tags: Back rank mate; rating: 500 } 1. Rd8#`,
        );
        expect(result).toMatchObject({ ok: true, tagNames: ['Back rank mate'], rating: 500 });
    });
});
