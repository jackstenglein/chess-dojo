import { expect, test } from '@playwright/test';
import { containsAll, getBySel } from '../../../lib/helpers';

test.describe('Sparring Positions Tab', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/material/sparring');
        // Wait for requirements to load
        await expect(page.getByText('Middlegame Win Conversions')).toBeVisible();
    });

    test('should have correct sections', async ({ page }) => {
        const titles = [
            'Middlegame Win Conversions',
            'Middlegame Sparring',
            'Endgame Algorithms',
            'Endgame Win Conversions',
            'Endgame Sparring',
            'Rook Endgame Progression',
        ];

        await containsAll(page, titles);
    });

    test('should have sections collapsed by default', async ({ page }) => {
        await expect(page.getByText('Extra Queen')).not.toBeVisible();
    });

    test('should allow expanding sections', async ({ page }) => {
        await page.getByText('Middlegame Win Conversions').click();
        await page.getByText('600-700').click();

        await expect(page.getByText('Extra Queen')).toBeVisible();
        await expect(page.locator('cg-board')).toBeVisible();
    });

    test('should have buttons for copying', async ({ page }) => {
        await page.getByText('Middlegame Win Conversions').click();
        await page.getByText('600-700').click();

        await expect(getBySel(page, 'position-fen-copy')).toBeVisible();
        await expect(getBySel(page, 'position-challenge-url')).toBeVisible();
    });
});
