import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('inserts a database game and persists its citation without moving the board', async ({
    page,
}, testInfo) => {
    test.setTimeout(60000);
    const user: Record<string, unknown> = {
        ...(JSON.parse(
            readFileSync(new URL('../../../fixtures/auth/freeUser.json', import.meta.url), 'utf8'),
        ) as Record<string, unknown>),
        subscriptionStatus: 'SUBSCRIBED',
        hasCreatedProfile: true,
    };
    const target = {
        cohort: '1500-1600',
        id: 'context-menu-target',
        owner: user.username,
        ownerDisplayName: 'Owner',
        orientation: 'white',
        pgn: '[White "Owner"]\n[Black "Opponent"]\n[Result "*"]\n\n1. e4 e5 2. Nf3 *',
        headers: { White: 'Owner', Black: 'Opponent', Result: '*', Date: '2026.09.21' },
        createdAt: '2026-09-21T00:00:00Z',
        updatedAt: '2026-09-21T00:00:00Z',
        comments: [],
    };
    const source = {
        ...target,
        cohort: 'masters',
        id: 'context-menu-source',
        owner: 'masters',
        timeClass: 'standard',
        date: '2026.09.21',
        headers: { White: 'Source', Black: 'Master', Result: '*', Date: '2026.09.21' },
        pgn: '[White "Source"]\n[Black "Master"]\n\n1. e4 c5 2. Nf3 *',
    };
    await page.route('**/user', (route) => route.fulfill({ json: user }));
    await page.route('**/public/game/*/*', (route) =>
        route.fulfill({ json: route.request().url().includes('/masters/') ? source : target }),
    );
    await page.route('**/game/position?*', (route) => route.fulfill({ json: { games: [source] } }));
    await page.route('**/explorer/position?*', (route) =>
        route.fulfill({
            json: {
                normalizedFen: new URL(route.request().url()).searchParams.get('fen'),
                masters: { moves: {}, results: {} },
                dojo: { moves: {}, results: {} },
                lichess: null,
                tablebase: null,
                follower: null,
            },
        }),
    );
    await page.route('**/game2/*/*', async (route) => {
        expect(route.request().method()).toBe('PUT');
        const update = route.request().postDataJSON() as { pgnText: string };
        target.pgn = update.pgnText;
        target.updatedAt = '2026-09-21T00:01:00Z';
        await route.fulfill({ json: target });
    });
    await page.addInitScript(() => {
        localStorage.setItem('hideEngine', 'true');
        localStorage.removeItem('gameSidePanelTabs');
    });
    await page.goto('/games/1500-1600/context-menu-target?explorer=masters');
    await page.getByTestId('underboard-button-explorer').click();
    await page.getByTestId('explorer-tab-button-masters').click();
    await page.getByRole('button', { name: 'next move', exact: true }).click();
    const selected = page.locator('[data-testid="pgn-text-move-button"].MuiButton-contained');
    await expect(selected).toHaveCount(1);
    const before = (await selected.textContent()) ?? '';
    const row = page.getByTestId('games-table').getByRole('row').filter({ hasText: 'Source' });
    await row.click({ button: 'right' });
    await expect(page.getByRole('menuitem', { name: 'Insert game with citation' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('game-context-menu.png') });
    await page.getByRole('menuitem', { name: 'Insert game with citation' }).click();
    await expect(page.getByText('Game inserted.')).toBeVisible();
    await expect(selected).toHaveText(before);
    const citation = page.getByRole('link', { name: 'Source - Master 2026.09.21' });
    await expect(citation).toBeVisible();
    await expect.poll(() => target.pgn, { timeout: 15000 }).toContain('context-menu-source');
    expect(target.pgn).toContain('c5');
    await page.reload();
    await expect(citation).toBeVisible();
    await page.getByTestId('underboard-button-explorer').click();
    await page.getByTestId('explorer-tab-button-masters').click();
    await page.getByRole('button', { name: 'next move', exact: true }).click();
    const popup = page.waitForEvent('popup');
    await row.click();
    const opened = await popup;
    expect(opened.url()).toContain('/games/masters/context-menu-source');
    await opened.close();
});
