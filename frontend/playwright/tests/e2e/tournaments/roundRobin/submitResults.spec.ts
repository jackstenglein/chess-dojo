import { expect, test } from '@playwright/test';
import { mockTournament } from './mockTournament';

const game = 'https://lichess.org/MGc8PuIR/black';

test.describe('Round-Robin Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('**/public/tournaments/round-robin**', async (route) => {
            const url = new URL(route.request().url());
            const status = url.searchParams.get('status');

            if (status === 'ACTIVE') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ tournaments: [mockTournament] }),
                });
            } else {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ tournaments: [] }),
                });
            }
        });

        await page.goto('/tournaments/round-robin');
    });

    test('shows error if confirm clicked without selecting opponent', async ({ page }) => {
        await page.route('**/tournaments/round-robin/submit-game', async (route) => {
            await route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({
                    message:
                        'No pairing found for this game. Make sure you play all games under the usernames in the tournament. Contact support if you are sure the game is correct.',
                }),
            });
        });

        const submitButton = page.getByRole('button', { name: 'Submit Game' });
        await submitButton.waitFor({ state: 'visible' });
        await submitButton.click();

        const submitDialog = page.getByRole('dialog');
        await submitDialog.waitFor({ state: 'visible' });

        const input = submitDialog.locator('input[type="text"]');
        await input.fill(game);

        const dialogSubmit = submitDialog.getByRole('button', { name: 'Submit' });
        await dialogSubmit.click();

        const mismatchDialog = page.getByRole('dialog', { name: 'Mismatch Detected' });
        await mismatchDialog.waitFor({ state: 'visible' });

        // Immediately click "Confirm" without selecting an opponent
        const confirmButton = mismatchDialog.getByRole('button', { name: 'Confirm' });
        await confirmButton.click();

        await expect(mismatchDialog.getByText('Must select an opponent.')).toBeVisible();
    });

    test('shows success when opponent is selected', async ({ page }) => {
        await page.route('**/tournaments/round-robin/submit-game', async (route) => {
            await route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({
                    message:
                        'No pairing found for this game. Make sure you play all games under the usernames in the tournament. Contact support if you are sure the game is correct.',
                }),
            });
        });

        const submitButton = page.getByRole('button', { name: 'Submit Game' });
        await submitButton.waitFor({ state: 'visible' });
        await submitButton.click();

        const submitDialog = page.getByRole('dialog');
        await submitDialog.waitFor({ state: 'visible' });

        const input = submitDialog.locator('input[type="text"]');
        await input.fill(game);

        const dialogSubmit = submitDialog.getByRole('button', { name: 'Submit' });
        await dialogSubmit.click();

        const mismatchDialog = page.getByRole('dialog', { name: 'Mismatch Detected' });
        await mismatchDialog.getByLabel('Select the correct opponent').click();
        await page.getByRole('option', { name: 'Shattered Nirvana' }).click();

        const confirmButton = mismatchDialog.getByRole('button', { name: 'Confirm' });
        await confirmButton.click();

        await expect(mismatchDialog).not.toBeVisible();
        await expect(submitDialog).not.toBeVisible();
        await expect(page.getByText('Game submitted')).toBeVisible();
    });
});
