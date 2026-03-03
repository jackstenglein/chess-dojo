import { expect, test } from '@playwright/test';

test.describe('Share Tab Unauthenticated', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test.beforeEach(async ({ page }) => {
        await page.goto('/games/1200-1300/2022.06.28_fb475365-7f5b-4aa6-a69c-a4c8ec16f335');
    });

    test('opens sharing tab when unauthenticated', async ({ page }) => {
        await page.getByTestId('underboard-button-share').click();
        // Verify the share panel is visible by checking the button is pressed
        await expect(page.getByRole('button', { name: 'Share', pressed: true })).toBeVisible();
    });
});
