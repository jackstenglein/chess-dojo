import { expect, test } from '@playwright/test';
import { containsAll, locatorContainsAll } from '../../../lib/helpers';

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
        await expect(page.getByTestId('search-query')).toBeVisible();
    });

    test('has selector to change views', async ({ page }) => {
        await expect(page.getByTestId('scoreboard-view-selector')).toBeVisible();
    });

    test('has checkboxes for field searching', async ({ page }) => {
        await expect(page.getByTestId('search-field')).toHaveCount(checkboxes.length);
        await containsAll(page, checkboxes);
    });

    test('requires at least one field', async ({ page }) => {
        await page.getByTestId('search-query').locator('input').fill('Test Account');
        await page.getByText('All Fields').click();

        await expect(page.getByText('At least one search field is required')).toBeVisible();
    });

    test('shows correct table columns on search', async ({ page }) => {
        await page.getByTestId('search-query').locator('input').fill('Test Account');

        await expect(page.getByTestId('search-results').getByText('Test Account')).toBeVisible();
        await locatorContainsAll(page.getByTestId('search-results'), [
            'Cohort',
            ...checkboxes.slice(1),
        ]);

        await page.getByText('All Fields').click();
        await page.getByText('FIDE ID').first().click();
        await page.getByText('ECF ID').first().click();

        await expect(
            page.getByTestId('search-results').locator('.MuiDataGrid-columnHeader'),
        ).toHaveCount(4);
        await locatorContainsAll(page.getByTestId('search-results'), [
            'Cohort',
            'Display Name',
            'FIDE ID',
            'ECF ID',
        ]);
    });
});
