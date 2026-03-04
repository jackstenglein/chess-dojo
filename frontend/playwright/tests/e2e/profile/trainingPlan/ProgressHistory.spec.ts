import { expect, test } from '@playwright/test';
import { getEnv } from '../../../../lib/env';

const baseCustomTask = {
    category: 'Tactics',
    counts: {
        '0-300': 100,
        '1000-1100': 100,
        '1100-1200': 100,
        '1200-1300': 100,
        '1300-1400': 100,
        '1400-1500': 100,
        '1500-1600': 100,
        '1600-1700': 100,
        '1700-1800': 100,
        '1800-1900': 100,
        '1900-2000': 100,
        '2000-2100': 100,
        '2100-2200': 100,
        '2200-2300': 100,
        '2300-2400': 100,
        '2400+': 100,
        '300-400': 100,
        '400-500': 100,
        '500-600': 100,
        '600-700': 100,
        '700-800': 100,
        '800-900': 100,
        '900-1000': 100,
    },
    description: '',
    numberOfCohorts: 1,
    owner: '',
    progressBarSuffix: 'Pages',
    scoreboardDisplay: 'PROGRESS_BAR',
    updatedAt: '2005-02-27T17:26:30.731Z',
};

const mockUser = {
    id: '950493fb-7fdf-4079-9ace-8384f95659f5',
    username: 'test',
    subscriptionStatus: 'SUBSCRIBED',
    subscriptionTier: 'BASIC',
    displayName: 'Test Account',
    ratingSystem: 'CHESSCOM',
    ratings: {
        CHESSCOM: {
            username: 'test',
            hideUsername: false,
            startRating: 1971,
            currentRating: 2009,
        },
    },
    customTasks: [
        {
            ...baseCustomTask,
            id: '65006c33-349d-4774-a03b-14c7e3f42abf',
            name: 'Nonzero Min Goal',
            startCount: 25,
        },
        {
            ...baseCustomTask,
            id: '225f93fd-2ea9-4488-bbb9-9807981283f8',
            name: 'History with ProgressBar',
            startCount: 25,
        },
        {
            ...baseCustomTask,
            id: '0238bb2d-15bf-444c-9da4-f57bc2183d6d',
            name: 'No min goal with progress',
        },
        {
            ...baseCustomTask,
            id: 'a5332a93-8117-4bc5-85e1-69bd089e7c8b',
            name: 'No History',
        },
    ],
    dojoCohort: '1400-1500',
    progress: {
        '225f93fd-2ea9-4488-bbb9-9807981283f8': {
            counts: {
                ALL_COHORTS: 80,
            },
            minutesSpent: {
                '1400-1500': 130,
                '1300-1400': 70,
            },
            requirementId: '225f93fd-2ea9-4488-bbb9-9807981283f8',
            updatedAt: '2026-02-27T19:26:30.731Z',
        },
        '0238bb2d-15bf-444c-9da4-f57bc2183d6d': {
            counts: {
                ALL_COHORTS: 30,
            },
            minutesSpent: {
                '1400-1500': 20,
            },
            requirementId: '0238bb2d-15bf-444c-9da4-f57bc2183d6d',
            updatedAt: '2026-02-27T19:26:30.731Z',
        },
    },
    isAdmin: false,
    isCalendarAdmin: false,
    isTournamentAdmin: false,
    createdAt: '2022-05-01T17:00:00Z',
    updatedAt: '2026-02-27T19:26:30.731Z',
    timezoneOverride: 'DEFAULT',
    timeFormat: '24',
    hasCreatedProfile: true,
    followerCount: 4,
    followingCount: 1,
    lastFetchedNewsfeed: '2025-03-09T18:37:38Z',
    referralSource: 'Reddit',
    totalDojoScore: 2,
    pinnedTasks: [],
    weekStart: 0,
};

const baseTimelineEntry = {
    owner: mockUser.id,
    ownerDisplayName: mockUser.displayName,
    cohort: mockUser.dojoCohort,
    requirementCategory: 'Tactics',
    progressBarSuffix: 'Suffix',
    totalCount: 100,
    notes: '',
    comments: null,
    reactions: null,
};

