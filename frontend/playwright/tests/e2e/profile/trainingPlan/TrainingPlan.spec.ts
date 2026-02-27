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
});
