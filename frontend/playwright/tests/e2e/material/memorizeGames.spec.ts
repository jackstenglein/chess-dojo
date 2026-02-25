import { expect, test } from '@playwright/test';
import { getEnv } from '../../../lib/env';
import { getBySel, useFreeTier } from '../../../lib/helpers';

test.describe('Memorize Games Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/material/memorizegames');
        // Wait for PGN selector to load
        await expect(getBySel(page, 'pgn-selector-item').first()).toBeVisible();
    });

    test('should have a game per cohort', async ({ page }) => {
        const count = await getBySel(page, 'pgn-selector-item').count();
        expect(count).toBe(getEnv('numCohorts'));
    });

    test('should switch between study/test mode', async ({ page }) => {
        await expect(page.getByText('Show Answer')).not.toBeVisible();

        // Test mode is a radio button, not a regular button
        await page.getByRole('radio', { name: 'Test' }).click();

        await expect(page.getByText('Show Answer')).toBeVisible();
    });

    test('should switch between games', async ({ page }) => {
        // Click different games from the PGN selector
        const items = getBySel(page, 'pgn-selector-item');
        const count = await items.count();
        if (count >= 2) {
            await items.nth(1).click();
            // Verify PGN text is visible (game changed)
            await expect(getBySel(page, 'pgn-text-move-button').first()).toBeVisible();
        }
    });
});

test.describe('Memorize Games Page (Free Tier)', () => {
    test.beforeEach(async ({ page }) => {
        await useFreeTier(page);
        await page.goto('/material/memorizegames');
        await expect(getBySel(page, 'pgn-selector-item').first()).toBeVisible();
    });

    test('should restrict free tier users', async ({ page }) => {
        await expect(getBySel(page, 'pgn-selector-item')).toHaveCount(3);
        await expect(getBySel(page, 'upsell-message')).toBeVisible();
    });
});
