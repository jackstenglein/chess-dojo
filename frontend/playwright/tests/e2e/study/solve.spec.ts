import { expect, Page, test } from '@playwright/test';
import { getEnv } from '../../../lib/env';

/**
 * A puzzle book opens in solve mode. The panel shows the prompt card instead of the move
 * list, and Show solution flips the item to read mode. The spec plays no move, so it posts
 * nothing and needs no cleanup. It skips when the task is not in the plan or the page
 * reports no material for it.
 */
const TASK_NAME = 'Solve Polgar M2s through Problem {{count}}';
const API = getEnv('apiBaseUrl');

async function idToken(page: Page): Promise<string> {
    const cookies = await page.context().cookies();
    const cookie = cookies.find((c) => c.name.endsWith('.idToken'));
    if (!cookie) throw new Error('no id token cookie');
    return cookie.value;
}

/** The puzzle task from the plan. The test skips when the account's plan has none. */
async function puzzleTask(page: Page) {
    const headers = { Authorization: `Bearer ${await idToken(page)}` };
    const user = (await (await page.request.get(`${API}/user`, { headers })).json()) as {
        dojoCohort: string;
    };
    const list = (await (
        await page.request.get(`${API}/requirements/${user.dojoCohort}?scoreboardOnly=false`, {
            headers,
        })
    ).json()) as { requirements: { id: string; name: string }[] };
    const task = list.requirements.find((r) => r.name === TASK_NAME);
    test.skip(!task, `${TASK_NAME} is not in the ${user.dojoCohort} plan`);
    return task;
}

test.describe('Solve mode', () => {
    test('opens a puzzle with the prompt card and shows the solution on request', async ({
        page,
    }) => {
        test.setTimeout(120_000);
        const task = await puzzleTask(page);

        await page.goto(`/study/${task?.id}`);
        // The page decides whether the task has material, so the frontend stub is enough.
        const catalog = page.getByTestId('study-catalog');
        const noMaterial = page.getByText('This task has no study material.');
        await expect(catalog.or(noMaterial)).toBeVisible({ timeout: 60_000 });
        test.skip(await noMaterial.isVisible(), `${TASK_NAME} has no material on dev yet`);
        const card = page.getByTestId('study-solve-card');
        await expect(card).toBeVisible({ timeout: 60_000 });
        await expect(card).toHaveAttribute('data-status', 'prompt');
        await expect(card).toContainText(/to move/);
        await expect(page.getByTestId('pgn-text')).toHaveCount(0);
        await expect(page.getByTestId('study-mark-done')).toBeDisabled();
        await expect(page.getByTestId('study-mode-solve')).toHaveAttribute('aria-pressed', 'true');

        await page.getByTestId('study-show-solution').click();
        await expect(page.getByTestId('pgn-text')).toBeVisible();
        await expect(page.getByTestId('study-solve-card')).toHaveCount(0);
        await expect(page.getByTestId('study-mode-read')).toHaveAttribute('aria-pressed', 'true');

        await page.getByTestId('study-mode-solve').click();
        await expect(page.getByTestId('study-solve-card')).toHaveAttribute('data-status', 'prompt');
        await expect(page.getByTestId('pgn-text')).toHaveCount(0);
    });
});
