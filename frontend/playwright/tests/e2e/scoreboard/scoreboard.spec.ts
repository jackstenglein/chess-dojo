import { expect, test } from '@playwright/test';
import { getBySel, locatorContainsAll, useFreeTier } from '../../../lib/helpers';

test.describe('Scoreboard Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/scoreboard');
        await page.waitForURL(/\/scoreboard\//);
    });

    test('redirects to cohort-specific scoreboard', async ({ page }) => {
        await expect(page).toHaveURL(/\/scoreboard\/\d+-\d+/);
    });

    test('has selector to change views', async ({ page }) => {
        await expect(getBySel(page, 'scoreboard-view-selector')).toBeVisible();
    });

    test('contains tables for current members and graduates', async ({ page }) => {
        await expect(getBySel(page, 'current-members-scoreboard')).toBeVisible();
        await expect(getBySel(page, 'graduates-scoreboard')).toBeVisible();
    });

    test('contains column groups', async ({ page }) => {
        await page.setViewportSize({ width: 15000, height: 660 });
        // Reload after viewport change to get all columns
        await page.reload();
        await expect(getBySel(page, 'current-members-scoreboard')).toBeVisible();

        const columnGroups = [
            'User Info',
            'Ratings',
            'Training Plan',
            'Time Spent',
            'Games + Analysis',
            'Tactics',
            'Middlegames + Strategy',
            'Endgame',
            'Opening',
        ];
        for (const col of columnGroups) {
            await expect(
                getBySel(page, 'current-members-scoreboard').getByText(col, { exact: true }),
            ).toBeVisible();
        }
    });

    test('contains default columns', async ({ page }) => {
        await page.setViewportSize({ width: 15000, height: 660 });
        await page.reload();
        await expect(getBySel(page, 'current-members-scoreboard')).toBeVisible();

        const defaultColumns = [
            'Name',
            'Graduated',
            'Rating System',
            'Start Rating',
            'Current Rating',
            'Normalized Dojo Rating',
            'Dojo Score',
            'Percent Complete',
            'Cohort Tasks',
            'Last 7 Days',
            'Last 30 Days',
            'Last 90 Days',
            'Last 365 Days',
            'Non-Dojo',
        ];
        await locatorContainsAll(getBySel(page, 'current-members-scoreboard'), defaultColumns);
    });
});

test.describe('Scoreboard Page (Free Tier)', () => {
    test.beforeEach(async ({ page }) => {
        await useFreeTier(page);
        await page.goto('/scoreboard');
        await page.waitForURL(/\/scoreboard\//);
    });

    test('hides free-tier users', async ({ page }) => {
        await expect(
            getBySel(page, 'upsell-alert').getByRole('link', { name: 'View Options' }),
        ).toHaveAttribute('href', /\/prices\?redirect=\/scoreboard\//);
    });
});
