import { expect, test } from '@playwright/test';

test.describe('Default Time Control (localStorage)', () => {
    test.beforeEach(async ({ page }) => {
        // Clear the default time control from localStorage before each test
        await page.evaluate(() => localStorage.removeItem('defaultTimeControl'));
    });

    test('saves time control to localStorage when edited', async ({ page }) => {
        // Navigate to games analysis page
        await page.goto('/games/analysis');

        // Open the Tags tab
        await page.getByRole('button', { name: 'PGN Tags' }).click();

        // Find the TimeControl row and double-click to edit
        const timeControlRow = page.getByRole('row', { name: 'TimeControl' });
        await timeControlRow.getByRole('gridcell').last().dblclick();

        // The TimeControlEditor dialog should open
        await expect(page.getByRole('dialog', { name: 'Update Time Control' })).toBeVisible();

        // Set initial time to 1:30:00 (90 minutes = 5400 seconds)
        // Use the spinbuttons for Hours, Minutes, Seconds
        await page.getByRole('spinbutton', { name: 'Hours' }).fill('01');
        await page.getByRole('spinbutton', { name: 'Minutes' }).fill('30');
        await page.getByRole('spinbutton', { name: 'Seconds' }).fill('00');

        // Set increment to 30 seconds
        await page.getByRole('textbox', { name: 'Bonus Time (Sec)' }).fill('30');

        // Click Update button
        await page.getByRole('button', { name: 'Update' }).click();

        // Wait for dialog to close
        await expect(page.getByRole('dialog', { name: 'Update Time Control' })).not.toBeVisible();

        // Verify the value was saved to localStorage
        const stored = await page.evaluate(() => localStorage.getItem('defaultTimeControl'));
        expect(stored).toBe('"5400+30"'); // useLocalStorage stores as JSON string
    });

    test('pre-fills time control from localStorage in editor dialog', async ({ page }) => {
        // Set a default time control in localStorage (useLocalStorage format is JSON)
        await page.evaluate(() => {
            localStorage.setItem('defaultTimeControl', '"5400+30"');
        });

        // Navigate to import page first
        await page.goto('/games/analysis');

        // Open the Tags tab
        await page.getByRole('button', { name: 'PGN Tags' }).click();

        // Double-click TimeControl to open the editor dialog
        const timeControlRow = page.getByRole('row', { name: 'TimeControl' });
        await timeControlRow.getByRole('gridcell').last().dblclick();

        // The TimeControlEditor dialog should open with pre-filled values
        await expect(page.getByRole('dialog', { name: 'Update Time Control' })).toBeVisible();

        // Verify the time fields show pre-filled values (01:30:00)
        // MUI TimeField uses contenteditable spans, so we check text content, not value
        await expect(page.getByRole('spinbutton', { name: 'Hours' })).toHaveText('01');
        await expect(page.getByRole('spinbutton', { name: 'Minutes' })).toHaveText('30');
        await expect(page.getByRole('spinbutton', { name: 'Seconds' })).toHaveText('00');

        // Verify the Bonus Time field shows 30 (this is a regular input, so use toHaveValue)
        await expect(page.getByRole('textbox', { name: 'Bonus Time (Sec)' })).toHaveValue('30');
    });

    test('does not override existing time control from imported game', async ({ page }) => {
        await page.goto('/games/import');

        // Set a default in localStorage (useLocalStorage format is JSON)
        await page.evaluate(() => {
            localStorage.setItem('defaultTimeControl', '"5400+30"');
        });

        // Click to show PGN import option
        await page.getByRole('button', { name: /PGN/ }).click();

        // Use a minimal PGN with TimeControl
        const pgnWithTimeControl = '[TimeControl "3600+0"]\n\n1. e4 *';

        // Fill in the PGN textarea (the dialog uses "Paste PGN" as the label)
        await page.getByRole('textbox', { name: 'Paste PGN' }).fill(pgnWithTimeControl);

        // Click Import button
        await page.getByRole('button', { name: 'Import' }).click();

        // Should be on analysis page
        await expect(page).toHaveURL('/games/analysis');

        // Open the Tags tab
        await page.getByRole('button', { name: 'PGN Tags' }).click();

        // Verify the original TimeControl is preserved (3600+0), not the localStorage default
        // Use regex since row name includes the value (e.g., "TimeControl 3600+0")
        const timeControlRow = page.getByRole('row', { name: /TimeControl/ });
        await expect(timeControlRow).toContainText('3600');
        await expect(timeControlRow).not.toContainText('5400');
    });
});
