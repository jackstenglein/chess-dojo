import { expect, Page, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEnv } from '../../../../lib/env';
import { verifyGame } from './helpers';

const testUrls = {
    lichessChapter: 'https://lichess.org/study/W67VW7nM/3wugVXBW',
    lichessStudy: 'https://lichess.org/study/W67VW7nM',
    lichessGame: 'https://lichess.org/mN1qj7pP/black',
    lichessGameNoColor: 'https://lichess.org/mN1qj7pP/',
    lichessChapterMissingData: 'https://lichess.org/study/W67VW7nM/lsJkNwwR',
    lichessGameFromPosition: 'https://lichess.org/XdWMCVrNX6No',
    chesscomAnalysisA: 'https://www.chess.com/a/2eUTHynZc2Jtfx?tab=analysis',
    chesscomAnalysisB: 'https://www.chess.com/analysis/game/pgn/3PQmunBaE2?tab=analysis',
    chesscomAnalysisGame: 'https://www.chess.com/analysis/game/live/108036079387?tab=review',
    chesscomGame: 'https://www.chess.com/game/live/107855985867',
    chesscomGameAlt: 'https://www.chess.com/live/game/107855985867',
    chesscomDailyGame: 'https://www.chess.com/game/daily/926728269?move=0',
};

async function importUrl(page: Page, url: string): Promise<void> {
    await page.getByRole('textbox', { name: /Lichess or Chess\.com URL/i }).fill(url);
    await page.getByRole('button', { name: 'Import' }).click();
    await expect(page).toHaveURL('/games/analysis');
}

test.describe('Import Games Page - Import Online Games', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/games/import');
        await page.getByRole('button', { name: /Online Game/ }).click();
    });

    test('Requires valid URL', async ({ page }) => {
        await page.getByRole('button', { name: 'Import' }).click();
        await expect(page.getByText('URL is required')).toBeVisible();

        await page
            .getByRole('textbox', { name: /Lichess or Chess\.com URL/i })
            .fill('hello, world!' + testUrls.lichessChapter);
        await page.getByRole('button', { name: 'Import' }).click();
        await expect(page.getByText('The provided URL is unsupported')).toBeVisible();
    });

    test('submits from Lichess chapter URL', async ({ page }) => {
        await importUrl(page, testUrls.lichessChapter);
        await verifyGame(page, {
            white: 'Test1',
            black: 'Test2',
            lastMove: 'e4',
            lastMoveEmt: '0',
        });
    });

    test('submits from Lichess game URL', async ({ page }) => {
        await importUrl(page, testUrls.lichessGame);
        await verifyGame(page, {
            white: 'Sokrates1975',
            black: 'bestieboots',
            lastMove: 'Rxd6#',
            lastMoveClock: {
                white: '0:17:37',
                black: '0:10:28',
            },
            lastMoveEmt: '00:17',
        });
    });

    test('submits from Lichess game URL without color', async ({ page }) => {
        await importUrl(page, testUrls.lichessGameNoColor);
        await verifyGame(page, {
            white: 'Sokrates1975',
            black: 'bestieboots',
            lastMove: 'Rxd6#',
            lastMoveClock: {
                white: '0:17:37',
                black: '0:10:28',
            },
            lastMoveEmt: '00:17',
        });
    });

    test('submits from a Lichess chapter URL with missing headers successfully', async ({
        page,
    }) => {
        await importUrl(page, testUrls.lichessChapterMissingData);
        await verifyGame(page, {
            lastMove: 'd4',
            lastMoveEmt: '0',
        });
    });

    test('submits from Chess.com game URL', async ({ page }) => {
        await importUrl(page, testUrls.chesscomGame);
        await verifyGame(page, {
            white: 'bestieboots',
            black: 'NVWV1',
            lastMove: 'Kxh4',
            lastMoveClock: {
                white: '0:04:14',
                black: '0:02:54',
            },
            lastMoveEmt: '00:00',
        });
    });

    test('submits from Chess.com game alternate URL', async ({ page }) => {
        await importUrl(page, testUrls.chesscomGameAlt);
        await verifyGame(page, {
            white: 'bestieboots',
            black: 'NVWV1',
            lastMove: 'Kxh4',
            lastMoveClock: {
                white: '0:04:14',
                black: '0:02:54',
            },
            lastMoveEmt: '00:00',
        });
    });

    test('submits from Chess.com annotations URL (type A)', async ({ page }) => {
        await importUrl(page, testUrls.chesscomAnalysisA);
        await verifyGame(page, {
            lastMove: 'Nxb6',
            lastMoveEmt: '0',
        });
    });

    test('submits from Chess.com annotations URL (type B)', async ({ page }) => {
        await importUrl(page, testUrls.chesscomAnalysisB);
        await verifyGame(page, {
            white: 'Test1',
            black: 'Test2',
            lastMove: 'e4',
            lastMoveEmt: '0',
        });
    });

    test('submits from Chess.com analysis URL', async ({ page }) => {
        await importUrl(page, testUrls.chesscomAnalysisGame);
        await verifyGame(page, {
            white: 'bestieboots',
            black: 'David71401',
            lastMove: 'Nf3',
            lastMoveClock: {
                white: '0:08:14',
                black: '0:09:05',
            },
            lastMoveEmt: '00:48',
        });
    });

    test('submits Chess.com daily game URL', async ({ page }) => {
        await importUrl(page, testUrls.chesscomDailyGame);
        await verifyGame(page, {
            white: 'JackStenglein',
            black: 'carson2626',
            lastMove: 'Nc5',
        });
    });

    test('submits from recent game', async ({ page }) => {
        // Click the first recent game button in the list
        const recentGameButton = page.getByTestId(/online-game-card-/).first();
        await recentGameButton.click();
        // Just verify we get to the analysis page - game content varies
        await expect(page).toHaveURL('/games/analysis');
    });

    test('submits Lichess game from position', async ({ page }) => {
        await importUrl(page, testUrls.lichessGameFromPosition);
        await verifyGame(page, {
            white: 'lwierenga',
            black: 'JackStenglein',
            lastMove: 'Rf4+',
            lastMoveClock: {
                white: '0:15:36',
                black: '0:10:24',
            },
            lastMoveEmt: '00:01',
            orientation: 'black',
        });
    });
});

