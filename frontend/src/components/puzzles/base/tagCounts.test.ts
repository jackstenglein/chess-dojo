import { describe, expect, it } from 'vitest';
import { sortThemes } from './BucketThemeMenu';
import { countTags } from './tagCounts';

describe('countTags', () => {
    it('counts puzzles per bucket and theme', () => {
        const counts = countTags([
            { buckets: ['Tactics', 'Endgame'], themes: ['Pin', 'Passed pawn'] },
            { buckets: ['Tactics'], themes: ['Pin'] },
            { buckets: [], themes: [] },
        ]);
        expect(counts.buckets).toEqual({ Tactics: 2, Endgame: 1 });
        expect(counts.themes).toEqual({ Pin: 2, 'Passed pawn': 1 });
    });

    it('returns empty counts for no puzzles', () => {
        expect(countTags([])).toEqual({ buckets: {}, themes: {} });
    });
});

describe('sortThemes', () => {
    it('sorts alphabetically without mutating the input', () => {
        const themes = ['Skewer', 'fork', 'Pin', 'Deflection'];
        expect(sortThemes(themes)).toEqual(['Deflection', 'fork', 'Pin', 'Skewer']);
        expect(themes).toEqual(['Skewer', 'fork', 'Pin', 'Deflection']);
    });
});
