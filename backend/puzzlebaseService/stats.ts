'use strict';

import { RunsRequestSchema } from '@jackstenglein/chess-dojo-common/src/puzzlebase/runs';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    errToApiGatewayProxyResultV2,
    parseEvent,
    requireUserInfo,
    success,
} from '../directoryService/api';
import { getRuns, getStats, requireCanViewStats } from './runsDatabase';

/** The number of days of runs returned when the request does not say. */
const DEFAULT_DAYS = 30;

/**
 * Handles requests for someone's puzzle stats: running totals overall and for each bucket and
 * theme. Members can see their own, and coaches and admins can see anyone's.
 */
export const statsHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const caller = requireUserInfo(event);
        const { username } = parseEvent(event, RunsRequestSchema);
        await requireCanViewStats(caller.username, username);
        return success(await getStats(username));
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Handles requests for someone's sessions and attempts in a stretch of time, which defaults to
 * the last 30 days. Each attempt has every move tried. Members can see their own, and coaches and
 * admins can see anyone's.
 */
export const runsHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const caller = requireUserInfo(event);
        const request = parseEvent(event, RunsRequestSchema);
        await requireCanViewStats(caller.username, request.username);

        const to = request.to ?? new Date().toISOString();
        const from =
            request.from ??
            new Date(Date.parse(to) - DEFAULT_DAYS * 24 * 60 * 60 * 1000).toISOString();
        return success(await getRuns(request.username, from, to));
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
