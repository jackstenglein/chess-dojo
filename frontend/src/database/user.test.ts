import { RatingSystem, User } from '@jackstenglein/chess-dojo-common/src/database/user';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPartialUserHideCohortPrompt, getSuggestedCohorts } from './user';

const ONE_WEEK_MS = 1000 * 60 * 60 * 24 * 7;

function makeUser(overrides: Partial<User> = {}): User {
    return {
        username: 'testuser',
        displayName: 'Test User',
        discordUsername: 'test',
        dojoCohort: '1000-1100',
        bio: '',
        ratingSystem: RatingSystem.Chesscom,
        ratings: {
            [RatingSystem.Chesscom]: {
                username: 'testuser',
                startRating: 800,
                currentRating: 1000,
            },
        },
        progress: {},
        disableBookingNotifications: false,
        disableCancellationNotifications: false,
        isAdmin: false,
        isCalendarAdmin: false,
        isTournamentAdmin: false,
        isBetaTester: false,
        isCoach: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        numberOfGraduations: 0,
        previousCohort: '',
        lastGraduatedAt: '',
        enableLightMode: false,
        enableZenMode: false,
        timezoneOverride: '',
        timeFormat: '24h',
        hasCreatedProfile: true,
        followerCount: 0,
        followingCount: 0,
        referralSource: '',
        ...overrides,
    } as User;
}

describe('getSuggestedCohorts', () => {
    it('returns undefined cohorts when user is missing', () => {
        expect(getSuggestedCohorts(undefined)).toEqual([undefined, undefined]);
    });

    it('returns undefined cohorts when dojoCohort or ratingSystem is missing', () => {
        const user = makeUser({ dojoCohort: '', ratingSystem: RatingSystem.Chesscom });
        expect(getSuggestedCohorts(user)).toEqual([undefined, undefined]);
    });

    it('can return different old and new suggested cohorts', () => {
        const ratingsToTry = [850, 900, 950, 1000, 1049, 1050, 1100, 1200, 1800, 2000];
        const found = ratingsToTry.find((currentRating) => {
            const [oldCohort, newCohort] = getSuggestedCohorts(
                makeUser({
                    ratingSystem: RatingSystem.Dwz,
                    ratings: {
                        [RatingSystem.Dwz]: {
                            username: 'testuser',
                            startRating: currentRating,
                            currentRating,
                            hideUsername: false,
                        },
                    },
                }),
            );
            return oldCohort !== undefined && newCohort !== undefined && oldCohort !== newCohort;
        });
        expect(found).toBeDefined();
    });

    it('returns the same cohort when rating boundaries are unchanged', () => {
        const user = makeUser({
            ratingSystem: RatingSystem.Cfc,
            ratings: {
                [RatingSystem.Cfc]: {
                    username: '12345',
                    startRating: 1200,
                    currentRating: 1200,
                    hideUsername: false,
                },
            },
        });
        const [oldCohort, newCohort] = getSuggestedCohorts(user);
        expect(oldCohort).toBeDefined();
        expect(newCohort).toBe(oldCohort);
    });
});

describe('getPartialUserHideCohortPrompt', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-05-23T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('defaults hideCohortPromptUntil to 30 days in the future', () => {
        const result = getPartialUserHideCohortPrompt(makeUser());
        const until = result.notificationSettings?.siteNotificationSettings?.hideCohortPromptUntil;
        expect(new Date(until ?? '').toISOString()).toBe('2026-06-22T12:00:00.000Z');
    });

    it('uses a custom offset when provided', () => {
        const result = getPartialUserHideCohortPrompt(makeUser(), ONE_WEEK_MS);
        const until = result.notificationSettings?.siteNotificationSettings?.hideCohortPromptUntil;
        expect(new Date(until ?? '').toISOString()).toBe('2026-05-30T12:00:00.000Z');
    });

    it('preserves existing site notification settings', () => {
        const user = makeUser({
            notificationSettings: {
                siteNotificationSettings: {
                    disableGameComment: true,
                    disableGameCommentReplies: false,
                    disableNewFollower: false,
                    disableNewsfeedComment: false,
                    disableNewsfeedReaction: false,
                    disableCalendarInvite: false,
                },
            },
        });
        const result = getPartialUserHideCohortPrompt(user, ONE_WEEK_MS);
        expect(result.notificationSettings?.siteNotificationSettings?.disableGameComment).toBe(
            true,
        );
    });
});
