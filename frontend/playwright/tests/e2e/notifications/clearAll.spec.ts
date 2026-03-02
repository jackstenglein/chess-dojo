import { expect, test } from '@playwright/test';

const FAKE_NOTIFICATION = {
    id: 'GAME_COMMENT|2000-2100|test-game-id',
    type: 'GAME_COMMENT',
    updatedAt: '2026-01-01T00:00:00Z',
    count: 1,
    gameCommentMetadata: {
        cohort: '2000-2100',
        id: 'test-game-id',
        headers: { White: 'Alice', Black: 'Bob' },
    },
};

function mockNotifications(
    page: import('@playwright/test').Page,
    notifications: (typeof FAKE_NOTIFICATION)[] = [],
) {
    return page.route('**/user/notifications', (route) => {
        if (route.request().method() === 'GET') {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    notifications,
                    lastEvaluatedKey: '',
                }),
            });
        }
        if (route.request().method() === 'DELETE') {
            return route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
        }
        return route.continue();
    });
}

test.describe('Clear All Notifications', () => {
    test('shows Clear All button on notifications page when notifications exist', async ({
        page,
    }) => {
        await mockNotifications(page, [FAKE_NOTIFICATION]);
        await page.goto('/notifications');

        await expect(page.getByRole('button', { name: 'Clear All' })).toBeVisible();
    });

    test('hides Clear All button on notifications page when no notifications exist', async ({
        page,
    }) => {
        await mockNotifications(page, []);
        await page.goto('/notifications');

        await expect(page.getByText('No notifications')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Clear All' })).not.toBeVisible();
    });

    test('clicking Clear All removes all notifications from the page', async ({ page }) => {
        await mockNotifications(page, [FAKE_NOTIFICATION]);
        await page.goto('/notifications');

        const clearAllButton = page.getByTestId('clear-all-notifications');
        await expect(clearAllButton).toBeVisible();
        await clearAllButton.click();

        await expect(page.getByText('No notifications')).toBeVisible({ timeout: 15000 });
        await expect(clearAllButton).not.toBeVisible();
    });

    test('dropdown shows Clear All above notifications when they exist', async ({ page }) => {
        await mockNotifications(page, [FAKE_NOTIFICATION]);
        await page.goto('/');

        const notificationButton = page.getByTestId('Notifications');
        await notificationButton.click();

        const menu = page.locator('#notifications-menu');
        await expect(menu).toBeVisible();
        await expect(menu.getByRole('button', { name: 'Clear All' })).toBeVisible();
    });

    test('dropdown hides Clear All when no notifications exist', async ({ page }) => {
        await mockNotifications(page, []);
        await page.goto('/');

        const notificationButton = page.getByTestId('Notifications');
        await notificationButton.click();

        const menu = page.locator('#notifications-menu');
        await expect(menu).toBeVisible();
        await expect(menu.getByText('No notifications')).toBeVisible();
        await expect(menu.getByRole('button', { name: 'Clear All' })).not.toBeVisible();
    });
});
