import { expect, Page, test } from '@playwright/test';
import { getEnv } from '../../../lib/env';

/**
 * Test "Study Master Games" when the dev backend has task material and seeded courses.
 * Use the last catalog row and delete the recorded copy and timeline entry afterward.
 */
const TASK_NAME = 'Study Master Games';
const API = getEnv('apiBaseUrl');

interface Written {
    copy?: { cohort: string; id: string };
    entry?: { id: string; requirementId: string };
    progressBefore?: unknown;
    taskId?: string;
}

async function idToken(page: Page): Promise<string> {
    const cookies = await page.context().cookies();
    const cookie = cookies.find((c) => c.name.endsWith('.idToken'));
    if (!cookie) throw new Error('no id token cookie');
    return cookie.value;
}

/** Click a square by name. Chessground moves a piece after a click on its square and one on the target. */
async function clickSquare(page: Page, square: string) {
    const board = page.locator('cg-board');
    const bounds = await board.boundingBox();
    if (!bounds) throw new Error('no board');
    const classes = await page.getByTestId('chessground-board').first().getAttribute('class');
    const flipped = classes?.includes('orientation-black') ?? false;
    let file = square.charCodeAt(0) - 'a'.charCodeAt(0);
    let rank = Number(square[1]) - 1;
    if (flipped) {
        file = 7 - file;
        rank = 7 - rank;
    }
    const size = bounds.width / 8;
    await page.mouse.click(bounds.x + (file + 0.5) * size, bounds.y + (7.5 - rank) * size);
}

/** Play a white first move as a new variation from the starting position. */
async function playFirstMove(page: Page, from: string, to: string) {
    await page.getByRole('button', { name: 'first move', exact: true }).click();
    await clickSquare(page, from);
    await clickSquare(page, to);
}

/** The task and the user's progress on it, from the plan; skips the test when the page cannot run yet. */
async function studyTask(page: Page) {
    const headers = { Authorization: `Bearer ${await idToken(page)}` };
    const user = (await (await page.request.get(`${API}/user`, { headers })).json()) as {
        dojoCohort: string;
        progress: Record<string, unknown>;
    };
    const list = (await (
        await page.request.get(`${API}/requirements/${user.dojoCohort}?scoreboardOnly=false`, {
            headers,
        })
    ).json()) as { requirements: { id: string; name: string; material?: unknown[] }[] };
    const task = list.requirements.find((r) => r.name === TASK_NAME);
    test.skip(!task, `${TASK_NAME} is not in the ${user.dojoCohort} plan`);
    test.skip(!task?.material?.length, `${TASK_NAME} has no material on dev yet`);
    return { task, progress: user.progress[task?.id ?? ''] };
}

