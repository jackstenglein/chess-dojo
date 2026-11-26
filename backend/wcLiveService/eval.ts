import {
    buildRoster,
    isWcSensei,
    WcEval,
    WcEvalRequestSchema,
} from '@jackstenglein/chess-dojo-common/src/wcLive/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseBody,
    requireUserInfo,
} from '../directoryService/api';
import { listRoster, ok, putEval } from './database';
import { getRoundState } from './lichess';

/**
 * Saves one sensei's eval of a position the game has reached. Shared with the
 * guest links, which call it for the guest only.
 */
export async function saveEval(
    roundId: string,
    ply: number,
    value: number,
    senseiId: string,
    updatedBy: string,
): Promise<WcEval> {
    const state = await getRoundState(roundId);
    if (ply > state.played.length) {
        throw new ApiError({
            statusCode: 400,
            publicMessage: 'That position has not been reached yet',
        });
    }
    const item: WcEval = {
        senseiId,
        ply,
        value,
        updatedAt: new Date().toISOString(),
        updatedBy,
    };
    await putEval(roundId, item);
    return item;
}

/**
 * Saves an eval of one position. Only the senseis in WC_SENSEIS may call it.
 * Any sensei can set the eval of anyone on the roster, themselves, another
 * sensei or a guest. Each eval records who set it.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const { username } = requireUserInfo(event);
        if (!isWcSensei(username)) {
            throw new ApiError({
                statusCode: 403,
                publicMessage: 'Only senseis can put an eval on the bar',
            });
        }
        const request = parseBody(event, WcEvalRequestSchema);
        const senseiId = request.senseiId ?? username;

        if (senseiId !== username) {
            const roster = buildRoster(await listRoster());
            if (!roster.some((s) => s.id === senseiId)) {
                throw new ApiError({
                    statusCode: 404,
                    publicMessage: 'That sensei is not on the bar',
                });
            }
        }

        return ok(await saveEval(request.roundId, request.ply, request.value, senseiId, username));
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
