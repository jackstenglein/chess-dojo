import { expect, test } from '@playwright/test';
import { getBySel, interceptApi } from '../../../lib/helpers';
import { dateMapper, Event } from '../../../lib/utils';
import { events as initialEvents } from './events';

const ALL_EVENTS_COUNT = 26;

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

test.describe('Calendar Page', () => {
    test.beforeEach(async ({ page }) => {
        await interceptApi(page, 'GET', '/calendar', {
            statusCode: 200,
            body: { events },
        });
        await page.goto('/calendar');
        await expect(page.getByText('Hide Filters')).toBeVisible();
    });

    test('has correct filters', async ({ page }) => {
        await expect(getBySel(page, 'timezone-selector')).toBeVisible();
        await expect(
            page.getByRole('heading', { name: 'My Dojo Calendar', exact: true }),
        ).toBeVisible();
        await expect(
            page.getByRole('heading', { name: 'DojoLiga Tournaments', exact: true }),
        ).toBeVisible();
        await expect(
            page.getByRole('heading', { name: 'Bookable Meetings', exact: true }),
        ).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Cohorts', exact: true })).toBeVisible();
    });

    test('displays correct events for tournament filters', async ({ page }) => {
        await expect(page.locator('.rs__event__item')).toHaveCount(ALL_EVENTS_COUNT);

        await getBySel(page, 'dojoliga-tournaments').click();
        await page.locator('.MuiPopover-root').getByText('Rapid').click();
        await page.locator('.MuiPopover-root').getByText('Classical').click();
        await expect(page.locator('.rs__event__item')).toHaveCount(12);

        await page.locator('.MuiPopover-root').getByText('Rapid').click();
        await page.locator('.MuiPopover-root').getByText('Classical').click();
        await expect(page.locator('.rs__event__item')).toHaveCount(3);
    });

    test('displays correct events for dojo events filter', async ({ page }) => {
        await expect(page.locator('.rs__event__item')).toHaveCount(ALL_EVENTS_COUNT);

        await getBySel(page, 'my-dojo-calendar').click();
        await page.locator('.MuiPopover-root').getByText('Availabilities').click();
        await page.locator('.MuiPopover-root').getByText('Meetings').click();
        await page.locator('.MuiPopover-root').getByText('Coaching Sessions').click();
        await expect(page.locator('.rs__event__item')).toHaveCount(ALL_EVENTS_COUNT - 1);
    });

    test('displays correct events for meeting types filter', async ({ page }) => {
        await expect(page.locator('.rs__event__item')).toHaveCount(ALL_EVENTS_COUNT);

        await getBySel(page, 'calendar-filters').getByText('All Types').click();
        await page.locator('.MuiPopover-root').getByText('All Types').click();
        await expect(page.locator('.rs__event__item')).toHaveCount(ALL_EVENTS_COUNT - 2);

        await page.locator('.MuiPopover-root').getByText('Classical Game').click();
        await expect(page.locator('.rs__event__item')).toHaveCount(ALL_EVENTS_COUNT);
    });

    test('displays correct events for cohort filter', async ({ page }) => {
        await expect(page.locator('.rs__event__item')).toHaveCount(ALL_EVENTS_COUNT);

        await getBySel(page, 'calendar-filters').getByText('All Cohorts').click();
        await page.locator('.MuiPopover-root').getByText('All Cohorts').click();
        await expect(page.locator('.rs__event__item')).toHaveCount(ALL_EVENTS_COUNT - 2);

        await page.locator('.MuiPopover-root').getByText('1500-1600').click();
        await expect(page.locator('.rs__event__item')).toHaveCount(ALL_EVENTS_COUNT);
    });

    test('displays correct content for availability', async ({ page }) => {
        await getBySel(page, 'dojoliga-tournaments').click();
        await page.locator('.MuiPopover-root').getByText('All Time Controls').click();
        await page.locator('.MuiBackdrop-root').click({ force: true });
        await expect(page.locator('.MuiPopover-root')).not.toBeVisible();

        await page.getByText('Bookable - Ricardo Alves').click({ force: true });

        await expect(
            getBySel(page, 'availability-viewer')
                .getByRole('link')
                .filter({ has: page.getByText('Ricardo Alves (1500-1600)') }),
        ).toHaveAttribute('href', '/profile/c6f63283-044e-49db-b1ba-5b23556a0349');
        await expect(getBySel(page, 'book-button').getByText('Book')).toBeVisible();
    });

    test('shows and cancels availability booker', async ({ page }) => {
        await getBySel(page, 'dojoliga-tournaments').click();
        await page.locator('.MuiPopover-root').getByText('All Time Controls').click();
        await page.locator('.MuiBackdrop-root').click({ force: true });
        await expect(page.locator('.MuiPopover-root')).not.toBeVisible();

        await page.getByText('Bookable - Ricardo Alves').click({ force: true });
        await getBySel(page, 'book-button').click();

        await expect(getBySel(page, 'availability-booker')).toBeVisible();

        await getBySel(page, 'cancel-button').click();
        await expect(getBySel(page, 'availability-booker')).not.toBeVisible();
    });
});
