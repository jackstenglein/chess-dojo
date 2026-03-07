import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, '../../../fixtures/games/player-explorer');

const backendResponseChesscom = JSON.parse(
    fs.readFileSync(path.join(fixturesDir, 'backend-response-chesscom.json'), 'utf-8'),
);
const backendResponseLichess = JSON.parse(
    fs.readFileSync(path.join(fixturesDir, 'backend-response-lichess.json'), 'utf-8'),
);

/** Sets up a mock for the POST /explorer/player-opening-tree backend endpoint. Returns a call counter. */
async function mockBackendRoute(
    page: import('@playwright/test').Page,
    response: object,
    status = 200,
) {
    const callCount = { count: 0 };

    await page.route('**/explorer/player-opening-tree', (route) => {
        if (route.request().method() !== 'POST') {
            return route.fallback();
        }
        callCount.count++;
        return route.fulfill({
            status,
            contentType: 'application/json',
            body: JSON.stringify(response),
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
        await mockBackendRoute(page, backendResponseChesscom);
        await openPlayerTab(page);

        // The default source type is Chess.com — enter username and load
        await page.getByPlaceholder('Chess.com Username').fill('testuser');
        await page.getByRole('button', { name: 'Load Games' }).click();

        // Wait for the tree to load (Clear Data appears when the tree is set)
        await expect(page.getByRole('button', { name: 'Clear Data' })).toBeVisible({
            timeout: 15000,
        });

        // Opening tree should render with move rows (e4 is the most common move in the fixture)
        await expect(page.getByTestId('explorer-tab-player')).toBeVisible();
        await expect(page.getByRole('cell', { name: /e4/ })).toBeVisible();
    });

    test('loads Lichess games and displays opening tree', async ({ page }) => {
        await mockBackendRoute(page, backendResponseLichess);
        await openPlayerTab(page);

        // Switch source type to Lichess
        await page.getByRole('button', { name: 'Lichess' }).click();
        await page.getByPlaceholder('Lichess Username').fill('testplayer');
        await page.getByRole('button', { name: 'Load Games' }).click();

        // Wait for the tree to load
        await expect(page.getByRole('button', { name: 'Clear Data' })).toBeVisible({
            timeout: 15000,
        });

        // Opening tree should render with moves
        await expect(page.getByTestId('explorer-tab-player')).toBeVisible();
        await expect(page.getByRole('cell', { name: /e4/ })).toBeVisible();
    });

    test('filters by color without making new API calls', async ({ page }) => {
        const callCount = await mockBackendRoute(page, backendResponseChesscom);
        await openPlayerTab(page);

        await page.getByPlaceholder('Chess.com Username').fill('testuser');
        await page.getByRole('button', { name: 'Load Games' }).click();

        // Wait for load to complete
        await expect(page.getByRole('button', { name: 'Clear Data' })).toBeVisible({
            timeout: 15000,
        });

        const apiCallsAfterLoad = callCount.count;

        // Open filters and change color to Black
        await page.getByText('Filters').click();
        await page.getByRole('radio', { name: 'Black' }).click();

        // Wait a moment for the tree to re-render with the filter applied
        await page.waitForTimeout(500);

        // The tree should still be visible (re-filtered, not re-fetched)
        await expect(page.getByTestId('explorer-tab-player')).toBeVisible();

        // No new API calls should have been made
        expect(callCount.count).toBe(apiCallsAfterLoad);
    });

    test('displays error when backend request fails', async ({ page }) => {
        await mockBackendRoute(page, { message: 'Internal server error' }, 500);
        await openPlayerTab(page);

        await page.getByPlaceholder('Chess.com Username').fill('nonexistentuser12345');
        await page.getByRole('button', { name: 'Load Games' }).click();

        // The backend returns an error — the frontend should display an error alert
        await expect(page.getByText('Failed to load games. Please try again.')).toBeVisible({
            timeout: 15000,
        });

        // The move table should not contain any actual moves
        await expect(page.getByRole('cell', { name: /e4/ })).not.toBeVisible();
        await expect(page.getByRole('cell', { name: /d4/ })).not.toBeVisible();
    });

    test('displays empty tree for unknown username', async ({ page }) => {
        // Backend returns successfully but with an empty tree (user has no games)
        await mockBackendRoute(page, { positions: {}, games: {} });
        await openPlayerTab(page);

        await page.getByPlaceholder('Chess.com Username').fill('nonexistentuser12345');
        await page.getByRole('button', { name: 'Load Games' }).click();

        // The tree loads but is empty — Clear Data should appear
        await expect(page.getByRole('button', { name: 'Clear Data' })).toBeVisible({
            timeout: 15000,
        });

        // The move table should not contain any actual moves
        await expect(page.getByRole('cell', { name: /e4/ })).not.toBeVisible();
        await expect(page.getByRole('cell', { name: /d4/ })).not.toBeVisible();
    });
});
