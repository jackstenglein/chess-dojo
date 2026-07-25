import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { LiveClass } from '@jackstenglein/chess-dojo-common/src/liveClasses/api';
import { describe, expect, it } from 'vitest';
import {
    compareLiveClasses,
    findLiveClassBySlug,
    formatRecordingDate,
    formatRecordingDuration,
    getLiveClassHref,
    getLiveClassSlug,
    getUniqueTags,
    matchesCohortLevel,
    matchesSearch,
    matchesTagFilter,
} from './liveClassUtils';

function mockLiveClass(overrides: Partial<LiveClass> = {}): LiveClass {
    return {
        id: 'test-class',
        name: 'Test Class',
        type: SubscriptionTier.Lecture,
        cohortRange: '0-1200',
        tags: ['Opening'],
        teacher: 'GM Test',
        description: 'A test class description.',
        recordings: [{ date: '2025-02-27', s3Key: 'LECTURE/test/2025-02-27' }],
        ...overrides,
    };
}

describe('liveClassUtils', () => {
    describe('formatRecordingDate', () => {
        it('extracts YYYY-MM-DD from recording date string', () => {
            expect(formatRecordingDate('2025-02-27')).toBe('2025-02-27');
            expect(formatRecordingDate('2025-02-27 (Group Class).mp4')).toBe('2025-02-27');
        });

        it('supports date with slashes', () => {
            expect(formatRecordingDate('Group Class 2025/02/27')).toBe('2025/02/27');
        });

        it('returns original string when no date pattern found', () => {
            expect(formatRecordingDate('not-a-date')).toBe('not-a-date');
        });
    });

    describe('formatRecordingDuration', () => {
        it('formats minutes and seconds', () => {
            expect(formatRecordingDuration(0)).toBe('0:00');
            expect(formatRecordingDuration(65)).toBe('1:05');
            expect(formatRecordingDuration(600)).toBe('10:00');
        });

        it('formats hours when present', () => {
            expect(formatRecordingDuration(3661)).toBe('1:01:01');
            expect(formatRecordingDuration(3600)).toBe('1:00:00');
        });

        it('returns undefined for missing or invalid values', () => {
            expect(formatRecordingDuration(undefined)).toBeUndefined();
            expect(formatRecordingDuration(-1)).toBeUndefined();
            expect(formatRecordingDuration(Number.NaN)).toBeUndefined();
        });
    });

    describe('matchesSearch', () => {
        it('returns true when query is empty or whitespace', () => {
            const c = mockLiveClass();
            expect(matchesSearch(c, '')).toBe(true);
            expect(matchesSearch(c, '   ')).toBe(true);
        });

        it('matches on class name (case insensitive)', () => {
            const c = mockLiveClass({ name: 'The Najdorf 1100+' });
            expect(matchesSearch(c, 'najdorf')).toBe(true);
            expect(matchesSearch(c, 'NAJDORF')).toBe(true);
            expect(matchesSearch(c, 'other')).toBe(false);
        });

        it('matches on teacher (case insensitive)', () => {
            const c = mockLiveClass({ teacher: 'IM David Pruess' });
            expect(matchesSearch(c, 'pruess')).toBe(true);
            expect(matchesSearch(c, 'David')).toBe(true);
            expect(matchesSearch(c, 'unknown')).toBe(false);
        });

        it('matches on description (case insensitive)', () => {
            const c = mockLiveClass({ description: 'Learn the Sicilian defense.' });
            expect(matchesSearch(c, 'sicilian')).toBe(true);
            expect(matchesSearch(c, 'defense')).toBe(true);
            expect(matchesSearch(c, 'missing')).toBe(false);
        });

        it('handles missing teacher', () => {
            const c = mockLiveClass({ teacher: undefined });
            expect(matchesSearch(c, 'test')).toBe(true);
        });
    });

    describe('getUniqueTags', () => {
        it('returns empty array when no classes or no tags', () => {
            expect(getUniqueTags([])).toEqual([]);
            expect(
                getUniqueTags([mockLiveClass({ tags: [] }), mockLiveClass({ tags: [] })]),
            ).toEqual([]);
        });

        it('returns sorted unique tags across classes', () => {
            const classes = [
                mockLiveClass({ tags: ['Opening', 'Endgame'] }),
                mockLiveClass({ tags: ['Endgame', 'Tactics'] }),
            ];
            expect(getUniqueTags(classes)).toEqual(['Endgame', 'Opening', 'Tactics']);
        });

        it('trims and skips empty tags', () => {
            const tags = ['  Opening  ', '', '  '];
            const classes = [mockLiveClass({ tags })];
            expect(getUniqueTags(classes)).toEqual(['Opening']);
        });
    });

    describe('matchesTagFilter', () => {
        it('returns true when no tags selected', () => {
            const c = mockLiveClass({ tags: ['Opening'] });
            expect(matchesTagFilter(c, [])).toBe(true);
        });

        it('returns true when class has a selected tag', () => {
            const c = mockLiveClass({ tags: ['Opening', 'Endgame'] });
            expect(matchesTagFilter(c, ['Opening'])).toBe(true);
            expect(matchesTagFilter(c, ['Endgame'])).toBe(true);
            expect(matchesTagFilter(c, ['Tactics'])).toBe(false);
        });

        it('returns true when class type matches selected tag', () => {
            const lecture = mockLiveClass({ type: SubscriptionTier.Lecture });
            const gameReview = mockLiveClass({ type: SubscriptionTier.GameReview });
            expect(matchesTagFilter(lecture, [SubscriptionTier.Lecture])).toBe(true);
            expect(matchesTagFilter(gameReview, [SubscriptionTier.GameReview])).toBe(true);
            expect(matchesTagFilter(lecture, [SubscriptionTier.GameReview])).toBe(false);
        });
    });

    describe('matchesCohortLevel', () => {
        it('returns true when level is all', () => {
            const c = mockLiveClass({ cohortRange: '1100+' });
            expect(matchesCohortLevel(c, 'all')).toBe(true);
        });

        it('returns true when class cohort overlaps level range', () => {
            expect(matchesCohortLevel(mockLiveClass({ cohortRange: '0-1000' }), 'beginner')).toBe(
                true,
            );
            expect(matchesCohortLevel(mockLiveClass({ cohortRange: '0-1200' }), 'beginner')).toBe(
                true,
            );
            expect(
                matchesCohortLevel(mockLiveClass({ cohortRange: '1100+' }), 'intermediate'),
            ).toBe(true);
            expect(matchesCohortLevel(mockLiveClass({ cohortRange: '2000+' }), 'expert')).toBe(
                true,
            );
        });

        it('returns false when class cohort does not overlap level', () => {
            expect(matchesCohortLevel(mockLiveClass({ cohortRange: '1100+' }), 'beginner')).toBe(
                false,
            );
            expect(matchesCohortLevel(mockLiveClass({ cohortRange: '0-1000' }), 'expert')).toBe(
                false,
            );
        });
    });

    describe('getLiveClassSlug', () => {
        it('uses id when available', () => {
            const c = mockLiveClass({ id: 'abc-123', name: 'Test Class' });
            expect(getLiveClassSlug(c)).toBe('abc-123');
        });

        it('encodes name when id is missing', () => {
            const c = mockLiveClass({ id: undefined, name: 'Calculation 1000+' });
            expect(getLiveClassSlug(c)).toBe(encodeURIComponent('Calculation 1000+'));
        });
    });

    describe('getLiveClassHref', () => {
        it('returns the recordings page path', () => {
            const c = mockLiveClass({ id: 'abc-123' });
            expect(getLiveClassHref(c)).toBe('/learn/live-classes/abc-123');
        });
    });

    describe('findLiveClassBySlug', () => {
        const classes = [
            mockLiveClass({ id: 'abc-123', name: 'Class A' }),
            mockLiveClass({ id: undefined, name: 'Class B' }),
        ];

        it('finds class by id', () => {
            expect(findLiveClassBySlug(classes, 'abc-123')?.name).toBe('Class A');
        });

        it('finds class by encoded name', () => {
            expect(findLiveClassBySlug(classes, encodeURIComponent('Class B'))?.name).toBe(
                'Class B',
            );
        });

        it('returns undefined when not found', () => {
            expect(findLiveClassBySlug(classes, 'missing')).toBeUndefined();
        });
    });

    describe('compareLiveClasses', () => {
        it('sorts Lecture before GameReview', () => {
            const lecture = mockLiveClass({ name: 'B', type: SubscriptionTier.Lecture });
            const gameReview = mockLiveClass({ name: 'A', type: SubscriptionTier.GameReview });
            expect(compareLiveClasses(lecture, gameReview)).toBeLessThan(0);
            expect(compareLiveClasses(gameReview, lecture)).toBeGreaterThan(0);
        });

        it('sorts by cohort range min ascending when same type', () => {
            const low = mockLiveClass({
                name: 'Low',
                type: SubscriptionTier.Lecture,
                cohortRange: '0-1000',
            });
            const high = mockLiveClass({
                name: 'High',
                type: SubscriptionTier.Lecture,
                cohortRange: '1100+',
            });
            expect(compareLiveClasses(low, high)).toBeLessThan(0);
            expect(compareLiveClasses(high, low)).toBeGreaterThan(0);
        });

        it('sorts by cohort range max when min equal', () => {
            const narrow = mockLiveClass({
                name: 'Narrow',
                type: SubscriptionTier.Lecture,
                cohortRange: '0-1200',
            });
            const wide = mockLiveClass({
                name: 'Wide',
                type: SubscriptionTier.Lecture,
                cohortRange: '0-1500',
            });
            expect(compareLiveClasses(narrow, wide)).toBeLessThan(0);
            expect(compareLiveClasses(wide, narrow)).toBeGreaterThan(0);
        });

        it('sorts by name when type and cohort match', () => {
            const a = mockLiveClass({
                name: 'Alpha',
                type: SubscriptionTier.Lecture,
                cohortRange: '0-1200',
            });
            const b = mockLiveClass({
                name: 'Beta',
                type: SubscriptionTier.Lecture,
                cohortRange: '0-1200',
            });
            expect(compareLiveClasses(a, b)).toBeLessThan(0);
            expect(compareLiveClasses(b, a)).toBeGreaterThan(0);
            expect(compareLiveClasses(a, a)).toBe(0);
        });
    });
});
