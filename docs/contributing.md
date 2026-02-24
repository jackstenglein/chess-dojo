# Contribution Guide

First things first, projects like this are made possible by people like you, so thank you! See something you can fix? Here's how to get started.

## Reserving an Issue

When you find an issue that you want to work on, make sure to first comment on it. This way other people know you are working on it and do not duplicate work with you. If you stop working on the issue, please comment that as well or unassign yourself from the issue.

## Frontend Development

This project uses a shared backend environment (named `dev`) for development, which your local frontend instance will connect to by default. The `dev` backend environment mirrors the production backend environment, but has its own database. You can create an account using sign in with Google or with email/password, just like you would on the real site.

To run the frontend locally, run the following commands in the `frontend/` directory:

-   `npm i` => install dependencies
-   `npm run dev` => will start the development environment on localhost:3000 by default
-   If you plan to also do backend development, you will want to create a `.env.development.local` file and override some of the values in `.env.development`.

### Creating a Paid Account

If you need to test features which are only available on the paid tiers, you can easily create a paid account. Simply navigate to the payment page like you would in the production site. When you need to enter payment details, use [Stripe's test mode credit cards](https://docs.stripe.com/testing#cards) to bypass the payment page.

## Backend Development

For historical reasons, our backend is deployed using V3 of the [serverless framework](https://www.serverless.com/). This is an unfortunate piece of technical debt that we hope to eventually migrate to AWS CDK (if some brave soul wants to work on this, that would be greatly appreciated). Serverless can be quite difficult to deploy because it does not handle dependencies between some types of resources correctly. When first bootstrapping everything, it sometimes requires commenting out some resources, deploying, uncommenting the resources and deploying again. To deploy your own version of the backend, follow the instructions in `backend/README.md`.

If you are unable to deploy your own instance of the backend but need to test changes in dev, open a draft PR and ping `@jackstenglein` in Discord to push the changes to dev.

## Opening a Pull Request

Commits to `main` deploy automatically to the production instance of the website. It is very rare that we will merge PRs directly into `main`. Instead, please open your PRs against the `dev` branch. We generally stage changes in this branch for final testing before merging to `main`. When you open the PR, please fill out the template, and please include a screenshot or screen recording which demonstrates your change if applicable.

## Style Guide

You can view our style guide [here](docs/style.md).
