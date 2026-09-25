import { expect, test } from '@playwright/test';
import { getEnv } from '../../../lib/env';

const user = {
    hasCreatedProfile: true,
    tutorials: { ScoreboardPage: true },
    username: 'privacy-test',
    displayName: 'Privacy Test',
    dojoCohort: '1200-1300',
    ratingSystem: 'CHESSCOM',
    ratings: {},
    progress: {},
    bio: '',
    subscriptionStatus: 'SUBSCRIBED',
    subscriptionTier: 'BASIC',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-07T00:00:00Z',
    timezoneOverride: 'DEFAULT',
    followerCount: 0,
    followingCount: 0,
    weekStart: 0,
};

test.beforeEach(async ({ page }) => {
    await page.route(`${getEnv('apiBaseUrl')}/user`, async (route) => {
        if (route.request().method() === 'GET') await route.fulfill({ json: user });
        else await route.abort();
    });
    await page.route(`${getEnv('apiBaseUrl')}/user/access/v2`, (route) => route.abort());
});

test('totals checkbox defaults off, follows visibility, and Cancel restores both settings', async ({
    page,
}) => {
    await page.goto('/profile/edit');
    const visibility = page.getByRole('combobox', { name: 'Training visibility' });
    const totals = page.getByRole('checkbox', {
        name: 'Show training time and Dojo points to everyone',
    });
    await expect(visibility).toHaveText('Public');
    await expect(totals).toHaveCount(0);
    await visibility.click();
    await page.getByRole('option', { name: 'Private', exact: true }).click();
    await expect(totals).not.toBeChecked();
    await totals.check();
    await visibility.click();
    await page.getByRole('option', { name: 'Public', exact: true }).click();
    await expect(totals).toHaveCount(0);
    await visibility.click();
    await page.getByRole('option', { name: 'Private', exact: true }).click();
    await expect(totals).toBeChecked();
    await page.getByRole('button', { name: 'Cancel', exact: true }).first().click();
    await expect(visibility).toHaveText('Public');
    await visibility.click();
    await page.getByRole('option', { name: 'Private', exact: true }).click();
    await expect(totals).not.toBeChecked();
});

for (const totals of [false, true]) {
    test(`profile hides detail tabs with shared totals ${totals}`, async ({ page }) => {
        await page.route(`${getEnv('apiBaseUrl')}/user/profile/other`, (route) =>
            route.fulfill({
                json: {
                    ...user,
                    username: 'other',
                    displayName: 'Other Player',
                    progress: undefined,
                    canViewTraining: false,
                    canViewTrainingTotals: totals,
                    ...(totals
                        ? { totalDojoScore: 42, minutesSpent: { ALL_COHORTS_ALL_TIME: 120 } }
                        : {}),
                },
            }),
        );
        await page.goto('/profile/other?view=progress');
        await expect(page.getByText('Other Player', { exact: true })).toBeVisible();
        await expect(
            page.getByRole('tabpanel').getByText("This user's training activity is private."),
        ).toBeVisible();
        if (totals) {
            await expect(page.getByText('Dojo points: 42', { exact: true })).toBeVisible();
            await expect(page.getByText('Training time: 2h', { exact: true })).toBeVisible();
            await expect(
                page.getByText('Training totals are shared. Training details are private.'),
            ).toBeVisible();
        } else {
            await expect(page.getByText('Dojo points: 42', { exact: true })).toHaveCount(0);
        }
        await page.getByRole('tab', { name: 'Activity', exact: true }).click();
        await expect(
            page.getByRole('tabpanel').getByText("This user's training activity is private."),
        ).toBeVisible();
    });
}

test('saves the totals preference and restores it on Cancel', async ({ page }) => {
    let saved = { ...user, trainingVisibility: 'PRIVATE', showTrainingTotals: false };
    let update: Record<string, unknown> = {};
    await page.route(`${getEnv('apiBaseUrl')}/user`, async (route) => {
        if (route.request().method() === 'PUT') {
            update = route.request().postDataJSON() as Record<string, unknown>;
            saved = { ...saved, ...update };
        }
        await route.fulfill({ json: saved });
    });
    await page.goto('/profile/edit');
    const totals = page.getByRole('checkbox', {
        name: 'Show training time and Dojo points to everyone',
    });
    await expect(totals).not.toBeChecked();
    await totals.check();
    await page.getByRole('button', { name: 'Save', exact: true }).first().click();
    await expect.poll(() => update.showTrainingTotals).toBe(true);
    await page.reload();
    await expect(totals).toBeChecked();
    await totals.uncheck();
    await page.getByRole('button', { name: 'Cancel', exact: true }).first().click();
    await expect(totals).toBeChecked();
});

test('stealth users participate in aggregate scoreboard rankings', async ({ page }) => {
    await page.route(`${getEnv('apiBaseUrl')}/scoreboard/dojo?**`, (route) =>
        route.fulfill({
            json: {
                data: [
                    {
                        ...user,
                        username: 'stealth',
                        displayName: 'Stealth Player',
                        progress: undefined,
                        canViewTraining: false,
                        canViewTrainingTotals: true,
                        totalDojoScore: 42,
                        minutesSpent: { ALL_COHORTS_ALL_TIME: 120 },
                    },
                    {
                        ...user,
                        username: 'visible',
                        displayName: 'Visible Player',
                        totalDojoScore: 20,
                    },
                    {
                        ...user,
                        username: 'hidden',
                        displayName: 'Hidden Player',
                        progress: undefined,
                        canViewTraining: false,
                        canViewTrainingTotals: false,
                    },
                ],
            },
        }),
    );
    await page.goto('/scoreboard/dojo');
    const grid = page.getByTestId('current-members-scoreboard');
    const stealth = grid.locator('[data-id="stealth"]');
    await expect(stealth).toBeVisible();
    await expect(stealth.locator('[data-field="rank"]')).toHaveText('1');
    await expect(stealth.locator('[data-field="totalDojoScore"]')).toHaveText('42');
    await expect(grid.locator('[data-id="hidden"] [data-field="rank"]')).toBeEmpty();
    await grid.getByRole('columnheader', { name: /^Dojo Score/ }).click();
    await grid.getByRole('columnheader', { name: /^Dojo Score/ }).click();
    await expect(stealth.locator('[data-field="nonDojoTime"]')).toHaveText('Private');
    await grid.locator('.MuiDataGrid-virtualScroller').evaluate((element) => {
        element.scrollLeft = 0;
    });
    await expect(stealth.locator('[data-field="rank"]')).toHaveText('2');
});
