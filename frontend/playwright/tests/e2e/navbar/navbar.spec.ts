import { expect, test } from '@playwright/test';

const navbarStartItems = [
    'Training Plan',
    'Games',
    'Calendar',
    'Tournaments',
    'Live Classes',
    'Learn',
    'Social',
    'Shop',
];

const navbarEndItems = ['Help', 'Search Users', 'Timer', 'Notifications', 'navbar-profile-button'];

const viewPortWidths = [
    { width: 1501, hidden: 0, endHidden: 0 },
    { width: 1499, hidden: 2, endHidden: 0 },
    { width: 1340, hidden: 3, endHidden: 0 },
    { width: 1216, hidden: 4, endHidden: 0 },
    { width: 999, hidden: 5, endHidden: 0 },
    { width: 809, hidden: 6, endHidden: 0 },
    { width: 679, hidden: 6, endHidden: 1 },
    { width: 639, hidden: 6, endHidden: 2 },
    { width: 583, hidden: 6, endHidden: 3 },
    { width: 566, hidden: 6, endHidden: 4 },
    { width: 541, hidden: 6, endHidden: 5 },
    { width: 449, hidden: 8, endHidden: 5 },
];

test.describe('Navbar (unauthenticated)', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('should have limited options when unauthenticated', async ({ page }) => {
        await page.setViewportSize({ width: 1200, height: 660 });
        await page.goto('/');

        const navbar = page.getByTestId('navbar');
        await expect(navbar.getByText('Live Classes')).toBeVisible();
        await expect(navbar.getByText('Tournaments')).toBeVisible();
        await expect(navbar.getByText('Blog')).toBeVisible();
        await expect(navbar.getByText('Shop')).toBeVisible();
        await expect(navbar.getByText('Sign In')).toBeVisible();
        await expect(navbar.getByText('Sign Up')).toBeVisible();
        await expect(navbar.getByText('Profile')).not.toBeVisible();
        await expect(navbar.getByText('Sign Out')).not.toBeVisible();

        // Test mobile menu
        await page.setViewportSize({ width: 449, height: 660 });
        await page.getByTestId('navbar-more-button').click();

        const menu = page.locator('#menu-appbar');
        await expect(menu.getByRole('menuitem', { name: /Live Classes/ })).toBeVisible();
        await expect(menu.getByRole('menuitem', { name: 'Tournaments' })).toBeVisible();
        await expect(menu.getByRole('menuitem', { name: 'Blog' })).toBeVisible();
        await expect(menu.getByRole('menuitem', { name: 'Shop' })).toBeVisible();
        await expect(menu.getByRole('menuitem', { name: 'Sign In' })).toBeVisible();
        await expect(menu.getByRole('menuitem', { name: 'Sign Up' })).toBeVisible();
        await expect(menu.getByRole('menuitem', { name: 'Profile' })).not.toBeVisible();
    });
});

test.describe('Navbar (authenticated)', () => {
    for (const { width, hidden, endHidden } of viewPortWidths) {
        test(`shows correct authenticated items with ${width}px width`, async ({ page }) => {
            await page.setViewportSize({ width, height: 660 });
            await page.goto('/profile');

            const navbar = page.getByTestId('navbar');

            // Check visible start items
            const visibleStartItems = navbarStartItems.slice(0, navbarStartItems.length - hidden);
            for (const item of visibleStartItems) {
                await expect(navbar.getByText(item, { exact: false })).toBeVisible();
            }

            // Check visible end items
            const visibleEndItems = navbarEndItems.slice(endHidden);
            for (const item of visibleEndItems) {
                await expect(page.getByTestId(item)).toBeVisible();
            }

            // Check hidden items in menu
            if (hidden > 0) {
                await page.getByTestId('navbar-more-button').click();
                const menu = page.locator('#menu-appbar');

                const hiddenStartItems = navbarStartItems.slice(navbarStartItems.length - hidden);
                for (const item of hiddenStartItems) {
                    await expect(menu.getByRole('menuitem', { name: item })).toBeVisible();
                }

                const hiddenEndItems = navbarEndItems.slice(0, endHidden);
                for (const item of hiddenEndItems) {
                    if (item !== 'navbar-profile-button') {
                        await expect(menu.getByRole('menuitem', { name: item })).toBeVisible();
                    }
                }
            }
        });
    }
});
