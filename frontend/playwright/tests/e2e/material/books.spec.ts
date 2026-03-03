import { expect, test } from '@playwright/test';

test.describe('Books Tab', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/material/books');
    });

    test('should have correct sections', async ({ page }) => {
        await expect(
            page.getByRole('heading', { name: 'Main Recommendations' }).first(),
        ).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Tactics' }).first()).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Endgames' }).first()).toBeVisible();
    });

    test('should have cohort selector', async ({ page }) => {
        await expect(page.getByTestId('cohort-selector')).toBeVisible();
    });
});
