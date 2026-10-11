'use strict';

import {
    ImportLichessStudyRequestSchema,
    ImportLichessStudyResponse,
    PuzzlebasePuzzle,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import {
    buildPuzzle,
    contributionFromPgn,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/build';
import {
    ParsedPuzzlePgn,
    parsePuzzlePgn,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/parse';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseBody,
    requireUserInfo,
    success,
} from '../directoryService/api';
import { getLichessStudy } from '../pgnService/game/lichess';
import {
    addToPuzzleCount,
    getTaxonomy,
    MAX_PUZZLES_PER_REQUEST,
    putPuzzle,
    requireContributor,
    reservePuzzleIds,
} from './database';

const STUDY_ID_REGEX = /^[A-Za-z0-9]{8}$/;

/**
 * Returns the canonical URL of a Lichess study, given a study URL (including one that points at
 * a chapter) or a bare study id.
 * @throws ApiError 400 if the input is neither.
 */
export function lichessStudyUrl(input: string): string {
    const trimmed = input.trim();
    const id = STUDY_ID_REGEX.test(trimmed)
        ? trimmed
        : /lichess\.org\/study\/([A-Za-z0-9]{8})/.exec(trimmed)?.[1];
    if (!id) {
        throw new ApiError({
            statusCode: 400,
            publicMessage: 'Enter a Lichess study link, like https://lichess.org/study/abcd1234',
        });
    }
    return `https://lichess.org/study/${id}`;
}

/** Returns a chapter's title from its PGN, for reporting chapters that were skipped. */
function chapterTitle(pgn: string): string | undefined {
    return /\[Event "([^"]*)"\]/.exec(pgn)?.[1];
}

/**
 * Handles requests to import a public Lichess study. Every chapter becomes its own puzzle, and
 * every puzzle gets the requested rating. Chapters that are not puzzles (no starting position, no
 * moves, or an illegal move) are skipped and reported rather than failing the whole import.
 * The caller must be a Puzzle Contributor or an admin.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        const contributor = await requireContributor(userInfo.username);
        const request = parseBody(event, ImportLichessStudyRequestSchema);

        const studyUrl = lichessStudyUrl(request.study);
        const chapters = await getLichessStudy(studyUrl);
        if (chapters.length > MAX_PUZZLES_PER_REQUEST) {
            throw new ApiError({
                statusCode: 400,
                publicMessage: `This study has ${chapters.length} chapters. You can import at most ${MAX_PUZZLES_PER_REQUEST} at a time.`,
            });
        }

        const response: ImportLichessStudyResponse = { puzzles: [], skipped: [], warnings: [] };
        const usable: { parsed: ParsedPuzzlePgn; chapter: number; title?: string }[] = [];
        chapters.forEach((pgn, index) => {
            try {
                usable.push({
                    parsed: parsePuzzlePgn(pgn),
                    chapter: index + 1,
                    title: chapterTitle(pgn),
                });
            } catch (err) {
                response.skipped.push({
                    chapter: index + 1,
                    title: chapterTitle(pgn),
                    reason: err instanceof Error ? err.message : 'Not a valid puzzle',
                });
            }
        });

        if (usable.length > 0) {
            const { taxonomy } = await getTaxonomy();
            const ids = await reservePuzzleIds(usable.length);
            const now = new Date().toISOString();
            const puzzles: PuzzlebasePuzzle[] = usable.map(({ parsed, chapter, title }, i) => {
                // A chapter can ask for its own tags and rating. Anything that is not a real
                // theme is left off and reported, rather than skipping the whole chapter.
                const fromPgn = contributionFromPgn(taxonomy, parsed);
                for (const message of fromPgn.warnings) {
                    response.warnings.push({ chapter, title, message });
                }
                return buildPuzzle(
                    {
                        id: ids[i],
                        annotator: contributor.username,
                        annotatorDisplayName: contributor.displayName,
                        now,
                    },
                    parsed,
                    {
                        rating: fromPgn.rating ?? request.rating,
                        buckets: fromPgn.buckets,
                        themes: fromPgn.themes,
                    },
                    taxonomy,
                    studyUrl,
                );
            });

            await Promise.all(puzzles.map((puzzle) => putPuzzle(puzzle)));
            await addToPuzzleCount(contributor, puzzles.length, now);
            response.puzzles = puzzles;
        }

        return success(response);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
