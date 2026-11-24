import { buildRoster, WcSensei } from '@jackstenglein/chess-dojo-common/src/wcLive/api';
import {
    WcGuestAnalysisReadSchema,
    WcGuestAnalysisRequestSchema,
    WcGuestEvalRequestSchema,
    WcGuestMe,
    WcGuestMeRequestSchema,
} from '@jackstenglein/chess-dojo-common/src/wcLive/guests';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { ApiError, errToApiGatewayProxyResultV2, parseBody } from '../directoryService/api';
import { applyAndSave } from './analysis';
import { getAnalysis, guestIdForToken, listRoster, ok } from './database';
import { saveEval } from './eval';
import { requireMatchRound } from './lichess';

/**
 * The guest links' routes. They are public (a guest has no ChessDojo account),
 * so every one first checks the token in the body: it must be the guest's
 * current link, and the guest must still be on the roster. A guest can set
 * only their own eval and use the shared analysis board.
 */
export async function requireGuest(token: string): Promise<WcSensei> {
    const id = await guestIdForToken(token);
    const guest = id
        ? buildRoster(await listRoster()).find((s) => s.guest && s.id === id)
        : undefined;
    if (!guest) {
        throw new ApiError({
            statusCode: 403,
            publicMessage: 'This guest link no longer works. Ask a sensei for a new one.',
        });
    }
    return guest;
}

/** POST /public/wc-live/guest/me: who the link belongs to. */
export const me: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const { token } = parseBody(event, WcGuestMeRequestSchema);
        const guest = await requireGuest(token);
        return ok({ id: guest.id, name: guest.name, color: guest.color } satisfies WcGuestMe);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/** PUT /public/wc-live/guest/eval: the guest's own eval of a position. */
export const putEval: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const request = parseBody(event, WcGuestEvalRequestSchema);
        const guest = await requireGuest(request.token);
        return ok(await saveEval(request.roundId, request.ply, request.value, guest.id, guest.id));
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/** POST /public/wc-live/guest/analysis/read: the shared analysis of a game. */
export const getAnalysisForGuest: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const { token, roundId } = parseBody(event, WcGuestAnalysisReadSchema);
        await requireGuest(token);
        await requireMatchRound(roundId);
        return ok(await getAnalysis(roundId));
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/** PUT /public/wc-live/guest/analysis: a guest's move or step on the analysis board. */
export const putAnalysis: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const { token, request } = parseBody(event, WcGuestAnalysisRequestSchema);
        const guest = await requireGuest(token);
        return ok(await applyAndSave(request, guest.id));
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
