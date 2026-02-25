import { expect, test } from '@playwright/test';
import { containsAll, getBySel, locatorContainsAll } from '../../../lib/helpers';

const checkboxes = [
    'All Fields',
    'Display Name',
    'Discord Username',
    'Chess.com Username',
    'Lichess Username',
    'FIDE ID',
    'USCF ID',
    'ECF ID',
    'CFC ID',
    'DWZ ID',
    'ACF ID',
    'KNSB ID',
];

test.describe('Search Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/scoreboard/search');
        await expect(getBySel(page, 'search-query')).toBeVisible();
    });

    test('has selector to change views', async ({ page }) => {
        await expect(getBySel(page, 'scoreboard-view-selector')).toBeVisible();
    });

    test('has checkboxes for field searching', async ({ page }) => {
        await expect(getBySel(page, 'search-field')).toHaveCount(checkboxes.length);
        await containsAll(page, checkboxes);
    });

    test('requires at least one field', async ({ page }) => {
        await getBySel(page, 'search-query').locator('input').fill('Test Account');
        await page.getByText('All Fields').click();

        await expect(page.getByText('At least one search field is required')).toBeVisible();
    });

    test('shows correct table columns on search', async ({ page }) => {
        await getBySel(page, 'search-query').locator('input').fill('Test Account');

        await expect(getBySel(page, 'search-results').getByText('Test Account')).toBeVisible();
        await locatorContainsAll(getBySel(page, 'search-results'), [
            'Cohort',
            ...checkboxes.slice(1),
        ]);

        await page.getByText('All Fields').click();
        await page.getByText('FIDE ID').first().click();
        await page.getByText('ECF ID').first().click();

        await expect(
            getBySel(page, 'search-results').locator('.MuiDataGrid-columnHeader'),
        ).toHaveCount(4);
        await locatorContainsAll(getBySel(page, 'search-results'), [
            'Cohort',
            'Display Name',
            'FIDE ID',
            'ECF ID',
        ]);
    });
});
