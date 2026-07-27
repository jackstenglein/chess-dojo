import { expect, Locator, Page, test } from '@playwright/test';
import { getEnv } from '../../../lib/env';
import { interceptApi } from '../../../lib/helpers';
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

/** Desktop sidebar filters (mobile drawer keeps a hidden duplicate in the DOM). */
function visibleFilters(page: Page): Locator {
    return page.locator('[data-testid=calendar-filters]:visible').first();
}

/** Event cards rendered by the v5 scheduler. */
function calendarEvents(page: Page): Locator {
    return page.locator('[data-testid=rs-wrapper] .MuiPaper-elevation1');
}

test.describe('Calendar Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            for (const key of Object.keys(localStorage)) {
                if (key.startsWith('calendarFilters.')) {
                    localStorage.removeItem(key);
                }
            }
        });
        await interceptApi(page, 'GET', '/calendar', {
            statusCode: 200,
            body: { events },
        });
        await page.goto('/calendar');
        await expect(visibleFilters(page)).toBeVisible();
    });

    test('has correct filters', async ({ page }) => {
        const filters = visibleFilters(page);
        await expect(
            filters.getByRole('heading', { name: 'Dojo Calendars', exact: true }),
        ).toBeVisible();
        await expect(
            filters.getByRole('heading', { name: 'Bookable Meetings', exact: true }),
        ).toBeVisible();
        await expect(filters.getByRole('heading', { name: 'Cohorts', exact: true })).toBeVisible();

        await expect(page.getByTestId('calendar-settings-button')).toBeVisible();
        await page.getByTestId('calendar-settings-button').click();
        await expect(page.getByTestId('timezone-selector')).toBeVisible();
    });

    test('opens share menu and copies ICS link with current filters', async ({ page, context }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);

        await expect(page.getByTestId('calendar-share-button')).toBeVisible();
        await page.getByTestId('calendar-share-button').click();

        await expect(page.getByText('Subscribe in Google Calendar')).toBeVisible();
        await expect(
            page.getByText(
                'Follow these steps to add your ChessDojo calendar to Google Calendar. Your current filters will be applied to the calendar.',
            ),
        ).toBeVisible();
        await expect(page.getByText('Copy the calendar link below.')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Copy Calendar Link' })).toBeVisible();

        await page.getByRole('button', { name: 'Copy Calendar Link' }).click();
        await expect(page.getByRole('button', { name: 'Link copied' })).toBeVisible();

        const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
        const apiBaseUrl = getEnv('apiBaseUrl');
        expect(clipboardText).toMatch(
            new RegExp(
                `^${apiBaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/public/calendar/[^/]+/ics\\?sessions=ALL_SESSIONS&types=ALL_TYPES$`,
            ),
        );
    });

    test('ICS link includes updated session filters', async ({ page, context }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);

        const sessions = visibleFilters(page).getByTestId('my-dojo-calendar');
        await sessions.getByRole('checkbox', { name: 'Workshops' }).uncheck();
        await sessions.getByRole('checkbox', { name: 'Game & Profile Reviews' }).uncheck();
        await sessions.getByRole('checkbox', { name: 'Streams & Community Events' }).uncheck();

        await page.getByTestId('calendar-share-button').click();
        await page.getByRole('button', { name: 'Copy Calendar Link' }).click();
        await expect(page.getByRole('button', { name: 'Link copied' })).toBeVisible();

        const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
        const decoded = decodeURIComponent(clipboardText);
        expect(decoded).toContain('sessions=MEETINGS,AVAILABILITIES');
        expect(decoded).toContain('types=ALL_TYPES');
        expect(decoded).not.toContain('ALL_SESSIONS');
    });

    test('displays correct events for dojo events filter', async ({ page }) => {
        await expect(calendarEvents(page)).toHaveCount(ALL_EVENTS_COUNT);

        await visibleFilters(page)
            .getByTestId('my-dojo-calendar')
            .getByRole('checkbox', { name: 'Streams & Community Events' })
            .uncheck();
        await expect(calendarEvents(page)).toHaveCount(ALL_EVENTS_COUNT - 1);
    });

    test('displays correct events for meeting types filter', async ({ page }) => {
        await expect(calendarEvents(page)).toHaveCount(ALL_EVENTS_COUNT);

        await visibleFilters(page).getByRole('checkbox', { name: 'Classical Game' }).uncheck();
        await expect(calendarEvents(page)).toHaveCount(ALL_EVENTS_COUNT - 2);

        await visibleFilters(page).getByRole('checkbox', { name: 'Classical Game' }).check();
        await expect(calendarEvents(page)).toHaveCount(ALL_EVENTS_COUNT);
    });

    test('displays correct events for cohort filter', async ({ page }) => {
        await expect(calendarEvents(page)).toHaveCount(ALL_EVENTS_COUNT);

        await visibleFilters(page).getByText('All Cohorts').click();
        await page.locator('.MuiPopover-root').getByText('All Cohorts').click();
        await expect(calendarEvents(page)).toHaveCount(ALL_EVENTS_COUNT - 2);

        await page.locator('.MuiPopover-root').getByText('1500-1600').click();
        await expect(calendarEvents(page)).toHaveCount(ALL_EVENTS_COUNT);
    });

    test('displays correct content for availability', async ({ page }) => {
        await page.getByText('Bookable - Ricardo Alves').click({ force: true });

        await expect(
            page
                .getByTestId('availability-viewer')
                .getByRole('link')
                .filter({ has: page.getByText('Ricardo Alves (1500-1600)') }),
        ).toHaveAttribute('href', '/profile/c6f63283-044e-49db-b1ba-5b23556a0349');
        await expect(page.getByTestId('book-button').getByText('Book')).toBeVisible();
    });

    test('shows and cancels availability booker', async ({ page }) => {
        await page.getByText('Bookable - Ricardo Alves').click({ force: true });
        await page.getByTestId('book-button').click();

        await expect(page.getByTestId('availability-booker')).toBeVisible();

        await page.getByTestId('cancel-button').click();
        await expect(page.getByTestId('availability-booker')).not.toBeVisible();
    });
});
