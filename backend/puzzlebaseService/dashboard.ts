'use strict';

import {
    DashboardAttempt,
    DashboardAttemptsResponse,
    DashboardRequestSchema,
    MAX_DASHBOARD_ATTEMPTS,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/runs';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseEvent,
    requireUserInfo,
    success,
} from '../directoryService/api';
import { listPuzzles, requireContributor } from './database';
import { listAttemptsForPuzzle } from './runsDatabase';

const DAY_MS = 24 * 60 * 60 * 1000;

/** How many puzzles are queried at the same time. */
const CONCURRENCY = 10;

/**
 * Handles requests for the stats dashboard: every member's attempts in a stretch of time (the
 * last 30 days by default), newest first. Each puzzle's attempts are read from the ByPuzzle index.
 * Puzzle Contributors and admins can see it.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const { username } = requireUserInfo(event);
        await requireContributor(username);
        const request = parseEvent(event, DashboardRequestSchema);

        const to = request.to ?? new Date().toISOString();
        const from = request.from ?? new Date(Date.parse(to) - 30 * DAY_MS).toISOString();
        if (from >= to) {
            throw new ApiError({
                statusCode: 400,
                publicMessage: 'The start of the range must be before its end.',
            });
        }

        const puzzleIds = (await listPuzzles()).map((puzzle) => puzzle.id);
        // Ask for one more than the cap per puzzle, so an over-full range is noticed.
        const perPuzzle = MAX_DASHBOARD_ATTEMPTS + 1;
        const attempts: DashboardAttempt[] = [];
        for (let i = 0; i < puzzleIds.length; i += CONCURRENCY) {
            const batch = await Promise.all(
                puzzleIds
                    .slice(i, i + CONCURRENCY)
                    .map((id) => listAttemptsForPuzzle(id, from, to, perPuzzle)),
            );
            attempts.push(...batch.flat());
        }

        attempts.sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
        const response: DashboardAttemptsResponse = {
            attempts: attempts.slice(0, MAX_DASHBOARD_ATTEMPTS),
            truncated: attempts.length > MAX_DASHBOARD_ATTEMPTS,
        };
        return success(response);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
