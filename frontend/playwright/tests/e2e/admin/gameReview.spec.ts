import { expect, test } from '@playwright/test';
import { interceptApi, useAdminUser } from '../../../lib/helpers';

const mockGameReviewCohortsResponse = {
    gameReviewCohorts: [
        {
            type: 'GAME_REVIEW_COHORT',
            id: 'cohort-1',
            name: 'Group A',
            discordChannelId: 'discord-1',
            members: {
                alice: {
                    username: 'alice',
                    displayName: 'Alice',
                    queueDate: '2025-01-01T00:00:00.000Z',
                    dojoCohort: '1200-1300',
                },
                bob: {
                    username: 'bob',
                    displayName: 'Bob',
                    queueDate: '2025-01-02T00:00:00.000Z',
                    dojoCohort: '1300-1400',
                },
            },
            peerReviewEventId: 'event-1',
            senseiReviewEventId: 'event-2',
        },
        {
            type: 'GAME_REVIEW_COHORT',
            id: 'cohort-2',
            name: 'Group B',
            discordChannelId: 'discord-2',
            members: {
                charlie: {
                    username: 'charlie',
                    displayName: 'Charlie',
                    queueDate: '2025-01-03T00:00:00.000Z',
                    dojoCohort: '1800-1900',
                },
            },
            peerReviewEventId: 'event-3',
            senseiReviewEventId: 'event-4',
        },
    ],
    unassignedUsers: [
        {
            username: 'dave',
            displayName: 'Dave',
            dojoCohort: '0-300',
            createdAt: '2025-01-04T00:00:00.000Z',
        },
    ],
    lectureUsers: [
        { username: 'eve', displayName: 'Eve', dojoCohort: '1500-1600' },
        { username: 'frank', displayName: 'Frank', dojoCohort: '800-900' },
        { username: 'grace', displayName: 'Grace', dojoCohort: '1500-1600' },
    ],
};

test.describe('Admin game review page', () => {
    test.beforeEach(async ({ page }) => {
        await useAdminUser(page);
        await interceptApi(page, 'GET', '/admin/game-review-cohorts', {
            statusCode: 200,
            body: mockGameReviewCohortsResponse,
        });
        await page.goto('/admin/game-review');
        // Wait for mocked cohort data to render before assertions
        await expect(page.locator('input[value="Group A"]')).toBeVisible();
    });

    test('displays game review cohort groups with member names', async ({ page }) => {
        const groupA = page
            .locator('.MuiCard-root')
            .filter({ has: page.locator('input[value="Group A"]') });
        const groupB = page
            .locator('.MuiCard-root')
            .filter({ has: page.locator('input[value="Group B"]') });

        await expect(page.locator('input[value="Group A"]')).toBeVisible();
        await expect(page.locator('input[value="Group B"]')).toBeVisible();
        await expect(groupA.getByRole('link', { name: 'Alice' })).toBeVisible();
        await expect(groupA.getByRole('link', { name: 'Bob' })).toBeVisible();
        await expect(groupB.getByRole('link', { name: 'Charlie' })).toBeVisible();
    });

    test('displays dojoCohort next to members', async ({ page }) => {
        const groupA = page
            .locator('.MuiCard-root')
            .filter({ has: page.locator('input[value="Group A"]') });
        const groupB = page
            .locator('.MuiCard-root')
            .filter({ has: page.locator('input[value="Group B"]') });

        await expect(groupA.getByText('(1200-1300)')).toBeVisible();
        await expect(groupA.getByText('(1300-1400)')).toBeVisible();
        await expect(groupB.getByText('(1800-1900)')).toBeVisible();
    });

    test('displays unassigned users section', async ({ page }) => {
        const unassigned = page.locator('.MuiCard-root').filter({ hasText: 'Unassigned Users' });

        await expect(unassigned.getByText('Unassigned Users')).toBeVisible();
        await expect(unassigned.getByRole('link', { name: 'Dave' })).toBeVisible();
    });

    test('displays Workshops Tier Users card', async ({ page }) => {
        const card = page.getByTestId('lecture-tier-card');
        await expect(card.getByText('Workshops Tier Users')).toBeVisible();
        await expect(card.getByRole('link', { name: 'Eve' })).toBeVisible();
        await expect(card.getByRole('link', { name: 'Frank' })).toBeVisible();
        await expect(card.getByRole('link', { name: 'Grace' })).toBeVisible();
    });

    test('groups lecture tier users by cohort with lower cohorts first', async ({ page }) => {
        const card = page.getByTestId('lecture-tier-card');
        const cohortLabels = card.getByText(/^\d+-\d+$/);

        await expect(cohortLabels.first()).toBeVisible();
        await expect
            .poll(async () => {
                const texts = await cohortLabels.allTextContents();
                return texts.indexOf('800-900') < texts.indexOf('1500-1600');
            })
            .toBe(true);
    });
});
