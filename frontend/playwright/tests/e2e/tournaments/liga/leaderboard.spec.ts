import { expect, test } from '@playwright/test';
import { getBySel, interceptApi, locatorContainsAll } from '../../../../lib/helpers';

test.describe('Leaderboard Tab', () => {
    test.beforeEach(async ({ page }) => {
        await interceptApi(
            page,
            'GET',
            '/public/tournaments/leaderboard?site=lichess.org&timePeriod=monthly&tournamentType=ARENA&timeControl=blitz',
            { fixture: 'tournaments/liga/leaderboardBlitzArenaMonthly.json' },
        );
        await interceptApi(
            page,
            'GET',
            '/public/tournaments/leaderboard?site=lichess.org&timePeriod=yearly&tournamentType=ARENA&timeControl=rapid',
            { fixture: 'tournaments/liga/leaderboardRapidArenaYearly.json' },
        );

        await page.goto('/tournaments/liga?type=leaderboard');
    });

    test('contains search options', async ({ page }) => {
        await expect(getBySel(page, 'time-control-selector')).toBeVisible();
        await expect(getBySel(page, 'tournament-type-selector')).toBeVisible();
        await expect(page.getByText('Monthly')).toBeVisible();
        await expect(page.getByText('Yearly')).toBeVisible();
    });

    test('contains correct columns', async ({ page }) => {
        const columns = ['Rank', 'Username', 'Rating', 'Score'];

        const leaderboard = getBySel(page, 'leaderboard');
        await expect(leaderboard.locator('.MuiDataGrid-columnHeader')).toHaveCount(columns.length);

        await locatorContainsAll(leaderboard, columns);
    });
});
