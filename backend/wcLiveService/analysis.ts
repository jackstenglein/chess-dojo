import {
    AnalysisRuleError,
    applyAnalysisRequest,
    isLegalPath,
    WcAnalysis,
    WcAnalysisRequest,
    WcAnalysisRequestSchema,
} from '@jackstenglein/chess-dojo-common/src/wcLive/analysis';
import { isWcSensei, WcRoundRequestSchema } from '@jackstenglein/chess-dojo-common/src/wcLive/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseBody,
    parsePathParameters,
    requireUserInfo,
} from '../directoryService/api';
import { getAnalysis, ok, saveAnalysis } from './database';
import { getRoundState, requireMatchRound } from './lichess';

/** Saves are retried this many times when another sensei saved at the same moment. */
const ATTEMPTS = 4;

function requireSensei(event: Parameters<APIGatewayProxyHandlerV2>[0]): string {
    const { username } = requireUserInfo(event);
    if (!isWcSensei(username)) {
        // Fans only see the live position, never the analysis.
        throw new ApiError({ statusCode: 403, publicMessage: 'The analysis is for senseis only' });
    }
    return username;
}

/** GET /wc-live/rounds/{roundId}/analysis: the senseis' variations and where they are looking. */
export const get: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        requireSensei(event);
        const { roundId } = parsePathParameters(event, WcRoundRequestSchema);
        await requireMatchRound(roundId);
        return ok(await getAnalysis(roundId));
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * PUT /wc-live/analysis: a sensei plays a move on the analysis board, shows a
 * position to the other senseis, or deletes a variation.
 */
export const put: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const username = requireSensei(event);
        const request = parseBody(event, WcAnalysisRequestSchema);
        if (!isLegalPath(request.path)) {
            throw new ApiError({ statusCode: 400, publicMessage: 'That move is not legal here' });
        }
        const state = await getRoundState(request.roundId);

        for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
            const current = await getAnalysis(request.roundId);
            const next = apply(current, request, state.sans, username);
            if (await saveAnalysis(next, current.version)) {
                return ok({ ...next, version: current.version + 1 });
            }
        }
        throw new ApiError({
            statusCode: 409,
            publicMessage: 'Another sensei changed the analysis at the same moment. Try again.',
        });
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/** The analysis after the request, with a refused request as a 400. */
export function apply(
    current: WcAnalysis,
    request: WcAnalysisRequest,
    mainline: string[],
    username: string,
): WcAnalysis {
    try {
        return applyAnalysisRequest(current, request, mainline, username);
    } catch (err) {
        if (err instanceof AnalysisRuleError) {
            throw new ApiError({ statusCode: 400, publicMessage: err.message });
        }
        throw err;
    }
}
