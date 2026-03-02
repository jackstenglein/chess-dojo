import { expect, test } from '@playwright/test';

test.describe('Newsfeed Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/newsfeed');
    });

    test('loads when not a member of a club', async ({ page }) => {
        await expect(page.getByTestId('newsfeed-list').first()).toBeVisible();
    });
});
