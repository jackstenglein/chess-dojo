import { describe, expect, it } from 'vitest';
import {
    getGameReviewCohortRequestSchema,
    getRecordingRequestSchema,
    pauseQueueDateRequestSchema,
    resetQueueDateRequestSchema,
    setGameReviewCohortsRequestSchema,
} from './api';

describe('liveClasses/api', () => {
    describe('getRecordingRequestSchema', () => {
        it('parses a valid Lecture s3Key', () => {
            const input = { s3Key: 'LECTURE/some-folder/something.mp4' };
            expect(getRecordingRequestSchema.parse(input)).toEqual(input);
        });

        it('parses a valid GameReview s3Key', () => {
            const input = { s3Key: 'GAME_REVIEW/some-folder/something.mp4' };
            expect(getRecordingRequestSchema.parse(input)).toEqual(input);
        });

        it('rejects when s3Key is missing', () => {
            const result = getRecordingRequestSchema.safeParse({});
            expect(result.success).toBe(false);
        });

        it('rejects when s3Key is not a string', () => {
            const result = getRecordingRequestSchema.safeParse({ s3Key: 123 });
            expect(result.success).toBe(false);
        });

        it('rejects when s3Key does not match regex', () => {
            const result = getRecordingRequestSchema.safeParse({ s3Key: 'not-valid/foo/bar.mp4' });
            expect(result.success).toBe(false);
        });
    });

    describe('getGameReviewCohortRequestSchema', () => {
        it('parses a valid id', () => {
            const input = { id: 'cohort-123' };
            expect(getGameReviewCohortRequestSchema.parse(input)).toEqual(input);
        });

        it('rejects when id is missing', () => {
            const result = getGameReviewCohortRequestSchema.safeParse({});
            expect(result.success).toBe(false);
        });
    });

    describe('resetQueueDateRequestSchema', () => {
        it('parses a valid reset request', () => {
            const input = { id: 'cohort-123', username: 'player1' };
            expect(resetQueueDateRequestSchema.parse(input)).toEqual(input);
        });

        it('rejects when username is missing', () => {
            const result = resetQueueDateRequestSchema.safeParse({ id: 'cohort-123' });
            expect(result.success).toBe(false);
        });

        it('rejects when id is not a string', () => {
            const result = resetQueueDateRequestSchema.safeParse({ id: 123, username: 'u' });
            expect(result.success).toBe(false);
        });
    });

    describe('pauseQueueDateRequestSchema', () => {
        it('parses a valid pause request', () => {
            const input = { id: 'cohort-123', username: 'player1', pause: true };
            expect(pauseQueueDateRequestSchema.parse(input)).toEqual(input);
        });

        it('rejects when pause is not boolean', () => {
            const result = pauseQueueDateRequestSchema.safeParse({
                id: 'cohort-123',
                username: 'player1',
                pause: 'true',
            });
            expect(result.success).toBe(false);
        });

        it('rejects when username is missing', () => {
            const result = pauseQueueDateRequestSchema.safeParse({ id: 'cohort-123', pause: true });
            expect(result.success).toBe(false);
        });
    });

    describe('setGameReviewCohortsRequestSchema', () => {
        it('parses a minimal valid gameReviewCohorts payload', () => {
            const input = {
                gameReviewCohorts: [
                    {
                        name: 'Cohort 1',
                        members: {
                            user1: {
                                username: 'user1',
                                displayName: 'User One',
                                queueDate: '2025-01-01',
                            },
                        },
                    },
                ],
            };

            expect(setGameReviewCohortsRequestSchema.parse(input)).toEqual(input);
        });

        it('rejects when members is not a record', () => {
            const input = {
                gameReviewCohorts: [
                    {
                        name: 'Cohort 1',
                        members: ['not-a-record'],
                    },
                ],
            };

            const result = setGameReviewCohortsRequestSchema.safeParse(input);
            expect(result.success).toBe(false);
        });

        it('rejects when a member is missing required fields', () => {
            const input = {
                gameReviewCohorts: [
                    {
                        name: 'Cohort 1',
                        members: {
                            user1: {
                                username: 'user1',
                                // missing displayName and queueDate
                            },
                        },
                    },
                ],
            };

            const result = setGameReviewCohortsRequestSchema.safeParse(input);
            expect(result.success).toBe(false);
        });
    });
});
