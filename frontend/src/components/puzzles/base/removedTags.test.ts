import { describe, expect, it } from 'vitest';
import { removedTags } from './removedTags';

describe('removedTags', () => {
    it('returns nothing when no tags were removed', () => {
        const tags = { buckets: ['Tactics'], themes: ['Pin'] };
        expect(removedTags(tags, tags)).toEqual([]);
        expect(removedTags(tags, { buckets: ['Tactics', 'Endgame'], themes: ['Pin'] })).toEqual([]);
    });

    it('returns removed themes', () => {
        expect(
            removedTags(
                { buckets: ['Tactics'], themes: ['Pin', 'Fork'] },
                { buckets: ['Tactics'], themes: ['Pin'] },
            ),
        ).toEqual(['Fork']);
    });

    it('returns a removed bucket along with its removed themes', () => {
        expect(
            removedTags(
                { buckets: ['Tactics', 'Endgame'], themes: ['Pin', 'Passed pawn'] },
                { buckets: ['Endgame'], themes: ['Passed pawn'] },
            ),
        ).toEqual(['Tactics', 'Pin']);
    });
});
