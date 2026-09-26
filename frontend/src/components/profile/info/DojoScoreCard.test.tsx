import { useRequirements } from '@/api/cache/requirements';
import {
    Requirement,
    RequirementCategory,
    RequirementStatus,
    ScoreboardDisplay,
} from '@/database/requirement';
import { RatingSystem, TimeFormat, User } from '@/database/user';
import {
    SubscriptionStatus,
    SubscriptionTier,
} from '@jackstenglein/chess-dojo-common/src/database/user';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DojoScoreCard from './DojoScoreCard';

vi.mock('@/api/cache/requirements', () => ({
    useRequirements: vi.fn(),
}));

vi.mock('@/auth/Auth', () => ({
    useAuth: () => ({ user: { username: 'test-user', enableZenMode: true } }),
}));

vi.mock('@/components/profile/activity/useTimeline', () => ({
    useTimelineContext: () => ({ entries: [] }),
}));

vi.mock('@/scoreboard/ScoreboardProgress', () => ({
    default: ({ label }: { label?: string }) => <div>{label}</div>,
}));

vi.mock('next-intl', () => ({
    useTranslations: () => Object.assign((key: string) => key, { has: () => true }),
}));

const cohort = '1000-1100';

function makeRequirement(id: string, subscriptionTiers?: SubscriptionTier[]): Requirement {
    return {
        id,
        status: RequirementStatus.Active,
        category: RequirementCategory.Games,
        name: id,
        description: '',
        freeDescription: '',
        counts: { [cohort]: 10 },
        startCount: 0,
        numberOfCohorts: -1,
        unitScore: 1,
        totalScore: 0,
        scoreboardDisplay: ScoreboardDisplay.ProgressBar,
        progressBarSuffix: '',
        updatedAt: '2026-01-01T00:00:00Z',
        sortPriority: '1',
        expirationDays: 0,
        isFree: true,
        atomic: false,
        expectedMinutes: 30,
        subscriptionTiers,
    };
}

function makeUser(): User {
    return {
        username: 'test-user',
        displayName: 'Test User',
        discordUsername: '',
        dojoCohort: cohort,
        bio: '',
        ratingSystem: RatingSystem.Chesscom,
        ratings: {},
        progress: {
            available: {
                requirementId: 'available',
                counts: { [cohort]: 5 },
                minutesSpent: { [cohort]: 0 },
                updatedAt: '2026-01-01T00:00:00Z',
            },
        },
        disableBookingNotifications: false,
        disableCancellationNotifications: false,
        isAdmin: false,
        isCalendarAdmin: false,
        isTournamentAdmin: false,
        isBetaTester: false,
        isCoach: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        numberOfGraduations: 0,
        previousCohort: '',
        lastGraduatedAt: '',
        enableLightMode: false,
        enableZenMode: true,
        timezoneOverride: '',
        timeFormat: TimeFormat.Default,
        hasCreatedProfile: true,
        followerCount: 0,
        followingCount: 0,
        referralSource: '',
        totalDojoScore: 0,
        subscriptionStatus: SubscriptionStatus.Subscribed,
        subscriptionTier: SubscriptionTier.Basic,
        exams: {},
        weekStart: 0,
    };
}

describe('DojoScoreCard', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('excludes requirements unavailable to the user subscription tier from progress', () => {
        vi.mocked(useRequirements).mockReturnValue({
            requirements: [
                makeRequirement('available'),
                makeRequirement('lecture-only', [SubscriptionTier.Lecture]),
            ],
            request: {} as ReturnType<typeof useRequirements>['request'],
        });

        render(<DojoScoreCard user={makeUser()} cohort={cohort} />);

        expect(screen.getAllByText('50%')).toHaveLength(2);
        expect(screen.queryByText('25%')).not.toBeInTheDocument();
    });
});
