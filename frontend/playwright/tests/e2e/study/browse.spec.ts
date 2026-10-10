import { expect, Page, test } from '@playwright/test';
import { getEnv } from '../../../lib/env';

/**
 * Browse mode opens a course in the reader without a task. Nothing is timed or
 * counted, so the spec writes nothing and needs no cleanup. It picks the first
 * opening course included with the subscription; a free-tier account skips.
 */
const API = getEnv('apiBaseUrl');

async function idToken(page: Page): Promise<string> {
    const cookies = await page.context().cookies();
    const cookie = cookies.find((c) => c.name.endsWith('.idToken'));
    if (!cookie) throw new Error('no id token cookie');
    return cookie.value;
}

async function readableCourse(page: Page) {
    const headers = { Authorization: `Bearer ${await idToken(page)}` };
    const user = (await (await page.request.get(`${API}/user`, { headers })).json()) as {
        subscriptionStatus?: string;
    };
    test.skip(
        user.subscriptionStatus !== 'SUBSCRIBED',
        'the test account is not subscribed, so no course is readable',
    );
    let startKey: string | undefined;
    do {
        const list = (await (
            await page.request.get(`${API}/courses/OPENING`, {
                headers,
                params: startKey ? { startKey } : undefined,
            })
        ).json()) as {
            courses: { id: string; name: string; includedWithSubscription: boolean }[];
            lastEvaluatedKey?: string;
        };
        const course = list.courses.find((c) => c.includedWithSubscription);
        if (course) return course;
        startKey = list.lastEvaluatedKey || undefined;
    } while (startKey);
    test.skip(true, 'no opening course is included with the subscription on dev');
    throw new Error('unreachable');
}

test.describe('Browse mode', () => {
    test('opens a course in the reader with no session row', async ({ page }) => {
        const course = await readableCourse(page);
        await page.goto(`/study/course/OPENING/${course.id}`);

        await expect(page.getByTestId('study-catalog')).toBeVisible();
        await expect(page.getByTestId('study-item').first()).toBeVisible();
        await expect(page.getByTestId('study-catalog')).toContainText(course.name);
        await expect(page.getByTestId('study-catalog-progress')).toBeVisible();
        await expect(page.getByTestId('chessground-board').first()).toBeVisible();

        await expect(page.getByTestId('study-panel')).toBeVisible();
        await expect(page.getByTestId('study-browse-notice')).toBeVisible();
        await expect(page.getByTestId('study-mark-done')).toHaveCount(0);
        await expect(page.getByTestId('study-start-timer')).toHaveCount(0);
        await expect(page.getByTestId('study-pause-timer')).toHaveCount(0);

        await page.getByTestId('study-catalog-collapse').click();
        await expect(page.getByTestId('study-catalog')).toHaveCount(0);
        await expect(page.getByTestId('study-catalog-expand')).toBeVisible();
        await page.getByTestId('study-catalog-expand').click();
        await expect(page.getByTestId('study-catalog')).toBeVisible();
    });
});
