import { Chess } from '@jackstenglein/chess';
import { WcGuessRequestSchema } from '@jackstenglein/chess-dojo-common/src/wcLive/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseBody,
    requireUserInfo,
} from '../directoryService/api';
import { getUser } from '../directoryService/database';
import { ok, putGuess } from './database';
import { getRoundState, RoundState } from './lichess';

/**
 * Saves a guess for the next move of a game. The guess can change as often as
 * the user likes until Lichess shows the move as played. Guesses for move 1
 * are open until the game starts.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const { username } = requireUserInfo(event);
        const request = parseBody(event, WcGuessRequestSchema);

        const state = await getRoundState(request.roundId);
        checkGuess(state, request.ply, request.uci);

        const user = await getUser(username);
        await putGuess(
            request.roundId,
            username,
            user.displayName || username,
            request.ply,
            request.uci,
        );
        return ok({ roundId: request.roundId, ply: request.ply, uci: request.uci });
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/** Throws unless the guess is a legal move for the ply that is up next. */
export function checkGuess(state: RoundState, ply: number, uci: string): void {
    if (state.result !== '*') {
        throw new ApiError({ statusCode: 409, publicMessage: 'This game is over' });
    }
    if (ply <= state.played.length) {
        throw new ApiError({
            statusCode: 409,
            publicMessage: 'That move has already been played',
        });
    }
    if (ply > state.played.length + 1) {
        throw new ApiError({ statusCode: 400, publicMessage: 'You can only guess the next move' });
    }

    const chess = new Chess({ fen: state.fen });
    const legal = chess.moves({ disableNullMoves: true }).some((m) => {
        const move = m as { from: string; to: string; promotion?: string };
        return `${move.from}${move.to}${move.promotion ?? ''}` === uci;
    });
    if (!legal) {
        throw new ApiError({ statusCode: 400, publicMessage: 'That move is not legal here' });
    }
}
