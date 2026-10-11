'use strict';

import {
    CreatePuzzleRequestSchema,
    CreatePuzzleResponse,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import {
    buildPuzzle,
    contributionFromPgn,
    validateTags,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/build';
import { parsePuzzlePgn } from '@jackstenglein/chess-dojo-common/src/puzzlebase/parse';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    errToApiGatewayProxyResultV2,
    parseBody,
    requireUserInfo,
    success,
} from '../directoryService/api';
import {
    addToPuzzleCount,
    getTaxonomy,
    putPuzzle,
    requireContributor,
    reservePuzzleIds,
    userInput,
} from './database';

/**
 * Handles requests to add a puzzle from a PGN. The caller must be a Puzzle Contributor or an
 * admin, and becomes the puzzle's annotator. The PGN needs a [FEN] header, so full games are
 * rejected, and every move must be legal.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        const contributor = await requireContributor(userInfo.username);
        const request = parseBody(event, CreatePuzzleRequestSchema);

        const parsed = userInput(() => parsePuzzlePgn(request.pgn));
        const { taxonomy } = await getTaxonomy();
        // The PGN can ask for tags and a rating of its own, which add to what the request says.
        const fromPgn = contributionFromPgn(taxonomy, parsed);
        const tags = {
            buckets: [...new Set([...request.buckets, ...fromPgn.buckets])],
            themes: [...new Set([...request.themes, ...fromPgn.themes])],
        };
        // Check the tags before reserving an id, so a mistake does not use one up.
        userInput(() => validateTags(taxonomy, tags.buckets, tags.themes));

        const [id] = await reservePuzzleIds(1);
        const now = new Date().toISOString();
        const puzzle = buildPuzzle(
            {
                id,
                annotator: contributor.username,
                annotatorDisplayName: contributor.displayName,
                now,
            },
            parsed,
            { ...request, ...tags, rating: fromPgn.rating ?? request.rating },
            taxonomy,
        );

        await putPuzzle(puzzle);
        await addToPuzzleCount(contributor, 1, now);
        const response: CreatePuzzleResponse = { puzzle, warnings: fromPgn.warnings };
        return success(response);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
