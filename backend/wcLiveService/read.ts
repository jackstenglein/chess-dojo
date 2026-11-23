import {
    buildRoster,
    scoreGuesses,
    WcEvalsResponse,
    WcLeaderboard,
    WcRoundRequestSchema,
} from '@jackstenglein/chess-dojo-common/src/wcLive/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    errToApiGatewayProxyResultV2,
    parsePathParameters,
    requireUserInfo,
} from '../directoryService/api';
import { getGuesses, listEvals, listGuesses, listRoster, ok } from './database';
import { getRoundState, requireMatchRound } from './lichess';

/**
 * Every viewer polls the evals and the leaderboard, so each Lambda instance
 * answers from memory for a few seconds before reading the table again.
 */
const EVALS_TTL_MS = 2000;
const LEADERBOARD_TTL_MS = 15000;

const evalsCache = new Map<string, { at: number; response: WcEvalsResponse }>();
const leaderboardCache = new Map<string, { at: number; leaderboard: WcLeaderboard }>();

/**
 * GET /public/wc-live/rounds/{roundId}/evals: the roster and every sensei eval
 * in the game, in one call since the page polls it.
 */
export const evals: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const { roundId } = parsePathParameters(event, WcRoundRequestSchema);
        const cached = evalsCache.get(roundId);
        if (cached && Date.now() - cached.at < EVALS_TTL_MS) {
            return ok(cached.response);
        }
        await requireMatchRound(roundId);
        const [list, saved] = await Promise.all([listEvals(roundId), listRoster()]);
        const response: WcEvalsResponse = { roundId, roster: buildRoster(saved), evals: list };
        evalsCache.set(roundId, { at: Date.now(), response });
        return ok(response);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/** GET /public/wc-live/rounds/{roundId}/leaderboard: "Who's a GM today" for one game. */
export const leaderboard: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const { roundId } = parsePathParameters(event, WcRoundRequestSchema);
        const cached = leaderboardCache.get(roundId);
        if (cached && Date.now() - cached.at < LEADERBOARD_TTL_MS) {
            return ok(cached.leaderboard);
        }
        const state = await getRoundState(roundId);
        const all = await listGuesses(roundId);
        const result: WcLeaderboard = {
            roundId,
            plies: state.played.length,
            entries: scoreGuesses(state.played, all),
            updatedAt: new Date().toISOString(),
        };
        leaderboardCache.set(roundId, { at: Date.now(), leaderboard: result });
        return ok(result);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/** GET /wc-live/rounds/{roundId}/guesses: the caller's own guesses for one game. */
export const myGuesses: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const { username } = requireUserInfo(event);
        const { roundId } = parsePathParameters(event, WcRoundRequestSchema);
        await requireMatchRound(roundId);
        return ok(await getGuesses(roundId, username));
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
