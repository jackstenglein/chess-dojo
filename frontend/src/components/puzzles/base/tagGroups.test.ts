import { PuzzlebaseTaxonomy } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { describe, expect, it } from 'vitest';
import { groupTags } from './tagGroups';

const taxonomy: PuzzlebaseTaxonomy = {
    buckets: {
        Tactics: ['Fork', 'Pin', 'Sacrifice'],
        Opening: ['Opening trap'],
        Middlegame: ['Attack on the king'],
        Endgame: ['Passed pawn'],
    },
};

describe('groupTags', () => {
    it('orders groups by the taxonomy, not the order tags were added', () => {
        const groups = groupTags(taxonomy, {
            buckets: ['Endgame', 'Middlegame', 'Tactics'],
            themes: ['Passed pawn', 'Attack on the king', 'Sacrifice'],
        });
        expect(groups.map((g) => g.bucket)).toEqual(['Tactics', 'Middlegame', 'Endgame']);
    });

    it('lists each bucket followed by its own themes, alphabetically', () => {
        const groups = groupTags(taxonomy, {
            buckets: ['Tactics', 'Middlegame'],
            themes: ['Sacrifice', 'Attack on the king', 'Fork'],
        });
        expect(groups).toEqual([
            { bucket: 'Tactics', hasBucketTag: true, themes: ['Fork', 'Sacrifice'] },
            { bucket: 'Middlegame', hasBucketTag: true, themes: ['Attack on the king'] },
        ]);
    });

    it('still shows a group when only a theme is tagged, marking the bucket as absent', () => {
        expect(groupTags(taxonomy, { buckets: [], themes: ['Pin'] })).toEqual([
            { bucket: 'Tactics', hasBucketTag: false, themes: ['Pin'] },
        ]);
    });

    it('keeps buckets and themes that are missing from the taxonomy', () => {
        const groups = groupTags(taxonomy, { buckets: ['Retired'], themes: ['Mystery'] });
        expect(groups).toEqual([
            { bucket: 'Retired', hasBucketTag: true, themes: [] },
            { bucket: '', hasBucketTag: false, themes: ['Mystery'] },
        ]);
    });

    it('returns nothing for an untagged puzzle', () => {
        expect(groupTags(taxonomy, { buckets: [], themes: [] })).toEqual([]);
    });
});

describe('groupTags with a theme listed under several buckets', () => {
    const shared: PuzzlebaseTaxonomy = {
        buckets: {
            Tactics: ['Pin', 'Attack on the king'],
            Middlegame: ['Attack on the king'],
            Endgame: ['Passed pawn', 'Attack on the king'],
        },
    };

    it('shows the theme once, under the first of the puzzle’s buckets that lists it', () => {
        const groups = groupTags(shared, {
            buckets: ['Endgame', 'Tactics'],
            themes: ['Attack on the king'],
        });
        expect(groups.map((g) => [g.bucket, g.themes])).toEqual([
            ['Tactics', ['Attack on the king']],
            ['Endgame', []],
        ]);
    });

    it('shows it under the only bucket the puzzle has that lists it', () => {
        const groups = groupTags(shared, { buckets: ['Endgame'], themes: ['Attack on the king'] });
        expect(groups.map((g) => [g.bucket, g.themes])).toEqual([
            ['Endgame', ['Attack on the king']],
        ]);
    });

    it('falls back to the first bucket that lists it when the puzzle has none of them', () => {
        const groups = groupTags(shared, { buckets: [], themes: ['Attack on the king'] });
        expect(groups.map((g) => [g.bucket, g.themes])).toEqual([
            ['Tactics', ['Attack on the king']],
        ]);
    });
});