const mockTimeline = {
    entries: [
        {
            ...baseTimelineEntry,
            requirementId: '225f93fd-2ea9-4488-bbb9-9807981283f8',
            requirementName: 'History with ProgressBar',
            scoreboardDisplay: 'PROGRESS_BAR',
            previousCount: 25,
            newCount: 30,
            dojoPoints: 0,
            totalDojoPoints: 0,
            minutesSpent: 70,
            totalMinutesSpent: 70,
            createdAt: '2026-02-28T19:26:30.731Z',
            cohort: '1300-1400',
        },
        {
            ...baseTimelineEntry,
            requirementId: '225f93fd-2ea9-4488-bbb9-9807981283f8',
            requirementName: 'History with ProgressBar',
            scoreboardDisplay: 'PROGRESS_BAR',
            previousCount: 30,
            newCount: 50,
            dojoPoints: 0,
            totalDojoPoints: 0,
            minutesSpent: 30,
            totalMinutesSpent: 100,
            createdAt: '2026-03-01T19:27:30.731Z',
            comments: null,
        },
        {
            ...baseTimelineEntry,
            requirementId: '225f93fd-2ea9-4488-bbb9-9807981283f8',
            requirementName: 'Nonzero Min Goal with Progress',
            scoreboardDisplay: 'PROGRESS_BAR',
            previousCount: 50,
            newCount: 80,
            dojoPoints: 0,
            totalDojoPoints: 0,
            minutesSpent: 100,
            totalMinutesSpent: 130,
            createdAt: '2026-03-02T19:26:30.731Z',
        },
        {
            ...baseTimelineEntry,
            requirementId: '38y61',
            requirementName: 'Nonexistent task',
            scoreboardDisplay: 'PROGRESS_BAR',
            previousCount: 0,
            newCount: 10,
            dojoPoints: 0,
            totalDojoPoints: 0,
            minutesSpent: 19,
            totalMinutesSpent: 19,
            createdAt: '2026-03-03T19:26:30.731Z',
        },
    ],
    lastEvaluatedKey: null,
};

interface UpdateTimelineRequestBody {
    requirementId: string;
    progress: {
        requirementId: string;
        minutesSpent: Record<string, number>;
        updatedAt: string;
        counts?: Record<string, number>;
    };
    updated: {
        previousCount: number;
        newCount: number;
        minutesSpent: number;
        totalMinutesSpent: number;
        requirementId: string;
    }[];
    deleted: {
        previousCount: number;
        newCount: number;
        minutesSpent: number;
        totalMinutesSpent: number;
        requirementId: string;
    }[];
}

let postRequestBody: UpdateTimelineRequestBody | null = null;

