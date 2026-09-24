import { expect, test, type Locator } from '@playwright/test';
import { readFileSync } from 'node:fs';

const pgn = '[White "Presenter"]\n[Black "Opponent"]\n[Result "*"]\n\n1. e4 e5 2. Nf3 Nc6 *';
const user = {
    ...(JSON.parse(
        readFileSync(new URL('../../../fixtures/auth/freeUser.json', import.meta.url), 'utf8'),
    ) as Record<string, unknown>),
    hasCreatedProfile: true,
};

async function boardBounds(board: Locator) {
    const bounds = await board.boundingBox();
    if (!bounds) throw new Error('Expected the board to have visible bounds');
    return bounds;
}

test.beforeEach(async ({ page }) => {
    await page.route('**/user', (route) => route.fulfill({ json: user }));
    await page.route('**/public/game/*/*', (route) =>
        route.fulfill({
            json: {
                cohort: '1500-1600',
                id: 'panel-visibility',
                owner: 'another-user',
                ownerDisplayName: 'Presenter',
                pgn,
                orientation: 'white',
                headers: { White: 'Presenter', Black: 'Opponent', Result: '*' },
                createdAt: '2026-09-08T00:00:00Z',
                updatedAt: '2026-09-08T00:00:00Z',
                comments: [],
            },
        }),
    );
    await page.addInitScript(
        ({ pgn }) => {
            localStorage.removeItem('analysisSidePanelTabs');
            localStorage.removeItem('gameSidePanelTabs');
            localStorage.setItem('hideEngine', 'true');
            localStorage.setItem(
                'boardKeyBindings',
                JSON.stringify({
                    FOCUS_MAIN_TEXTFIELD: { modifier: '', key: 'e' },
                    TOGGLE_ORIENTATION: { modifier: '', key: 'f' },
                }),
            );
            sessionStorage.setItem('useSaveGame:stageCreateGame', JSON.stringify({ pgnText: pgn }));
        },
        { pgn },
    );
});