test.describe('Study page', () => {
    const written: Written = {};

    test.afterEach(async ({ page }) => {
        const token = await idToken(page);
        const headers = { Authorization: `Bearer ${token}` };
        if (written.entry && written.taskId) {
            const progress = written.progressBefore ?? {
                requirementId: written.taskId,
                counts: {},
                minutesSpent: {},
                updatedAt: '',
            };
            await page.request.post(`${API}/user/progress/timeline/v2`, {
                headers,
                data: {
                    requirementId: written.taskId,
                    progress,
                    updated: [],
                    deleted: [written.entry],
                },
            });
            written.entry = undefined;
        }
        if (written.copy) {
            await page.request.post(`${API}/game/delete`, { headers, data: [written.copy] });
            written.copy = undefined;
        }
    });

    test("opens the task, keeps the student's edits in a copy, and records a game as done", async ({
        page,
    }) => {
        test.setTimeout(120_000);
        const { task, progress } = await studyTask(page);
        written.taskId = task?.id;
        written.progressBefore = progress;

        await page.goto(`/study/${task?.id}`);
        await expect(page.getByTestId('study-catalog')).toBeVisible();
        await expect(page.getByTestId('study-catalog')).toContainText(TASK_NAME);
        await expect(page.getByTestId('study-panel')).toBeVisible();

        const rows = page.getByTestId('study-item');
        await expect(rows.first()).toBeVisible();
        const last = rows.last();
        await expect(last.getByTestId('study-item-done')).toHaveCount(0);
        await last.click();
        const itemKey = await last.getAttribute('data-item-key');
        expect(itemKey).toBeTruthy();
        await expect(page.getByTestId('chessground-board').first()).toBeVisible();
        await expect(page.getByTestId('study-your-copy')).toHaveCount(0);

        // The first edit creates a copy. The second updates it.
        const created = page.waitForResponse(
            (r) => r.url().endsWith('/game2') && r.request().method() === 'POST',
        );
        await playFirstMove(page, 'a2', 'a3');
        const createResp = await created;
        expect(createResp.status()).toBe(200);
        const game = (await createResp.json()) as { cohort: string; id: string; pgn: string };
        written.copy = { cohort: game.cohort, id: game.id };
        expect(game.pgn).toContain(`[StudyItem "${itemKey}"]`);

        const updated = page.waitForResponse(
            (r) => r.url().includes('/game2/') && r.request().method() === 'PUT',
        );
        await playFirstMove(page, 'h2', 'h4');
        expect((await updated).status()).toBe(200);
        await expect(page.getByTestId('study-your-copy')).toBeVisible();

        // Reopening loads the copy with both edits.
        await page.goto(`/study/${task?.id}?item=${encodeURIComponent(itemKey ?? '')}`);
        await expect(page.getByTestId('study-your-copy')).toBeVisible();
        const moves = page.getByTestId('pgn-text');
        await expect(moves).toContainText('a3');
        await expect(moves).toContainText('h4');
        // The course forbids export, so the board's copy menu offers no PGN.
        await page.getByRole('button', { name: 'Copy', exact: true }).click();
        await expect(page.getByRole('menuitem', { name: 'Copy URL' })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Copy PGN' })).toHaveCount(0);
        await page.keyboard.press('Escape');

        // Done posts the game's key with no dialog, moves the count by one, checks the row and
        // offers Undo in its place.
        const progressLine = page.getByTestId('study-catalog-progress');
        const doneBefore = Number.parseInt((await progressLine.textContent()) ?? '', 10);
        expect(Number.isNaN(doneBefore)).toBe(false);
        const posted = page.waitForResponse(
            (r) => r.url().endsWith('/user/progress/v3') && r.request().method() === 'POST',
        );
        await page.getByTestId('study-mark-done').click();
        const resp = await posted;
        expect(resp.status()).toBe(200);
        const sent = resp.request().postDataJSON() as {
            studyInfo?: { itemKey: string };
            newCount: number;
            previousCount: number;
        };
        expect(sent.studyInfo?.itemKey).toBe(itemKey);
        expect(sent.newCount).toBe(sent.previousCount + 1);
        const body = (await resp.json()) as {
            timelineEntry: { id: string; requirementId: string };
        };
        written.entry = body.timelineEntry;
        await expect(progressLine).toContainText(`${doneBefore + 1} of`);
        await expect(
            page.locator(`[data-item-key="${itemKey}"]`).getByTestId('study-item-done'),
        ).toBeVisible();
        await expect(page.getByTestId('study-undo-mark')).toBeVisible();
    });

    test('the task dialog offers Study', async ({ page }) => {
        await studyTask(page);
        await page.goto('/profile?view=progress');
        const header = page.getByTestId('Middlegames-+-Strategy-header');
        await expect(header).toBeVisible({ timeout: 30_000 });
        const entry = page.getByTestId(`${TASK_NAME.replaceAll(' ', '-')}-training-plan-entry`);
        if (!(await entry.isVisible())) {
            await header.click();
        }
        await expect(entry).toBeVisible();
        await entry.locator('#task-details').click();
        await expect(page.getByRole('dialog')).toBeVisible();
        const study = page.getByTestId('task-study-button');
        await expect(study).toBeVisible();
        await study.click();
        await expect(page).toHaveURL(/\/study\//);
        await expect(page.getByTestId('study-catalog')).toBeVisible();
    });
});
