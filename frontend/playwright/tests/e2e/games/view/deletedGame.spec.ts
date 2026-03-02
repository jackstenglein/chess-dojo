import { expect, test } from '@playwright/test';

test.describe('Deleted Game URL', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('shows 404 page when navigating to a deleted game URL', async ({ page }) => {
        await page.route('**/public/game/**', (route) =>
            route.fulfill({
                status: 404,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'Game not found' }),
            }),
        );

        await page.goto('/games/1200-1300/2022.06.28_fb475365-7f5b-4aa6-a69c-a4c8ec16f335');

        await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
        await expect(page.getByText('Resource not found')).toBeVisible();
    });
});
