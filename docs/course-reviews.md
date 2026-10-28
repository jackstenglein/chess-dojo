# Course ratings and reviews

Implemented on `course-ratings-reviews`, based on upstream production `main` at
`91830dcc`. No deployment is part of these changes.

## Behavior

- Active Core (`BASIC`), Lecture, and Game Review members can review any published course.
- A signed-in purchaser can review the specific course they own, including with an expired or free membership.
- Submitting feedback is optional. Every submission requires 1–5 whole stars and a non-blank written review (maximum 5000 characters).
- After submitting, the author sees their saved review. **Edit review** opens the editor, with **Save changes** and **Cancel** actions. Link instructions appear in an info-icon tooltip.
- Each account has one submission per course. Saving again replaces it. Removing deletes both its stars and text.
- Former members can remove their own submission even when they can no longer submit one.
- Everyone can see the average rating, rating count, and written reviews on the course and purchase pages.
- Course listing cards show a read-only star average out of five and the number of ratings, including existing ratings from before text was required. Unrated courses show no rating summary.
- Anonymous purchasers must sign in and sync their purchase to contribute, using the existing purchase synchronization flow.

## Local demo without AWS

Set `NEXT_PUBLIC_COURSE_REVIEWS_DEMO=true` in
`frontend/.env.development.local` and start the frontend development server.
This option is ignored in production builds. It is enabled in this local checkout.

Open a course and scroll to **Ratings and reviews**. The blue demo notice confirms
that the form uses a simulated eligible reviewer and saves only to this browser's
local storage. Try a rating with written text, edits, reload, and removal. Demo
reviews are separate for each course. No review requests reach AWS in this mode.
Real account eligibility still needs the development backend and is covered by
backend tests; demo mode intentionally lets you inspect the form without an
eligible account. Remove the flag or set it to `false` to return to real API calls.

## Browser testing

With demo mode disabled, the frontend uses the shared development backend by default. The new `reviews`
Lambda routes and `${stage}-course-reviews` DynamoDB table in
`backend/courseService/serverless.yml` must be deployed to the development
backend using the repository's existing Serverless Compose `courseService`
service before browser submissions work. This requires the backend maintainer's
AWS access. A local frontend server alone cannot save reviews to an undeployed API.

Start the frontend from `frontend/` with `pnpm dev`, then open
http://localhost:3000/courses, select a course, and scroll to **Ratings and reviews**.
If pnpm requests dependency reconciliation after switching branches, install the
current branch's dependencies in `common/` and `frontend/` first.

Once the development service is deployed:

1. With a Core or higher development account, leave four stars with a written review. Reload and confirm the rating persists and contributes to the average/count.
2. Edit the text and save again. Confirm the count stays the same and the review appears under your display name.
3. Remove the rating and reload. Confirm both the text and rating disappear.
4. With a free account that purchased the course, repeat submission. Confirm a different unpurchased course does not allow submission.
5. With a free non-purchaser and while signed out, confirm ratings are readable but the form is unavailable.
6. Leave the form untouched or type text without choosing stars. Confirm nothing is saved and submission stays disabled until stars are selected.

## Automated checks

From `backend/`:

```sh
go test ./courseService/reviews ./database
```

From `frontend/`:

```sh
./node_modules/.bin/vitest run src/components/courses/CourseReviews.test.tsx src/api/courseReviewApi.test.ts src/api/courseReviewDemo.test.ts
```

Tests cover membership and course ownership checks, authenticated author identity,
invalid ratings and oversized text, draft visibility, updates, deletion after
membership expiry, rejection of blank review text, required text, save failures, public reads,
and pagination for the full rating average.

## Moderation and admin deletion

Written reviews are automatically checked with the existing Go profanity detector
before saving, including common obfuscations. All written text then waits for
administrator approval; stars count immediately. This manual queue also covers
adult content, context, and languages that keyword checks can miss. Approval is
not an automated semantic safety guarantee.

Authors see their pending text. Other viewers see only approved text. Editing a
review resets its text to pending. Administrators see a pending count on each
course, can approve the exact version they inspected, and can delete any review
(including its rating). Permissions are checked against the authenticated user
record on the server. Approval and deletion log the administrator and author.

In the local demo, use **Preview admin moderation (local demo only)** to try the
controls without a real admin account. The toggle is unavailable in production;
production permissions come from the backend. The demo uses the existing
frontend profanity filter and simulates approval in browser storage.

## Review link whitelist

Review text may link only to `chessdojo.club`, `chess.com`, or `lichess.org`,
including their subdomains. The server validates both new/edited submissions and
admin approval of older pending reviews. Editor feedback and the local demo use
the same policy. Checks cover bare domains, Markdown destinations, protocol-relative
URLs, other URL schemes, IP addresses, credential tricks, and lookalike domains.
Non-whitelisted links return a validation error without replacing a saved review.
