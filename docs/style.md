# Style Guide

This document describes coding patterns and conventions used in the chess-dojo repository. Follow these when adding or modifying code.

---

## TypeScript & ESLint

- **Strictness**: Use TypeScript strict mode. ESLint extends `strictTypeChecked` and `stylisticTypeChecked` from typescript-eslint.
- **Unused identifiers**: Prefix with `_` to ignore (e.g. `_err`, `argsIgnorePattern: '^_'`).
- **Console**: No `console` in `frontend/src` code (ESLint `no-console: error`). Instead use the logger file located at `frontend/src/logging`. `console` is allowed in backend Lambda handlers and in `playwright/**` tests.
- **Deprecated APIs**: Avoid; `@typescript-eslint/no-deprecated` is set to `warn`.

---

## Naming

| Kind | Convention | Example |
|------|------------|---------|
| React components | PascalCase | `DeleteGameButton`, `DeleteGamesDialog` |
| Component files | PascalCase | `DeleteGameButton.tsx`, `ClockEditor.tsx` |
| Hooks | camelCase with `use` prefix | `useRouter`, `useRequest` |
| API / utils / non-component modules | camelCase | `notificationApi.ts`, `axiosService.ts` |
| Props interface | `PascalCase` + `Props` suffix | `DeleteGameButtonProps` |
| E2E test selectors (`data-cy`) | kebab-case | `delete-game-button`, `clear-all-notifications` |
| Backend Lambda handlers | Export `handler` | `export const handler: APIGatewayProxyHandlerV2 = async (event) => { ... }` |
| Backend service folders | camelCase + `Service` suffix | `blogService`, `directoryService` |

---

## Frontend

### Paths & imports

- Use the **`@/`** path alias for `src/` (e.g. `@/database/game`, `@/hooks/useRouter`, `@/components/navigation/Link`).
- Prefer `@/` for app-level modules; relative imports (`../`, `../../`) are used for nearby or sibling modules (e.g. within the same feature).

### React components

- Do not use `React.FC<Props>`. This pattern was used earlier in the codebase but is now avoided. Instead just define the type of props inline or create an interface.
- **Named export** for all exports. Default exports were used earlier in the codebase but are now avoided.
- Destructure props in the function signature (this is not always necessary).
- Use **single quotes** for JSX attribute values where possible (e.g. `data-cy='delete-game-button'`, `color='error'`, `variant='h5'`). Use double quotes when the string contains a single quote.

### UI & layout

- Use **MUI (Material-UI)** for components (`@mui/material`, `@mui/icons-material`, `@mui/lab`).
- Use MUI’s `sx` prop for most styling; shared styles live in `frontend/src/style/` or theme.

### API & request state

- Use **`useRequest<T>()`** for request lifecycle state.
- Avoid **`useApi`**. This hook was used frequently throughout the codebase but is now deprecated.
- Show errors with **`<RequestSnackbar request={request} />`**.
- Call `request.onStart()`, `request.onSuccess(data)`, or `request.onFailure(err)` around API calls.

### E2E testability

- Add **`data-cy`** attributes to elements that tests need to target (e.g. buttons, forms, key sections).
- Use **kebab-case** for `data-cy` values: `data-cy='delete-game-confirm-button'`.

### Documentation

- Add **JSDoc** for public helpers, non-obvious behavior, and exported types used across modules (e.g. in `database/`, API modules).

### Formatting

- Run `npm run format` in `frontend` to automatically format your files using Prettier.


---

## API layer (frontend)

- One **API module per domain** (e.g. `notificationApi.ts`, `gameApi.ts`).
- Call **`axiosService`** with a `functionName` option for logging and analytics:  
  `axiosService.get('/user/notifications', { ..., functionName: 'listNotifications' })`. `axiosService` also handles automatically adding the user's authentication tokens to the request.
- If the request does not require the user to be authenticated, prefix the URL path with `/public/`.
- Do not export an interface for the API context type (e.g. `NotificationApiContextType`) or **standalone functions** that take `idToken` as the first argument. This pattern was previously used but is now deprecated in favor of standalone functions which do not take the `idToken` argument and instead rely on `axiosService` to handle auth.
- Define **response types** as interfaces (e.g. `ListNotificationsResponse`) and document fields with JSDoc.


