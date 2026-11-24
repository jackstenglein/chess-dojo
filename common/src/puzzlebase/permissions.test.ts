import { describe, expect, it } from 'vitest';
import { canManagePuzzle, restrictedChanges } from './permissions';

describe('canManagePuzzle', () => {
    it('lets the author and admins manage a puzzle, and no one else', () => {
        const puzzle = { annotator: 'ann' };
        expect(canManagePuzzle(puzzle, { username: 'ann', isAdmin: false })).toBe(true);
        expect(canManagePuzzle(puzzle, { username: 'boss', isAdmin: true })).toBe(true);
        expect(canManagePuzzle(puzzle, { username: 'bob', isAdmin: false })).toBe(false);
    });
});

describe('restrictedChanges', () => {
    it('allows tags and the rating', () => {
        expect(
            restrictedChanges({ id: '001', rating: 1200, themes: ['Fork'], buckets: ['Tactics'] }),
        ).toEqual([]);
    });

    it('names the other fields that were changed', () => {
        expect(
            restrictedChanges({
                id: '001',
                solutionPgn: '1. e4',
                white: 'A',
                black: 'B',
                event: 'Open',
            }),
        ).toEqual(['solution', 'players', 'event']);
    });

    it('ignores fields that are not sent', () => {
        expect(restrictedChanges({ id: '001', composer: undefined })).toEqual([]);
    });
});
