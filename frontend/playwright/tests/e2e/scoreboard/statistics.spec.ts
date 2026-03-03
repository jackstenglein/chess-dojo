import { expect, test } from '@playwright/test';

test.describe('Statistics Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/scoreboard/stats');
        await expect(page.getByTestId('chart-title').first()).toBeVisible();
    });

    test('has selector to change views', async ({ page }) => {
        await expect(page.getByTestId('scoreboard-view-selector')).toBeVisible();
    });

    test('has correct graphs', async ({ page }) => {
        const titles = [
            'Total Rating Change',
            'Average Rating Change',
            'Total Time Spent',
            'Average Time Spent',
            'Average Rating Change Per Hour',
            'Number of Graduations',
            'Average Time to Graduate',
            'Total Dojo Score',
            'Average Dojo Score',
            'Average Rating Change Per Dojo Point',
            'Participants',
            'Rating Systems',
        ];

        await expect(page.getByTestId('chart-title')).toHaveCount(titles.length);

        for (const title of titles) {
            await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
        }
    });
});
