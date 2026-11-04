import { RequirementCategory, ScoreboardDisplay } from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { RatingSystem, TimeFormat, User, WorkGoalHistory } from '@/database/user';
import { renderWithIntl } from '@/i18n/intl.test';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { RenderResult } from '@testing-library/react';
import { ReactElement } from 'react';

const theme = createTheme();

/** Sunday through Saturday of a single week, so week summaries land on one day. */
export const MIN_DATE = '2026-10-18';
export const MAX_DATE = '2026-10-24';

export function blockId(date: string) {
    return `heatmap-block-${date}`;
}

/**
 * Builds a viewer in Etc/GMT+5. That zone is far enough from UTC for the heatmap's
 * timezone conversion to run, and noon UTC still falls on the same calendar day there,
 * so assertions stay stable on any machine timezone.
 */
export function makeUser(overrides: Partial<User> = {}): User {
    return {
        username: 'owner',
        displayName: 'Owner',
        discordUsername: '',
        dojoCohort: '1400-1500',
        bio: '',
        ratingSystem: RatingSystem.Chesscom,
        ratings: {},
        progress: {},
        disableBookingNotifications: false,
        disableCancellationNotifications: false,
        isAdmin: false,
        isCalendarAdmin: false,
        isTournamentAdmin: false,
        isBetaTester: false,
        isCoach: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        numberOfGraduations: 0,
        previousCohort: '',
        lastGraduatedAt: '',
        enableLightMode: true,
        enableZenMode: false,
        timezoneOverride: 'Etc/GMT+5',
        timeFormat: TimeFormat.Default,
        hasCreatedProfile: true,
        followerCount: 0,
        followingCount: 0,
        referralSource: '',
        weekStart: 0,
        ...overrides,
    } as User;
}

/** A timeline entry at noon UTC on the given YYYY-MM-DD date. */
export function makeEntry(on: string, overrides: Partial<TimelineEntry> = {}): TimelineEntry {
    const date = `${on}T12:00:00.000Z`;
    return {
        owner: 'owner',
        id: `${on}-entry`,
        ownerDisplayName: 'Owner',
        cohort: '1400-1500',
        requirementId: 'tactics-1',
        requirementName: 'Puzzle Storm',
        requirementCategory: RequirementCategory.Tactics,
        scoreboardDisplay: ScoreboardDisplay.Hidden,
        progressBarSuffix: '',
        totalCount: 1,
        previousCount: 0,
        newCount: 1,
        dojoPoints: 0,
        totalDojoPoints: 0,
        minutesSpent: 30,
        totalMinutesSpent: 30,
        date,
        createdAt: date,
        notes: '',
        comments: [],
        reactions: {},
        ...overrides,
    };
}

export function workGoal(date: string, minutesPerDay: number | number[]): WorkGoalHistory {
    return {
        date,
        workGoal: {
            minutesPerDay: Array.isArray(minutesPerDay)
                ? minutesPerDay
                : Array<number>(7).fill(minutesPerDay),
        },
    };
}

export function renderHeatmap(ui: ReactElement): RenderResult {
    return renderWithIntl(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}
