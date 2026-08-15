import { expect, test } from '@playwright/test';

test.describe('Info Tab', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tournaments/liga?type=info');
        // Wait for the page content to load
        await expect(page.getByText('Welcome to the DojoLiga')).toBeVisible();
    });

    test('has tab selector', async ({ page }) => {
        await page.getByTestId('tournaments-tab-list').getByText('Leaderboard').click();

        await expect(page).toHaveURL(/\/tournaments\/liga\?type=leaderboard/);
    });

    test('has correct content', async ({ page }) => {
        await expect(page.getByText('Welcome to the DojoLiga')).toBeVisible();
        await expect(page.getByText('Registration')).toBeVisible();
        await expect(page.getByText('Event Scoring')).toBeVisible();
    });

    test('links to Lichess team', async ({ page }) => {
        await expect(page.getByTestId('lichess-team-link')).toHaveAttribute(
            'href',
            'https://lichess.org/team/chessdojo',
        );
    });

    test('links to Chess.com team', async ({ page }) => {
        await expect(page.getByTestId('chesscom-team-link')).toHaveAttribute(
            'href',
            'https://www.chess.com/club/chessdojo',
        );
    });

    test('links to Discord server', async ({ page }) => {
        await expect(page.getByTestId('discord-invite-link')).toHaveAttribute(
            'href',
            'https://discord.gg/ehryScGMfP',
        );
    });
});
