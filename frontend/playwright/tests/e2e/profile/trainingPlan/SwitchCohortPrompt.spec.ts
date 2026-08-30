import { expect, Page, test } from '@playwright/test';
import { User } from 'src/database/user';
import { getEnv } from '../../../../lib/env';

/** Minimal user fields required for the training plan profile view. */
const baseUser = {
    username: 'test',
    subscriptionStatus: 'SUBSCRIBED',
    subscriptionTier: 'BASIC',
    displayName: 'Test Account',
    progress: {},
    isAdmin: false,
    isCalendarAdmin: false,
    isTournamentAdmin: false,
    createdAt: '2022-05-01T17:00:00Z',
    updatedAt: '2026-05-23T12:00:00Z',
    timezoneOverride: 'DEFAULT',
    timeFormat: '24',
    hasCreatedProfile: true,
    followerCount: 0,
    followingCount: 0,
    weekStart: 0,
};

/**
 * User on an outdated cohort with a Chess.com rating that maps to a different cohort
 * under the 2026 boundary tables.
 */
function createSwitchCohortUser(overrides: Record<string, unknown> = {}) {
    return {
        ...baseUser,
        ratingSystem: 'CHESSCOM',
        dojoCohort: '0-300',
        ratings: {
            CHESSCOM: {
                username: 'test',
                hideUsername: false,
                startRating: 525,
                currentRating: 525,
            },
        },
        ...overrides,
    };
}

function createLowRatingHistory(rating: number, days: number) {
    const history: { date: string; rating: number }[] = [];
    const now = new Date('2026-05-23T12:00:00Z');
    for (let i = 0; i < days; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        history.push({ date: date.toISOString(), rating });
    }
    return history;
}

/** User who should see the demotion snackbar instead of the new-cohort dialog. */
function createDemotionUser() {
    return {
        ...baseUser,
        ratingSystem: 'CHESSCOM',
        dojoCohort: '1400-1500',
        cohortVersion: '2026',
        ratings: {
            CHESSCOM: {
                username: 'test',
                hideUsername: false,
                startRating: 1500,
                currentRating: 1300,
            },
        },
        ratingHistories: {
            CHESSCOM: createLowRatingHistory(1300, 100),
        },
    };
}

async function mockUserRoute(
    page: Page,
    initialUser: Record<string, unknown>,
    options?: { onPut?: (body: Record<string, unknown>) => void },
) {
    let currentUser = initialUser;

    await page.route(`${getEnv('apiBaseUrl')}/user`, async (route) => {
        const method = route.request().method();
        if (method === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(currentUser),
            });
            return;
        }

        if (method === 'PUT') {
            const body = route.request().postDataJSON() as Record<string, unknown>;
            options?.onPut?.(body);
            currentUser = { ...currentUser, ...body };
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(currentUser),
            });
            return;
        }

        await route.abort();
    });

    await page.route(`${getEnv('apiBaseUrl')}/user/access/v2`, (route) => route.abort());
}

