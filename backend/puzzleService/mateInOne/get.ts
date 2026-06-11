import { GetMateInOnePuzzleResponse } from '@jackstenglein/chess-dojo-common/src/mateInOne/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { errToApiGatewayProxyResultV2, requireUserInfo, success } from '../../directoryService/api';

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
 * Handles GET /puzzle/mate-in-one/next.
 * Fetches a random mate-in-one puzzle in the 800-1200 rating band from MongoDB.
 * Requires a valid JWT but does not read or write any DynamoDB user data.
 *
 * @param event - The API Gateway proxy event.
 * @returns A response containing the next puzzle.
 */
export const getNextPuzzleHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        requireUserInfo(event);

        const cursor = mongoClient
            .db('puzzles')
            .collection('puzzles')
            .aggregate([
                {
                    $match: {
                        themes: { $in: ['mateIn1'] },
                        rating: { $gte: 800, $lte: 1200 },
                    },
                },
                { $sample: { size: 1 } },
            ]);

        const document = await cursor.next();
        if (!document) {
            return errToApiGatewayProxyResultV2(new Error('No puzzle found'));
        }
        const response: GetMateInOnePuzzleResponse = {
            puzzle: {
                id: String(document._id),
                fen: document.fen ?? '',
                moves: document.moves ?? [],
            },
        };

        return success(response);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
