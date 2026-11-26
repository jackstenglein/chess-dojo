import { describe, expect, it } from 'vitest';
import { commonThemes } from './CommonTags';

const p = (id: string, buckets: string[], themes: string[]) => ({ id, buckets, themes });

describe('commonThemes', () => {
    const puzzles = [
        p('1', ['Tactics', 'Middlegame'], ['Fork', 'Pin']),
        p('2', ['Tactics', 'Middlegame'], ['Fork']),
        p('3', ['Tactics', 'Endgame'], ['Skewer', 'Skewer2']),
        p('4', ['Strategy', 'Middlegame'], ['Outpost']),
    ];

    it('uses puzzles of the same type and phase, not counting the puzzle itself', () => {
        expect(commonThemes(puzzles, p('9', ['Tactics', 'Middlegame'], []))).toEqual([
            'Fork',
            'Pin',
        ]);
        expect(commonThemes(puzzles, p('1', ['Tactics', 'Middlegame'], []))).toEqual(['Fork']);
    });

    it('narrows only by the buckets picked so far', () => {
        expect(commonThemes(puzzles, p('9', ['Strategy'], []))).toEqual(['Outpost']);
        expect(commonThemes(puzzles, p('9', [], []), 2)).toEqual(['Fork', 'Outpost']);
    });
});
