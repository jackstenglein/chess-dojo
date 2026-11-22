import { ScanCommand, ScanCommandInput } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import {
    GetTacticsForgerLeaderboardResponse,
    TacticsForgerLeaderboardRow,
} from '@jackstenglein/chess-dojo-common/src/puzzles/tacticsForger/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { errToApiGatewayProxyResultV2, requireUserInfo, success } from '../../directoryService/api';
import { dynamo } from '../../directoryService/database';
import { tacticsForgerLeaderboardTable } from './progress';

/**
 * Handles GET /puzzle/tactics-forger/leaderboard. Returns every player who has saved
 * Tactics Forger progress, with their cohort, so the app can rank the caller overall and
 * within their cohort.
 * @param event The API Gateway proxy event.
 * @returns All leaderboard rows.
 */
export const getHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        requireUserInfo(event);
        const players: TacticsForgerLeaderboardRow[] = [];
        let startKey: ScanCommandInput['ExclusiveStartKey'];
        do {
            const output = await dynamo.send(
                new ScanCommand({
                    TableName: tacticsForgerLeaderboardTable,
                    ExclusiveStartKey: startKey,
                }),
            );
            for (const item of output.Items ?? []) {
                players.push(unmarshall(item) as TacticsForgerLeaderboardRow);
            }
            startKey = output.LastEvaluatedKey;
        } while (startKey);

        const response: GetTacticsForgerLeaderboardResponse = { players };
        return success(response);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
