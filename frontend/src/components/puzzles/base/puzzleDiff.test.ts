import { PuzzlebasePuzzle } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { describe, expect, it } from 'vitest';
import { errorMessage, errorStatus } from './puzzlebaseErrors';
import { diffToUpdate } from './puzzleDiff';

const puzzle: PuzzlebasePuzzle = {
    id: '004',
    fen: '3q3k/8/8/4N3/8/8/8/6K1 w - - 0 1',
    solutionPgn: '[FEN "x"]\n\n1. Nf7+',
    annotator: 'a',
    annotatorDisplayName: 'A',
    rating: 800,
    buckets: ['Tactics'],
    themes: ['Fork'],
    createdAt: 'T0',
    updatedAt: 'T0',
};

describe('diffToUpdate', () => {
    it('returns nothing when nothing changed', () => {
        expect(diffToUpdate(puzzle, { ...puzzle })).toBeUndefined();
    });

    it('ignores fields that are not saved', () => {
        expect(
            diffToUpdate(puzzle, { ...puzzle, updatedAt: 'T1', annotator: 'b' }),
        ).toBeUndefined();
    });

    it('sends only the rating when only the rating changed', () => {
        expect(diffToUpdate(puzzle, { ...puzzle, rating: 1200 })).toEqual({
            id: '004',
            rating: 1200,
        });
    });

    it('sends both buckets and themes when either changed', () => {
        expect(diffToUpdate(puzzle, { ...puzzle, themes: ['Fork', 'Pin'] })).toEqual({
            id: '004',
            buckets: ['Tactics'],
            themes: ['Fork', 'Pin'],
        });
        expect(diffToUpdate(puzzle, { ...puzzle, buckets: [], themes: [] })).toEqual({
            id: '004',
            buckets: [],
            themes: [],
        });
    });

    it('sends the solution when the position or the moves changed', () => {
        expect(diffToUpdate(puzzle, { ...puzzle, solutionPgn: '[FEN "y"]\n\n1. Ng6' })).toEqual({
            id: '004',
            solutionPgn: '[FEN "y"]\n\n1. Ng6',
        });
        expect(diffToUpdate(puzzle, { ...puzzle, fen: '8/8/8/8/8/8/8/K6k w - - 0 1' })).toEqual({
            id: '004',
            solutionPgn: puzzle.solutionPgn,
        });
    });

    it('combines several changes in one request', () => {
        expect(diffToUpdate(puzzle, { ...puzzle, rating: 900, composer: 'Book' })).toEqual({
            id: '004',
            rating: 900,
            composer: 'Book',
        });
    });
});

describe('errorMessage', () => {
    it('prefers the message the API sent', () => {
        expect(
            errorMessage({ response: { data: { message: 'Nope' } }, message: 'Request failed' }),
        ).toBe('Nope');
    });

    it('falls back to the error message, then a generic one', () => {
        expect(errorMessage(new Error('Network down'))).toBe('Network down');
        expect(errorMessage(undefined)).toMatch(/Something went wrong/);
        expect(errorMessage({ response: { data: {} } })).toMatch(/Something went wrong/);
    });
});

describe('errorStatus', () => {
    it('reads the HTTP status', () => {
        expect(errorStatus({ response: { status: 403 } })).toBe(403);
        expect(errorStatus(new Error('x'))).toBeUndefined();
    });
});
