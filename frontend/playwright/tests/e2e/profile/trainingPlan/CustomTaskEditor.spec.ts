import { expect, test } from '@playwright/test';
import { getEnv } from '../../../../lib/env';

test.describe('Custom Task Editor', () => {
    test(`Clicking 'Create Custom Task' button opens the Custom Task Editor`, async ({ page }) => {
        await page.goto('/profile?view=progress');
        await page.getByTestId('Tactics-header').click();
        await page.getByTestId('add-custom-task-button-Tactics').click();

        await expect(page.getByTestId('custom-task-name-input')).toBeVisible();
        await expect(page.getByTestId('custom-task-description-input')).toBeVisible();
        await expect(page.getByTestId('custom-task-starting-point-input')).toBeVisible();
        await expect(page.getByTestId('custom-task-goal-input')).toBeVisible();
        await expect(page.getByTestId('custom-task-goal-type-select')).toBeVisible();
        await expect(page.getByTestId('custom-task-reset-count-checkbox')).toBeVisible();
        await expect(page.getByTestId('custom-task-cancel-button')).toBeVisible();
        await expect(page.getByTestId('custom-task-submit-button')).toBeVisible();
    });

    test.describe('Input Validation', () => {
        test.beforeEach(async ({ page }) => {
            await page.route(`${getEnv('apiBaseUrl')}/user`, async (route) => {
                if (route.request().method() === 'GET') {
                    // Respond to 'GET' with a mock user
                    await route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({
                            username: 'test',
                            subscriptionStatus: 'SUBSCRIBED',
                            subscriptionTier: 'BASIC',
                            displayName: 'Test Account',
                            ratingSystem: 'CHESSCOM',
                            ratings: {},
                            dojoCohort: '1400-1500',
                            progress: {},
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
                            pinnedTasks: [],
                            weekStart: 0,
                        }),
                    });
                } else {
                    // Don't allow any other requests to go through
                    return route.abort();
                }
            });

            await page.goto('/profile?view=progress');
            await page.getByTestId('Tactics-header').click();
            await page.getByTestId('add-custom-task-button-Tactics').click();
        });

        test('Cannot define starting point without defining a goal', async ({ page }) => {
            await page
                .getByTestId('custom-task-starting-point-input')
                .getByRole('textbox')
                .fill('5');
            await page.getByTestId('custom-task-submit-button').click();

            await expect(page.getByText('Must be less than Goal')).toBeVisible();
        });

        test('Starting point must be less than goal', async ({ page }) => {
            await page.getByTestId('custom-task-goal-input').getByRole('textbox').fill('5');
            await page
                .getByTestId('custom-task-starting-point-input')
                .getByRole('textbox')
                .fill('10');
            await page.getByTestId('custom-task-submit-button').click();

            await expect(page.getByText('Must be less than Goal')).toBeVisible();
        });

        test('Starting point must be at least 0', async ({ page }) => {
            await page
                .getByTestId('custom-task-starting-point-input')
                .getByRole('textbox')
                .fill('-1');
            await page.getByTestId('custom-task-submit-button').click();

            await expect(page.getByText('Must be a positive integer or empty')).toBeVisible();
        });

        test('Starting point must be an integer', async ({ page }) => {
            await page.getByTestId('custom-task-goal-input').getByRole('textbox').fill('5');
            await page
                .getByTestId('custom-task-starting-point-input')
                .getByRole('textbox')
                .fill('1.5');
            await page.getByTestId('custom-task-submit-button').click();

            await expect(page.getByText('Must be a positive integer or empty')).toBeVisible();
        });

        test('Starting point must be a number', async ({ page }) => {
            await page.getByTestId('custom-task-goal-input').getByRole('textbox').fill('5');
            await page
                .getByTestId('custom-task-starting-point-input')
                .getByRole('textbox')
                .fill('abc');
            await page.getByTestId('custom-task-submit-button').click();

            await expect(page.getByText('Must be a positive integer or empty')).toBeVisible();
        });
    });
});
