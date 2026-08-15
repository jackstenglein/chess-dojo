import { expect, test } from '@playwright/test';
import { useFreeTier } from '../../../../lib/helpers';

test.describe('List Games Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/games');
        // Wait for the games table to be visible
        await expect(page.getByTestId('games-table')).toBeVisible();
    });

    test('has correct columns', async ({ page }) => {
        const table = page.getByTestId('games-table');
        await expect(table.getByText('Cohort')).toBeVisible();
        await expect(table.getByText('Players')).toBeVisible();
        await expect(table.getByText('Result')).toBeVisible();
        await expect(table.getByText('Played')).toBeVisible();
    });

    test('has import game button', async ({ page }) => {
        const importButton = page.getByTestId('import-game-button');
        await expect(importButton).toContainText('Analyze a Game');
        await importButton.click();
        await expect(page).toHaveURL(/\/games\/import/);
    });

    test('has link to full database', async ({ page }) => {
        await expect(page.getByText('Download full database (updated daily)')).toBeVisible();
    });

    test('allows searching by cohort by default', async ({ page }) => {
        const searchForm = page.getByTestId('search-games');
        await expect(searchForm).toBeVisible();
        await expect(searchForm.getByTestId('cohort-select')).toBeVisible();
        await expect(searchForm.getByTestId('search-games-button')).toBeVisible();

        await searchForm.getByTestId('cohort-select').click();
        await page.locator('.MuiPopover-root').getByText('1600-1700').click();
        await searchForm.getByTestId('search-games-button').click();

        await expect(page.getByTestId('games-table').getByText('16-1700').first()).toBeVisible();
        expect(page.url()).toContain('?type=games&cohort=1600-1700');
    });

    test('allows searching by player', async ({ page }) => {
        const searchForm = page.getByTestId('search-games');
        await expect(searchForm.getByTestId('player-white')).toBeVisible();
        await expect(searchForm.getByTestId('player-black')).toBeVisible();
        await expect(searchForm.getByTestId('ignore-colors')).toBeVisible();
        await expect(searchForm.getByTestId('player-min-elo')).toBeVisible();
        await expect(searchForm.getByTestId('elo-mode')).toBeVisible();
        await expect(searchForm.getByTestId('player-result')).toBeVisible();
        await expect(searchForm.getByTestId('player-opening')).toBeVisible();
        await expect(searchForm.getByTestId('player-time-class')).toBeVisible();
        await expect(searchForm.getByTestId('search-games-button')).toBeVisible();

        await searchForm.getByTestId('player-white').locator('input').fill('JackStenglein');
        await searchForm.getByTestId('ignore-colors').check();
        await searchForm.getByTestId('search-games-button').click();

        await page.waitForURL((url) => url.searchParams.get('white') === 'JackStenglein');
        const params = new URL(page.url()).searchParams;
        expect(params.get('type')).toBe('games');
        expect(params.get('ignoreColors')).toBe('true');
        expect(params.get('eloMode')).toBe('one');
        expect(params.get('results')).toBe('1-0,0-1,1/2-1/2');
    });

    test('allows filtering by a subset of results', async ({ page }) => {
        const searchForm = page.getByTestId('search-games');
        await searchForm.getByTestId('player-result').click();
        await page.getByRole('option', { name: '0-1' }).click();
        await page.keyboard.press('Escape');
        await searchForm.getByTestId('search-games-button').click();

        await page.waitForURL((url) => url.searchParams.get('type') === 'games');
        expect(new URL(page.url()).searchParams.get('results')).toBe('1-0,1/2-1/2');
    });

    test('links to game page on row click', async ({ page }) => {
        const table = page.getByTestId('games-table');
        // Wait for the DataGrid hidden content (measurement area) to be removed
        // before clicking - otherwise the click might hit the hidden duplicate
        await expect(table.locator('.MuiDataGrid-main--hiddenContent')).toHaveCount(0);
        // Click a visible row in the main (non-hidden) content area
        await table
            .locator('.MuiDataGrid-main:not(.MuiDataGrid-main--hiddenContent) .MuiDataGrid-row')
            .first()
            .click();
        await expect(page).toHaveURL(/\/games\/\d{3,4}-\d{3,4}\/.+$/);
    });
});

test.describe('List Games Page (Free Tier)', () => {
    test.beforeEach(async ({ page }) => {
        await useFreeTier(page);
        await page.goto('/games');
        // Wait for the games table to be visible
        await expect(page.getByTestId('games-table')).toBeVisible();
    });

    test('blocks pagination', async ({ page }) => {
        await expect(page.locator('[aria-label="Go to next page"]')).toBeDisabled();
    });

    test('prevents searching by player through URL', async ({ page }) => {
        await page.goto('/games?type=games&white=JackStenglein&startDate=&endDate=');

        await expect(page.getByTestId('upsell-dialog')).toBeVisible();
    });

    test('blocks link to full database', async ({ page }) => {
        await page.getByText('Download full database').click();
        await expect(page.getByTestId('upsell-dialog')).toBeVisible();
    });
});
