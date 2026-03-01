import { expect, test } from '@playwright/test';

test.describe('Import Games Page - Position', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/games/import');
    });

    test('submits with default FEN', async ({ page }) => {
        await page.getByRole('button', { name: /Starting Position/ }).click();
        await expect(page).toHaveURL('/games/analysis');
    });

    test('prevents navigating away from unsaved analysis', async ({ page }) => {
        await page.getByRole('button', { name: /Starting Position/ }).click();
        await expect(page).toHaveURL('/games/analysis');

        await page.getByRole('link', { name: 'Training Plan' }).click();

        await expect(page.getByTestId('unsaved-analysis-nav-guard')).toBeVisible();
    });
});
