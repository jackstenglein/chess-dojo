'use strict';

import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { z } from 'zod';
import { ApiError, errToApiGatewayProxyResultV2 } from '../../directoryService/api';
import { gamesIndex, getClient, isSearchEnabled } from './client';
import { SearchDocument } from './document';

const PAGE_SIZE = 50;
const MAX_RESULTS = 10000;

/** Absolute PGN result values that can be filtered on. */
export const GAME_RESULTS = ['1-0', '0-1', '1/2-1/2'] as const;
export type GameResult = (typeof GAME_RESULTS)[number];

const gameResultSchema = z.enum(GAME_RESULTS);

const requestSchema = z.object({
    white: z.string().trim().min(1).optional(),
    black: z.string().trim().min(1).optional(),
    ignoreColors: z
        .string()
        .optional()
        .transform((v) => v === 'true'),
    minElo: z.coerce.number().int().optional(),
    maxElo: z.coerce.number().int().optional(),
    eloMode: z.enum(['one', 'both', 'average']).default('one'),
    /** Comma-separated subset of 1-0, 0-1, 1/2-1/2. Omitted/all three = no filter. */
    results: z
        .string()
        .optional()
        .transform((v) => {
            if (!v) {
                return undefined;
            }
            return v
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
        })
        .pipe(z.array(gameResultSchema).optional()),
    cohort: z.string().optional(),
    opening: z.string().trim().min(1).optional(),
    minMoves: z.coerce.number().int().min(0).optional(),
    maxMoves: z.coerce.number().int().min(0).optional(),
    timeClass: z.enum(['bullet', 'blitz', 'rapid', 'classical', 'daily']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    startKey: z.coerce.number().int().min(0).default(0),
});

export type SearchGamesRequest = z.infer<typeof requestSchema>;

/** Matches an ECO code or prefix: a letter A-E plus 0-2 digits. */
const ECO_REGEX = /^[A-Ea-e]\d{0,2}$/;

/** Returns the range bounds for the request's min/max elo, or undefined when neither is set. */
function eloRange(request: SearchGamesRequest): object | undefined {
    if (request.minElo === undefined && request.maxElo === undefined) {
        return undefined;
    }
    return {
        ...(request.minElo !== undefined ? { gte: request.minElo } : {}),
        ...(request.maxElo !== undefined ? { lte: request.maxElo } : {}),
    };
}

/** Builds top-level elo filters based on whether one, both, or average rating must match. */
function eloFilters(request: SearchGamesRequest): object[] {
    const range = eloRange(request);
    if (!range) {
        return [];
    }
    if (request.eloMode === 'average') {
        return [{ range: { avgElo: range } }];
    }
    if (request.eloMode === 'both') {
        return [{ range: { whiteElo: range } }, { range: { blackElo: range } }];
    }
    return [
        {
            bool: {
                should: [{ range: { whiteElo: range } }, { range: { blackElo: range } }],
                minimum_should_match: 1,
            },
        },
    ];
}

/** Fuzzy + prefix name match against one color field. */
function nameMatch(side: 'white' | 'black', player: string): object {
    return {
        bool: {
            should: [
                {
                    match: {
                        [side]: {
                            query: player,
                            fuzziness: 'AUTO',
                            operator: 'and',
                        },
                    },
                },
                { match_phrase_prefix: { [side]: player } },
            ],
            minimum_should_match: 1,
        },
    };
}

/**
 * Builds the player-matching portion of the query: either a list of should
 * clauses (OR) or must clauses to merge into the top-level filter (AND).
 */
function playerClauses(request: SearchGamesRequest): {
    should?: object[];
    must?: object[];
} {
    const { white, black, ignoreColors } = request;

    if (!white && !black) {
        return {};
    }

    if (white && black) {
        if (ignoreColors) {
            return {
                should: [
                    {
                        bool: {
                            must: [nameMatch('white', white), nameMatch('black', black)],
                        },
                    },
                    {
                        bool: {
                            must: [nameMatch('white', black), nameMatch('black', white)],
                        },
                    },
                ],
            };
        }
        return {
            must: [nameMatch('white', white), nameMatch('black', black)],
        };
    }

    const player = (white || black) as string;
    if (!ignoreColors) {
        return {
            must: [nameMatch(white ? 'white' : 'black', player)],
        };
    }
    return {
        should: [nameMatch('white', player), nameMatch('black', player)],
    };
}

/** Builds a filter for the selected PGN results, or empty when all/omitted. */
function resultFilters(request: SearchGamesRequest): object[] {
    const selected = request.results;
    if (
        selected === undefined ||
        selected.length === 0 ||
        selected.length === GAME_RESULTS.length
    ) {
        return [];
    }
    return [{ terms: { result: selected } }];
}

/** Builds the OpenSearch query for a game search request. */
export function buildSearchQuery(request: SearchGamesRequest): object {
    const filter: object[] = [...eloFilters(request), ...resultFilters(request)];
    if (request.cohort) {
        filter.push({ term: { cohort: request.cohort } });
    }
    if (request.startDate || request.endDate) {
        filter.push({
            range: {
                date: {
                    ...(request.startDate ? { gte: request.startDate } : {}),
                    ...(request.endDate ? { lte: request.endDate } : {}),
                },
            },
        });
    }

    if (request.opening) {
        if (ECO_REGEX.test(request.opening)) {
            filter.push({ prefix: { eco: request.opening.toUpperCase() } });
        } else {
            filter.push({
                bool: {
                    should: [
                        { match: { opening: { query: request.opening, operator: 'and' } } },
                        { match_phrase_prefix: { opening: request.opening } },
                    ],
                    minimum_should_match: 1,
                },
            });
        }
    }
    if (request.minMoves !== undefined || request.maxMoves !== undefined) {
        filter.push({
            range: {
                plyCount: {
                    ...(request.minMoves !== undefined ? { gte: 2 * request.minMoves - 1 } : {}),
                    ...(request.maxMoves !== undefined ? { lte: 2 * request.maxMoves } : {}),
                },
            },
        });
    }
    if (request.timeClass) {
        filter.push({ term: { timeClass: request.timeClass } });
    }

    const players = playerClauses(request);
    if (players.must) {
        filter.push(...players.must);
    }

    if (players.should) {
        return {
            bool: {
                should: players.should,
                minimum_should_match: 1,
                filter,
            },
        };
    }
    return { bool: { filter } };
}

/** Converts a SearchDocument into the GameInfo shape the frontend renders. */
function toGameInfo(doc: SearchDocument): object {
    const pgnDate = doc.date.replaceAll('-', '.');
    return {
        cohort: doc.cohort,
        id: doc.id,
        date: pgnDate,
        createdAt: doc.createdAt,
        owner: doc.owner,
        ownerDisplayName: doc.ownerDisplayName,
        ownerPreviousCohort: '',
        headers: {
            White: doc.white,
            Black: doc.black,
            WhiteElo: doc.whiteElo?.toString(),
            BlackElo: doc.blackElo?.toString(),
            Result: doc.result,
            Date: pgnDate,
            ECO: doc.eco,
            Opening: doc.opening,
            TimeControl: doc.timeControl,
            PlyCount: doc.plyCount?.toString(),
        },
    };
}

/**
 * Searches the games index by player name with optional color, elo,
 * result, cohort and date filters.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    console.log('Event: %j', event);

    if (!isSearchEnabled()) {
        // Simple deployments have no search domain.
        return errToApiGatewayProxyResultV2(
            new ApiError({
                statusCode: 503,
                publicMessage: 'Game search is not available on this deployment',
            }),
        );
    }

    const parsed = requestSchema.safeParse(event.queryStringParameters ?? {});
    if (!parsed.success) {
        return errToApiGatewayProxyResultV2(
            new ApiError({
                statusCode: 400,
                publicMessage: `Invalid request: ${parsed.error.issues
                    .map((i) => `${i.path.join('.')}: ${i.message}`)
                    .join(', ')}`,
            }),
        );
    }
    const request = parsed.data;

    try {
        const response = await getClient().search({
            index: gamesIndex(),
            body: {
                query: buildSearchQuery(request),
                sort: [{ date: 'desc' }, '_score'],
                from: request.startKey,
                size: PAGE_SIZE,
            },
        });

        const hits = response.body.hits;
        const games = hits.hits
            .map((hit) => hit._source)
            .filter((source): source is SearchDocument => source !== undefined)
            .map(toGameInfo);

        const next = request.startKey + PAGE_SIZE;
        const total = typeof hits.total === 'number' ? hits.total : (hits.total?.value ?? 0);
        const lastEvaluatedKey = total > next && next < MAX_RESULTS ? String(next) : undefined;

        return {
            statusCode: 200,
            body: JSON.stringify({ games, lastEvaluatedKey }),
        };
    } catch (err) {
        console.error('Failed to search games for request %j:', request, err);
        return errToApiGatewayProxyResultV2(
            new ApiError({
                statusCode: 500,
                publicMessage: 'Temporary server error',
                cause: err,
            }),
        );
    }
};
