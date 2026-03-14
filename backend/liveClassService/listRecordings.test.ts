import { _Object } from '@aws-sdk/client-s3';
import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { describe, expect, it } from 'vitest';
import { getLiveClasses } from './listRecordings';
import type { MeetingInfo } from './meetingInfo';

const mockLectureInfo: MeetingInfo = {
    type: SubscriptionTier.Lecture,
    name: 'Test Lecture',
    googleMeetNames: ['Test Lecture | GM Someone'],
    googleMeetIds: ['abc-def-ghi'],
    cohortRange: '1200+',
    tags: ['Opening'],
    teacher: 'GM Someone',
    description: '',
    imageUrl: '',
    awsS3Folder: 'test-lecture',
};

const mockGameReviewInfo: MeetingInfo = {
    type: SubscriptionTier.GameReview,
    name: 'Peer Review',
    googleMeetNames: ['Peer Review'],
    googleMeetIds: ['peer-id'],
    cohortRange: 'All',
    tags: [],
    teacher: 'Sensei',
    description: '',
    imageUrl: '',
    awsS3Folder: 'peer-review',
};

function s3Item(key: string): _Object {
    return { Key: key };
}

describe('getLiveClasses', () => {
    it('returns empty array when s3Items is empty', () => {
        expect(getLiveClasses([], [mockLectureInfo])).toEqual([]);
    });

    it('returns empty array when no s3 item matches any meeting info', () => {
        const items = [s3Item('LECTURE/unknown-folder/2025-02-27')];
        expect(getLiveClasses(items, [mockLectureInfo])).toEqual([]);
    });

    it('returns one LiveClass with one recording when one item matches', () => {
        const items = [s3Item('LECTURE/test-lecture/2025-02-27')];
        const result = getLiveClasses(items, [mockLectureInfo]);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            name: 'Test Lecture',
            type: SubscriptionTier.Lecture,
            cohortRange: '1200+',
            teacher: 'GM Someone',
        });
        expect(result[0].recordings).toEqual([
            { date: '2025-02-27', s3Key: 'LECTURE/test-lecture/2025-02-27' },
        ]);
    });

    it('skips item when key last segment is not a valid date', () => {
        const items = [
            s3Item('LECTURE/test-lecture/2025-02-27'),
            s3Item('LECTURE/test-lecture/not-a-date'),
        ];
        const result = getLiveClasses(items, [mockLectureInfo]);
        expect(result).toHaveLength(1);
        expect(result[0].recordings).toHaveLength(1);
        expect(result[0].recordings[0].date).toBe('2025-02-27');
    });

    it('groups multiple recordings for same meeting into one LiveClass', () => {
        const items = [
            s3Item('LECTURE/test-lecture/2025-03-01'),
            s3Item('LECTURE/test-lecture/2025-02-27'),
        ];
        const result = getLiveClasses(items, [mockLectureInfo]);
        expect(result).toHaveLength(1);
        expect(result[0].recordings).toHaveLength(2);
        expect(result[0].recordings.map((r) => r.date)).toEqual(['2025-02-27', '2025-03-01']);
    });

    it('sorts classes by first recording date', () => {
        const items = [
            s3Item('LECTURE/test-lecture/2025-03-05'),
            s3Item('GAME_REVIEW/peer-review/2025-02-28'),
        ];
        const result = getLiveClasses(items, [mockLectureInfo, mockGameReviewInfo]);
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Peer Review');
        expect(result[1].name).toBe('Test Lecture');
    });

    it('returns multiple LiveClasses when items match different meetings', () => {
        const items = [
            s3Item('LECTURE/test-lecture/2025-02-27'),
            s3Item('GAME_REVIEW/peer-review/2025-02-28'),
        ];
        const result = getLiveClasses(items, [mockLectureInfo, mockGameReviewInfo]);
        expect(result).toHaveLength(2);
        const byName = Object.fromEntries(result.map((c) => [c.name, c]));
        expect(byName['Test Lecture'].recordings).toEqual([
            { date: '2025-02-27', s3Key: 'LECTURE/test-lecture/2025-02-27' },
        ]);
        expect(byName['Peer Review'].recordings).toEqual([
            { date: '2025-02-28', s3Key: 'GAME_REVIEW/peer-review/2025-02-28' },
        ]);
    });

    it('exactly matches key to awsS3Folder', () => {
        const items = [s3Item('LECTURE/some-prefix-test-lecture-suffix/2025-02-27')];
        const result = getLiveClasses(items, [mockLectureInfo]);
        expect(result).toEqual([]);
    });
});
