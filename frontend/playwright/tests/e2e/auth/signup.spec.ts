import { expect, test } from '@playwright/test';

test.describe('Signup Page', () => {
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
    });

    test('has correct content', async ({ page }) => {
        await expect(page.getByTestId('title')).toHaveText('ChessDojo');
    });

    test('should link to signin', async ({ page }) => {
        await page.getByTestId('signin-button').click();
        await expect(page).toHaveURL('/signin');
    });

    test('requires name to submit form', async ({ page }) => {
        await page.locator('#email').fill('test@email.com');
        await page.locator('#password').fill('testpassword');
        await page.getByTestId('submit-button').click();
        await expect(page.locator('#name-helper-text')).toHaveText('Name is required');
    });

    test('requires email to submit form', async ({ page }) => {
        await page.locator('#name').fill('Test Name');
        await page.locator('#password').fill('testpassword');
        await page.getByTestId('submit-button').click();
        await expect(page.locator('#email-helper-text')).toHaveText('Email is required');
    });

    test('requires password to submit form', async ({ page }) => {
        await page.locator('#name').fill('Test Name');
        await page.locator('#email').fill('test@email.com');
        await page.getByTestId('submit-button').click();
        await expect(page.locator('#password-helper-text')).toHaveText('Password is required');
    });

    test('shows email verification after submit', async ({ page }) => {
        await page.locator('#name').fill('Test Name');
        await page.locator('#email').fill('test@email.com');
        await page.locator('#password').fill('testpassword');
        await page.getByTestId('submit-button').click();
        await expect(page.getByTestId('description')).toContainText(
            'please enter the verification code',
        );
    });
});
