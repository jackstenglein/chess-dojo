import { expect, test } from '@playwright/test';
import { getBySel } from '../../../lib/helpers';

test.describe('Model Games Tab', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/material/modelgames');
    });

    test('should display correct contents', async ({ page }) => {
        await expect(getBySel(page, 'cohort-select')).toBeVisible();
        await expect(getBySel(page, 'pgn-selector-item').first()).toBeVisible();
        await expect(page.locator('cg-board')).toBeVisible();
        await expect(getBySel(page, 'pgn-text')).toBeVisible();
        await expect(getBySel(page, 'player-header-header')).toBeVisible();
        await expect(getBySel(page, 'player-header-footer')).toBeVisible();
    });

    test('allows switching cohorts', async ({ page }) => {
        await getBySel(page, 'cohort-select').click();
        await page.getByText('1400-1500').click();
        await expect(getBySel(page, 'pgn-selector')).toContainText('Ben Wicks - Emma Williams');

        await getBySel(page, 'cohort-select').click();
        await page.getByText('1500-1600').click();
        await expect(getBySel(page, 'pgn-selector')).toContainText(
            'Clarke VandenHoven - Adithya Chitta',
        );
    });
});
