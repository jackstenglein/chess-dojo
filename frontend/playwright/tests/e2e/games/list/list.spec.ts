import { expect, test } from '@playwright/test';
import { findBySel, getBySel, useFreeTier, waitForNavigation } from '../../../../lib/helpers';

test.describe('List Games Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/games');
        // Wait for the games table to be visible
        await expect(getBySel(page, 'games-table')).toBeVisible();
    });

    test('has correct columns', async ({ page }) => {
        const table = getBySel(page, 'games-table');
        await expect(table.getByText('Cohort')).toBeVisible();
        await expect(table.getByText('Players')).toBeVisible();
        await expect(table.getByText('Result')).toBeVisible();
        await expect(table.getByText('Played')).toBeVisible();
    });

    test('has import game button', async ({ page }) => {
        const importButton = getBySel(page, 'import-game-button');
        await expect(importButton).toContainText('Analyze a Game');
        await importButton.click();
        await expect(page).toHaveURL(/\/games\/import/);
    });

    test('has link to full database', async ({ page }) => {
        await expect(page.getByText('Download full database (updated daily)')).toBeVisible();
    });

    test('allows searching by cohort by default', async ({ page }) => {
        const searchForm = getBySel(page, 'search-by-cohort');
        await expect(searchForm).toBeVisible();
        await expect(findBySel(searchForm, 'cohort-select')).toBeVisible();
        await expect(findBySel(searchForm, 'cohort-search-button')).toBeVisible();

        await findBySel(searchForm, 'cohort-select').click();
        await page.locator('.MuiPopover-root').getByText('1600-1700').click();
        await findBySel(searchForm, 'cohort-search-button').click();

        await expect(getBySel(page, 'games-table').getByText('16-1700').first()).toBeVisible();
        expect(page.url()).toContain('?type=cohort&cohort=1600-1700&startDate=&endDate=');
    });

    test('allows searching by player', async ({ page }) => {
        await page.getByRole('button', { name: 'Search By Player' }).click();

        const searchForm = getBySel(page, 'search-by-player');
        await expect(findBySel(searchForm, 'player-name')).toBeVisible();
        await expect(findBySel(searchForm, 'player-search-button')).toBeVisible();

        await findBySel(searchForm, 'player-name').locator('input').fill('JackStenglein');
        await findBySel(searchForm, 'player-search-button').click();

        await waitForNavigation(
            page,
            '/games?type=player&player=JackStenglein&color=either&startDate=&endDate=',
        );
    });

    test('allows searching by eco', async ({ page }) => {
        await page.getByRole('button', { name: 'Search By Opening' }).click();

        const searchForm = getBySel(page, 'search-by-opening');
        await expect(findBySel(searchForm, 'opening-eco')).toBeVisible();
        await expect(findBySel(searchForm, 'opening-search-button')).toBeVisible();

        await findBySel(searchForm, 'opening-eco').locator('input').fill('B01');
        await findBySel(searchForm, 'opening-search-button').click();

        await waitForNavigation(page, '/games?type=opening&eco=B01&startDate=&endDate=');
    });

    test('allows searching current user uploads', async ({ page }) => {
        await page.getByRole('button', { name: 'Search My Uploads' }).click();

        const searchForm = getBySel(page, 'search-by-owner');
        await expect(findBySel(searchForm, 'owner-search-description')).toBeVisible();
        await expect(findBySel(searchForm, 'owner-search-button')).toBeVisible();
        await findBySel(searchForm, 'owner-search-button').click();

        await waitForNavigation(page, '/games?type=owner&startDate=&endDate=');
    });

    test('links to game page on row click', async ({ page }) => {
        const table = getBySel(page, 'games-table');
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
        await expect(getBySel(page, 'games-table')).toBeVisible();
    });

    test('blocks pagination', async ({ page }) => {
        await expect(page.locator('[aria-label="Go to next page"]')).toBeDisabled();
    });

    test('prevents searching by player', async ({ page }) => {
        await page.getByRole('button', { name: 'Search By Player' }).click();

        await expect(getBySel(page, 'player-search-button')).toBeDisabled();
        await expect(
            page.getByText('Free-tier users are not able to search by player name'),
        ).toBeVisible();
    });

    test('prevents searching by player through URL', async ({ page }) => {
        await page.goto('/games?type=player&player=JackStenglein&color=either&startDate=&endDate=');

        await expect(getBySel(page, 'upsell-dialog')).toBeVisible();
    });

    test('blocks link to full database', async ({ page }) => {
        await page.getByText('Download full database').click();
        await expect(getBySel(page, 'upsell-dialog')).toBeVisible();
    });
});
