import { expect, test } from '@playwright/test';

test.describe('Landing Page (unauthenticated)', () => {
    // These tests run without authentication
    test.use({ storageState: { cookies: [], origins: [] } });

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('has correct content', async ({ page }) => {
        await expect(page.getByTestId('title')).toContainText('Got Mated?');
        await expect(page.getByTestId('title')).toContainText('Time to join ChessDojo!');
        await expect(page.getByTestId('subtitle')).toContainText(
            'A chess training plan for every level and a community to do it with.',
        );
        await expect(page.locator('img').first()).toBeVisible();
    });

    test('has sign up button', async ({ page }) => {
        await page.getByRole('link', { name: 'Join the Dojo' }).first().click();
        await expect(page).toHaveURL('/signup');
    });

    test('has explore button', async ({ page }) => {
        await page.getByRole('button', { name: 'Explore the Program' }).click();
        await expect(page).toHaveURL('/');
    });

    test('should redirect unauthenticated user to landing', async ({ page }) => {
        await page.goto('/profile');
        // URL may include redirectUri query param to remember intended destination
        await expect(page).toHaveURL(/^http:\/\/localhost:3000\/(\?redirectUri=.*)?$/);
    });
});

test.describe('Landing Page (authenticated)', () => {
    // This test runs with authentication (uses storageState from config)

    test('redirects authenticated user to profile', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveURL('/profile');
    });
});
