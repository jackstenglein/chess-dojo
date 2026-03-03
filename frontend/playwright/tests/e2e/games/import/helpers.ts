import { expect, Page } from '@playwright/test';

/** Matches the URL of a game page. */
export const gameUrlRegex = /^\/games\/\d{3,4}-\d{3,4}\/\d{4}\.\d{2}\.\d{2}_.+$/;

/**
 * Deletes the game currently open in the browser.
 */
export async function deleteCurrentGame(page: Page): Promise<void> {
    await page.getByTestId('underboard-button-settings').click();
    await page.getByTestId('delete-game-button').click();
    await page.getByTestId('delete-game-confirm-button').click();
    await expect(page).toHaveURL('/profile');
}

/**
 * Verifies that the game currently open in the browser has the provided
 * attributes.
 *
 * Note: player-header-header always shows black, player-header-footer always shows white,
 * regardless of board orientation. The orientation only affects the board display.
 */
export async function verifyGame(
    page: Page,
    {
        white,
        black,
        lastMove,
        lastMoveClock,
        lastMoveEmt,
        orientation,
    }: {
        white?: string;
        black?: string;
        lastMove?: string;
        lastMoveClock?: { white?: string; black?: string };
        lastMoveEmt?: string;
        orientation?: 'white' | 'black';
    },
): Promise<void> {
    if (white) {
        await expect(
            page.getByTestId(
                orientation === 'black' ? 'player-header-header' : 'player-header-footer',
            ),
        ).toContainText(white);
    }
    if (black) {
        await expect(
            page.getByTestId(
                orientation === 'black' ? 'player-header-footer' : 'player-header-header',
            ),
        ).toContainText(black);
    }
    if (lastMove) {
        const moveButton = page.getByTestId('pgn-text-move-button').last();
        await expect(moveButton).toContainText(lastMove);
        await moveButton.click();

        if (lastMoveClock?.white) {
            await expect(
                page.getByTestId(
                    orientation === 'black' ? 'player-header-header' : 'player-header-footer',
                ),
            ).toContainText(lastMoveClock.white);
        }
        if (lastMoveClock?.black) {
            await expect(
                page.getByTestId(
                    orientation === 'black' ? 'player-header-footer' : 'player-header-header',
                ),
            ).toContainText(lastMoveClock.black);
        }
    }
    if (lastMoveEmt) {
        await expect(page.getByTestId('elapsed-move-time').last()).toHaveText(lastMoveEmt);
    }
}

/**
 * Clicks the import button.
 */
export async function clickImport(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'Import' }).click();
}
