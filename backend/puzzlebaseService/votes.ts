'use strict';

import { VoteRequestSchema } from '@jackstenglein/chess-dojo-common/src/puzzlebase/votes';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseBody,
    requireUserInfo,
    success,
} from '../directoryService/api';
import { castVote, getPuzzle, requireTrainingAccess } from './database';
import { getLastSeen } from './runsDatabase';

/**
 * Handles requests to vote on a puzzle: a thumbs up (1), a thumbs down (-1), or taking the vote
 * back (0). Whoever can train can vote, but only on a puzzle they have played. A member has one
 * vote per puzzle, and voting again changes it. Returns the member's vote and the puzzle's totals.
 */
export const voteHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const { username } = requireUserInfo(event);
        await requireTrainingAccess(username);
        const { puzzleId, vote } = parseBody(event, VoteRequestSchema);

        if (!(await getPuzzle(puzzleId))) {
            throw new ApiError({ statusCode: 404, publicMessage: `Puzzle ${puzzleId} not found` });
        }
        if (!(await getLastSeen(username))[puzzleId]) {
            throw new ApiError({
                statusCode: 403,
                publicMessage: 'Play the puzzle before voting on it.',
            });
        }

        return success(await castVote(username, puzzleId, vote));
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
