import { expect, test } from '@playwright/test';
import { interceptApi, locatorContainsAll } from '../../../../lib/helpers';

const fixedDate = new Date(2024, 5, 15);

test.describe('Leaderboard Tab', () => {
    test.beforeEach(async ({ page }) => {
        await page.clock.install({ time: fixedDate });
        await interceptApi(page, 'GET', '/public/tournaments/liga/2024-06', {
            fixture: 'tournaments/liga/dojoLigaLeaderboard.json',
        });

        await page.goto('/tournaments/liga?type=leaderboard');
    });

    test('contains month selector', async ({ page }) => {
        await expect(page.getByText('June 2024')).toBeVisible();
    });

    test('contains correct columns', async ({ page }) => {
        const columns = ['Rank', 'Username', 'Points', 'Tournaments'];

        const leaderboard = page.getByTestId('leaderboard');
        await locatorContainsAll(leaderboard, columns);
    });
});