for (const width of [2463, 1400, 390]) {
    for (const route of ['/games/analysis', '/games/1500-1600/panel-visibility']) {
        test(`${route}: hide and restore at ${width}px`, async ({ page }) => {
            await page.setViewportSize({ width, height: 1000 });
            await page.goto(route);
            const left = page.getByTestId('underboard-tab-content');
            const right = page.getByTestId('right-underboard-tab-content');
            const board = page.locator('cg-board');
            await expect(board).toBeVisible();
            const boardElement = await page.getByTestId('chessground-board').elementHandle();
            if (!boardElement) throw new Error('Expected a mounted board');
            const originalWidth = (await boardBounds(board)).width;
            const originalLeftWidth = (await boardBounds(left)).width;
            const originalRightWidth = (await boardBounds(right)).width;
            const leftToggle = await boardBounds(
                page.getByRole('button', { name: 'Hide left panel', exact: true }),
            );
            const rightToggle = await boardBounds(
                page.getByRole('button', { name: 'Hide right panel', exact: true }),
            );
            const nextButton = await boardBounds(
                page.getByRole('button', { name: 'next move', exact: true }),
            );
            const boardRect = await boardBounds(board);
            expect(
                Math.abs(nextButton.x + nextButton.width / 2 - boardRect.x - boardRect.width / 2),
            ).toBeLessThan(3);
            expect(Math.abs(leftToggle.y - rightToggle.y)).toBeLessThan(2);
            expect(leftToggle.x).toBeGreaterThanOrEqual(boardRect.x);
            expect(rightToggle.x + rightToggle.width).toBeLessThanOrEqual(
                boardRect.x + boardRect.width + 1,
            );
            if (originalWidth >= 480) {
                expect(
                    Math.abs(
                        nextButton.y + nextButton.height / 2 - leftToggle.y - leftToggle.height / 2,
                    ),
                ).toBeLessThan(2);
            } else {
                expect(nextButton.y).toBeGreaterThanOrEqual(leftToggle.y + leftToggle.height);
            }
            await page.getByRole('button', { name: 'next move', exact: true }).click();
            const selectedMove = right.locator(
                '[data-testid="pgn-text-move-button"].MuiButton-contained',
            );
            await expect(selectedMove).toHaveCount(1);
            const moveText = (await selectedMove.textContent()) ?? '';
            await page.keyboard.press('f');
            await expect(page.getByTestId('chessground-board')).toHaveClass(/orientation-black/);

            await page.getByRole('button', { name: 'Hide left panel', exact: true }).click();
            await expect(left).toBeHidden();
            await expect(right).toBeVisible();
            await expect
                .poll(async () => (await boardBounds(board)).width)
                .toBeCloseTo(originalWidth, 0);
            await expect
                .poll(async () => (await boardBounds(right)).width)
                .toBeCloseTo(originalRightWidth, 0);
            if (width >= 900) {
                const boardRect = await boardBounds(board);
                const rightRect = await boardBounds(right);
                expect(
                    Math.abs((boardRect.x + rightRect.x + rightRect.width) / 2 - width / 2),
                ).toBeLessThan(3);
                await page.screenshot({
                    path: test.info().outputPath('right-panel-only.png'),
                    fullPage: true,
                });
            }
            await page.getByRole('button', { name: 'Hide right panel', exact: true }).click();
            await expect(right).toBeHidden();
            const bounds = await boardBounds(board);
            expect(bounds.width).toBeCloseTo(originalWidth, 0);
            expect(Math.abs(bounds.x + bounds.width / 2 - width / 2)).toBeLessThan(3);
            expect(await boardElement.evaluate((element) => element.isConnected)).toBe(true);
            await expect(page.getByTestId('chessground-board')).toHaveClass(/orientation-black/);
            await page.screenshot({
                path: test.info().outputPath('board-only.png'),
                fullPage: true,
            });

            if (width >= 900) {
                await page.mouse.move(bounds.x + bounds.width - 3, bounds.y + bounds.height - 3);
                await page.mouse.down();
                await page.mouse.move(bounds.x + bounds.width - 83, bounds.y + bounds.height - 83, {
                    steps: 8,
                });
                await page.mouse.up();
                await expect
                    .poll(async () => (await boardBounds(board)).width)
                    .toBeLessThan(bounds.width - 50);
            }

            const resizedWidth = (await boardBounds(board)).width;
            await page.getByRole('button', { name: 'Show right panel', exact: true }).click();
            await expect(selectedMove).toHaveText(moveText);
            await page.getByRole('button', { name: 'Show left panel', exact: true }).click();
            await expect(left).toBeVisible();
            await expect
                .poll(async () => (await boardBounds(board)).width)
                .toBeCloseTo(resizedWidth, 0);
            expect((await boardBounds(left)).width).toBeCloseTo(originalLeftWidth, 0);
            expect((await boardBounds(right)).width).toBeCloseTo(originalRightWidth, 0);
            await page.getByRole('button', { name: 'Hide right panel', exact: true }).click();
            expect((await boardBounds(left)).width).toBeCloseTo(originalLeftWidth, 0);
            expect((await boardBounds(board)).width).toBeCloseTo(resizedWidth, 0);
        });
    }
}

for (const route of ['/games/analysis', '/games/1500-1600/panel-visibility']) {
    test(`${route}: keeps square coordinates aligned when side panels are toggled`, async ({
        page,
    }) => {
        await page.setViewportSize({ width: 1400, height: 1000 });
        await page.goto(route);
        const board = page.locator('cg-board');
        const left = page.getByTestId('underboard-tab-content');
        const right = page.getByTestId('right-underboard-tab-content');
        await expect(board).toBeVisible();

        const highlightSquare = async (square: string) => {
            const bounds = await boardBounds(board);
            const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
            const rank = Number(square[1]);
            await page.mouse.click(
                bounds.x + ((file + 0.5) * bounds.width) / 8,
                bounds.y + ((8 - rank + 0.5) * bounds.height) / 8,
                { button: 'right' },
            );
            await expect
                .poll(() =>
                    page.evaluate(() => {
                        const api = (
                            window as unknown as {
                                chessground: {
                                    state: { drawable: { shapes: { orig: string }[] } };
                                };
                            }
                        ).chessground;
                        return api.state.drawable.shapes.at(-1)?.orig;
                    }),
                )
                .toBe(square);
        };

        await page.getByRole('button', { name: 'Hide left panel', exact: true }).click();
        await expect(left).toBeHidden();
        await highlightSquare('e7');

        await page.getByRole('button', { name: 'Show left panel', exact: true }).click();
        await expect(left).toBeVisible();
        await page.getByRole('button', { name: 'Hide right panel', exact: true }).click();
        await expect(right).toBeHidden();
        await highlightSquare('b2');
    });
}