---

## Backend (Lambda / Node)

- Prefer TypeScript for all new backend code, unless there is a specific open-source package necessary or some other reason to use a different language.
- Put **`'use strict';`** at the top of each handler/entry file.
- Export the Lambda entry as **`handler`** with type **`APIGatewayProxyHandlerV2`**.
- Use shared helpers from **`api.ts`** (or equivalent in the service):
  - **`ApiError`** for HTTP errors (statusCode, publicMessage, optional privateMessage/cause).
  - **`errToApiGatewayProxyResultV2(err)`** in the catch block.
  - **`success(value)`** for 200 JSON responses.
  - **`getUserInfo(event)`** / **`requireUserInfo(event)`** for auth.
  - **`parsePathParameters(event, schema)`** / **`parseBody(event, schema)`** for request validation.
- Define **request/response shapes** and validation in the **common** package (Zod); backend imports schemas from `@jackstenglein/chess-dojo-common/...` (e.g. `getBlogRequestSchema`, `createBlogRequestSchema`).
- One **service folder** per domain (e.g. `blogService/`, `directoryService/`) with files like `get.ts`, `create.ts`, `update.ts`, `database.ts`, and shared `api.ts` where applicable.
- Add **JSDoc** for handlers and for exported functions (e.g. `getBlog`, `createBlog`).
- If the API does not require the user to be authenticated, prefix the URL path with `/public/`.

---

## Common package

- Use **Zod** for all shared schemas: `z.object()`, `z.enum()`, etc., and export both the schema and inferred type:
  - `export const BlogSchema = z.object({ ... });`
  - `export type Blog = z.infer<typeof BlogSchema>;`
- Export **enum-like** values from the schema: `export const BlogStatuses = BlogStatusSchema.enum;`
- Add **JSDoc** on exported schemas, types, and constants.


---

## Testing

### Unit tests (Vitest)

- File naming: **`*.test.ts`** next to the module under test (e.g. `notificationApi.test.ts`).
- Use **`describe` / `it`** and **`vi.mock`** (with **`vi.hoisted`** when mocking before imports) for dependencies.
- Structure: `describe('moduleOrFile', () => { describe('functionOrBehavior', () => { it('...', () => { ... }); }); })`.

### E2E tests (Playwright)

- Tests live under **`frontend/playwright/tests/e2e/`**, grouped by feature (e.g. `auth/`, `games/`, `calendar/`).
- Use **`test.describe('Feature or Page')`** and **`test('should ...', async ({ page }) => { ... })`**.
- Use **`getBySel(page, 'data-cy-value')`** from `playwright/lib/helpers.ts` to select by `data-cy` (replacing Cypress-style `cy.getBySel`).
- Use **`getEnv(...)`** from `playwright/lib/env.ts` for environment-dependent values (e.g. credentials, API base URL).
- Use **`test.beforeEach`** for shared setup (e.g. `page.goto('/signin')`).

---

## Formatting & style details

- **Quotes**: Prefer single quotes for strings and JSX attributes; use double quotes when the string contains a single quote.
- **Semicolons**: Use them (enforced by ESLint/TypeScript config).
- **Trailing commas**: Use in multiline structures (stylisticTypeChecked).
- **Indentation**: 4 spaces (from existing code).
- Run `npm run format` in `frontend` to automatically format your files using Prettier.


---

## Summary checklist

- Types and ESLint: strict, no console in frontend, `_` for unused vars.
- Naming: PascalCase components/files, camelCase APIs/hooks, kebab-case `data-cy`.
- Frontend: `@/` imports, named exports, MUI, `useRequest` + `RequestSnackbar`, `data-cy` on test targets.
- API: one module per domain, `functionName` passed to `axoisService` in axios calls, JSDoc on public API.
- Backend: `'use strict'`, shared `api.ts` helpers, Zod from common, JSDoc on handlers and exported functions.
- Common: Zod schemas + inferred types, JSDoc on exports.
- Tests: Vitest `describe`/`it` and mocks; Playwright `getBySel`, `getEnv`, and `test.describe`/`test()`.
