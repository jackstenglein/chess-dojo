'use strict';

import {
    CreateThemeRequestSchema,
    DeleteThemeRequestSchema,
    DeleteThemeResponse,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import {
    addThemeToTaxonomy,
    removeThemeFromTaxonomy,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/build';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseBody,
    requireUserInfo,
    success,
} from '../directoryService/api';
import {
    getPuzzle,
    getTaxonomy,
    listPuzzles,
    logAdminAction,
    putPuzzle,
    requireAdmin,
    requireContributor,
    saveTaxonomy,
    userInput,
} from './database';

/** How many times to retry adding a theme when someone else changes the taxonomy at once. */
const MAX_ATTEMPTS = 3;

/**
 * Handles requests to get the buckets and their themes. Any signed-in member can: the trainer
 * needs them to offer a bucket or theme to focus on, and the names are not puzzle content.
 */
export const getHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        requireUserInfo(event);
        return success((await getTaxonomy()).taxonomy);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Handles requests to add a theme to a bucket. The caller must be a Puzzle Contributor or an
 * admin. Returns the updated taxonomy.
 */
export const createThemeHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        await requireContributor(userInfo.username);
        const request = parseBody(event, CreateThemeRequestSchema);

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            const { taxonomy, version } = await getTaxonomy();
            const updated = userInput(() =>
                addThemeToTaxonomy(taxonomy, request.bucket, request.theme),
            );
            if (await saveTaxonomy(updated, version)) {
                return success(updated);
            }
        }

        throw new ApiError({
            statusCode: 409,
            publicMessage: 'The themes changed while adding yours. Please try again.',
        });
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Handles requests to delete a theme from a bucket. The caller must be a puzzle admin. If no
 * bucket lists the theme any more, every puzzle loses it. The deletion is written to the admin log.
 * Returns the updated taxonomy and how many puzzles lost the theme.
 */
export const deleteThemeHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        const admin = await requireAdmin(userInfo.username);
        const request = parseBody(event, DeleteThemeRequestSchema);

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            const { taxonomy, version } = await getTaxonomy();
            const removal = userInput(() =>
                removeThemeFromTaxonomy(taxonomy, request.bucket, request.theme),
            );
            if (!(await saveTaxonomy(removal.taxonomy, version))) {
                continue;
            }

            let puzzlesChanged = 0;
            if (removal.goneEverywhere) {
                for (const listed of (await listPuzzles()).filter((p) =>
                    p.themes.includes(removal.theme),
                )) {
                    // Re-read so a save made in the meantime is not overwritten.
                    for (let tries = 0; tries < MAX_ATTEMPTS; tries++) {
                        const puzzle = (await getPuzzle(listed.id)) ?? listed;
                        const updated = {
                            ...puzzle,
                            themes: puzzle.themes.filter((t) => t !== removal.theme),
                            updatedAt: new Date().toISOString(),
                        };
                        try {
                            await putPuzzle(updated, puzzle.updatedAt);
                            puzzlesChanged++;
                            break;
                        } catch (err) {
                            if (!(err instanceof ApiError && err.statusCode === 409)) throw err;
                        }
                    }
                }
            }

            await logAdminAction(
                admin,
                'DELETE_THEME',
                `Deleted the theme "${removal.theme}" from ${request.bucket}` +
                    (removal.goneEverywhere
                        ? ` and removed it from ${puzzlesChanged} puzzle${puzzlesChanged === 1 ? '' : 's'}`
                        : ' (it is still listed under another bucket)'),
            );
            const response: DeleteThemeResponse = { taxonomy: removal.taxonomy, puzzlesChanged };
            return success(response);
        }

        throw new ApiError({
            statusCode: 409,
            publicMessage: 'The themes changed while deleting. Please try again.',
        });
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
