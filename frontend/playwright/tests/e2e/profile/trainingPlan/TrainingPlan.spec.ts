import { expect, Page, test } from '@playwright/test';
import { getEnv } from '../../../../lib/env';

/** Minimal user fields shared across training plan mocks. */
const baseUser = {
    username: 'test',
    subscriptionStatus: 'SUBSCRIBED',
    subscriptionTier: 'BASIC',
    displayName: 'Test Account',
    ratingSystem: 'CHESSCOM',
    ratings: {
        CHESSCOM: {
            username: 'test',
            hideUsername: false,
            startRating: 1971,
            currentRating: 2009,
        },
    },
    dojoCohort: '1400-1500',
    isAdmin: false,
    isCalendarAdmin: false,
    isTournamentAdmin: false,
    createdAt: '2022-05-01T17:00:00Z',
    updatedAt: '2026-02-27T19:26:30.731Z',
    timezoneOverride: 'DEFAULT',
    timeFormat: '24',
    hasCreatedProfile: true,
    followerCount: 4,
    followingCount: 1,
    lastFetchedNewsfeed: '2025-03-09T18:37:38Z',
    referralSource: 'Reddit',
    totalDojoScore: 2,
    weekStart: 0,
    cohortVersion: '2026',
};

const classicalGamesRequirement = {
    id: '38f46441-7a4e-4506-8632-166bcbe78baf',
    status: 'ACTIVE',
    category: 'Games',
    name: 'Play Classical Games',
    description: '',
    freeDescription: '',
    counts: { '1400-1500': 40 },
    startCount: 0,
    numberOfCohorts: 1,
    unitScore: 0,
    totalScore: 0,
    scoreboardDisplay: 'PROGRESS_BAR',
    progressBarSuffix: 'Games',
    updatedAt: '2025-01-01T00:00:00Z',
    sortPriority: '',
    expirationDays: -1,
    isFree: false,
    atomic: false,
    expectedMinutes: 0,
};

const talBotvinnikRequirement = {
    id: 'd18d2b74-c11c-4466-9378-d1510e137cb3',
    status: 'ACTIVE',
    category: 'Opening',
    name: 'Read Tal-Botvinnik 1960',
    description: '',
    freeDescription: '',
    // Counts only for another cohort so this appears via pinning, not the normal plan
    counts: { '1500-1600': 1 },
    startCount: 0,
    numberOfCohorts: 1,
    unitScore: 0,
    totalScore: 0,
    scoreboardDisplay: 'CHECKBOX',
    progressBarSuffix: '',
    updatedAt: '2025-01-01T00:00:00Z',
    sortPriority: '',
    expirationDays: -1,
    isFree: false,
    atomic: false,
    expectedMinutes: 30,
};

const customTaskCounts = {
    '0-300': 100,
    '1000-1100': 100,
    '1100-1200': 100,
    '1200-1300': 100,
    '1300-1400': 100,
    '1400-1500': 100,
    '1500-1600': 100,
    '1600-1700': 100,
    '1700-1800': 100,
    '1800-1900': 100,
    '1900-2000': 100,
    '2000-2100': 100,
    '2100-2200': 100,
    '2200-2300': 100,
    '2300-2400': 100,
    '2400+': 100,
    '300-400': 100,
    '400-500': 100,
    '500-600': 100,
    '600-700': 100,
    '700-800': 100,
    '800-900': 100,
    '900-1000': 100,
};

function customTask(overrides: Record<string, unknown>) {
    return {
        category: 'Tactics',
        counts: customTaskCounts,
        description: '',
        numberOfCohorts: 1,
        owner: '',
        progressBarSuffix: 'Pages',
        scoreboardDisplay: 'PROGRESS_BAR',
        updatedAt: '2026-02-27T17:26:30.731Z',
        ...overrides,
    };
}

/**
 * Mock GET/PUT /user so weekly-plan autosaves do not abort and flake the UI.
 * Also blocks access checks that would overwrite the mock with the real user.
 */
async function mockUser(page: Page, initialUser: Record<string, unknown>) {
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
            currentUser = { ...currentUser, ...body };
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(currentUser),
            });
            return;
        }

        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.route(`${getEnv('apiBaseUrl')}/user/access/v2`, (route) => route.abort());
}

