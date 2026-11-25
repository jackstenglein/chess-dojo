import { RequirementCategory } from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { CategoryColors } from '@/style/ThemeProvider';
import { describe, expect, it } from 'vitest';
import { filterTimelineForPlan } from '../customPlan';
import { BUCKET_PALETTE, getBucketCategory, getBucketColor, nextBucketColor } from './bucketColors';

describe('getBucketCategory', () => {
    it('prefers the stored category, so renamed buckets keep their icon', () => {
        expect(
            getBucketCategory({ name: 'My openings', category: RequirementCategory.Opening }),
        ).toBe(RequirementCategory.Opening);
    });

    it('falls back to a bucket named after a category', () => {
        expect(getBucketCategory({ name: 'Tactics' })).toBe(RequirementCategory.Tactics);
        expect(getBucketCategory({ name: 'Calculation' })).toBeUndefined();
    });
});

describe('getBucketColor', () => {
    it('uses the bucket color, then the category color, then the palette', () => {
        expect(getBucketColor({ name: 'X', color: '#123456' }, 0)).toBe('#123456');
        expect(getBucketColor({ name: 'X', category: RequirementCategory.Endgame }, 0)).toBe(
            CategoryColors[RequirementCategory.Endgame],
        );
        expect(getBucketColor({ name: 'X' }, 1)).toBe(BUCKET_PALETTE[1]);
    });

    it('ignores invalid colors', () => {
        expect(getBucketColor({ name: 'X', color: 'red' }, 0)).toBe(BUCKET_PALETTE[0]);
    });
});

describe('nextBucketColor', () => {
    it('returns the first unused palette color', () => {
        expect(nextBucketColor([BUCKET_PALETTE[0].toUpperCase(), BUCKET_PALETTE[1]])).toBe(
            BUCKET_PALETTE[2],
        );
    });
});

describe('filterTimelineForPlan', () => {
    const entries = [
        { id: 'dojo' },
        { id: 'plan-1', planId: 'plan-1' },
        { id: 'plan-2', planId: 'plan-2' },
    ] as TimelineEntry[];

    it('treats untagged entries as the Dojo plan', () => {
        expect(filterTimelineForPlan(entries, '').map((e) => e.id)).toEqual(['dojo']);
    });

    it('returns only the given plan', () => {
        expect(filterTimelineForPlan(entries, 'plan-1').map((e) => e.id)).toEqual(['plan-1']);
    });
});
