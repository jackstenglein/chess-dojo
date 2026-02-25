import { expect, test } from '@playwright/test';
import { getBySel } from '../../../lib/helpers';

test.describe('Newsfeed Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/newsfeed');
    });

    test('loads when not a member of a club', async ({ page }) => {
        await expect(getBySel(page, 'newsfeed-list').first()).toBeVisible();
    });
});
