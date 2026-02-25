import { expect, test } from '@playwright/test';
import { getBySel } from '../../../../lib/helpers';

test.describe('Model Games Module', () => {
    test('should display course page', async ({ page }) => {
        await page.goto('/courses/OPENING/b042a392-e285-4466-9bc0-deeecc2ce16c/0/4');

        // The course page should load showing either the PGN selector (if purchased)
        // or the course description/upsell page (if not purchased)
        await expect(
            page.getByRole('heading', { name: 'Najdorf Sicilian', exact: true }),
        ).toBeVisible();
        await expect(getBySel(page, 'pgn-selector')).toBeVisible();
        await expect(getBySel(page, 'chessground-board')).toBeVisible();
    });
});
