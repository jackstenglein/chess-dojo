import { expect, test } from '@playwright/test';
import { getBySel } from '../../../../lib/helpers';

test.describe('Import Games Page - Custom Position', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/games/import');
        await page.getByRole('button', { name: /Custom Position/ }).click();
    });

    test('submits with default FEN', async ({ page }) => {
        await page.getByRole('button', { name: 'Import' }).click();
        await expect(page).toHaveURL('/games/analysis');
    });

    test('submits with custom FEN', async ({ page }) => {
        const fen = 'r1b2r1k/4qp1p/p1Nppb1Q/4nP2/1p2P3/2N5/PPP4P/2KR1BR1 b - - 5 18';

        const positionEntry = page.getByRole('combobox', { name: /Choose Position or Paste FEN/i });
        await positionEntry.clear();
        await positionEntry.fill(fen);
        await positionEntry.press('Enter');
        await page.getByRole('button', { name: 'Import' }).click();

        await expect(page).toHaveURL('/games/analysis');

        await getBySel(page, 'underboard-button-tags').click();
        await expect(page.getByText(fen)).toBeVisible();
    });

    test('submits with custom FEN on blur', async ({ page }) => {
        const fen = 'r1b2r1k/4qp1p/p1Nppb1Q/4nP2/1p2P3/2N5/PPP4P/2KR1BR1 b - - 5 18';

        const positionEntry = page.getByRole('combobox', { name: /Choose Position or Paste FEN/i });
        await positionEntry.clear();
        await positionEntry.fill(fen);
        await positionEntry.blur();
        await page.getByRole('button', { name: 'Import' }).click();

        await expect(page).toHaveURL('/games/analysis');

        await getBySel(page, 'underboard-button-tags').click();
        await expect(page.getByText(fen)).toBeVisible();
    });
});