/** User with Lichess + Chess.com usernames so Recent Games section loads */
const userWithOnlineRatings = {
    username: 'import-test-user',
    subscriptionStatus: 'SUBSCRIBED',
    displayName: 'Import Test User',
    ratingSystem: 'CHESSCOM',
    ratings: {
        CHESSCOM: {
            username: 'testuser',
            hideUsername: false,
            startRating: 1500,
            currentRating: 1520,
        },
        LICHESS: {
            username: 'searchalice',
            hideUsername: false,
            startRating: 1600,
            currentRating: 1610,
        },
    },
    dojoCohort: '1500-1600',
    progress: {},
    isAdmin: false,
    hasCreatedProfile: true,
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Mock Lichess and Chess.com APIs so no real requests are made. Call before opening the Online Game dialog. */
async function mockOnlineGameApis(page: Page) {
    const lichessNdjson = fs.readFileSync(path.join(__dirname, 'lichess-games.ndjson'), 'utf-8');
    const chessComGames = fs.readFileSync(path.join(__dirname, 'chess-com-games.json'), 'utf-8');

    await page.route('**/lichess.org/api/games/user/*', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/x-ndjson',
            body: lichessNdjson,
        }),
    );

    await page.route(
        '**/api.chess.com/pub/player/*/games/*/*',
        (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: chessComGames,
            }),
        // The OnlineGameForm fetches two Chess.com archives. We mock only the first to avoid duplicate items in the list.
        { times: 1 },
    );
}

/** Mock /user to return a user with Lichess and Chess.com usernames. */
async function mockUserWithOnlineRatings(page: Page) {
    await page.route(`${getEnv('apiBaseUrl')}/user`, async (route) => {
        if (route.request().method() !== 'GET') {
            return route.continue();
        }
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(userWithOnlineRatings),
        });
    });
    await page.route(`${getEnv('apiBaseUrl')}/user/access/v2`, (route) => route.abort());
}

