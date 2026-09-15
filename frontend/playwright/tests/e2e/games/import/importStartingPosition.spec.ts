import { expect, test } from '@playwright/test';

test.describe('Import Games Page - Position', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/games/import');
    });

    test('submits with default FEN', async ({ page }) => {
        await page.getByRole('button', { name: /Starting Position/ }).click();

        await expect(page).toHaveURL(/\/games\/analysis(?:\?|$)/);
    });

    test('allows navigating away from analysis with five or fewer moves', async ({ page }) => {
        await page.getByRole('button', { name: /Starting Position/ }).click();
        await expect(page).toHaveURL(/\/games\/analysis(?:\?|$)/);

        await page.getByRole('link', { name: 'Training Plan' }).click();

        await expect(page).not.toHaveURL(/\/games\/analysis(?:\?|$)/);
    });

    test('guards navigation when move six starts', async ({ page }) => {
        await page.getByRole('button', { name: /^PGN/ }).click();
        await page
            .getByRole('textbox', { name: 'Paste PGN' })
            .fill('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1');
        await page.getByRole('button', { name: 'Import' }).click();

        await expect(page).toHaveURL(/\/games\/analysis(?:\?|$)/);

        await page.getByRole('link', { name: 'Training Plan' }).click();

        await expect(page.getByTestId('unsaved-analysis-nav-guard')).toBeVisible();
        await expect(page).toHaveURL(/\/games\/analysis(?:\?|$)/);
    });
});
