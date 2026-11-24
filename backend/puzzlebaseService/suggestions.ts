'use strict';

import { applyPuzzleUpdate } from '@jackstenglein/chess-dojo-common/src/puzzlebase/build';
import {
    acceptTags,
    applyTagChanges,
    isEmptySuggestion,
    newTagsFor,
    removalsFor,
    ResolveSuggestionsRequestSchema,
    suggestedNames,
    SuggestTagsRequestSchema,
    summarizeSuggestions,
    withoutTags,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/suggestions';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { z } from 'zod';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseBody,
    parsePathParameters,
    requireUserInfo,
    success,
} from '../directoryService/api';
import {
    deleteSuggestion,
    getPuzzle,
    getTaxonomy,
    getUser,
    listPuzzles,
    listSuggestions,
    listSuggestionsFor,
    putPuzzle,
    putSuggestion,
    requireContributor,
    userInput,
} from './database';

/** Whether the caller is a Puzzle Contributor or an admin, without failing if they are not. */
async function canEditTags(username: string): Promise<boolean> {
    try {
        await requireContributor(username);
        return true;
    } catch (err) {
        if (err instanceof ApiError && err.statusCode === 403) return false;
        throw err;
    }
}

/** Takes the named tags out of everyone's suggestions for a puzzle, deleting those left empty. */
async function clearSuggestedTags(puzzleId: string, names: string[]) {
    for (const suggestion of await listSuggestionsFor(puzzleId)) {
        const rest = withoutTags(suggestion, names);
        if (isEmptySuggestion(rest)) {
            await deleteSuggestion(puzzleId, suggestion.username);
        } else if (suggestedNames(rest).length !== suggestedNames(suggestion).length) {
            await putSuggestion(rest);
        }
    }
}

const puzzleIdSchema = z.object({ id: z.string().min(1) });

/**
 * Handles requests to suggest tags for a puzzle. Any signed-in member can. A suggestion is not a
 * tag: it goes to a review pile for Puzzle Contributors. A Puzzle Contributor's or admin's own
 * suggestion is made at once instead, and the updated puzzle is returned. Sending the request with
 * no tags withdraws the member's suggestion.
 */
export const suggestHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const { username } = requireUserInfo(event);
        const { id } = parsePathParameters(event, puzzleIdSchema);
        const request = parseBody(event, SuggestTagsRequestSchema);

        const puzzle = await getPuzzle(id);
        if (!puzzle) {
            throw new ApiError({ statusCode: 404, publicMessage: `Puzzle ${id} not found` });
        }

        const wantsAdds = request.buckets.length + request.themes.length > 0;
        const wantsRemovals = request.removeBuckets.length + request.removeThemes.length > 0;
        if (!wantsAdds && !wantsRemovals) {
            await deleteSuggestion(id, username);
            return success({ applied: false });
        }

        const { taxonomy } = await getTaxonomy();
        const known = new Set(Object.values(taxonomy.buckets).flat());
        userInput(() => {
            const bucket = [...request.buckets, ...request.removeBuckets].find(
                (b) => !(b in taxonomy.buckets),
            );
            if (bucket) throw new Error(`Unknown bucket: ${bucket}`);
            const theme = [...request.themes, ...request.removeThemes].find((t) => !known.has(t));
            if (theme) throw new Error(`Unknown theme: ${theme}`);
        });

        const tags = { ...newTagsFor(puzzle, request), ...removalsFor(puzzle, request) };
        if (isEmptySuggestion(tags)) {
            throw new ApiError({
                statusCode: 400,
                publicMessage:
                    wantsAdds && !wantsRemovals
                        ? 'Those tags are already on this puzzle.'
                        : !wantsAdds
                          ? 'This puzzle does not have those tags.'
                          : 'The puzzle already matches what you suggested.',
            });
        }

        if (await canEditTags(username)) {
            // A Puzzle Contributor or admin does not need a review: the change is made at once.
            const next = applyTagChanges(taxonomy, puzzle, tags);
            const updated = userInput(() =>
                applyPuzzleUpdate(puzzle, { id, ...next }, taxonomy, new Date().toISOString()),
            );
            await putPuzzle(updated, puzzle.updatedAt);
            await deleteSuggestion(id, username);
            await clearSuggestedTags(id, suggestedNames(tags));
            return success({ applied: true, puzzle: updated });
        }

        const user = await getUser(username);
        await putSuggestion({
            puzzleId: id,
            username,
            displayName: user.displayName,
            ...tags,
            createdAt: new Date().toISOString(),
        });
        return success({ applied: false });
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Handles requests for the review pile: every puzzle with suggested tags, and who suggested what.
 * The caller must be a Puzzle Contributor or an admin. Tags a puzzle has since been given are left out.
 */
export const listSuggestionsHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        await requireContributor(requireUserInfo(event).username);
        const [suggestions, puzzles] = await Promise.all([listSuggestions(), listPuzzles()]);
        const byId = new Map(puzzles.map((p) => [p.id, p]));

        const current = suggestions
            .map((s) => {
                const puzzle = byId.get(s.puzzleId);
                return puzzle
                    ? { ...s, ...newTagsFor(puzzle, s), ...removalsFor(puzzle, s) }
                    : undefined;
            })
            .filter((s) => s !== undefined);
        return success(summarizeSuggestions(current));
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Handles a contributor's decision on a puzzle's suggested tags. Accepted tags are added to the
 * puzzle. Accepted and dismissed tags both leave the review pile, for everyone who suggested them.
 * The caller must be a Puzzle Contributor or an admin.
 */
export const resolveSuggestionsHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        await requireContributor(requireUserInfo(event).username);
        const { id } = parsePathParameters(event, puzzleIdSchema);
        const request = parseBody(event, ResolveSuggestionsRequestSchema);

        const puzzle = await getPuzzle(id);
        if (!puzzle) {
            throw new ApiError({ statusCode: 404, publicMessage: `Puzzle ${id} not found` });
        }

        let result = puzzle;
        if (request.accept.length > 0) {
            const { taxonomy } = await getTaxonomy();
            const { tags, unknown } = acceptTags(taxonomy, puzzle, request.accept);
            if (unknown.length > 0) {
                throw new ApiError({
                    statusCode: 400,
                    publicMessage: `Not a known tag: ${unknown.join(', ')}`,
                });
            }
            result = userInput(() =>
                applyPuzzleUpdate(puzzle, { id, ...tags }, taxonomy, new Date().toISOString()),
            );
            await putPuzzle(result, puzzle.updatedAt);
        }

        await clearSuggestedTags(id, [...request.accept, ...request.reject]);
        return success(result);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
