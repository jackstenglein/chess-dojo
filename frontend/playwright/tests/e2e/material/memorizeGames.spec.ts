import { expect, test } from '@playwright/test';
import { getEnv } from '../../../lib/env';
import { useFreeTier } from '../../../lib/helpers';

test.describe('Memorize Games Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/material/memorizegames');
        // Wait for PGN selector to load
        await expect(page.getByTestId('pgn-selector-item').first()).toBeVisible();
    });

    test('should have a game per cohort', async ({ page }) => {
        const count = await page.getByTestId('pgn-selector-item').count();
        expect(count).toBe(getEnv('numCohorts'));
    });

    test('should switch between study/test mode', async ({ page }) => {
        await expect(page.getByText('Show Answer')).not.toBeVisible();

        // Test mode is a radio button, not a regular button
        await page.getByRole('radio', { name: 'Test' }).click();

        await expect(page.getByText('Show Answer')).toBeVisible();
    });

    test('keeps the current game on screen while the next one loads', async ({ page }) => {
        const items = page.getByTestId('pgn-selector-item');
        test.skip((await items.count()) < 2, 'needs two games');
        const firstMove = page.getByTestId('pgn-text-move-button').first();
        await expect(firstMove).toBeVisible();

        await page.route(/\/public\/game\//, async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            await route.continue();
        });
        const loaded = page.waitForResponse(/\/public\/game\//);
        await items.nth(1).click();
        await page.waitForTimeout(300);

        // Mid-load: no spinner, the previous game still on the board.
        expect(await page.getByRole('progressbar').count()).toBe(0);
        expect(await page.getByTestId('chessground-board').isVisible()).toBe(true);
        expect(await firstMove.isVisible()).toBe(true);

        await loaded;
        await expect(items.nth(1).getByRole('button')).toHaveClass(/Mui-selected/);
        await expect(page.getByTestId('pgn-text-move-button').first()).toBeVisible();
    });

    test('should not reveal moves past the frontier via keyboard in test mode', async ({
        page,
    }) => {
        // window.d.ts imports chessground's Api from a package that is not installed.
        const getFen = () =>
            page.evaluate(() =>
                (window as unknown as { chessground: { getFen(): string } }).chessground.getFen(),
            );
        const startFen = await getFen();

        // Study mode first, to show the key reaches the board at all.
        await page.keyboard.press('ArrowRight');
        expect(await getFen()).not.toBe(startFen);
        await page.keyboard.press('ArrowLeft');
        expect(await getFen()).toBe(startFen);

        await page.getByRole('radio', { name: 'Test' }).click();
        await expect(page.getByText('Show Answer')).toBeVisible();

        // First variation falls back to the next mainline move.
        await page.keyboard.press('Shift+ArrowRight');
        expect(await getFen()).toBe(startFen);

        await page.keyboard.press('ArrowRight');
        expect(await getFen()).toBe(startFen);
    });

    test('should switch between games', async ({ page }) => {
        // Click different games from the PGN selector
        const items = page.getByTestId('pgn-selector-item');
        const count = await items.count();
        if (count >= 2) {
            await items.nth(1).click();
            // Verify PGN text is visible (game changed)
            await expect(page.getByTestId('pgn-text-move-button').first()).toBeVisible();
        }
    });
});

test.describe('Memorize Games Page (Free Tier)', () => {
    test.beforeEach(async ({ page }) => {
        await useFreeTier(page);
        await page.goto('/material/memorizegames');
        await expect(page.getByTestId('pgn-selector-item').first()).toBeVisible();
    });

    test('should restrict free tier users', async ({ page }) => {
        await expect(page.getByTestId('pgn-selector-item')).toHaveCount(3);
        await expect(page.getByTestId('upsell-message')).toBeVisible();
    });
});
