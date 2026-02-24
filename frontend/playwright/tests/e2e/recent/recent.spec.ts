import { expect, test } from '@playwright/test';
import { getBySel, interceptApi } from '../../../lib/helpers';

// Freeze time at Sept 6, 2023 so the fixture dates fall within range
const fixedDate = new Date(2023, 8, 6); // month is 0-indexed

test.describe('Graduations', () => {
    test.beforeEach(async ({ page }) => {
        await page.clock.install({ time: fixedDate });
        await interceptApi(page, 'GET', '/public/graduations', {
            fixture: 'recent/graduations.json',
        });
        await page.goto('/recent');
    });

    test('displays correct columns for graduation', async ({ page }) => {
        const columns = [
            'Name',
            'Graduated',
            'Old Cohort',
            'New Cohort',
            'Dojo Score',
            'Games Annotated',
            'Date',
        ];
        for (const col of columns) {
            await expect(page.getByText(col, { exact: true })).toBeVisible();
        }
    });

    test('displays correct graduations from past week', async ({ page }) => {
        await expect(
            getBySel(page, 'recent-graduates-table').getByText('1–11 of 11'),
        ).toBeVisible();
        await expect(page.getByRole('link', { name: 'QuiteKnight' })).toHaveAttribute(
            'href',
            '/profile/f3ed6d22-4b50-4049-b65f-ff2b1131ba4a',
        );
    });

    test('displays correct graduations for other timeframes', async ({ page }) => {
        await getBySel(page, 'graduates-timeframe-select').click();
        await page.getByText('Graduation of 8/30/2023').click();

        await expect(getBySel(page, 'recent-graduates-table').getByText('1–9 of 9')).toBeVisible();
        await expect(page.getByRole('link', { name: 'Bodheen' })).toHaveAttribute(
            'href',
            '/profile/372ae346-b786-4000-9fc8-36005eb29415',
        );
    });
});

test.describe('No Graduations', () => {
    test('displays correct message when no graduations', async ({ page }) => {
        await interceptApi(page, 'GET', '/public/graduations', {
            fixture: 'recent/noGraduations.json',
        });
        await page.goto('/recent');
        await expect(page.getByText('No graduations in the selected timeframe')).toBeVisible();
    });
});
