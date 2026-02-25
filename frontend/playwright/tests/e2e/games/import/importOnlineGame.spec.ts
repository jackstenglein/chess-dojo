import { expect, test } from '@playwright/test';
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

async function importUrl(page: import('@playwright/test').Page, url: string): Promise<void> {
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
        const recentGameButton = page
            .locator('button')
            .filter({ hasText: /\d{1,2}\/\d{1,2}\/\d{4}.*\d+\s*\|\s*\d+/ })
            .first();
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
