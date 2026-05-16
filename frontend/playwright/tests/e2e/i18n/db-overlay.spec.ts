import { expect, test } from '@playwright/test';

test.describe('DB overlay - course titles per locale', () => {
    test('english /courses course titles are plain (no [T] prefix)', async ({ page }) => {
        await page.goto('/en/courses');

        const firstTitle = page.getByRole('heading', { level: 5 }).first();
        await expect(firstTitle).toBeVisible({ timeout: 15000 });
        await expect(firstTitle).not.toHaveText(/^\[T\]/);
    });

    test('pseudo /courses course titles show [T] prefix', async ({ page }) => {
        test.skip(
            true,
            'No pseudo course-title translations seeded in the test DB; unskip when seed data lands.',
        );
        await page.goto('/pseudo/courses');

        const firstTitle = page.getByRole('heading', { level: 5 }).first();
        await expect(firstTitle).toBeVisible({ timeout: 15000 });
        await expect(firstTitle).toHaveText(/^\[T\]/);
    });
});
