import { expect, test } from '@playwright/test';

test.describe('Position Explorer', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/games/1500-1600/2024.07.24_3a1711cf-5adb-44df-b97f-e2a6907f8842');
    });

    test('opens to dojo tab by default', async ({ page }) => {
        await page.getByTestId('underboard-button-explorer').click();
        await expect(page.getByTestId('explorer-tab-button-dojo')).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Dojo', selected: true })).toBeVisible();
    });

    test('opens other tabs', async ({ page }) => {
        await page.getByTestId('underboard-button-explorer').click();

        await page.getByTestId('explorer-tab-button-masters').click();
        await expect(page.getByRole('tab', { name: 'Masters', selected: true })).toBeVisible();

        await page.getByTestId('explorer-tab-button-lichess').click();
        await expect(page.getByRole('tab', { name: 'Lichess', selected: true })).toBeVisible();

        await page.getByTestId('explorer-tab-button-tablebase').click();
        await expect(page.getByRole('tab', { name: 'Tablebase', selected: true })).toBeVisible();
    });

    test('remembers last open tab', async ({ page }) => {
        await page.getByTestId('underboard-button-explorer').click();
        await expect(page.getByRole('tab', { name: 'Dojo', selected: true })).toBeVisible();

        await page.getByTestId('explorer-tab-button-masters').click({ force: true });
        await expect(page.getByRole('tab', { name: 'Masters', selected: true })).toBeVisible();

        await page.getByTestId('underboard-button-tags').click();
        await expect(page.getByTestId('explorer-tab-button-masters')).not.toBeVisible();

        await page.getByTestId('underboard-button-explorer').click();
        await expect(page.getByRole('tab', { name: 'Masters', selected: true })).toBeVisible();
    });

    test('shows tablebase warning for more than 7 pieces', async ({ page }) => {
        await page.getByTestId('underboard-button-explorer').click();
        await page.getByTestId('explorer-tab-button-tablebase').click();

        await expect(
            page.getByText('Tablebase is only available for positions with 7 pieces or fewer'),
        ).toBeVisible();
    });
});
