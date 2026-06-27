import type React from 'react';

import { RatingSystem, User } from '@/database/user';
import { renderWithIntl } from '@/i18n/intl.test';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SwitchCohortPrompt } from './SwitchCohortPrompt';

const mocks = vi.hoisted(() => ({
    user: undefined as User | undefined,
    updateUser: vi.fn(),
}));

vi.mock('@/auth/Auth', () => ({
    useAuth: () => ({ user: mocks.user }),
}));

vi.mock('@/api/Api', () => ({
    useApi: () => ({ updateUser: mocks.updateUser }),
}));

vi.mock('@/components/navigation/Link', () => ({
    Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

function makeUser(overrides: Partial<User> = {}): User {
    return {
        username: 'realraptor',
        displayName: 'realraptor',
        discordUsername: 'realraptor',
        dojoCohort: '1300-1400',
        bio: '',
        ratingSystem: RatingSystem.Fide,
        ratings: {
            [RatingSystem.Fide]: {
                username: '123456',
                startRating: 1698,
                currentRating: 1698,
                hideUsername: false,
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
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-05-23T00:00:00Z',
        numberOfGraduations: 0,
        previousCohort: '',
        lastGraduatedAt: '',
        enableLightMode: false,
        enableZenMode: false,
        timezoneOverride: '',
        timeFormat: '24',
        hasCreatedProfile: true,
        followerCount: 0,
        followingCount: 0,
        referralSource: '',
        totalDojoScore: 0,
        subscriptionStatus: 'NOT_SUBSCRIBED',
        exams: {},
        weekStart: 1,
        ...overrides,
    } as User;
}

describe('SwitchCohortPrompt', () => {
    beforeEach(() => {
        mocks.user = undefined;
        mocks.updateUser.mockReset();
    });

    afterEach(cleanup);

    it('shows the stored current cohort as the source cohort in the 2026 switch prompt', async () => {
        mocks.user = makeUser();

        renderWithIntl(<SwitchCohortPrompt />);

        expect(await screen.findByText('New Cohorts Released')).toBeInTheDocument();
        expect(screen.getByText('1300-1400')).toBeInTheDocument();
        expect(screen.queryByText('1400-1500')).not.toBeInTheDocument();
    });
});
