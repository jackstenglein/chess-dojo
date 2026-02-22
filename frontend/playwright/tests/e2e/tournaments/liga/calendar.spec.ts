import { expect, test } from '@playwright/test';
import { getBySel, interceptApi } from '../../../../lib/helpers';
import { dateMapper, Event } from '../../../../lib/utils';
import { events } from './events';

test.describe('Calendar Tab', () => {
    test.beforeEach(async ({ page }) => {
        for (const event of events as Event[]) {
            const startDate = event.startTime.slice(0, 10);
            const endDate = event.endTime.slice(0, 10);

            if (dateMapper[startDate]) {
                event.startTime = event.startTime.replace(startDate, dateMapper[startDate]);
            }
            if (dateMapper[endDate]) {
                event.endTime = event.endTime.replace(endDate, dateMapper[endDate]);
            }
        }

        await interceptApi(page, 'GET', '/calendar', {
            body: events,
        });

        await page.goto('/tournaments/liga?type=calendar');
        // Dismiss tutorial dialog if it appears
        const closeButton = page.locator('[role="alertdialog"] button').first();
        if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await closeButton.click();
        }
        // Wait for the calendar to load
        await expect(page.getByText('Hide Filters')).toBeVisible();
    });

    test('has tab selector', async ({ page }) => {
        await getBySel(page, 'tournaments-tab-list').getByText('Leaderboard').click();

        await expect(page).toHaveURL(/\/tournaments\/liga\?type=leaderboard/);
    });

    test('has correct filters', async ({ page }) => {
        await expect(page.locator('text=Timezone').first()).toBeVisible();
        await expect(
            page.getByRole('heading', { name: 'Time Controls', exact: true }),
        ).toBeVisible();
    });
});
