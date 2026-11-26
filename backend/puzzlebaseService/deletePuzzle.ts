'use strict';

import { canManagePuzzle } from '@jackstenglein/chess-dojo-common/src/puzzlebase/permissions';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { z } from 'zod';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseEvent,
    requireUserInfo,
    success,
} from '../directoryService/api';
import {
    addToPuzzleCount,
    deletePuzzle,
    deleteSuggestion,
    getPuzzle,
    listSuggestionsFor,
    logAdminAction,
    requireContributor,
} from './database';

const DeletePuzzleRequestSchema = z.object({ id: z.string().min(1) });

/**
 * Handles requests to delete a puzzle. Its author can delete it, and so can any admin. Tag
 * suggestions waiting on it go too, the author's puzzle count goes down by one, and the deletion
 * is written to the admin log. Attempts at it stay in people's history; its id is not reused.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        const caller = await requireContributor(userInfo.username);
        const { id } = parseEvent(event, DeletePuzzleRequestSchema);

        const puzzle = await getPuzzle(id);
        if (!puzzle) {
            throw new ApiError({ statusCode: 404, publicMessage: `Puzzle ${id} not found` });
        }
        if (!canManagePuzzle(puzzle, caller)) {
            throw new ApiError({
                statusCode: 403,
                publicMessage: 'You can only delete puzzles you added. An admin can delete any.',
            });
        }

        if (!(await deletePuzzle(id))) {
            throw new ApiError({ statusCode: 404, publicMessage: `Puzzle ${id} not found` });
        }
        const suggestions = await listSuggestionsFor(id);
        await Promise.all(suggestions.map((s) => deleteSuggestion(id, s.username)));
        await addToPuzzleCount(
            { username: puzzle.annotator, displayName: puzzle.annotatorDisplayName },
            -1,
            new Date().toISOString(),
        );
        const whose =
            puzzle.annotator === caller.username ? 'their own' : `${puzzle.annotatorDisplayName}'s`;
        await logAdminAction(caller, 'DELETE_PUZZLE', `Deleted ${whose} puzzle #${id}`);

        return success({ id });
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
