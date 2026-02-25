import { expect, test } from '@playwright/test';
import { getBySel } from '../../../../lib/helpers';

test.describe('Position Explorer', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/games/1500-1600/2024.07.24_3a1711cf-5adb-44df-b97f-e2a6907f8842');
    });

    test('opens to dojo tab by default', async ({ page }) => {
        await getBySel(page, 'underboard-button-explorer').click();
        await expect(getBySel(page, 'explorer-tab-button-dojo')).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Dojo', selected: true })).toBeVisible();
    });

    test('opens other tabs', async ({ page }) => {
        await getBySel(page, 'underboard-button-explorer').click();

        await getBySel(page, 'explorer-tab-button-masters').click();
        await expect(page.getByRole('tab', { name: 'Masters', selected: true })).toBeVisible();

        await getBySel(page, 'explorer-tab-button-lichess').click();
        await expect(page.getByRole('tab', { name: 'Lichess', selected: true })).toBeVisible();

        await getBySel(page, 'explorer-tab-button-tablebase').click();
        await expect(page.getByRole('tab', { name: 'Tablebase', selected: true })).toBeVisible();
    });

    test('remembers last open tab', async ({ page }) => {
        await getBySel(page, 'underboard-button-explorer').click();
        await expect(page.getByRole('tab', { name: 'Dojo', selected: true })).toBeVisible();

        await getBySel(page, 'explorer-tab-button-masters').click({ force: true });
        await expect(page.getByRole('tab', { name: 'Masters', selected: true })).toBeVisible();

        await getBySel(page, 'underboard-button-tags').click();
        await expect(getBySel(page, 'explorer-tab-button-masters')).not.toBeVisible();

        await getBySel(page, 'underboard-button-explorer').click();
        await expect(page.getByRole('tab', { name: 'Masters', selected: true })).toBeVisible();
    });

    test('shows tablebase warning for more than 7 pieces', async ({ page }) => {
        await getBySel(page, 'underboard-button-explorer').click();
        await getBySel(page, 'explorer-tab-button-tablebase').click();

        await expect(
            page.getByText('Tablebase is only available for positions with 7 pieces or fewer'),
        ).toBeVisible();
    });
});
