import { expect, test } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';
import { getEnv } from '../../../../lib/env';
import { getBySel, interceptApi } from '../../../../lib/helpers';

function mockHomeWithTestDir() {
    return {
        body: {
            directory: {
                owner: getEnv('username'),
                id: 'home',
                parent: '00000000-0000-0000-0000-000000000000',
                name: 'Home',
                visibility: 'PUBLIC',
                items: {
                    '2bca0358-bbfc-46f0-b28d-e850ded0ba5c': {
                        type: 'DIRECTORY',
                        id: '2bca0358-bbfc-46f0-b28d-e850ded0ba5c',
                        metadata: {
                            createdAt: '2024-08-02T17:36:22.690Z',
                            updatedAt: '2024-08-02T17:36:22.690Z',
                            visibility: 'PUBLIC',
                            name: 'Test',
                        },
                    },
                },
                itemIds: ['2bca0358-bbfc-46f0-b28d-e850ded0ba5c'],
                createdAt: '2024-07-27T16:59:32.621Z',
                updatedAt: '2024-08-07T02:24:57.001Z',
            },
            accessRole: 'OWNER',
        },
    };
}

test.describe('Directories', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/profile?view=games');
        // Wait for the Games tab content to load
        await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
    });

    test('displays empty home directory', async ({ page }) => {
        await interceptApi(page, 'GET', `/directory/${getEnv('username')}/home/v2`, {
            statusCode: 200,
            body: {
                directory: {
                    owner: getEnv('username'),
                    id: 'home',
                    parent: '00000000-0000-0000-0000-000000000000',
                    name: 'Home',
                    visibility: 'PUBLIC',
                    items: {},
                    itemIds: [],
                },
                accessRole: 'OWNER',
            },
        });
        await page.goto('/profile?view=games');

        await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
        await expect(page.getByText('No rows')).toBeVisible();
    });

    test('links to game import page', async ({ page }) => {
        await page.getByRole('button', { name: 'Add' }).click();

        await expect(page.getByRole('menuitem', { name: 'New Game' })).toHaveAttribute(
            'href',
            `/games/import?directory=home&directoryOwner=${getEnv('username')}`,
        );
    });

    test('displays new directory dialog', async ({ page }) => {
        await page.getByRole('button', { name: 'Add' }).click();
        await page.getByText('New Folder').click();
        await expect(getBySel(page, 'update-directory-form')).toBeVisible();
    });

    test('requires name to create new directory', async ({ page }) => {
        await page.getByRole('button', { name: 'Add' }).click();
        await page.getByText('New Folder').click();
        await expect(getBySel(page, 'update-directory-save-button')).toBeDisabled();

        await getBySel(page, 'update-directory-name').locator('input').fill('Test');
        await expect(getBySel(page, 'update-directory-save-button')).toBeEnabled();
    });

    test('requires name to be <= 100 characters', async ({ page }) => {
        await page.getByRole('button', { name: 'Add' }).click();
        await page.getByText('New Folder').click();
        await expect(getBySel(page, 'update-directory-save-button')).toBeDisabled();

        const input = getBySel(page, 'update-directory-name').locator('input');
        await input.fill('A');
        await expect(getBySel(page, 'update-directory-save-button')).toBeEnabled();

        await input.fill('A'.repeat(101));
        await expect(getBySel(page, 'update-directory-save-button')).toBeDisabled();
        await expect(page.getByText('101 / 100 characters')).toBeVisible();
    });

    test('requires confirmation to delete directory', async ({ page }) => {
        await interceptApi(
            page,
            'GET',
            `/directory/${getEnv('username')}/home/v2`,
            mockHomeWithTestDir(),
        );
        await page.goto('/profile?view=games');

        await getBySel(page, 'directories-data-grid')
            .getByText('Test')
            .last()
            .click({ button: 'right' });
        await page.getByText('Delete').click();

        await expect(getBySel(page, 'delete-directory-form')).toBeVisible();
        await expect(getBySel(page, 'delete-directory-button')).toBeDisabled();

        await getBySel(page, 'delete-directory-confirm').locator('input').fill('DeLeTe');
        await expect(getBySel(page, 'delete-directory-button')).toBeEnabled();
    });

    test('displays move directory dialog', async ({ page }) => {
        await interceptApi(
            page,
            'GET',
            `/directory/${getEnv('username')}/home/v2`,
            mockHomeWithTestDir(),
        );
        await page.goto('/profile?view=games');

        await getBySel(page, 'directories-data-grid')
            .getByText('Test')
            .last()
            .click({ button: 'right' });
        await page.getByText('Move').click();

        await expect(getBySel(page, 'move-directory-form')).toBeVisible();
    });

    test('disables renaming directory to empty/same name', async ({ page }) => {
        await interceptApi(
            page,
            'GET',
            `/directory/${getEnv('username')}/home/v2`,
            mockHomeWithTestDir(),
        );
        await page.goto('/profile?view=games');

        await getBySel(page, 'directories-data-grid')
            .getByText('Test')
            .last()
            .click({ button: 'right' });
        await page.getByText('Edit Name/Visibility').click();

        await getBySel(page, 'update-directory-name').locator('input').fill('');
        await expect(getBySel(page, 'update-directory-save-button')).toBeDisabled();

        await getBySel(page, 'update-directory-name').locator('input').fill('Test');
        await expect(getBySel(page, 'update-directory-save-button')).toBeDisabled();

        await getBySel(page, 'update-directory-name').locator('input').fill('Test 2');
        await expect(getBySel(page, 'update-directory-save-button')).toBeEnabled();
    });

    test('creates and deletes directory', async ({ page }) => {
        const name = uuidv4();

        await page.getByRole('button', { name: 'Add' }).click();
        await page.getByText('New Folder').click();

        await getBySel(page, 'update-directory-name').locator('input').fill(name);
        await getBySel(page, 'update-directory-save-button').click();
        await expect(getBySel(page, 'update-directory-form')).not.toBeVisible();
        await expect(getBySel(page, 'directories-data-grid').getByText(name).last()).toBeVisible();

        await getBySel(page, 'directories-data-grid')
            .getByText(name)
            .last()
            .click({ button: 'right' });
        await page.getByText('Delete').click();

        await getBySel(page, 'delete-directory-confirm').locator('input').fill('DeLeTe');
        await getBySel(page, 'delete-directory-button').click();

        await expect(getBySel(page, 'delete-directory-form')).not.toBeVisible();
        await expect(
            getBySel(page, 'directories-data-grid').getByText(name).last(),
        ).not.toBeAttached();
    });
});
