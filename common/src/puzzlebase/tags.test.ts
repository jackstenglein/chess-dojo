import { describe, expect, it } from 'vitest';
import { missingBucketGroups, PuzzlebaseTaxonomy } from './api';
import {
    addBucket,
    addTheme,
    bucketsOfTheme,
    canonicalTheme,
    removeBucket,
    removeTheme,
} from './tags';

const taxonomy: PuzzlebaseTaxonomy = {
    buckets: { Tactics: ['Pin', 'Fork'], Endgame: ['Passed pawn'] },
};

describe('tags', () => {
    it('adding a theme adds its bucket', () => {
        expect(addTheme(taxonomy, { buckets: [], themes: [] }, 'Pin')).toEqual({
            buckets: ['Tactics'],
            themes: ['Pin'],
        });
    });

    it('does not duplicate tags', () => {
        const tags = { buckets: ['Tactics'], themes: ['Pin'] };
        expect(addTheme(taxonomy, tags, 'Pin')).toEqual(tags);
    });

    it('ignores unknown themes', () => {
        const tags = { buckets: [], themes: [] };
        expect(addTheme(taxonomy, tags, 'Nope')).toEqual(tags);
    });

    it('removing a theme keeps its bucket', () => {
        expect(removeTheme({ buckets: ['Tactics'], themes: ['Pin'] }, 'Pin')).toEqual({
            buckets: ['Tactics'],
            themes: [],
        });
    });

    it('removing a bucket removes its themes', () => {
        expect(
            removeBucket(
                taxonomy,
                { buckets: ['Tactics', 'Endgame'], themes: ['Pin', 'Passed pawn'] },
                'Tactics',
            ),
        ).toEqual({ buckets: ['Endgame'], themes: ['Passed pawn'] });
    });
});

describe('a theme listed under several buckets', () => {
    const shared: PuzzlebaseTaxonomy = {
        buckets: {
            Tactics: ['Pin', 'Attack on the king'],
            Middlegame: ['Attack on the king'],
            Endgame: ['Passed pawn', 'Attack on the king'],
        },
    };

    it('knows every bucket the theme is listed under', () => {
        expect(bucketsOfTheme(shared, 'Attack on the king')).toEqual([
            'Tactics',
            'Middlegame',
            'Endgame',
        ]);
        expect(bucketsOfTheme(shared, 'Pin')).toEqual(['Tactics']);
        expect(bucketsOfTheme(shared, 'Nope')).toEqual([]);
    });

    it('adds the bucket it was picked under', () => {
        const none = { buckets: [], themes: [] };
        expect(addTheme(shared, none, 'Attack on the king', 'Endgame')).toEqual({
            buckets: ['Endgame'],
            themes: ['Attack on the king'],
        });
        expect(addTheme(shared, none, 'Attack on the king', 'Tactics').buckets).toEqual([
            'Tactics',
        ]);
    });

    it('adds its first bucket when none was picked and the puzzle has none of them', () => {
        expect(addTheme(shared, { buckets: [], themes: [] }, 'Attack on the king').buckets).toEqual(
            ['Tactics'],
        );
    });

    it('adds no bucket when the puzzle already has one that lists the theme', () => {
        const tags = { buckets: ['Endgame'], themes: [] };
        expect(addTheme(shared, tags, 'Attack on the king')).toEqual({
            buckets: ['Endgame'],
            themes: ['Attack on the king'],
        });
    });

    it('can be added under a second bucket as well', () => {
        const tags = { buckets: ['Endgame'], themes: ['Attack on the king'] };
        expect(addTheme(shared, tags, 'Attack on the king', 'Tactics').buckets).toEqual([
            'Endgame',
            'Tactics',
        ]);
    });

    it('stays on the puzzle when one of two buckets that list it is removed', () => {
        const tags = { buckets: ['Tactics', 'Endgame'], themes: ['Attack on the king', 'Pin'] };
        expect(removeBucket(shared, tags, 'Endgame')).toEqual({
            buckets: ['Tactics'],
            themes: ['Attack on the king', 'Pin'],
        });
    });

    it('goes when the last bucket that lists it is removed', () => {
        const tags = { buckets: ['Endgame'], themes: ['Attack on the king', 'Passed pawn'] };
        expect(removeBucket(shared, tags, 'Endgame')).toEqual({ buckets: [], themes: [] });
    });

    it('finds a theme by name whatever its case', () => {
        expect(canonicalTheme(shared, 'attack ON the king')).toBe('Attack on the king');
        expect(canonicalTheme(shared, 'nope')).toBeUndefined();
    });
});

describe('one bucket per group', () => {
    const taxonomy = {
        buckets: {
            Tactics: ['Fork'],
            Strategy: ['Outpost'],
            Middlegame: ['Pawn storm'],
            Endgame: ['Opposition', 'Fork'],
        },
    };

    it('replaces the sibling bucket and the themes only it brought', () => {
        const tags = { buckets: ['Tactics'], themes: ['Fork'] };
        expect(addBucket(tags, 'Strategy', taxonomy)).toEqual({
            buckets: ['Strategy'],
            themes: [],
        });
    });

    it('replaces the phase when another is picked', () => {
        const tags = { buckets: ['Tactics', 'Middlegame'], themes: [] };
        expect(addBucket(tags, 'Endgame', taxonomy).buckets).toEqual(['Tactics', 'Endgame']);
    });

    it('does not change the phase when a theme from another phase is added', () => {
        const tags = { buckets: ['Middlegame'], themes: [] };
        expect(addTheme(taxonomy, tags, 'Opposition').buckets).toEqual(['Middlegame']);
    });

    it('reports the groups a puzzle still lacks', () => {
        expect(missingBucketGroups(['Tactics'])).toEqual([['Opening', 'Middlegame', 'Endgame']]);
        expect(missingBucketGroups(['Strategy', 'Endgame'])).toEqual([]);
    });
});
