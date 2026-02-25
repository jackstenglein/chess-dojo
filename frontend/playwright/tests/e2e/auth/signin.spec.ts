import { expect, test } from '@playwright/test';
import { getEnv } from '../../../lib/env';
import { getBySel } from '../../../lib/helpers';

test.describe('Signin Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/signin');
    });

    test('has correct content', async ({ page }) => {
        await expect(getBySel(page, 'title')).toHaveText('ChessDojo');
    });

    test('should link to signup', async ({ page }) => {
        await getBySel(page, 'signup-button').click();
        await expect(page).toHaveURL('/signup');
    });

    test('should link to forgot password', async ({ page }) => {
        await getBySel(page, 'forgot-password-button').click();
        await expect(page).toHaveURL('/forgot-password');
    });

    test('has sign in with google button', async ({ page }) => {
        // Click the Google sign-in button - this redirects to Google OAuth
        await page.getByRole('button', { name: 'Sign in with Google' }).click();

        // Wait for redirect to Google's OAuth page
        await expect(page).toHaveURL(/accounts\.google\.com/);
    });

    test('requires email to submit form', async ({ page }) => {
        await page.locator('#password').fill('testpassword');
        await page.locator('[data-cy="signin-button"]').click();
        await expect(page.locator('#email-helper-text')).toHaveText('Email is required');
    });

    test('requires password to submit form', async ({ page }) => {
        await page.locator('#email').fill('test@email.com');
        await page.locator('[data-cy="signin-button"]').click();
        await expect(page.locator('#password-helper-text')).toHaveText('Password is required');
    });

    test('returns error for incorrect password', async ({ page }) => {
        await page.locator('#email').fill('test@email.com');
        await page.locator('#password').fill('testpassword');
        await page.locator('[data-cy="signin-button"]').click();
        await expect(page.locator('#password-helper-text')).toHaveText(
            'Incorrect email or password',
        );
    });

    test('logs in with correct credentials', async ({ page }) => {
        await page.locator('#email').fill(getEnv('email'));
        await page.locator('#password').fill(getEnv('password'));
        await page.locator('[data-cy="signin-button"]').click();
        await expect(page).toHaveURL('/profile');
    });
});
