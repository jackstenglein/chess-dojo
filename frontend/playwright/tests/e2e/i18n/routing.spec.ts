import { Browser, BrowserContext, expect, test } from '@playwright/test';

/** A cookie-less English-browser context, so only the URL can pick the locale. */
async function newEnglishContext(browser: Browser): Promise<BrowserContext> {
    return browser.newContext({ locale: 'en-US', storageState: { cookies: [], origins: [] } });
}

/** The stored locale preference, if any. */
async function localeCookie(context: BrowserContext): Promise<string | undefined> {
    return (await context.cookies()).find((c) => c.name === 'locale')?.value;
}

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

test.describe('localePrefix: as-needed - locale cookie', () => {
    // A prefixed URL must not store a preference. Assert on cookies and URLs,
    // never on rendered text. All bundles ship to the client and translation
    // happens after hydration, so SSR HTML for /de differs from /en only by
    // lang and a token.
    test.use({ storageState: { cookies: [], origins: [] } });

    test('visiting a prefixed URL stores nothing', async ({ browser }) => {
        const context = await newEnglishContext(browser);
        const page = await context.newPage();
        await page.goto('/de/prices');
        expect(await localeCookie(context)).toBeUndefined();
        await context.close();
    });

    test('a bare URL after a prefixed visit stays bare', async ({ browser }) => {
        const context = await newEnglishContext(browser);
        const page = await context.newPage();
        await page.goto('/de/prices');
        await page.goto('/prices');
        // A /\/prices$/ regex would also accept /de/prices. The string is an exact match.
        await expect(page).toHaveURL('/prices');
        await context.close();
    });

    test('a stored preference still routes bare URLs', async ({ browser }) => {
        const context = await newEnglishContext(browser);
        await context.addCookies([{ name: 'locale', value: 'de', domain: 'localhost', path: '/' }]);
        const page = await context.newPage();
        await page.goto('/prices');
        await expect(page).toHaveURL('/de/prices');
        await context.close();
    });

    // Three different exits from proxy.ts: next-intl redirects the uppercase
    // prefix, the auth check redirects the unknown path, /pseudo is served as is.
    for (const path of ['/DE/prices', '/de/zzz-nonexistent-page', '/pseudo/prices']) {
        test(`${path} stores nothing`, async ({ browser }) => {
            const context = await newEnglishContext(browser);
            const page = await context.newPage();
            await page.goto(path);
            expect(await localeCookie(context)).toBeUndefined();
            await context.close();
        });
    }

    test('a request without Sec-Fetch-Dest stores nothing', async ({ browser }) => {
        // next-intl skips the cookie write when Sec-Fetch-Dest is present and not
        // "document", so browser prefetches never reach it. A client or CDN hop
        // without the header does.
        const context = await newEnglishContext(browser);
        const response = await context.request.get('/de/prices', {
            headers: { RSC: '1' },
            maxRedirects: 0,
        });
        const setCookie = response.headersArray().filter((h) => /^set-cookie$/i.test(h.name));
        expect(setCookie.filter((h) => h.value.startsWith('locale='))).toEqual([]);
        await context.close();
    });
});

test.describe('localePrefix: as-needed - authenticated', () => {
    // Uses the default storageState from playwright.config.ts (authenticated).

    test('bare /profile renders the authenticated profile page', async ({ page }) => {
        const response = await page.goto('/profile');
        expect(response?.status()).toBe(200);
        await expect(page).toHaveURL(/\/profile/);
    });

    test('route under an invalid locale returns 404', async ({ page }) => {
        // /zz/profile is not a registered locale; next-intl renders the
        // [locale]/not-found page. An unauthenticated user would be bounced
        // by the proxy, so this test must run authenticated.
        const response = await page.goto('/zz/profile');
        expect(response?.status()).toBe(404);
    });

    test('RequireProfile moves a prefixed URL to the profile language', async ({
        page,
        context,
    }) => {
        // RequireProfile writes the profile language (unset means English) to the
        // cookie. Read it, then visit a prefix that differs from it, so the
        // correction has to happen whatever the test account's setting is.
        await page.goto('/profile');
        await expect.poll(() => localeCookie(context)).toBeDefined();
        const preferred = (await localeCookie(context)) ?? 'en';
        const other = preferred === 'de' ? 'pseudo' : 'de';
        await page.goto(`/${other}/profile`);
        await expect(page).toHaveURL(preferred === 'en' ? '/profile' : `/${preferred}/profile`);
    });
});
