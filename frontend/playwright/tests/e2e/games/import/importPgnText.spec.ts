import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getBySel } from '../../../../lib/helpers';
import { verifyGame } from './helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importPgnText(page: import('@playwright/test').Page, pgn: string): Promise<void> {
    await page.getByRole('textbox', { name: 'Paste PGN' }).fill(pgn);
    await page.getByRole('button', { name: 'Import' }).click();
    await expect(page).toHaveURL('/games/analysis');
}

test.describe('Import Games Page - PGN Text', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/games/import');
        await page.getByRole('button', { name: /^PGN/ }).click();
    });

    test('requires PGN to submit manual entry', async ({ page }) => {
        await page.getByRole('button', { name: 'Import' }).click();
        await expect(page.getByText('One field is required').first()).toBeVisible();
    });

    test('submits from manual entry (full)', async ({ page }) => {
        const pgn = fs.readFileSync(
            path.join(__dirname, '../../../fixtures/games/pgns/valid.txt'),
            'utf-8',
        );
        await importPgnText(page, pgn);
        await verifyGame(page, { white: 'Test1', black: 'Test2', lastMove: 'e4' });
    });

    test('submits from manual entry (headers only)', async ({ page }) => {
        const pgn = fs.readFileSync(
            path.join(__dirname, '../../../fixtures/games/pgns/headers-only.txt'),
            'utf-8',
        );
        await importPgnText(page, pgn);
        await verifyGame(page, { white: 'bestieboots', black: 'test2' });
    });

    test('submits from manual entry (moves only)', async ({ page }) => {
        const pgn = fs.readFileSync(
            path.join(__dirname, '../../../fixtures/games/pgns/moves-only.txt'),
            'utf-8',
        );
        await importPgnText(page, pgn);
        await verifyGame(page, { lastMove: 'a4' });
    });

    test('displays error snackbar on invalid PGN', async ({ page }) => {
        const pgn = fs.readFileSync(
            path.join(__dirname, '../../../fixtures/games/pgns/invalid.txt'),
            'utf-8',
        );
        await page.getByRole('textbox', { name: 'Paste PGN' }).fill(pgn);
        await page.getByRole('button', { name: 'Import' }).click();

        await expect(page).toHaveURL('/games/import');
        await expect(getBySel(page, 'error-snackbar')).toContainText('Invalid PGN');
    });

    test('submits from Chess.com daily game', async ({ page }) => {
        const pgn = fs.readFileSync(path.join(__dirname, './daily_game.pgn'), 'utf-8');
        await importPgnText(page, pgn);
        await verifyGame(page, { white: 'JackStenglein', black: 'carson2626', lastMove: 'Nc5' });
    });

    test('submits commands without values', async ({ page }) => {
        await importPgnText(
            page,
            `
[White "JackStenglein"]
[Black "carson2626"]
[Result "1-0"]
[TimeControl "600"]
[WhiteElo "1653"]
[BlackElo "1149"]
[Termination "JackStenglein won by resignation"]
[ECO "A50"]
[EndDate "2026.02.09"]
[Link "https://www.chess.com/game/daily/926728269"]

1. e4 {[%clk 0:10:00]} 1... Nf6 {[%clk 0:05:20][%EOG]}`,
        );
        await verifyGame(page, {
            white: 'JackStenglein',
            black: 'carson2626',
            lastMove: 'Nf6',
            lastMoveClock: { white: '0:10:00', black: '0:05:20' },
        });
    });
});