for (const viewport of [
    { width: 1400, height: 800 },
    { width: 700, height: 900 },
    { width: 390, height: 400 },
]) {
    for (const route of ['/games/analysis', '/games/1500-1600/panel-visibility']) {
        test(`${route}: fits hidden bars at ${viewport.width}x${viewport.height}`, async ({
            page,
        }) => {
            await page.setViewportSize(viewport);
            await page.goto(route);
            const board = page.locator('cg-board');
            await expect(board).toBeVisible();
            await page.getByRole('button', { name: 'Hide left panel', exact: true }).click();
            await page.getByRole('button', { name: 'Hide right panel', exact: true }).click();
            const before = await boardBounds(board);
            const boardElement = await page.getByTestId('chessground-board').elementHandle();
            await page
                .getByRole('button', { name: 'Hide player bars and controls', exact: true })
                .click();
            const restore = page.getByRole('button', {
                name: 'Show player bars and controls',
                exact: true,
            });
            await expect(restore).toBeFocused();
            await expect(page.getByRole('button', { name: 'next move', exact: true })).toBeHidden();
            const fitted = await boardBounds(board);
            const restoreBounds = await boardBounds(restore);
            expect(fitted.width).toBeCloseTo(fitted.height, 0);
            expect(fitted.y + fitted.height).toBeLessThanOrEqual(viewport.height);
            expect(restoreBounds.x).toBeGreaterThanOrEqual(fitted.x + fitted.width);
            expect(restoreBounds.x + restoreBounds.width).toBeLessThanOrEqual(viewport.width);
            if (viewport.width === 1400) expect(fitted.width).toBeGreaterThan(before.width);
            expect(await boardElement?.evaluate((element) => element.isConnected)).toBe(true);
            await page.keyboard.press('f');
            await expect(page.getByTestId('chessground-board')).toHaveClass(/orientation-black/);
            expect(
                await page.evaluate(
                    () => document.documentElement.scrollWidth <= window.innerWidth,
                ),
            ).toBe(true);
            await page.screenshot({
                path: test.info().outputPath('hidden-bars.png'),
                fullPage: true,
            });
            await restore.click();
            await expect(
                page.getByRole('button', { name: 'Hide player bars and controls', exact: true }),
            ).toBeFocused();
            expect((await boardBounds(board)).width).toBeCloseTo(before.width, 0);
            await expect(page.getByTestId('chessground-board')).toHaveClass(/orientation-black/);
        });
    }
}

test('restores editor focus and draft through the existing shortcut', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 1000 });
    await page.goto('/games/analysis');
    await page.getByTestId('underboard-button-editor').click();
    const editor = page
        .getByTestId('underboard-tab-content')
        .getByRole('textbox', { name: 'Comments', exact: true });
    await editor.fill('Workshop notes in progress');
    await page.getByRole('button', { name: 'Hide left panel', exact: true }).click();
    await expect(editor).toBeHidden();
    await page.keyboard.press('e');
    await expect(editor).toBeVisible();
    await expect(editor).toBeFocused();
    await expect(editor).toHaveValue('Workshop notes in progress');
    await page.getByRole('button', { name: 'Hide right panel', exact: true }).click();
    await page.setViewportSize({ width: 700, height: 900 });
    await page.getByRole('button', { name: 'Show right panel', exact: true }).click();
    await expect(page.getByTestId('right-underboard-tab-content')).toBeVisible();
    await expect(editor).toHaveValue('Workshop notes in progress');
    await page.getByRole('button', { name: 'Hide left panel', exact: true }).click();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Hide left panel', exact: true })).toBeVisible();
});

test('keeps puzzle boards unchanged', async ({ page }) => {
    await page.route('**/puzzle/next', (route) =>
        route.fulfill({
            json: {
                user,
                puzzle: {
                    _id: 'panel-puzzle',
                    id: 'panel-puzzle',
                    fen: 'rnbqkbnr/pppp1ppp/8/4p3/8/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 2',
                    moves: ['g2g4', 'd8h4'],
                    rating: 1000,
                    ratingDeviation: 100,
                    volatility: 0.06,
                    plays: 1,
                    successfulPlays: 1,
                    themes: ['mateIn1'],
                },
            },
        }),
    );
    await page.goto('/puzzles/checkmate');
    await expect(page.locator('cg-board')).toBeVisible();
    await expect(
        page.getByRole('button', { name: /(?:Hide|Show) (?:left|right) panel/ }),
    ).toHaveCount(0);
});
