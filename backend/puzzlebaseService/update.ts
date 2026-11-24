'use strict';

import { UpdatePuzzleRequestSchema } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { applyPuzzleUpdate } from '@jackstenglein/chess-dojo-common/src/puzzlebase/build';
import {
    canManagePuzzle,
    restrictedChanges,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/permissions';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseEvent,
    requireUserInfo,
    success,
} from '../directoryService/api';
import {
    getPuzzle,
    getTaxonomy,
    getVoteCountsFor,
    putPuzzle,
    requireContributor,
    userInput,
} from './database';

/**
 * Handles requests to update a puzzle: its rating, tags, details, or its position and solution.
 * The caller must be a Puzzle Contributor or an admin. Any of them can change a puzzle's tags and
 * rating; the rest only its author or an admin can. Only the fields sent are changed. If
 * someone else changed the puzzle since it was read, the update fails with a 409 instead of
 * overwriting their change.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        const caller = await requireContributor(userInfo.username);
        const request = parseEvent(event, UpdatePuzzleRequestSchema);

        const puzzle = await getPuzzle(request.id);
        if (!puzzle) {
            throw new ApiError({
                statusCode: 404,
                publicMessage: `Puzzle ${request.id} not found`,
            });
        }

        // Anyone can retag or rerate any puzzle. The rest is up to its author or an admin.
        const restricted = restrictedChanges(request);
        if (restricted.length > 0 && !canManagePuzzle(puzzle, caller)) {
            throw new ApiError({
                statusCode: 403,
                publicMessage: `You can change the tags and rating of someone else's puzzle, but not its ${restricted.join(', ')}. Only its author or an admin can.`,
            });
        }

        const { taxonomy } = await getTaxonomy();
        const updated = userInput(() =>
            applyPuzzleUpdate(puzzle, request, taxonomy, new Date().toISOString()),
        );

        await putPuzzle(updated, puzzle.updatedAt);
        return success({ ...updated, ...(await getVoteCountsFor(updated.id)) });
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