async function mockRequirements(page: Page, requirements: unknown[]) {
    await page.route(`${getEnv('apiBaseUrl')}/requirements/*`, async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ requirements, lastEvaluatedKey: '' }),
        });
    });
}

async function mockEmptyTimeline(page: Page) {
    await page.route(`${getEnv('apiBaseUrl')}/user/*/timeline`, async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ entries: [], lastEvaluatedKey: '' }),
        });
    });
}

async function gotoTrainingPlan(page: Page) {
    await page.goto('/profile?view=progress');
    await expect(page.getByTestId('training-plan-today')).toBeVisible();
}

test.describe('Training Plan', () => {
    test('displays task updater', async ({ page }) => {
        await mockUser(page, {
            ...baseUser,
            progress: {},
            pinnedTasks: ['65006c33-349d-4774-a03b-14c7e3f42abf'],
            customTasks: [
                customTask({
                    id: '65006c33-349d-4774-a03b-14c7e3f42abf',
                    name: 'Nonzero Min Goal',
                    startCount: 25,
                }),
            ],
        });
        await mockRequirements(page, [classicalGamesRequirement]);
        await mockEmptyTimeline(page);
        await gotoTrainingPlan(page);

        await page.getByTestId('update-task-button').first().click();
        await expect(page.getByTestId('task-updater-save-button')).toBeVisible();
    });

    test('shows Minimum Reached chip for completed minimum tasks', async ({ page }) => {
        await mockUser(page, {
            ...baseUser,
            progress: {
                '38f46441-7a4e-4506-8632-166bcbe78baf': {
                    requirementId: '38f46441-7a4e-4506-8632-166bcbe78baf',
                    counts: { ALL_COHORTS: 44 },
                    minutesSpent: { '1400-1500': 3000 },
                    updatedAt: '2025-09-10T18:14:39Z',
                },
            },
            totalDojoScore: 50,
            updatedAt: '2025-09-12T20:41:37Z',
        });
        await mockRequirements(page, [classicalGamesRequirement]);
        await mockEmptyTimeline(page);
        await gotoTrainingPlan(page);

        await expect(page.getByText('Full Training Plan').first()).toBeVisible();
        await page.getByTestId('Games-header').click();

        await expect(page.getByText('Minimum Reached').first()).toBeVisible();
        await expect(page.getByText(/44 \/ 40 min\./).first()).toBeVisible();
        await expect(page.getByTestId('update-task-button').first()).toBeVisible();
    });

    test('displays pinned tasks from other cohorts in today', async ({ page }) => {
        await mockUser(page, {
            ...baseUser,
            progress: {
                '053582c8-0da9-4d4d-8f19-c0fd5bce154d': {
                    requirementId: '053582c8-0da9-4d4d-8f19-c0fd5bce154d',
                    counts: { ALL_COHORTS: 1 },
                    minutesSpent: { '1400-1500': 50 },
                    updatedAt: '2025-08-26T00:21:15Z',
                },
            },
            pinnedTasks: [
                'd18d2b74-c11c-4466-9378-d1510e137cb3',
                'e4aeaebb-5cc2-47fa-9698-dc52a1d0603a',
                '7893c680-2327-426e-8df6-f4d23f7b8baa',
            ],
            updatedAt: '2025-09-12T20:41:37Z',
        });
        await mockRequirements(page, [classicalGamesRequirement, talBotvinnikRequirement]);
        await mockEmptyTimeline(page);
        await gotoTrainingPlan(page);

        await expect(
            page.getByTestId('training-plan-today').getByText('Read Tal-Botvinnik 1960').first(),
        ).toBeVisible();
    });

    test('displays correct progress text in daily card for task with min goal', async ({
        page,
    }) => {
        await mockUser(page, {
            ...baseUser,
            customTasks: [
                customTask({
                    id: '65006c33-349d-4774-a03b-14c7e3f42abf',
                    name: 'Nonzero Min Goal',
                    startCount: 25,
                    counts: { '1400-1500': 100 },
                }),
                customTask({
                    id: '225f93fd-2ea9-4488-bbb9-9807981283f8',
                    name: 'Nonzero Min Goal with Progress',
                    startCount: 25,
                    counts: { '1400-1500': 100 },
                }),
            ],
            progress: {
                '225f93fd-2ea9-4488-bbb9-9807981283f8': {
                    counts: { ALL_COHORTS: 30 },
                    minutesSpent: { '1400-1500': 10 },
                    requirementId: '225f93fd-2ea9-4488-bbb9-9807981283f8',
                    updatedAt: '2026-02-27T19:26:30.731Z',
                },
            },
            pinnedTasks: [
                '65006c33-349d-4774-a03b-14c7e3f42abf',
                '225f93fd-2ea9-4488-bbb9-9807981283f8',
            ],
        });
        // One cohort requirement so daily plan isLoading becomes false
        await mockRequirements(page, [classicalGamesRequirement]);
        await mockEmptyTimeline(page);
        await gotoTrainingPlan(page);

        const today = page.getByTestId('training-plan-today');
        await expect(today.getByText('0 / 75 pages completed')).toBeVisible();
        await expect(today.getByText('5 / 75 pages completed')).toBeVisible();
    });

    test('displays correct progress text in daily card for task with no min goal', async ({
        page,
    }) => {
        await mockUser(page, {
            ...baseUser,
            customTasks: [
                customTask({
                    id: '8d90bed6-999a-45bd-a734-1529df933680',
                    name: 'No Min Goal',
                    counts: { '1400-1500': 100 },
                }),
            ],
            progress: {},
            pinnedTasks: ['8d90bed6-999a-45bd-a734-1529df933680'],
        });
        await mockRequirements(page, [classicalGamesRequirement]);
        await mockEmptyTimeline(page);
        await gotoTrainingPlan(page);

        await expect(
            page.getByTestId('training-plan-today').getByText('0 / 100 pages completed'),
        ).toBeVisible();
    });

    test.describe('Custom Tasks', () => {
        test.beforeEach(async ({ page }) => {
            await mockUser(page, {
                ...baseUser,
                customTasks: [
                    customTask({
                        id: '8d90bed6-999a-45bd-a734-1529df933680',
                        name: 'No Min Goal',
                    }),
                    customTask({
                        id: '30011da1-11eb-4d1b-a0a9-0efe146ef835',
                        name: '0 Min Goal',
                        startCount: 0,
                    }),
                    customTask({
                        id: '65006c33-349d-4774-a03b-14c7e3f42abf',
                        name: 'Nonzero Min Goal',
                        startCount: 25,
                    }),
                    customTask({
                        id: '225f93fd-2ea9-4488-bbb9-9807981283f8',
                        name: 'Nonzero Min Goal with Progress',
                        startCount: 25,
                    }),
                ],
                progress: {
                    '225f93fd-2ea9-4488-bbb9-9807981283f8': {
                        counts: { ALL_COHORTS: 30 },
                        minutesSpent: { '1400-1500': 0 },
                        requirementId: '225f93fd-2ea9-4488-bbb9-9807981283f8',
                        updatedAt: '2026-02-27T19:26:30.731Z',
                    },
                },
                pinnedTasks: [
                    '8d90bed6-999a-45bd-a734-1529df933680',
                    '30011da1-11eb-4d1b-a0a9-0efe146ef835',
                    '65006c33-349d-4774-a03b-14c7e3f42abf',
                    '225f93fd-2ea9-4488-bbb9-9807981283f8',
                ],
            });
            await mockRequirements(page, [classicalGamesRequirement]);
            await mockEmptyTimeline(page);
            await gotoTrainingPlan(page);

            const tacticsHeader = page.getByTestId('Tactics-header');
            await expect(tacticsHeader).toBeVisible();
            await tacticsHeader.click();
            await expect(page.getByTestId('No-Min-Goal-progress-text')).toBeVisible();
        });

        test('progress text starts at 0 for a custom task with no progress and no min goal', async ({
            page,
        }) => {
            await expect(page.getByTestId('No-Min-Goal-progress-text')).toHaveText('0 / 100');
        });

        test('progress text starts at 0 for a custom task with no progress and a min goal of 0', async ({
            page,
        }) => {
            await expect(page.getByTestId('0-Min-Goal-progress-text')).toHaveText('0 / 100');
        });

        test('progress text starts at min goal for a custom task with no progress', async ({
            page,
        }) => {
            await expect(page.getByTestId('Nonzero-Min-Goal-progress-text')).toHaveText('25 / 100');
        });

        test('progress text is correct for custom task with progress and a min goal', async ({
            page,
        }) => {
            await expect(
                page.getByTestId('Nonzero-Min-Goal-with-Progress-progress-text'),
            ).toHaveText('30 / 100');
        });
    });
});
