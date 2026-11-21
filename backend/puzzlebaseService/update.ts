'use strict';

import { UpdatePuzzleRequestSchema } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { applyPuzzleUpdate } from '@jackstenglein/chess-dojo-common/src/puzzlebase/build';
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
 * The caller must be a Puzzle Contributor or an admin. Only the fields sent are changed. If
 * someone else changed the puzzle since it was read, the update fails with a 409 instead of
 * overwriting their change.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        await requireContributor(userInfo.username);
        const request = parseEvent(event, UpdatePuzzleRequestSchema);

        const puzzle = await getPuzzle(request.id);
        if (!puzzle) {
            throw new ApiError({
                statusCode: 404,
                publicMessage: `Puzzle ${request.id} not found`,
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
