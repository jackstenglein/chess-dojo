import { Puzzle } from '@jackstenglein/chess-dojo-common/src/puzzles/api';
import {
    GetPuzzleRushPuzzleResponse,
    getPuzzleRushPuzzleSchema,
} from '@jackstenglein/chess-dojo-common/src/puzzles/rush/api';
import { PUZZLE_RUSH_RATING_WINDOW } from '@jackstenglein/chess-dojo-common/src/puzzles/rush/rating';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { Collection, Filter, MongoClient, ServerApiVersion } from 'mongodb';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseBody,
    success,
} from '../../directoryService/api';

const mongoClient = new MongoClient(process.env.MONGODB_URI ?? '', {
    auth: {
        username: process.env.AWS_ACCESS_KEY_ID,
        password: process.env.AWS_SECRET_ACCESS_KEY,
    },
    authSource: '$external',
    authMechanism: 'MONGODB-AWS',
    authMechanismProperties: {
        AWS_SESSION_TOKEN: process.env.AWS_SESSION_TOKEN,
    },
    maxIdleTimeMS: 60000,
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
    monitorCommands: true,
});

mongoClient.on('commandSucceeded', (event) => {
    if (event.duration > 100) {
        console.warn(`Slow Query Detected (${event.duration}ms):`, JSON.stringify(event.reply));
    }
});

/**
 * The rating windows to try, in order, when sampling a puzzle. The corpus is sparse
 * at very high ratings, so the window is widened if the initial band is empty.
 */
const RATING_WINDOWS = [
    PUZZLE_RUSH_RATING_WINDOW,
    PUZZLE_RUSH_RATING_WINDOW * 2,
    PUZZLE_RUSH_RATING_WINDOW * 4,
];

/** Theme tag applied to non-mate puzzles at upload time. */
const NON_MATE_THEME = process.env.stage === 'prod' ? 'non-mate' : undefined;

/**
 * Handles POST /puzzle/rush/next. Samples a random non-mate puzzle within a rating
 * band centered on the requested rating, excluding puzzles already used in the run.
 * Uses a precomputed `random` field for an index seek instead of `$sample`.
 * Does not read or write any user data.
 *
 * @param event The API Gateway proxy event.
 * @returns A response containing the next puzzle.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const request = parseBody(event, getPuzzleRushPuzzleSchema);

        const collection = mongoClient.db('puzzles').collection<Puzzle>('puzzles');
        for (const window of RATING_WINDOWS) {
            const document = await findRandomPuzzle(collection, {
                rating: request.rating,
                window,
                excludeIds: request.excludeIds,
            });
            if (document) {
                const response: GetPuzzleRushPuzzleResponse = {
                    puzzle: {
                        id: String(document._id),
                        fen: document.fen,
                        moves: document.moves,
                        rating: document.rating,
                        themes: document.themes ?? [],
                    },
                };
                return success(response);
            }
        }

        throw new ApiError({
            statusCode: 404,
            publicMessage: `No puzzle found near rating ${request.rating}`,
        });
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Finds a random puzzle in the given rating window using the precomputed `random`
 * field. Seeks to a random point in [0, 1) and wraps around if nothing is found
 * at or above that point, so every puzzle in the band remains reachable.
 *
 * Best served by an index such as `{ themes: 1, rating: 1, random: 1 }`.
 *
 * @param collection The puzzles collection.
 * @param options The search rating, window size, and ids to exclude.
 * @returns A matching puzzle, or null if the band is empty.
 */
async function findRandomPuzzle(
    collection: Collection<Puzzle>,
    {
        rating,
        window,
        excludeIds,
    }: {
        rating: number;
        window: number;
        excludeIds: string[];
    },
): Promise<Puzzle | null> {
    if (process.env.stage !== 'prod') {
        return findRandomPuzzleDev(collection, { rating, window, excludeIds });
    }

    const base: Filter<Puzzle> = {
        themes: NON_MATE_THEME,
        rating: {
            $gte: Math.max(0, rating - window),
            $lte: rating + window,
        },
        _id: { $nin: excludeIds },
    };

    const pivot = Math.random();
    const document = await collection.findOne({ ...base, random: { $gte: pivot } });
    if (document) {
        return document;
    }
    return collection.findOne({ ...base, random: { $gte: 0 } });
}

async function findRandomPuzzleDev(
    collection: Collection<Puzzle>,
    {
        rating,
        window,
        excludeIds,
    }: {
        rating: number;
        window: number;
        excludeIds: string[];
    },
) {
    const cursor = collection.aggregate<Puzzle>([
        {
            $match: {
                _id: { $nin: excludeIds },
                rating: {
                    $gte: Math.max(0, rating - window),
                    $lte: rating + window,
                },
            },
        },
        { $sample: { size: 1 } },
    ]);
    return await cursor.next();
}
