import { expect, Page, test } from '@playwright/test';
import { getBySel, interceptApi } from '../../../../lib/helpers';

async function fillForm(
    page: Page,
    data: {
        region?: string;
        section?: string;
        gameUrl?: string;
        white?: string;
        black?: string;
        result?: string;
    },
) {
    if (data.region) {
        await getBySel(page, 'region').locator('[role="combobox"]').click();
        await page.getByRole('option', { name: data.region }).click();
    }
    if (data.section) {
        await getBySel(page, 'section').locator('[role="combobox"]').click();
        await page.getByRole('option', { name: data.section }).click();
    }
    if (data.gameUrl) {
        await getBySel(page, 'game-url').locator('input').fill(data.gameUrl);
    }
    if (data.white) {
        await getBySel(page, 'white').locator('input').fill(data.white);
    }
    if (data.black) {
        await getBySel(page, 'black').locator('input').fill(data.black);
    }
    if (data.result) {
        await getBySel(page, 'result').locator('[role="combobox"]').click();
        await page.getByRole('option', { name: data.result }).click();
    }
}

test.describe('Submit Results Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tournaments/open-classical/submit-results');
        // Wait for form to load
        await expect(getBySel(page, 'submit-button')).toBeVisible();
    });

    test('fetches game results from Lichess', async ({ page }) => {
        await fillForm(page, { gameUrl: 'https://lichess.org/Mw461kKB9Rsq' });
        await getBySel(page, 'game-url').locator('input').blur();

        await expect(getBySel(page, 'white').locator('input')).toHaveAttribute(
            'value',
            'shatterednirvana',
        );
        await expect(getBySel(page, 'black').locator('input')).toHaveAttribute(
            'value',
            'jackstenglein',
        );
        await expect(getBySel(page, 'result').locator('input')).toHaveAttribute('value', '0-1');
    });

    test('requires region to submit', async ({ page }) => {
        await fillForm(page, {
            section: 'U1900',
            gameUrl: 'https://test.com',
            white: 'shatterednirvana',
            black: 'jackstenglein',
            result: 'Black Wins',
        });

        await getBySel(page, 'submit-button').click();

        await expect(getBySel(page, 'region')).toContainText('This field is required');
    });

    test('requires section to submit', async ({ page }) => {
        await fillForm(page, {
            region: 'Region A',
            gameUrl: 'https://test.com',
            white: 'shatterednirvana',
            black: 'jackstenglein',
            result: 'Black Wins',
        });

        await getBySel(page, 'submit-button').click();

        await expect(getBySel(page, 'section')).toContainText('This field is required');
    });

    test('requires game url to submit', async ({ page }) => {
        await fillForm(page, {
            region: 'Region A',
            section: 'U1900',
            white: 'shatterednirvana',
            black: 'jackstenglein',
            result: 'Black Wins',
        });

        await getBySel(page, 'submit-button').click();

        await expect(getBySel(page, 'game-url')).toContainText('This field is required');
    });

    test('requires white to submit', async ({ page }) => {
        await fillForm(page, {
            region: 'Region A',
            section: 'U1900',
            gameUrl: 'https://test.com',
            black: 'jackstenglein',
            result: 'Black Wins',
        });

        await getBySel(page, 'submit-button').click();

        await expect(getBySel(page, 'white')).toContainText('This field is required');
    });

    test('requires black to submit', async ({ page }) => {
        await fillForm(page, {
            region: 'Region A',
            section: 'U1900',
            gameUrl: 'https://test.com',
            white: 'jackstenglein',
            result: 'Black Wins',
        });

        await getBySel(page, 'submit-button').click();

        await expect(getBySel(page, 'black')).toContainText('This field is required');
    });

    test('requires result to submit', async ({ page }) => {
        await fillForm(page, {
            region: 'Region A',
            section: 'U1900',
            gameUrl: 'https://test.com',
            white: 'shatterednirvana',
            black: 'jackstenglein',
        });

        await getBySel(page, 'submit-button').click();

        await expect(getBySel(page, 'result')).toContainText('This field is required');
    });

    test('does not require URL when game is not played', async ({ page }) => {
        for (const result of ['Did Not Play', 'White Forfeits', 'Black Forfeits']) {
            await fillForm(page, { result });
            await getBySel(page, 'submit-button').click();

            await expect(getBySel(page, 'game-url')).not.toContainText('This field is required');
        }

        await fillForm(page, { result: 'White Wins' });
        await getBySel(page, 'submit-button').click();

        await expect(getBySel(page, 'game-url')).toContainText('This field is required');
    });

    test('displays report option when player forfeits', async ({ page }) => {
        for (const result of ['White Forfeits', 'Black Forfeits']) {
            await fillForm(page, { result });
            await expect(getBySel(page, 'report-opponent')).toBeVisible();
        }

        await fillForm(page, { result: 'Did Not Play' });
        await expect(getBySel(page, 'report-opponent')).not.toBeVisible();
    });

    test('redirects to details page on submit', async ({ page }) => {
        await interceptApi(page, 'POST', '/tournaments/open-classical/results', {
            body: {
                sections: {
                    A_U1900: {
                        rounds: [],
                    },
                },
            },
        });

        await fillForm(page, {
            region: 'Region A',
            section: 'U1900',
            gameUrl: 'https://test.com',
            white: 'shatterednirvana',
            black: 'jackstenglein',
            result: 'Black Wins',
        });

        await getBySel(page, 'submit-button').click();

        await expect(page).toHaveURL(/\/tournaments\/open-classical/);
    });
});
