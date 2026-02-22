import { expect, test } from '@playwright/test';
import { getEnv } from '../../../lib/env';
import { containsAll } from '../../../lib/helpers';

test.describe('Rating Conversions Tab', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/material/ratings');
    });

    test('should have correct content', async ({ page }) => {
        const columns = [
            'Dojo Cohort',
            'Chess.com Rapid',
            'Lichess Classical',
            'FIDE',
            'USCF',
            'ECF',
            'CFC',
            'DWZ',
            'ACF',
            'KNSB',
        ];

        await containsAll(page, columns);

        // Verify table has rows (at least 2: header + data)
        const rowCount = await page.locator('tr').count();
        expect(rowCount).toBe(getEnv('numCohorts') + 1);
    });
});
