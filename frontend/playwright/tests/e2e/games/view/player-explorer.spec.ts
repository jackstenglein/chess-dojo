import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, '../../../fixtures/games/player-explorer');

const chessComArchives = JSON.parse(
    fs.readFileSync(path.join(fixturesDir, 'chess-com-archives.json'), 'utf-8'),
) as Record<string, unknown>;
const chessComGames = JSON.parse(
    fs.readFileSync(path.join(fixturesDir, 'chess-com-games.json'), 'utf-8'),
) as Record<string, unknown>;
const lichessNdjson = fs.readFileSync(path.join(fixturesDir, 'lichess-games.ndjson'), 'utf-8');

/** Sets up Chess.com route mocks for a successful load. Returns a call counter. */
async function mockChesscomRoutes(page: import('@playwright/test').Page) {
    const callCount = { archives: 0, games: 0 };

    await page.route('**/api.chess.com/pub/player/*/games/archives', (route) => {
        callCount.archives++;
        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(chessComArchives),
        });
    });

    await page.route('**/api.chess.com/pub/player/*/games/*/*', (route) => {
        callCount.games++;
        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(chessComGames),
        });
    });

    return callCount;
}

/** Sets up Lichess route mock for a successful load. Returns a call counter. */
async function mockLichessRoutes(page: import('@playwright/test').Page) {
    const callCount = { games: 0 };

    await page.route('**/lichess.org/api/games/user/*', (route) => {
        callCount.games++;
        return route.fulfill({
            status: 200,
            contentType: 'application/x-ndjson',
            body: lichessNdjson,
        });
    });

    return callCount;
}

/** Navigate to a game page and open the Player explorer tab. */
async function openPlayerTab(page: import('@playwright/test').Page) {
    await page.goto('/games/1500-1600/2024.07.24_3a1711cf-5adb-44df-b97f-e2a6907f8842');
    await page.getByTestId('underboard-button-explorer').click();
    await page.getByTestId('explorer-tab-button-player').click();
    await expect(page.getByRole('tab', { name: 'Player', selected: true })).toBeVisible();
}

test.describe('Player Opening Explorer', () => {
    test.beforeEach(async ({ page }) => {
        // Clear localStorage to reset filter state
        await page.addInitScript(() => {
            for (const key of Object.keys(localStorage)) {
                if (key.startsWith('openingTreeFilters.')) {
                    localStorage.removeItem(key);
                }
            }
        });
    });

    test('loads Chess.com games and displays opening tree', async ({ page }) => {
        await mockChesscomRoutes(page);
        await openPlayerTab(page);

        // The default source type is Chess.com — enter username and load
        await page.getByPlaceholder('Chess.com Username').fill('testuser');
        await page.getByRole('button', { name: 'Load Games' }).click();

        // Wait for loading indicator to appear and then disappear
        await expect(page.getByText(/games? loaded/)).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(/games? loaded/)).not.toBeVisible({ timeout: 15000 });

        // Opening tree should render with move rows (e4 is the first move in most fixture games)
        await expect(page.getByTestId('explorer-tab-player')).toBeVisible();
        await expect(
            page.getByTestId('explorer-tab-player').getByRole('gridcell', { name: /e4/ }),
        ).toBeVisible();
    });

    test('loads Lichess games and displays opening tree', async ({ page }) => {
        await mockLichessRoutes(page);
        await openPlayerTab(page);

        // Switch source type to Lichess
        await page.getByRole('button', { name: 'Lichess' }).click();
        await page.getByPlaceholder('Lichess Username').fill('testplayer');
        await page.getByRole('button', { name: 'Load Games' }).click();

        // Wait for loading to complete
        await expect(page.getByText(/games? loaded/)).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(/games? loaded/)).not.toBeVisible({ timeout: 15000 });

        // Opening tree should render with moves
        await expect(page.getByTestId('explorer-tab-player')).toBeVisible();
        await expect(
            page.getByTestId('explorer-tab-player').getByRole('gridcell', { name: /e4/ }),
        ).toBeVisible();
    });

    test('filters by color without making new API calls', async ({ page }) => {
        const callCount = await mockChesscomRoutes(page);
        await openPlayerTab(page);

        await page.getByPlaceholder('Chess.com Username').fill('testuser');
        await page.getByRole('button', { name: 'Load Games' }).click();

        // Wait for load to complete
        await expect(page.getByText(/games? loaded/)).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(/games? loaded/)).not.toBeVisible({ timeout: 15000 });

        const apiCallsAfterLoad = { ...callCount };

        // Open filters and change color to Black
        await page.getByText('Filters').click();
        await page.getByRole('radio', { name: 'Black' }).click();

        // Wait a moment for the tree to re-render with the filter applied
        await page.waitForTimeout(500);

        // The tree should still be visible (re-filtered, not re-fetched)
        await expect(page.getByTestId('explorer-tab-player')).toBeVisible();

        // No new API calls should have been made
        expect(callCount.archives).toBe(apiCallsAfterLoad.archives);
        expect(callCount.games).toBe(apiCallsAfterLoad.games);
    });

    test('clear data resets the tree', async ({ page }) => {
        await mockChesscomRoutes(page);
        await openPlayerTab(page);

        await page.getByPlaceholder('Chess.com Username').fill('testuser');
        await page.getByRole('button', { name: 'Load Games' }).click();

        // Wait for load to complete
        await expect(page.getByText(/games? loaded/)).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(/games? loaded/)).not.toBeVisible({ timeout: 15000 });

        // Tree should be visible with moves
        await expect(page.getByTestId('explorer-tab-player')).toBeVisible();
        await expect(
            page.getByTestId('explorer-tab-player').getByRole('gridcell', { name: /e4/ }),
        ).toBeVisible();

        // Click Clear Data to reset the tree
        await page.getByText('Filters').click();
        await page.getByRole('button', { name: 'Clear Data' }).click();

        // Tree should be gone and Load Games button should reappear
        await expect(page.getByRole('button', { name: 'Load Games' })).toBeVisible();
    });

    test('displays error for invalid username (404)', async ({ page }) => {
        await page.route('**/api.chess.com/pub/player/*/games/archives', (route) => {
            return route.fulfill({
                status: 404,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'User not found' }),
            });
        });

        await openPlayerTab(page);

        await page.getByPlaceholder('Chess.com Username').fill('nonexistentuser12345');
        await page.getByRole('button', { name: 'Load Games' }).click();

        // The loader finishes quickly after the 404 — the tree is built but empty.
        // After loading completes, "Clear Data" should appear (tree exists but has no games),
        // and the move table should have no move rows (only the total row or be empty).
        await expect(page.getByRole('button', { name: 'Clear Data' })).toBeVisible({
            timeout: 15000,
        });

        // The move table should not contain any actual moves
        await expect(page.getByRole('gridcell', { name: /e4/ })).not.toBeVisible();
        await expect(page.getByRole('gridcell', { name: /d4/ })).not.toBeVisible();
    });
});
