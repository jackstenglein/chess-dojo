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
    });

    test('displays game review cohort groups with member names', async ({ page }) => {
        await expect(page.getByText('Group A')).toBeVisible();
        await expect(page.getByText('Group B')).toBeVisible();
        await expect(page.getByText('Alice')).toBeVisible();
        await expect(page.getByText('Bob')).toBeVisible();
        await expect(page.getByText('Charlie')).toBeVisible();
    });

    test('displays dojoCohort next to members', async ({ page }) => {
        await expect(page.getByText('(1200-1300)')).toBeVisible();
        await expect(page.getByText('(1300-1400)')).toBeVisible();
        await expect(page.getByText('(1800-1900)')).toBeVisible();
    });

    test('displays unassigned users section', async ({ page }) => {
        await expect(page.getByText('Unassigned')).toBeVisible();
        await expect(page.getByText('Dave')).toBeVisible();
    });

    test('displays Lecture Tier Users card', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Lecture Tier Users' })).toBeVisible();
        await expect(page.getByText('Eve')).toBeVisible();
        await expect(page.getByText('Frank')).toBeVisible();
        await expect(page.getByText('Grace')).toBeVisible();
    });

    test('groups lecture tier users by cohort with lower cohorts first', async ({ page }) => {
        const card = page.getByTestId('lecture-tier-card');
        const cohortLabels = card.getByText(/^\d+-\d+$/);
        const texts = await cohortLabels.allTextContents();
        expect(texts.indexOf('800-900')).toBeLessThan(texts.indexOf('1500-1600'));
    });
});
