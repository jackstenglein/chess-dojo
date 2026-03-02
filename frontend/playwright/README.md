# Playwright E2E Tests

End-to-end tests for the ChessDojo frontend using [Playwright](https://playwright.dev/).

## Setup

1. Install dependencies (from the `frontend` directory):

    ```bash
    npm install
    ```

2. Install Playwright browsers:

    ```bash
    npx playwright install
    ```

3. Create a `.env.test.local` file in the `frontend` directory with test credentials:
    ```
    AWS_COGNITO_USERNAME=your-test-email@example.com
    AWS_COGNITO_PASSWORD=your-test-password
    ```

## Running Tests

From the `frontend` directory:

```bash
# Run all tests
npm run test:playwright

# Run tests with UI mode (interactive)
npm run test:playwright:ui

# Run a specific test file
npx playwright test --config=playwright/playwright.config.ts tests/e2e/games/settings/defaultTimeControl.spec.ts
```

## Project Structure

```
playwright/
├── playwright.config.ts    # Playwright configuration
├── tests/
│   ├── setup/
│   │   └── auth.setup.ts   # Authentication setup (runs before tests)
│   └── e2e/
│       └── games/
│           └── settings/
│               └── defaultTimeControl.spec.ts
└── .auth/                  # Auth state storage (gitignored)
```

## Test Projects

The configuration defines two test projects:

1. **setup** - Handles authentication by logging in via the UI and saving session state
2. **e2e** - Runs the actual E2E tests using the saved authentication state

## Authentication

Tests use browser-based authentication:

1. The setup project navigates to `/signin`
2. Fills in credentials from environment variables
3. Saves the authenticated session to `.auth/user.json`
4. E2E tests reuse this session state

## Writing Tests

Tests should:

- Use Playwright's [locator API](https://playwright.dev/docs/locators) for element selection
- Prefer role-based locators (`getByRole`, `getByLabel`, `getByText`)
- Set the `data-testid` attribute on the DOM element and user `page.getByTestId` when role-based locators aren't specific enough

Example:

```typescript
import { test, expect } from '@playwright/test';

test('example test', async ({ page }) => {
    await page.goto('/games/import');
    await page.getByRole('button', { name: /Starting Position/ }).click();
    await expect(page).toHaveURL('/games/analysis');
});
```

## Debugging

```bash
# Run with headed browser
npx playwright test --config=playwright/playwright.config.ts --headed

# Run with debug mode (step through)
npx playwright test --config=playwright/playwright.config.ts --debug

# View test report after running
npx playwright show-report
```
