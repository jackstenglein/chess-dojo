import { expect, test } from '@playwright/test';
import { getEnv } from '../../../../lib/env';

test.describe('Training Plan', () => {
    test('displays task updater', async ({ page }) => {
        await page.goto('/profile?view=progress');
        await page.getByTestId('update-task-button').first().click();

        await expect(page.getByTestId('task-updater-save-button')).toBeVisible();
    });

    test('displays pinned tasks from other cohorts in today', async ({ page }) => {
        await page.route(`${getEnv('apiBaseUrl')}/user`, async (route) => {
            if (route.request().method() !== 'GET') {
                return route.abort();
            }

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
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
                    dojoCohort: '1400-1500',
                    progress: {
                        '053582c8-0da9-4d4d-8f19-c0fd5bce154d': {
                            requirementId: '053582c8-0da9-4d4d-8f19-c0fd5bce154d',
                            counts: { ALL_COHORTS: 1 },
                            minutesSpent: { '1400-1500': 50 },
                            updatedAt: '2025-08-26T00:21:15Z',
                        },
                        '38f46441-7a4e-4506-8632-166bcbe78baf': {
                            requirementId: '38f46441-7a4e-4506-8632-166bcbe78baf',
                            counts: { '1400-1500': 1 },
                            minutesSpent: { '1400-1500': 300 },
                            updatedAt: '2025-09-10T18:14:39Z',
                        },
                        '7269ee4f-991e-4b6a-b34b-46c2c00f3424': {
                            requirementId: '7269ee4f-991e-4b6a-b34b-46c2c00f3424',
                            counts: {},
                            minutesSpent: {},
                            updatedAt: '2025-09-10T18:01:17Z',
                        },
                        'f815084f-b9bc-408d-9db9-ba9b1c260ff3': {
                            requirementId: 'f815084f-b9bc-408d-9db9-ba9b1c260ff3',
                            counts: { ALL_COHORTS: 306 },
                            minutesSpent: { '1400-1500': 50 },
                            updatedAt: '2025-08-25T16:21:24Z',
                        },
                    },
                    isAdmin: false,
                    isCalendarAdmin: false,
                    isTournamentAdmin: false,
                    createdAt: '2022-05-01T17:00:00Z',
                    updatedAt: '2025-09-12T20:41:37Z',
                    timezoneOverride: 'DEFAULT',
                    timeFormat: '24',
                    hasCreatedProfile: true,
                    followerCount: 4,
                    followingCount: 1,
                    lastFetchedNewsfeed: '2025-03-09T18:37:38Z',
                    referralSource: 'Reddit',
                    totalDojoScore: 2,
                    pinnedTasks: [
                        'd18d2b74-c11c-4466-9378-d1510e137cb3',
                        'e4aeaebb-5cc2-47fa-9698-dc52a1d0603a',
                        '7893c680-2327-426e-8df6-f4d23f7b8baa',
                    ],
                    weekStart: 0,
                }),
            });
        });
        await page.route(`${getEnv('apiBaseUrl')}/user/access/v2`, (route) => route.abort());

        await page.goto('/profile?view=progress');
        await expect(
            page.getByTestId('training-plan-today').getByText('Read Tal-Botvinnik 1960').first(),
        ).toBeVisible();
    });

    test.describe('Custom Tasks', () => {
        test.beforeEach(async ({ page }) => {
            await page.route(`${getEnv('apiBaseUrl')}/user`, async (route) => {
                if (route.request().method() !== 'GET') {
                    return route.abort();
                }

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
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
                                id: '8d90bed6-999a-45bd-a734-1529df933680',
                                name: 'No Min Goal',
                                numberOfCohorts: 1,
                                owner: '',
                                progressBarSuffix: 'Pages',
                                scoreboardDisplay: 'PROGRESS_BAR',
                                updatedAt: '2026-02-27T17:26:30.731Z',
                            },
                            {
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
                                id: '30011da1-11eb-4d1b-a0a9-0efe146ef835',
                                name: '0 Min Goal',
                                numberOfCohorts: 1,
                                owner: '',
                                progressBarSuffix: 'Pages',
                                scoreboardDisplay: 'PROGRESS_BAR',
                                startCount: 0,
                                updatedAt: '2026-02-27T17:26:30.731Z',
                            },
                            {
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
                                id: '65006c33-349d-4774-a03b-14c7e3f42abf',
                                name: 'Nonzero Min Goal',
                                numberOfCohorts: 1,
                                owner: '',
                                progressBarSuffix: 'Pages',
                                scoreboardDisplay: 'PROGRESS_BAR',
                                startCount: 25,
                                updatedAt: '2026-02-27T17:26:30.731Z',
                            },
                            {
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
                                id: '225f93fd-2ea9-4488-bbb9-9807981283f8',
                                name: 'Nonzero Min Goal with Progress',
                                numberOfCohorts: 1,
                                owner: '',
                                progressBarSuffix: 'Pages',
                                scoreboardDisplay: 'PROGRESS_BAR',
                                startCount: 25,
                                updatedAt: '2026-02-27T17:26:30.731Z',
                            },
                        ],
                        dojoCohort: '1400-1500',
                        progress: {
                            '225f93fd-2ea9-4488-bbb9-9807981283f8': {
                                counts: {
                                    ALL_COHORTS: 30,
                                },
                                minutesSpent: {
                                    '1400-1500': 0,
                                },
                                requirementId: '225f93fd-2ea9-4488-bbb9-9807981283f8',
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
                        pinnedTasks: [
                            '8d90bed6-999a-45bd-a734-1529df933680',
                            '30011da1-11eb-4d1b-a0a9-0efe146ef835',
                            '65006c33-349d-4774-a03b-14c7e3f42abf',
                            '225f93fd-2ea9-4488-bbb9-9807981283f8',
                        ],
                        weekStart: 0,
                    }),
                });
            });

            await page.route(`${getEnv('apiBaseUrl')}/user/access/v2`, (route) => route.abort());

            await page.goto('/profile?view=progress');
        });

        test('progress text starts at 0 for a custom task with no progress and no min goal', async ({
            page,
        }) => {
            await page.getByTestId('Tactics-header').click();

            await expect(page.getByTestId('No-Min-Goal-progress-text')).toHaveText('0 / 100');
        });

        test('progress text starts at 0 for a custom task with no progress and a min goal of 0', async ({
            page,
        }) => {
            await page.getByTestId('Tactics-header').click();

            await expect(page.getByTestId('0-Min-Goal-progress-text')).toHaveText('0 / 100');
        });

        test('progress text starts at min goal for a custom task with no progress', async ({
            page,
        }) => {
            await page.getByTestId('Tactics-header').click();

            await expect(page.getByTestId('Nonzero-Min-Goal-progress-text')).toHaveText('25 / 100');
        });

        test('progress text is correct for custom task with progress and a min goal', async ({
            page,
        }) => {
            await page.getByTestId('Tactics-header').click();

            await expect(
                page.getByTestId('Nonzero-Min-Goal-with-Progress-progress-text'),
            ).toHaveText('30 / 100');
        });
    });
});
