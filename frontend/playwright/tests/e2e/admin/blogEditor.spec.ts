import { expect, test } from '@playwright/test';
import { getBySel, interceptApi, useAdminUser } from '../../../lib/helpers';

test.describe('Blog editor (create)', () => {
    test.beforeEach(async ({ page }) => {
        await useAdminUser(page);
        await page.goto('/admin/blog/new');
    });

    test('shows create form with all fields', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Create blog post' })).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'URL slug' })).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Subtitle' })).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Description' })).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Cover image URL' })).toBeVisible();
        await expect(page.getByRole('combobox', { name: 'Status' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Cancel' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Create post' })).toBeVisible();
    });

    test('editor has Write, Preview, List preview, and Syntax tabs', async ({ page }) => {
        await expect(page.getByRole('tab', { name: 'Write' })).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Preview', exact: true })).toBeVisible();
        await expect(page.getByRole('tab', { name: 'List preview' })).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Syntax' })).toBeVisible();
    });

    test('Syntax tab shows Game viewer section', async ({ page }) => {
        await page.getByRole('tab', { name: 'Syntax' }).click();
        await expect(page.getByText('Game viewer', { exact: true })).toBeVisible();
        await expect(
            page.getByText(/\[View game\]\(\/game:cohortId\/gameId\)/, { exact: false }),
        ).toBeVisible();
    });

    test('List preview tab shows card with title and description', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Title', exact: true }).fill('My Post');
        await page.getByRole('textbox', { name: 'Description' }).fill('Short overview.');
        await page.getByRole('tab', { name: 'List preview' }).click();
        await expect(page.getByText('How this post appears on the blog list page')).toBeVisible();
        await expect(page.getByText('My Post')).toBeVisible();
        await expect(
            getBySel(page, 'markdown-list-preview').getByText('Short overview.'),
        ).toBeVisible();
    });

    test('Preview tab shows title and subtitle with content', async ({ page }) => {
        await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Preview Title');
        await page.getByRole('textbox', { name: 'Subtitle' }).fill('Preview Subtitle');
        const editor = getBySel(page, 'markdown-editor').getByRole('textbox', {
            name: 'Write your blog post',
        });
        await editor.fill('# Heading\n\nSome content.');
        await page.getByRole('tab', { name: 'Preview', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Preview Title' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Preview Subtitle' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Heading', level: 1 })).toBeVisible();
        await expect(page.getByText('Some content.')).toBeVisible();
    });

    test('Create post button is disabled when required fields are empty', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Create post' })).toBeDisabled();

        await page.getByRole('textbox', { name: 'URL Slug' }).fill('/url-slug');
        await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Title');
        await page.getByRole('textbox', { name: 'Subtitle' }).fill('Subtitle');
        await page.getByRole('textbox', { name: 'Description' }).fill('Description');

        await expect(page.getByRole('button', { name: 'Create post' })).toBeEnabled();
    });
});

test.describe('Blog editor (edit)', () => {
    test.beforeEach(async ({ page }) => {
        await useAdminUser(page);
        await interceptApi(page, 'GET', '/blog/chessdojo/test-slug', {
            statusCode: 200,
            body: {
                owner: 'chessdojo',
                id: 'test-slug',
                title: 'Test Blog Post',
                subtitle: 'Dojo Digest • Test',
                description: 'A short overview for the list preview.',
                date: '2025-01-15',
                content: '# Hello\n\nThis is **markdown** content.',
                createdAt: '2025-01-01T00:00:00.000Z',
                updatedAt: '2025-01-15T00:00:00.000Z',
                status: 'DRAFT',
            },
        });
        await page.goto('/admin/blog/test-slug');
    });

    test('loads blog and shows edit form with prefilled data', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Edit blog post' })).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'URL slug' })).toHaveValue('test-slug');
        await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
            'Test Blog Post',
        );
        await expect(page.getByRole('textbox', { name: 'Subtitle' })).toHaveValue(
            'Dojo Digest • Test',
        );
        await expect(page.getByRole('textbox', { name: 'Description' })).toHaveValue(
            'A short overview for the list preview.',
        );
        await expect(page.getByRole('button', { name: 'Update post' })).toBeVisible();
    });

    test('URL slug is disabled when editing', async ({ page }) => {
        await expect(page.getByRole('textbox', { name: 'URL slug' })).toBeDisabled();
    });

    test('Preview tab shows loaded markdown content', async ({ page }) => {
        await page.getByRole('tab', { name: 'Preview', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Hello', level: 1 })).toBeVisible();
        await expect(page.getByText('This is')).toBeVisible();
        await expect(page.getByText('markdown', { exact: true })).toBeVisible();
        await expect(page.getByText('content.')).toBeVisible();
    });
});