test.describe('ProgressHistory', () => {
    test.beforeEach(async ({ page }) => {
        // Mock user get route, and abort other user requests
        await page.route(`${getEnv('apiBaseUrl')}/user`, async (route) => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(mockUser),
                });
            } else {
                // Don't allow any other requests to go through
                return route.abort();
            }
        });

        await page.route(`${getEnv('apiBaseUrl')}/user/progress/timeline/v2`, async (route) => {
            if (route.request().method() === 'POST') {
                postRequestBody = (await route
                    .request()
                    .postDataJSON()) as UpdateTimelineRequestBody;

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        ...mockUser,
                        progress: {
                            ...mockUser.progress,
                            [postRequestBody?.requirementId || '']: {
                                ...postRequestBody.progress,
                            },
                        },
                    }),
                });
            } else {
                return route.abort();
            }
        });

        // Mock timeline get route, and abort other timeline requests
        await page.route(`${getEnv('apiBaseUrl')}/public/user/*/timeline`, async (route) => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(mockTimeline),
                });
            }
        });

        // Abort access checks or the authenticated user will overwrite our mock
        await page.route(`${getEnv('apiBaseUrl')}/user/access/v2`, (route) => route.abort());

        // Navigate to the training plan
        await page.goto('/profile?view=progress');
        await page.getByTestId('Tactics-header').click();
    });

    test.afterEach(async ({ page }) => {
        await page.unrouteAll();
        postRequestBody = null;
    });

    test('ProgressHistory is correct when there is no history', async ({ page }) => {
        await page
            .getByTestId('No-History-training-plan-entry')
            .getByRole('button', { name: 'Update No History' })
            .click();
        await page.getByTestId('task-updater-show-history-button').click();

        await expect(page.getByText('You have no history for this requirement.')).toBeVisible();
        await expect(page.getByText('Total Count: 0. Current Cohort: 0')).toBeVisible();
        await expect(page.getByText('Total Time: 0h 0m. Current Cohort: 0h 0m')).toBeVisible();
    });

    test('ProgressHistory is correct when there is history', async ({ page }) => {
        await page
            .getByTestId('History-with-ProgressBar-training-plan-entry')
            .getByRole('button', { name: 'History with ProgressBar' })
            .click();
        await page.getByTestId('task-updater-show-history-button').click();

        await expect(page.getByRole('textbox', { name: 'Count' }).nth(0)).toHaveValue('30');
        await expect(page.getByRole('textbox', { name: 'Count' }).nth(1)).toHaveValue('20');
        await expect(page.getByRole('textbox', { name: 'Count' }).nth(2)).toHaveValue('5');

        await expect(page.getByRole('textbox', { name: 'Hours' }).nth(0)).toHaveValue('1');
        await expect(page.getByRole('textbox', { name: 'Hours' }).nth(1)).toHaveValue('0');
        await expect(page.getByRole('textbox', { name: 'Hours' }).nth(2)).toHaveValue('1');

        await expect(page.getByRole('textbox', { name: 'Minutes' }).nth(0)).toHaveValue('40');
        await expect(page.getByRole('textbox', { name: 'Minutes' }).nth(1)).toHaveValue('30');
        await expect(page.getByRole('textbox', { name: 'Minutes' }).nth(2)).toHaveValue('10');

        await expect(page.getByText('Total Count: 80. Current Cohort: 80')).toBeVisible();
        await expect(page.getByText('Total Time: 3h 20m. Current Cohort: 2h 10m')).toBeVisible();

        // The 'nonexistent task' does not appear. Only one with count 19.
        await expect(page.getByText('19', { exact: true })).not.toBeVisible();
    });

    test('Deleting tasks from progress history behaves correctly', async ({ page }) => {
        await page
            .getByTestId('History-with-ProgressBar-training-plan-entry')
            .getByRole('button', { name: 'History with ProgressBar' })
            .click();
        await page.getByTestId('task-updater-show-history-button').click();

        // Delete the second entry
        await page.getByTestId('task-history-delete-button').nth(1).click();

        // Verify that we've hidden the entry we want to delete. It's the only one with a count of 20
        await expect(page.getByText('20', { exact: true })).not.toBeVisible();

        // Save the changes, which will trigger a POST request to update the timeline
        await page.getByTestId('task-updater-save-button').click();

        // A POST request was made for the right requirement
        expect(postRequestBody).not.toBeNull();
        expect(postRequestBody?.requirementId).toBe('225f93fd-2ea9-4488-bbb9-9807981283f8');

        // Progress was synced to the new timeline
        expect(postRequestBody?.progress?.counts?.ALL_COHORTS).toBe(60);
        expect(postRequestBody?.progress?.minutesSpent?.['1400-1500']).toBe(100);
        expect(postRequestBody?.progress?.minutesSpent?.['1300-1400']).toBe(70);

        // A timeline entry was deleted
        expect(postRequestBody?.deleted?.length).toBe(1);

        // Subsequent timeline entries were updated to reflect the now-missing entry
        expect(postRequestBody?.updated?.[1]?.previousCount).toBe(30);
        expect(postRequestBody?.updated?.[1]?.newCount).toBe(60);
        expect(postRequestBody?.updated?.[1]?.minutesSpent).toBe(100);
        expect(postRequestBody?.updated?.[1]?.totalMinutesSpent).toBe(100);
    });
});
