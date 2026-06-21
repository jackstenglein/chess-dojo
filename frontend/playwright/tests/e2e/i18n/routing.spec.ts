import { expect, test } from '@playwright/test';

test.describe('localePrefix: as-needed - unauthenticated', () => {
    // Run these routing tests without auth so bare-URL redirects are not
    // confounded by the authenticated-user redirect to /profile.
    test.use({ storageState: { cookies: [], origins: [] } });

    test('bare / stays bare for en-US Accept-Language (no cookie)', async ({ browser }) => {
        const context = await browser.newContext({
            locale: 'en-US',
            storageState: { cookies: [], origins: [] },
        });
        const page = await context.newPage();
        await page.goto('/');
        await expect(page).toHaveURL(/\/$/);
        await context.close();
    });

    test('bare / redirects to /de for de-DE Accept-Language (no cookie)', async ({ browser }) => {
        const context = await browser.newContext({
            locale: 'de-DE',
            storageState: { cookies: [], origins: [] },
        });
        const page = await context.newPage();
        await page.goto('/');
        await expect(page).toHaveURL(/\/de\/?$/);
        await context.close();
    });

    test('bare /profile redirects to bare landing for en-US (unauthenticated)', async ({
        browser,
    }) => {
        const context = await browser.newContext({
            locale: 'en-US',
            storageState: { cookies: [], origins: [] },
        });
        const page = await context.newPage();
        await page.goto('/profile');
        await expect(page).toHaveURL(/\/\?redirectUri=/);
        await context.close();
    });

    test('pseudo locale route renders on nonprod', async ({ page }) => {
        await page.goto('/pseudo');
        await expect(page).toHaveURL(/\/pseudo\/?$/);
        // The pseudo locale prepends "[T] " to translated strings.
        await expect(page.locator('body')).toContainText('[T]', { timeout: 15000 });
    });

    test('cookie-set locale is honoured on bare URL visit', async ({ page, context }) => {
        // Simulate a user who previously selected the pseudo locale.
        await context.addCookies([
            {
                name: 'locale',
                value: 'pseudo',
                domain: 'localhost',
                path: '/',
            },
        ]);
        await page.goto('/profile');
        // Cookie wins over Accept-Language; bare URL gets prefixed to /pseudo.
        await expect(page).toHaveURL(/\/pseudo([/?#]|$)/);
    });

    test('/en/profile permanently redirects to /profile', async ({ page }) => {
        const response = await page.context().request.get('/en/profile', {
            maxRedirects: 0,
        });
        expect(response.status()).toBe(308);
        expect(response.headers().location).toBe('/profile');
    });
});

test.describe('localePrefix: as-needed - authenticated', () => {
    // Uses the default storageState from playwright.config.ts (authenticated).

    test('bare /profile renders the authenticated profile page', async ({ page }) => {
        const response = await page.goto('/profile');
        expect(response?.status()).toBe(200);
        await expect(page).toHaveURL(/\/profile/);
    });

    test('unknown route under a valid locale returns 404', async ({ page }) => {
        // /fr/profile is not a registered locale; next-intl renders the
        // [locale]/not-found page. An unauthenticated user would be bounced
        // by the proxy, so this test must run authenticated.
        const response = await page.goto('/fr/profile');
        expect(response?.status()).toBe(404);
    });
});
