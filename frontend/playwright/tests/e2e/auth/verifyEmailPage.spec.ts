import { expect, test } from '@playwright/test';

test.describe('Verify Email Page', () => {
    test.beforeEach(async ({ page }) => {
        // Mock Cognito signup response
        await page.route('**/cognito-idp.us-east-1.amazonaws.com/**', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    CodeDeliveryDetails: {
                        AttributeName: 'email',
                        DeliveryMedium: 'EMAIL',
                        Destination: 'test@email.com',
                    },
                }),
            });
        });

        await page.goto('/signup');
        await page.locator('#name').fill('Test Name');
        await page.locator('#email').fill('test@email.com');
        await page.locator('#password').fill('testpassword');
        await page.getByTestId('submit-button').click();

        // Wait for verification page to appear
        await expect(page.getByTestId('description')).toContainText(
            'please enter the verification code',
        );
    });

    test('has correct content', async ({ page }) => {
        await expect(page.getByTestId('title')).toHaveText('ChessDojo');
        await expect(page.getByTestId('description')).toContainText(
            'please enter the verification code',
        );
    });

    test('requires code to submit', async ({ page }) => {
        await page.getByTestId('verify-button').click();
        await expect(page.locator('#code-helper-text')).toHaveText('Verification code is required');
    });

    test('allows sending new code', async ({ page }) => {
        await page.getByTestId('resend-button').click();
        await expect(page.getByText('New verification code sent')).toBeVisible();
    });

    test('fails on incorrect code', async ({ page }) => {
        // Override route for verification failure
        await page.route('**/cognito-idp.us-east-1.amazonaws.com/**', async (route) => {
            await route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({
                    __type: 'CodeMismatchException',
                    message: 'Invalid verification code provided, please try again.',
                }),
            });
        });

        await page.locator('#code').fill('12345');
        await page.getByTestId('verify-button').click();

        await expect(page.locator('#code-helper-text')).toContainText('Invalid verification code');
    });

    test('fails on pre-existing email', async ({ page }) => {
        // Override route for alias exists error
        await page.route('**/cognito-idp.us-east-1.amazonaws.com/**', async (route) => {
            await route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({
                    __type: 'AliasExistsException',
                    message: 'Alias already exists.',
                }),
            });
        });

        await page.locator('#code').fill('12345');
        await page.getByTestId('verify-button').click();

        await expect(page.locator('#code-helper-text')).toHaveText('Alias already exists.');
        await expect(page.getByText('An account with this email already exists.')).toBeVisible();
    });
});
