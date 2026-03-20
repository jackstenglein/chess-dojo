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
            id: '8d90bed6-999a-45bd-a734-1529df933680',
            name: 'No Min Goal',
        },
        {
            ...baseCustomTask,
            id: '30011da1-11eb-4d1b-a0a9-0efe146ef835',
            name: '0 Min Goal',
            startCount: 0,
        },
        {
            ...baseCustomTask,
            id: '65006c33-349d-4774-a03b-14c7e3f42abf',
            name: 'Nonzero Min Goal',
            startCount: 25,
        },
        {
            ...baseCustomTask,
            id: '225f93fd-2ea9-4488-bbb9-9807981283f8',
            name: 'Nonzero Min Goal with Progress',
            startCount: 25,
        },
        {
            ...baseCustomTask,
            id: '0238bb2d-15bf-444c-9da4-f57bc2183d6d',
            name: 'No min goal with progress',
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
        '0238bb2d-15bf-444c-9da4-f57bc2183d6d': {
            counts: {
                ALL_COHORTS: 30,
            },
            minutesSpent: {
                '1400-1500': 0,
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

test.describe('InputSlider', () => {
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

        // Abort access checks or the authenticated user will overwrite our mock
        await page.route(`${getEnv('apiBaseUrl')}/user/access/v2`, (route) => route.abort());

        // Navigate to the training plan
        await page.goto('/profile?view=progress');
        await page.getByTestId('Tactics-header').click();
    });

    test.afterEach(async ({ page }) => {
        await page.unrouteAll();
    });

    test('input autofills startCount when there is startCount but no progress', async ({
        page,
    }) => {
        await page
            .getByTestId('Nonzero-Min-Goal-training-plan-entry')
            .getByRole('button', { name: 'Update Nonzero Min Goal' })
            .click();

        await expect(page.getByRole('textbox', { name: 'Pages' })).toHaveValue('25');
    });

    test('left spinner starts grayed out at startCount (startCount exists)', async ({ page }) => {
        await page
            .getByTestId('Nonzero-Min-Goal-training-plan-entry')
            .getByRole('button', { name: 'Update Nonzero Min Goal' })
            .click();

        await expect(page.getByRole('button', { name: 'Decrement' })).toBeDisabled();
    });

    test('left spinner reenables when input is greater than startCount (startCount exists)', async ({
        page,
    }) => {
        await page
            .getByTestId('Nonzero-Min-Goal-training-plan-entry')
            .getByRole('button', { name: 'Update Nonzero Min Goal' })
            .click();

        const input = page.getByRole('textbox', { name: 'Pages' });
        await input.fill('30');
        await input.blur();

        await expect(page.getByRole('button', { name: 'Decrement' })).toBeEnabled();
    });

    test('left spinner grays out after changing input to startCount (startCount exists)', async ({
        page,
    }) => {
        await page
            .getByTestId('Nonzero-Min-Goal-with-Progress-training-plan-entry')
            .getByRole('button', { name: 'Update Nonzero Min Goal with Progress' })
            .click();

        const input = page.getByRole('textbox', { name: 'Pages' });
        await input.fill('25');
        await input.blur();

        await expect(page.getByRole('button', { name: 'Decrement' })).toBeDisabled();
    });

    test('left spinner grays out at 0 (startCount does not exist)', async ({ page }) => {
        await page
            .getByTestId('No-Min-Goal-training-plan-entry')
            .getByRole('button', { name: 'Update No Min Goal' })
            .click();

        await expect(page.getByRole('button', { name: 'Decrement' })).toBeDisabled();
    });

    test('input values smaller than startCount are overwritten on blur', async ({ page }) => {
        await page
            .getByTestId('Nonzero-Min-Goal-training-plan-entry')
            .getByRole('button', { name: 'Update Nonzero Min Goal' })
            .click();

        const input = page.getByRole('textbox', { name: 'Pages' });
        await input.fill('20');
        await input.blur();

        await expect(input).toHaveValue('25');
    });

    test('input values < progress count but >= than startCount are okay', async ({ page }) => {
        await page
            .getByTestId('Nonzero-Min-Goal-with-Progress-training-plan-entry')
            .getByRole('button', { name: 'Update Nonzero Min Goal with Progress' })
            .click();

        const input = page.getByRole('textbox', { name: 'Pages' });
        await input.fill('25');
        await input.blur();

        await expect(input).toHaveValue('25');

        await input.fill('27');
        await input.blur();

        await expect(input).toHaveValue('27');
    });

    test('input values smaller than 0 are overwritten on blur (no startCount)', async ({
        page,
    }) => {
        await page
            .getByTestId('No-Min-Goal-training-plan-entry')
            .getByRole('button', { name: 'Update No Min Goal' })
            .click();

        const input = page.getByRole('textbox', { name: 'Pages' });
        await input.fill('-1');
        await input.blur();

        await expect(input).toHaveValue('0');
    });

    test('input autofills 0 when there is no startCount and no progress', async ({ page }) => {
        await page
            .getByTestId('No-Min-Goal-training-plan-entry')
            .getByRole('button', { name: 'Update No Min Goal' })
            .click();

        await expect(page.getByRole('textbox', { name: 'Pages' })).toHaveValue('0');
    });

    test('input autofills progress count when there is progress', async ({ page }) => {
        await page
            .getByTestId('No-min-goal-with-progress-training-plan-entry')
            .getByRole('button', { name: 'Update No min goal with progress' })
            .click();

        await expect(page.getByRole('textbox', { name: 'Pages' })).toHaveValue('30');
    });

    test('inputs greater than goal are okay', async ({ page }) => {
        await page
            .getByTestId('Nonzero-Min-Goal-training-plan-entry')
            .getByRole('button', { name: 'Update Nonzero Min Goal' })
            .click();

        const input = page.getByRole('textbox', { name: 'Pages' });
        await input.fill('200');
        await input.blur();

        await expect(input).toHaveValue('200');
    });

    test('left spinner decrements input value by 1', async ({ page }) => {
        await page
            .getByTestId('Nonzero-Min-Goal-with-Progress-training-plan-entry')
            .getByRole('button', { name: 'Update Nonzero Min Goal with Progress' })
            .click();

        await page.getByRole('button', { name: 'Decrement' }).click();

        await expect(page.getByRole('textbox', { name: 'Pages' })).toHaveValue('29');
    });

    test('right spinner increments input value by 1', async ({ page }) => {
        await page
            .getByTestId('Nonzero-Min-Goal-with-Progress-training-plan-entry')
            .getByRole('button', { name: 'Update Nonzero Min Goal with Progress' })
            .click();

        await page.getByRole('button', { name: 'Increment' }).click();

        await expect(page.getByRole('textbox', { name: 'Pages' })).toHaveValue('31');
    });

    test('right spinner allows values greater than goal', async ({ page }) => {
        await page
            .getByTestId('Nonzero-Min-Goal-with-Progress-training-plan-entry')
            .getByRole('button', { name: 'Update Nonzero Min Goal with Progress' })
            .click();

        const input = page.getByRole('textbox', { name: 'Pages' });
        await input.fill('200');
        await input.blur();

        await page.getByRole('button', { name: 'Increment' }).click();

        await expect(page.getByRole('textbox', { name: 'Pages' })).toHaveValue('201');
    });

    test('normal inputs are not changed on blur', async ({ page }) => {
        await page
            .getByTestId('Nonzero-Min-Goal-with-Progress-training-plan-entry')
            .getByRole('button', { name: 'Update Nonzero Min Goal with Progress' })
            .click();

        const input = page.getByRole('textbox', { name: 'Pages' });
        await input.fill('50');
        await input.blur();

        await expect(input).toHaveValue('50');
    });
});
