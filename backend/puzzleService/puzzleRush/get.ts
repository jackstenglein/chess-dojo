import {
    GetPuzzleRushPuzzleResponse,
    getPuzzleRushPuzzleSchema,
} from '@jackstenglein/chess-dojo-common/src/puzzleRush/api';
import { PUZZLE_RUSH_RATING_WINDOW } from '@jackstenglein/chess-dojo-common/src/puzzleRush/rating';
import { Puzzle } from '@jackstenglein/chess-dojo-common/src/puzzles/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { MongoClient, ServerApiVersion } from 'mongodb';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseBody,
    requireUserInfo,
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

/**
 * Handles POST /puzzle/rush/next. Samples a random puzzle within a rating band
 * centered on the requested rating, excluding puzzles already used in the run.
 * Does not read or write any user data.
 *
 * @param event The API Gateway proxy event.
 * @returns A response containing the next puzzle.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        requireUserInfo(event);
        const request = parseBody(event, getPuzzleRushPuzzleSchema);

        const collection = mongoClient.db('puzzles').collection<Puzzle>('puzzles');
        for (const window of RATING_WINDOWS) {
            const cursor = collection.aggregate<Puzzle>([
                {
                    $match: {
                        _id: { $nin: request.excludeIds },
                        rating: {
                            $gte: Math.max(0, request.rating - window),
                            $lte: request.rating + window,
                        },
                    },
                },
                { $sample: { size: 1 } },
            ]);
            const document = await cursor.next();
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