test.describe.skip('SwitchCohortPrompt - skipped until new cohorts are released', () => {
    test.afterEach(async ({ page }) => {
        await page.unrouteAll();
    });

    test.describe('new cohort switch dialog', () => {
        test('shows on the training plan when the user should switch cohorts', async ({ page }) => {
            await mockUserRoute(page, createSwitchCohortUser());
            await page.goto('/profile?view=progress');

            const dialog = page.getByRole('dialog', { name: 'New Cohorts Released' });
            await expect(dialog).toBeVisible();
            await expect(dialog).toContainText('recalculated the cohort ranges');
            await expect(dialog.getByRole('link', { name: 'help page' })).toBeVisible();
            await expect(dialog.getByRole('button', { name: 'Switch Cohorts' })).toBeVisible();
            await expect(dialog.getByRole('button', { name: 'Hide for 1 week' })).toBeVisible();
        });

        test('does not show when the user is already on the 2026 cohort version', async ({
            page,
        }) => {
            await mockUserRoute(page, createSwitchCohortUser({ cohortVersion: '2026' }));
            await page.goto('/profile?view=progress');

            await expect(
                page.getByRole('heading', { name: 'New Cohorts Released' }),
            ).not.toBeVisible();
        });

        test('does not show when the user has hidden the cohort prompt', async ({ page }) => {
            const hideUntil = new Date('2050-12-31T00:00:00Z').toISOString();
            await mockUserRoute(
                page,
                createSwitchCohortUser({
                    notificationSettings: {
                        siteNotificationSettings: {
                            disableGameComment: false,
                            disableGameCommentReplies: false,
                            disableNewFollower: false,
                            disableNewsfeedComment: false,
                            disableNewsfeedReaction: false,
                            disableCalendarInvite: false,
                            hideCohortPromptUntil: hideUntil,
                        },
                    },
                }),
            );
            await page.goto('/profile?view=progress');

            await expect(
                page.getByRole('heading', { name: 'New Cohorts Released' }),
            ).not.toBeVisible();
        });

        test('switch cohorts updates the user and closes the dialog', async ({ page }) => {
            await mockUserRoute(page, createSwitchCohortUser());
            await page.goto('/profile?view=progress');

            const dialog = page.getByRole('dialog', { name: 'New Cohorts Released' });
            await expect(dialog).toBeVisible();

            const newCohort = (await dialog.getByRole('strong').nth(1).textContent())?.trim();
            expect(newCohort).toBeTruthy();

            await dialog.getByRole('button', { name: 'Switch Cohorts' }).click();

            await expect(dialog).not.toBeVisible();
            await expect(page.locator('h5', { hasText: newCohort })).toBeVisible();
        });

        test('hide for 1 week updates notification settings and closes the dialog', async ({
            page,
        }) => {
            let newUser: User | undefined;
            await mockUserRoute(page, createSwitchCohortUser());
            await page.goto('/profile?view=progress');

            const responsePromise = page.waitForResponse(async (response) => {
                if (response.url().includes('/user') && response.request().method() === 'PUT') {
                    newUser = (await response.json()) as User;
                    return Boolean(
                        newUser?.notificationSettings?.siteNotificationSettings
                            ?.hideCohortPromptUntil,
                    );
                }
                return false;
            });
            const dialog = page.getByRole('dialog', { name: 'New Cohorts Released' });
            await dialog.getByRole('button', { name: 'Hide for 1 week' }).click();
            await responsePromise;

            await expect(dialog).not.toBeVisible();
            const hideUntil =
                newUser?.notificationSettings?.siteNotificationSettings?.hideCohortPromptUntil;
            expect(Date.parse(hideUntil ?? '')).toBeGreaterThan(Date.now());
        });
    });

    test.describe('demotion snackbar', () => {
        test('shows when the user should demote and is on the 2026 cohort version', async ({
            page,
        }) => {
            await mockUserRoute(page, createDemotionUser());
            await page.goto('/profile?view=progress');

            await expect(
                page.getByText(
                    "Your rating has been less than your cohort's minimum rating for 90 days",
                ),
            ).toBeVisible();
            await expect(page.getByRole('button', { name: 'Hide for 1 month' })).toBeVisible();
            await expect(
                page.getByRole('heading', { name: 'New Cohorts Released' }),
            ).not.toBeVisible();
        });

        test('hide for 1 month dismisses the demotion snackbar', async ({ page }) => {
            let putBody: Record<string, unknown> | undefined;
            await mockUserRoute(page, createDemotionUser(), {
                onPut: (body) => {
                    putBody = body;
                },
            });
            await page.goto('/profile?view=progress');

            const responsePromise = page.waitForResponse((response) => {
                return response.url().includes('/user') && response.request().method() === 'PUT';
            });
            await page.getByRole('button', { name: 'Hide for 1 month' }).click();
            await responsePromise;

            await expect(
                page.getByText(
                    "Your rating has been less than your cohort's minimum rating for 90 days",
                ),
            ).not.toBeVisible();

            const hideUntil = (
                putBody?.notificationSettings as {
                    siteNotificationSettings?: { hideCohortPromptUntil?: string };
                }
            )?.siteNotificationSettings?.hideCohortPromptUntil;
            expect(hideUntil).toBeTruthy();
        });

        test('switch cohorts from the demotion snackbar updates the user', async ({ page }) => {
            await mockUserRoute(page, createDemotionUser());
            await page.goto('/profile?view=progress');

            await page.getByRole('button', { name: 'Switch Cohorts' }).click();

            await expect(page.locator('h5', { hasText: '1100-1200' })).toBeVisible();
            await expect(
                page.getByText(
                    "Your rating has been less than your cohort's minimum rating for 90 days",
                ),
            ).not.toBeVisible();
        });
    });
});
