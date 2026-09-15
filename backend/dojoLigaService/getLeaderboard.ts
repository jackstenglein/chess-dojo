import {
    GetDojoLigaLeaderboardSchema,
    Leaderboard,
} from '@jackstenglein/chess-dojo-common/src/dojoLiga/dojoLiga';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parsePathParameters,
    success,
} from '../directoryService/api';
import { GetItemBuilder } from '../directoryService/database';

const tournamentsTable = `${process.env.stage}-tournaments`;

/**
 * Fetches the DojoLiga leaderboard for the given month.
 * @param event The API gateway event that triggered the request.
 * @returns The DojoLiga leaderboard for the requested month.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: ', event);
        const { month } = parsePathParameters(event, GetDojoLigaLeaderboardSchema);
        const leaderboard = await getLeaderboard(month);
        if (!leaderboard) {
            throw new ApiError({
                statusCode: 404,
                publicMessage: `Leaderboard not found for ${month}`,
            });
        }
        return success(leaderboard);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Fetches the DojoLiga leaderboard for the given month.
 * @param month The month to fetch, in YYYY-MM format.
 * @returns The leaderboard if it exists.
 */
export async function getLeaderboard(month: string): Promise<Leaderboard | undefined> {
    return new GetItemBuilder<Leaderboard>()
        .key('type', 'DOJO_LIGA')
        .key('startsAt', month)
        .table(tournamentsTable)
        .send();
}
