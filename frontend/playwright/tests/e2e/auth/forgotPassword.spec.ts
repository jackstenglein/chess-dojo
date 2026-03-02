import { expect, test } from '@playwright/test';

test.describe('Forgot Password Page', () => {
    test.beforeEach(async ({ page }) => {
        // Mock Cognito forgot password response
        await page.route('**/cognito-idp.us-east-1.amazonaws.com/**', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    codeDeliveryDetails: {
                        attributeName: 'email',
                        deliveryMedium: 'EMAIL',
                        destination: 'jackstenglein+test@gmail.com',
                    },
                }),
            });
        });
        await page.goto('/forgot-password');
    });

    test('has correct content', async ({ page }) => {
        await expect(page.getByTestId('title')).toHaveText('ChessDojo');
        await expect(page.getByTestId('description')).toContainText('Enter your email');
    });

    test('links back to signin page', async ({ page }) => {
        await page.getByTestId('cancel-button').click();
        await expect(page).toHaveURL('/signin');
    });

    test('requires email to submit form', async ({ page }) => {
        await page.getByTestId('submit-button').click();
        await expect(page.locator('#email-helper-text')).toHaveText('Email is required');
    });

    test('requires an existing account to submit form', async ({ page }) => {
        // Override the route for this specific test
        await page.route('**/cognito-idp.us-east-1.amazonaws.com/**', async (route) => {
            await route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({
                    __type: 'UserNotFoundException',
                    message: 'Username/client id combination not found.',
                }),
            });
        });

        await page.locator('#email').fill('test@email.com');
        await page.getByTestId('submit-button').click();
        await expect(page.locator('#email-helper-text')).toHaveText(
            'Account with this email does not exist',
        );
    });

    test('requires code to submit second form', async ({ page }) => {
        await page.locator('#email').fill('jackstenglein+test@gmail.com');
        await page.getByTestId('submit-button').click();

        await page.locator('#password').fill('testpassword');
        await page.locator('#password-confirm').fill('testpassword');
        await page.getByTestId('submit-button').click();

        await expect(page.locator('#code-helper-text')).toHaveText('Recovery code is required');
    });

    test('requires password to be 8 characters', async ({ page }) => {
        await page.locator('#email').fill('jackstenglein+test@gmail.com');
        await page.getByTestId('submit-button').click();

        await page.locator('#code').fill('12345');
        await page.locator('#password').fill('1234567');
        await page.getByTestId('submit-button').click();

        await expect(page.locator('#password-helper-text')).toHaveText(
            'Password must be at least 8 characters',
        );
    });

    test('requires password confirm to match', async ({ page }) => {
        await page.locator('#email').fill('jackstenglein+test@gmail.com');
        await page.getByTestId('submit-button').click();

        await page.locator('#code').fill('12345');
        await page.locator('#password').fill('12345678');
        await page.locator('#password-confirm').fill('12345679');
        await page.getByTestId('submit-button').click();

        await expect(page.locator('#password-confirm-helper-text')).toHaveText(
            'Passwords do not match',
        );
    });

    test('fails for incorrect recovery code', async ({ page }) => {
        await page.locator('#email').fill('jackstenglein+test@gmail.com');
        await page.getByTestId('submit-button').click();

        // Override the route for the confirm step
        await page.route('**/cognito-idp.us-east-1.amazonaws.com/**', async (route) => {
            await route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({
                    __type: 'CodeMismatchException',
                    message: 'Incorrect recovery code.',
                }),
            });
        });

        await page.locator('#code').fill('12345');
        await page.locator('#password').fill('12345678');
        await page.locator('#password-confirm').fill('12345678');
        await page.getByTestId('submit-button').click();

        await expect(page.locator('#code-helper-text')).toHaveText('Incorrect recovery code.');
    });

    test('redirects back to signin after completion', async ({ page }) => {
        await page.locator('#email').fill('jackstenglein+test@gmail.com');
        await page.getByTestId('submit-button').click();

        await page.locator('#code').fill('12345');
        await page.locator('#password').fill('12345678');
        await page.locator('#password-confirm').fill('12345678');
        await page.getByTestId('submit-button').click();

        await expect(page.getByTestId('description')).toHaveText(
            'You can now sign in using your new password.',
        );
        await page.getByTestId('signin-button').click();
        await expect(page).toHaveURL('/signin');
    });
});
