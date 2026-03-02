import { expect, test } from '@playwright/test';

test.describe('Model Games Tab', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/material/modelgames');
    });

    test('should display correct contents', async ({ page }) => {
        await expect(page.getByTestId('cohort-select')).toBeVisible();
        await expect(page.getByTestId('pgn-selector-item').first()).toBeVisible();
        await expect(page.locator('cg-board')).toBeVisible();
        await expect(page.getByTestId('pgn-text')).toBeVisible();
        await expect(page.getByTestId('player-header-header')).toBeVisible();
        await expect(page.getByTestId('player-header-footer')).toBeVisible();
    });

    test('allows switching cohorts', async ({ page }) => {
        await page.getByTestId('cohort-select').click();
        await page.getByText('1400-1500').click();
        await expect(page.getByTestId('pgn-selector')).toContainText('Ben Wicks - Emma Williams');

        await page.getByTestId('cohort-select').click();
        await page.getByText('1500-1600').click();
        await expect(page.getByTestId('pgn-selector')).toContainText(
            'Clarke VandenHoven - Adithya Chitta',
        );
    });
});
