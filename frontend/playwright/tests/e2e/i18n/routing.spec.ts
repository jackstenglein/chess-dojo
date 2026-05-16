import { expect, test } from '@playwright/test';

test.describe('URL-prefixed locales - unauthenticated', () => {
    // Run these routing tests without auth so bare-URL redirects are not
    // confounded by the authenticated-user redirect to /profile.
    test.use({ storageState: { cookies: [], origins: [] } });

    test('bare / redirects to a locale-prefixed root', async ({ page }) => {
        await page.goto('/');
        // Chrome's default Accept-Language is en-US, so middleware should
        // redirect to /en. Accept /pseudo as a fallback in case the server
        // is running in pseudo-locale mode.
        await expect(page).toHaveURL(/\/(en|pseudo)\/?$/);
    });

    test('bare /profile redirects to /en/profile (unauthenticated user sees landing)', async ({
        page,
    }) => {
        await page.goto('/profile');
        // Middleware redirects /profile -> /en/profile; the page itself may
        // then redirect an unauthenticated user back to the root with a
        // redirectUri param. Either way the locale prefix /en must appear.
        await expect(page).toHaveURL(/\/(en|pseudo)([/?#]|$)/);
    });

    test('pseudo locale route renders on nonprod', async ({ page }) => {
        await page.goto('/pseudo');
        // The route should not redirect away from /pseudo.
        await expect(page).toHaveURL(/\/pseudo\/?$/);
        // The pseudo locale prepends "[T] " to translated strings, so the
        // page body should contain that prefix somewhere.
        await expect(page.locator('body')).toContainText('[T]', { timeout: 15000 });
    });

    test('cookie-set locale is honoured on bare URL visit', async ({ page, context }) => {
        // Simulate a user who previously selected the pseudo locale by
        // injecting the locale cookie that the picker writes.
        await context.addCookies([
            {
                name: 'locale',
                value: 'pseudo',
                domain: 'localhost',
                path: '/',
            },
        ]);
        await page.goto('/profile');
        // Middleware reads the cookie and prefixes with /pseudo instead of /en.
        await expect(page).toHaveURL(/\/pseudo([/?#]|$)/);
    });
});

test.describe('URL-prefixed locales - authenticated', () => {
    // Uses the default storageState from playwright.config.ts (authenticated).

    test('/en/profile passes through without redirect loop', async ({ page }) => {
        await page.goto('/en/profile');
        // An authenticated user visiting /en/profile should stay at
        // /en/profile (or /en/profile?... if the profile page adds params),
        // NOT get bounced back to /?redirectUri=... since they are logged in.
        await expect(page).toHaveURL(/\/en\/profile/);
    });

    test('unknown route under a valid locale returns 404', async ({ page }) => {
        // /fr/profile gets prefixed by next-intl to /en/fr/profile (fr is not
        // in SUPPORTED_LOCALES), which Next.js renders via [locale]/not-found.
        // An unauthenticated user would instead get bounced to the landing
        // with a redirectUri by the proxy, so this test must run authenticated.
        const response = await page.goto('/fr/profile');
        expect(response?.status()).toBe(404);
    });
});
