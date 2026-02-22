import { expect, test as setup } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEnv } from '../../lib/env';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const authFile = path.join(__dirname, '../../.auth/user.json');

setup('authenticate', async ({ page }) => {
    const email = getEnv('email');
    const password = getEnv('password');

    console.debug(`Authenticating as: ${email}`);

    // Navigate directly to the signin page
    await page.goto('/signin');

    console.debug('On signin page, entering credentials...');

    // Fill in email/username
    const emailInput = page.getByRole('textbox', { name: 'Email' });
    await emailInput.fill(email);

    // Fill in password
    const passwordInput = page.getByRole('textbox', { name: 'Password' });
    await passwordInput.fill(password);

    // Click sign in button (use data-cy to avoid Google sign-in button)
    const signInButton = page.locator('[data-cy="signin-button"]');
    await signInButton.click();

    // Wait for navigation away from signin page
    await page.waitForURL((url) => !url.pathname.includes('signin'), { timeout: 30000 });

    // Navigate to profile to verify authentication
    await page.goto('/profile');
    await expect(page).toHaveURL('/profile', { timeout: 15000 });

    console.debug('Authentication successful, saving storage state');

    // Save storage state (cookies and localStorage)
    await page.context().storageState({ path: authFile });
});
