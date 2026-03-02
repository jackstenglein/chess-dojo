# Contribution Guide

First things first, projects like this are made possible by people like you, so thank you! See something you can fix? Here's how to get started.

## Reserving an Issue

When you find an issue that you want to work on, make sure to first comment on it. This way other people know you are working on it and do not duplicate work with you. If you stop working on the issue, please comment that as well or unassign yourself from the issue.

## Commit Messages

This project prefers [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/#summary), although it is not a strict requirement. The `scope` in the commit message should be the issue number that you are working on. If there is no issue related to your change, either open one or use the general area of code that your change targets (Ex: `api`, `frontend`, `profile`, etc.) as the scope.

## Opening a Pull Request

Commits to `main` deploy automatically to the production instance of the website. It is very rare that we will merge PRs directly into `main`. Instead, please open your PRs against the `dev` branch. We generally stage changes in this branch for final testing before merging to `main`. When you open the PR, please fill out the template, and please include a screenshot or screen recording which demonstrates your change if applicable.

## Frontend Development

This project uses a shared backend environment (named `dev`) for development, which your local frontend instance will connect to by default. The `dev` backend environment mirrors the production backend environment, but has its own database. You can create an account using sign in with Google or with email/password, just like you would on the real site.

To run the frontend locally, run the following commands in the `frontend/` directory:

-   `npm i` => install dependencies
-   `npm run dev` => will start the development environment on localhost:3000 by default
-   If you plan to also do backend development, you will want to create a `.env.development.local` file and override some of the values in `.env.development`.

### Creating a Paid Account

If you need to test features which are only available on the paid tiers, you can easily create a paid account. Simply navigate to the payment page like you would in the production site. When you need to enter payment details, use [Stripe's test mode credit cards](https://docs.stripe.com/testing#cards) to bypass the payment page.

### Testing

Our tests are mainly end to end tests written in [Playwright](https://playwright.dev/). We also have some unit tests which use [vitest](https://vitest.dev/). All frontend changes should have either Playwright or unit tests (or both) associated with them. You can run all tests locally by running `npm run test` in the `frontend` directory.

#### End to End Tests

To run just the Playwright tests, you can run `npm run test:playwright` in the `frontend` directory. The tests will use the already running server on `localhost:3000` or start one if nothing is running. It is highly recommended to serve a NextJS build (`npm run start:test`) instead of using the development server, or else many of the playwright tests may timeout.

By deafult, the Playwright tests use a shared test account whose credentials are located in `frontend/.env.test`. If you want to use a different account when running your Playwright tests locally, you can add the following environment variables to `frontend/.env.test.local`:

- `TEST_ACCOUNT_USERNAME` - The username of the test account on the ChessDojo site
- `TEST_ACCOUNT_EMAIL` - The email the test account uses to login
- `TEST_ACCOUNT_PASSWORD` - The password the test account uses to login

Please write your tests to be agnostic to the test account which is running them. Note that some of the older Playwright tests do not follow this rule and expect the test account to be in a certain cohort or have other specific attributes. If you encounter such a test and these assumptions break your own test, please fix the existing test.

If you need to run a test as a free user, you can use the `useFreeTier` function in `playwright/lib/helpers.ts`. Similarly, you can use `useAdminUser` if you need to run a test as an admin user.

You can read more about setting up Playwright and our specific structure [here](../frontend/playwright/README.md).

#### Unit Tests

You can run just the unit tests with `npm run test:unit`.

## Backend Development

For historical reasons, our backend is deployed using V3 of the [serverless framework](https://www.serverless.com/). This is an unfortunate piece of technical debt that we hope to eventually migrate to AWS CDK (if some brave soul wants to work on this, that would be greatly appreciated). Serverless can be quite difficult to deploy because it does not handle dependencies between some types of resources correctly. When first bootstrapping everything, it sometimes requires commenting out some resources, deploying, uncommenting the resources and deploying again. To deploy your own version of the backend, follow the instructions in `backend/README.md`.

If you are unable to deploy your own instance of the backend but need to test changes in dev, open a draft PR and ping `@jackstenglein` in Discord to push the changes to dev.

## Style Guide

You can view our style guide [here](style.md).