/** Open Import page and open the Online Game dialog with mocks in place so games load. */
async function openOnlineGameDialogWithMocks(page: Page) {
    await mockUserWithOnlineRatings(page);
    await mockOnlineGameApis(page);
    await page.goto('/games/import');
    await page.getByRole('button', { name: /Online Game/ }).click();
    await expect(page.getByRole('dialog', { name: 'Import Online Game' })).toBeVisible();
    await expect(page.getByTestId('online-game-card-li001')).toBeVisible();
}

test.describe('Import Games Page - Online Game search, sort, and filter', () => {
    test('shows recent games when user has Lichess and Chess.com usernames', async ({ page }) => {
        await openOnlineGameDialogWithMocks(page);
        await expect(page.getByPlaceholder('Search by player name')).toBeVisible();
        await expect(page.getByRole('combobox', { name: 'Sort' })).toBeVisible();
        await expect(page.getByRole('button', { name: /Filters/ })).toBeVisible();
        const cards = page.getByTestId(/online-game-card-/);
        await expect(cards).toHaveCount(10, { timeout: 5000 });
    });

    test('search by player name filters the game list', async ({ page }) => {
        await openOnlineGameDialogWithMocks(page);
        await expect(page.getByTestId('online-game-card-cc001')).toBeVisible();
        const searchInput = page.getByTestId('online-game-search').getByRole('textbox');
        await searchInput.fill('SearchAlice');
        await expect(page.getByTestId('online-game-card-cc001')).not.toBeVisible();
        await expect(page.getByTestId('online-game-card-li001')).toBeVisible();
        await expect(page.getByTestId('online-game-card-li002')).toBeVisible();
        await expect(page.getByTestId('online-game-card-li011')).toBeVisible();
        const visibleCards = page.getByTestId(/online-game-card-/);
        await expect(visibleCards).toHaveCount(6);
    });

    test('search with no matches shows empty message', async ({ page }) => {
        await openOnlineGameDialogWithMocks(page);
        await page
            .getByTestId('online-game-search')
            .getByRole('textbox')
            .fill('NobodyWithThisName');
        await expect(page.getByText('No games match the current filters.')).toBeVisible();
    });

    test('sort order changes game order', async ({ page }) => {
        await openOnlineGameDialogWithMocks(page);
        let firstCard = page.getByTestId(/online-game-card-/).first();
        await expect(firstCard).toHaveAttribute('data-testid', 'online-game-card-li001');
        const sortSelect = page.getByRole('combobox', { name: 'Sort' });
        await sortSelect.click();
        await page.getByRole('option', { name: 'Oldest first' }).click();
        firstCard = page.getByTestId(/online-game-card-/).first();
        await expect(firstCard).not.toHaveAttribute('data-testid', 'online-game-card-li001');
    });

    test('filter by source shows only Lichess games', async ({ page }) => {
        await openOnlineGameDialogWithMocks(page);
        await expect(page.getByTestId('online-game-card-cc001')).toBeVisible();
        await page.getByRole('button', { name: /Filters/ }).click();
        await page.getByRole('combobox', { name: 'Source' }).click();
        await page.getByRole('option', { name: 'Lichess' }).click();
        const cards = page.getByTestId(/online-game-card-/);
        await expect(cards).toHaveCount(10);
        await expect(page.getByTestId('online-game-card-li001')).toBeVisible();
        await expect(page.getByTestId('online-game-card-cc001')).not.toBeVisible();
    });

    test('filter by time class shows only matching games', async ({ page }) => {
        await openOnlineGameDialogWithMocks(page);
        await page.getByRole('button', { name: /Filters/ }).click();
        await page.getByRole('combobox', { name: 'Time Class' }).click();
        await page.getByRole('option', { name: 'Bullet' }).click();
        const cards = page.getByTestId(/online-game-card-/);
        await expect(cards).toHaveCount(2);
    });

    test('Lichess correspondence treated as daily game', async ({ page }) => {
        await openOnlineGameDialogWithMocks(page);
        await page.getByRole('button', { name: /Filters/ }).click();
        await page.getByRole('combobox', { name: 'Time Class' }).click();
        await page.getByRole('option', { name: 'Daily' }).click();
        const cards = page.getByTestId(/online-game-card-/);
        await expect(cards).toHaveCount(1);
    });

    test('filter by time control shows only matching games', async ({ page }) => {
        await openOnlineGameDialogWithMocks(page);
        await page.getByRole('button', { name: /Filters/ }).click();
        await page.getByRole('combobox', { name: 'Time Control' }).click();
        await page.getByRole('option', { name: '15+10' }).click();
        await expect(page.getByTestId('online-game-card-cc001')).not.toBeVisible();
        const cards = page.getByTestId(/online-game-card-/);
        await expect(cards).toHaveCount(1);
    });

    test('filter by result shows only matching games', async ({ page }) => {
        await openOnlineGameDialogWithMocks(page);
        await page.getByRole('button', { name: /Filters/ }).click();
        await page.getByRole('combobox', { name: 'Result', exact: true }).click();
        await page.getByRole('option', { name: 'Draw' }).click();
        const cards = page.getByTestId(/online-game-card-/);
        await expect(cards).toHaveCount(4);
    });

    test('filter by result reason shows only matching games', async ({ page }) => {
        await openOnlineGameDialogWithMocks(page);
        await page.getByRole('button', { name: /Filters/ }).click();
        await page.getByRole('combobox', { name: 'Result Reason' }).click();
        await page.getByRole('option', { name: 'Repetition' }).click();
        await expect(page.getByTestId('online-game-card-cc001')).not.toBeVisible();
        const cards = page.getByTestId(/online-game-card-/);
        await expect(cards).toHaveCount(1);
    });

    test('filter by rated shows only matching games', async ({ page }) => {
        await openOnlineGameDialogWithMocks(page);
        await page.getByRole('button', { name: /Filters/ }).click();
        await page.getByRole('combobox', { name: 'Rated' }).click();
        await page.getByRole('option', { name: 'Casual' }).click();
        await expect(page.getByTestId('online-game-card-cc001')).not.toBeVisible();
        const cards = page.getByTestId(/online-game-card-/);
        await expect(cards).toHaveCount(2);
    });

    test('filter by meets cohort time shows only matching games', async ({ page }) => {
        await openOnlineGameDialogWithMocks(page);
        await page.getByRole('button', { name: /Filters/ }).click();
        await page.getByRole('combobox', { name: 'Meets Cohort Time' }).click();
        await page.getByRole('option', { name: 'Yes' }).click();
        await expect(page.getByTestId('online-game-card-cc001')).not.toBeVisible();
        const cards = page.getByTestId(/online-game-card-/);
        await expect(cards).toHaveCount(1);
    });

    test('pagination shows page 2', async ({ page }) => {
        await openOnlineGameDialogWithMocks(page);
        await expect(page.getByTestId('online-games-pagination')).toBeVisible();
        await page.getByRole('button', { name: 'Go to page 2' }).click();
        const cards = page.getByTestId(/online-game-card-/);
        await expect(cards).toHaveCount(10);
        await expect(page.getByTestId('online-game-card-li001')).not.toBeVisible();
    });

    test('clear filters resets filters and shows all games again', async ({ page }) => {
        await openOnlineGameDialogWithMocks(page);
        await expect(page.getByTestId('online-game-card-cc001')).toBeVisible();
        await page.getByRole('button', { name: /Filters/ }).click();
        await page.getByRole('combobox', { name: 'Source' }).click();
        await page.getByRole('option', { name: 'Lichess' }).click();
        await expect(page.getByTestId('online-game-card-cc001')).not.toBeVisible();
        await page.getByRole('button', { name: 'Clear filters' }).click();
        const cardsAfterClear = page.getByTestId(/online-game-card-/);
        await expect(cardsAfterClear).toHaveCount(10);
        await expect(page.getByTestId('online-game-card-cc001')).toBeVisible();
    });
});
