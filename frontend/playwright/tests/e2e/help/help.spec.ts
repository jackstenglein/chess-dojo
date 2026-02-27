import { expect, test } from '@playwright/test';

test.describe('Help Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/help');
    });

    test('renders', async ({ page }) => {
        await expect(page.getByText('Help/FAQs')).toBeVisible();
    });

    test('requires all fields to submit support ticket', async ({ page }) => {
        await page.getByTestId('support-ticket-submit').click();

        await expect(page.getByTestId('support-ticket-name')).toContainText(
            'This field is required',
        );
        await expect(page.getByTestId('support-ticket-email')).toContainText(
            'This field is required',
        );
        await expect(page.getByTestId('support-ticket-subject')).toContainText(
            'This field is required',
        );
        await expect(page.getByTestId('support-ticket-message')).toContainText(
            'This field is required',
        );
    });

    // test('launches scoreboard tutorial', async ({ page }) => {
    //     await page.getByText('Launch Scoreboard Page Tutorial').click();

    //     await waitForNavigation(page, /\/scoreboard\//);
    //     await expect(page.getByTestId('tutorial-tooltip')).toBeVisible();
    // });

    // test('launches calendar tutorial', async ({ page }) => {
    //     await page.getByText('Launch Calendar Page Tutorial').click();

    //     await waitForNavigation(page, '/calendar');
    //     await expect(page.getByTestId('tutorial-tooltip')).toBeVisible();
    // });

    // test('launches games tutorial', async ({ page }) => {
    //     await page.getByText('Launch Games Page Tutorial').click();

    //     await waitForNavigation(page, '/games');
    //     await expect(page.getByTestId('tutorial-tooltip')).toBeVisible();
    // });
});
