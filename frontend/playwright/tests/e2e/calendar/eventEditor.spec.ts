import { expect, Page, test } from '@playwright/test';
import { findBySel, getBySel, interceptApi, useFreeTier } from '../../../lib/helpers';
import { dateMapper, Event } from '../../../lib/utils';
import { events as initialEvents } from './events';

function fixEventDates(events: Event[]) {
    return events.map((event) => {
        const startDate = event.startTime.slice(0, 10);
        const endDate = event.endTime.slice(0, 10);

        return {
            ...event,
            startTime: event.startTime.replace(startDate, dateMapper[startDate]),
            endTime: event.endTime.replace(endDate, dateMapper[endDate]),
        };
    });
}

const events = fixEventDates(initialEvents);

async function openEventEditor(page: Page) {
    await page.locator('.rs__cell:not(.rs__header):not(.rs__time)').first().click();
}

test.describe('Event Editor', () => {
    test.beforeEach(async ({ page }) => {
        await interceptApi(page, 'GET', '/calendar', {
            statusCode: 200,
            body: { events },
        });
        await page.goto('/calendar');
        await expect(page.getByText('Hide Filters')).toBeVisible();
    });

    test('prevents free users from adding events', async ({ page }) => {
        await useFreeTier(page);
        await page.goto('/calendar');
        await expect(page.getByText('Hide Filters')).toBeVisible();

        await openEventEditor(page);
        await expect(getBySel(page, 'upsell-dialog')).toBeVisible();
        await page.unrouteAll({ behavior: 'ignoreErrors' });
    });

    test('shows and hides event editor', async ({ page }) => {
        await openEventEditor(page);
        await expect(getBySel(page, 'event-editor')).toBeVisible();

        await getBySel(page, 'cancel-button').click();
        await expect(getBySel(page, 'event-editor')).not.toBeVisible();
    });

    test('contains correct content', async ({ page }) => {
        await openEventEditor(page);

        await expect(getBySel(page, 'event-title-textfield')).toBeVisible();
        await expect(getBySel(page, 'location-textfield')).toBeVisible();
        await expect(getBySel(page, 'description-textfield')).toBeVisible();
        await expect(getBySel(page, 'participants-textfield')).toBeVisible();
    });

    test('selects default cohorts on open', async ({ page }) => {
        await openEventEditor(page);

        await expect(getBySel(page, 'event-editor').getByText('1400-1500')).toBeVisible();
        await expect(getBySel(page, 'event-editor').getByText('1500-1600')).toBeVisible();
        await expect(getBySel(page, 'event-editor').getByText('1600-1700')).toBeVisible();
        await expect(getBySel(page, 'event-editor').getByText('1700-1800')).not.toBeVisible();
    });

    test('requires at least one type to save', async ({ page }) => {
        await openEventEditor(page);

        await getBySel(page, 'save-button').click();

        await expect(
            getBySel(page, 'event-editor').getByText('At least one type is required'),
        ).toBeVisible();
    });

    test('requires at least one cohort to save', async ({ page }) => {
        await openEventEditor(page);

        await findBySel(getBySel(page, 'event-editor'), 'cohort-selector').click();

        await page.locator('.MuiPopover-root').getByText('All Cohorts').click();
        await page.locator('.MuiPopover-root').getByText('All Cohorts').click();
        await page.locator('.MuiBackdrop-root').last().click({ force: true });
        await getBySel(page, 'save-button').click();

        await expect(
            getBySel(page, 'event-editor').getByText('At least one cohort is required'),
        ).toBeVisible();
    });

    test('creates and deletes availability', async ({ page }) => {
        await openEventEditor(page);

        await getBySel(page, 'availability-type-selector').click();
        await page.locator('.MuiPopover-root').getByText('All Types').click();
        await page.locator('.MuiBackdrop-root').last().click({ force: true });
        await getBySel(page, 'save-button').click();

        await page.getByText('Available - Group').click();

        await expect(
            getBySel(page, 'availability-viewer').getByText('Number of Participants'),
        ).toBeVisible();
        await expect(getBySel(page, 'availability-viewer').getByText('0 / 100')).toBeVisible();
        await expect(
            getBySel(page, 'availability-viewer').getByText('Available Types'),
        ).toBeVisible();
        await expect(getBySel(page, 'availability-viewer').getByText('Cohorts')).toBeVisible();
        await expect(getBySel(page, 'book-button')).not.toBeVisible();

        await page.locator('.rs__popper_actions').getByRole('button').last().click();
        await page.getByText('DELETE').click();

        await expect(page.getByText('Availability deleted')).toBeVisible();
    });
});
