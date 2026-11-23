import {
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
import { getUser } from '../directoryService/database';
import { ok, putEval } from './database';
import { getRoundState } from './lichess';

/** Saves a sensei's eval of one position. Only the senseis in WC_SENSEIS may call it. */
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

        const state = await getRoundState(request.roundId);
        if (request.ply > state.played.length) {
            throw new ApiError({
                statusCode: 400,
                publicMessage: 'That position has not been reached yet',
            });
        }

        const user = await getUser(username);
        const item: WcEval = {
            username,
            displayName: user.displayName || username,
            ply: request.ply,
            value: request.value,
            updatedAt: new Date().toISOString(),
        };
        await putEval(request.roundId, item);
        return ok(item);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
