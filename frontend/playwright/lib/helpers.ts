import { expect, Locator, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEnv } from './env';

/**
 * Verify all texts exist on page.
 * Replaces Cypress cy.containsAll(['text1', 'text2'])
 */
export async function containsAll(page: Page, texts: string[]): Promise<void> {
    for (const text of texts) {
        await expect(page.getByText(text, { exact: false })).toBeVisible();
    }
}

/**
 * Verify all texts exist within a locator.
 */
export async function locatorContainsAll(locator: Locator, texts: string[]): Promise<void> {
    for (const text of texts) {
        await expect(locator.getByText(text, { exact: false })).toBeVisible();
    }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Mock an API endpoint with a fixture or response.
 */
export async function interceptApi(
    page: Page,
    method: string,
    urlPath: string,
    response: { fixture?: string; statusCode?: number; body?: unknown },
): Promise<void> {
    await page.route(`${getEnv('apiBaseUrl')}${urlPath}`, async (route) => {
        if (route.request().method() !== method.toUpperCase()) {
            await route.continue();
            return;
        }

        if (response.fixture) {
            await route.fulfill({
                path: path.join(__dirname, `../tests/fixtures/${response.fixture}`),
                contentType: 'application/json',
            });
        } else {
            await route.fulfill({
                status: response.statusCode ?? 200,
                contentType: 'application/json',
                body: JSON.stringify(response.body ?? {}),
            });
        }
    });
}

/**
 * Wait for navigation to complete after an action.
 * Useful for SPA navigation where URL changes.
 */
export async function waitForNavigation(
    page: Page,
    urlPattern: string | RegExp,
    options?: { timeout?: number },
): Promise<void> {
    await expect(page).toHaveURL(urlPattern, { timeout: options?.timeout ?? 15000 });
}

/**
 * Intercepts the /user API request to replace the subscription status field
 * in the response so that the current user is on the free tier.
 */
export async function useFreeTier(page: Page) {
    await page.route(`${getEnv('apiBaseUrl')}/user`, async (route) => {
        const response = await route.fetch();
        const body = (await response.json()) as object;
        await route.fulfill({
            response,
            contentType: 'application/json',
            body: JSON.stringify({
                ...body,
                subscriptionStatus: 'NOT_SUBSCRIBED',
            }),
        });
    });
    await page.route(`${getEnv('apiBaseUrl')}/user/access/v2`, (route) => route.abort());
}

/** Minimal user returned when the live /user fetch fails in admin tests. */
const fallbackAdminUser = {
    username: 'test-admin',
    displayName: 'Test Admin',
    subscriptionStatus: 'SUBSCRIBED',
    subscriptionTier: 'BASIC',
    dojoCohort: '1400-1500',
    isAdmin: true,
    isCalendarAdmin: false,
    isTournamentAdmin: false,
    hasCreatedProfile: true,
    progress: {},
    ratings: {},
    ratingSystem: 'CHESSCOM',
    createdAt: '2022-05-01T17:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    timezoneOverride: 'DEFAULT',
    timeFormat: '24',
    weekStart: 0,
};

/**
 * Intercepts the /user API request to add isAdmin: true so that admin-only
 * pages (e.g. blog editor) are accessible in tests.
 *
 * Falls back to a static admin user if the live API fetch fails, so tests do
 * not flake when Cognito tokens expire or the API is briefly unavailable.
 */
export async function useAdminUser(page: Page) {
    await page.route(`${getEnv('apiBaseUrl')}/user`, async (route) => {
        if (route.request().method() !== 'GET') {
            await route.continue();
            return;
        }

        try {
            const response = await route.fetch();
            if (!response.ok()) {
                throw new Error(`GET /user returned ${response.status()}`);
            }
            const body = (await response.json()) as object;
            await route.fulfill({
                response,
                contentType: 'application/json',
                body: JSON.stringify({
                    ...body,
                    isAdmin: true,
                }),
            });
        } catch {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(fallbackAdminUser),
            });
        }
    });
    await page.route(`${getEnv('apiBaseUrl')}/user/access/v2`, (route) => route.abort());
}
