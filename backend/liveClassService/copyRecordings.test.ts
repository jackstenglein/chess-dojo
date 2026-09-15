import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { describe, expect, it } from 'vitest';
import { getS3Key } from './copyRecordings';
import type { MeetingInfo } from './meetingInfo';

const mockMeetingInfo: MeetingInfo = {
    type: SubscriptionTier.Lecture,
    name: 'Test Lecture',
    googleMeetNames: ['Test Lecture | GM Someone'],
    googleMeetIds: ['abc-def-ghi'],
    cohortRange: '1200+',
    tags: [],
    teacher: 'GM Someone',
    description: '',
    imageUrl: '',
    awsS3Folder: 'test-lecture',
};

describe('getS3Key', () => {
    it('returns empty string when meetingInfos is empty', () => {
        const fileName = 'Test Lecture - 2025-02-27 10:00 AM - Recording';
        expect(getS3Key(fileName, [])).toBe('');
    });

    it('returns empty string when fileName does not match any meeting info', () => {
        const fileName = 'Unknown Meeting - 2025-02-27 10:00 AM - Recording';
        expect(getS3Key(fileName, [mockMeetingInfo])).toBe('');
    });

    it('returns empty string when fileName has no date matching MEET_DATE_REGEX', () => {
        const fileName = 'Test Lecture | GM Someone - Recording';
        expect(getS3Key(fileName, [mockMeetingInfo])).toBe('');
    });

    it('returns S3 key when fileName matches by googleMeetName with YYYY-MM-DD date', () => {
        const fileName = 'Test Lecture | GM Someone - 2025-02-27 10:00 AM - Recording';
        expect(getS3Key(fileName, [mockMeetingInfo])).toBe('LECTURE/test-lecture/2025-02-27');
    });

    it('returns S3 key when fileName matches by googleMeetId with YYYY-MM-DD date', () => {
        const fileName = 'abc-def-ghi - 2025-03-01 2:00 PM - Recording';
        expect(getS3Key(fileName, [mockMeetingInfo])).toBe('LECTURE/test-lecture/2025-03-01');
    });

    it('normalizes YYYY/MM/DD date to YYYY-MM-DD in S3 key', () => {
        const fileName = 'Test Lecture | GM Someone - 2025/02/27 10:00 AM - Recording';
        expect(getS3Key(fileName, [mockMeetingInfo])).toBe('LECTURE/test-lecture/2025-02-27');
    });

    it('uses first matching meeting info when multiple match', () => {
        const otherInfo: MeetingInfo = {
            ...mockMeetingInfo,
            type: SubscriptionTier.GameReview,
            googleMeetNames: ['Other Meeting'],
            googleMeetIds: ['xyz-xyz-xyz'],
            awsS3Folder: 'other-folder',
        };
        const fileName = 'Test Lecture | GM Someone - 2025-02-27 10:00 AM - Recording';
        expect(getS3Key(fileName, [mockMeetingInfo, otherInfo])).toBe(
            'LECTURE/test-lecture/2025-02-27',
        );
    });

    it('returns correct key for GameReview tier', () => {
        const gameReviewInfo: MeetingInfo = {
            ...mockMeetingInfo,
            type: SubscriptionTier.GameReview,
            googleMeetNames: ['Peer Review'],
            googleMeetIds: ['peer-review-id'],
            awsS3Folder: 'peer-review',
        };
        const fileName = 'Peer Review - 2025-02-28 11:00 AM - Recording';
        expect(getS3Key(fileName, [gameReviewInfo])).toBe('GAME_REVIEW/peer-review/2025-02-28');
    });
});
