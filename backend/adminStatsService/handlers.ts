import { AttributeValue, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
    AdminStatsSnapshot,
    GetAdminStatsResponse,
} from '@jackstenglein/chess-dojo-common/src/adminStats/api';
import { dojoCohorts } from '@jackstenglein/chess-dojo-common/src/database/cohort';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    requireUserInfo,
    success,
} from '../directoryService/api';
import { dynamo, getUser, USER_TABLE } from '../directoryService/database';
import {
    computeAccountStats,
    NO_COHORT,
    STATS_USER_ATTRIBUTES,
    StatsUser,
    toSnapshot,
} from './stats';

/** One row per day: the totals that day. */
export const adminStatsHistoryTable = `${process.env.stage}-admin-stats-history`;
const HISTORY_KEY = 'DAILY';

/**
 * Handles GET /admin/site-stats. Admins only. Computes the account stats from
 * the users table and returns them with the saved daily history.
 */
export const getHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const { username } = requireUserInfo(event);
        const caller = await getUser(username);
        if (!caller.isAdmin) {
            throw new ApiError({
                statusCode: 403,
                publicMessage: 'You must be an admin to perform this action',
            });
        }

        const now = new Date();
        const [users, history] = await Promise.all([listStatsUsers(), listHistory()]);
        const stats = computeAccountStats(users, dojoCohorts, now);
        const response: GetAdminStatsResponse = {
            generatedAt: now.toISOString(),
            ...stats,
            history,
        };
        return success(response);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/** Runs nightly: saves today's totals so the history builds up over time. */
export const snapshotHandler = async () => {
    const now = new Date();
    const stats = computeAccountStats(await listStatsUsers(), dojoCohorts, now);
    const snapshot = toSnapshot(stats, now);
    await dynamo.send(
        new PutItemCommand({
            TableName: adminStatsHistoryTable,
            Item: marshall({ type: HISTORY_KEY, ...snapshot }),
        }),
    );
    console.log('Saved snapshot', snapshot);
};

/** Reads every account (only the fields the stats need), one cohort at a time in parallel. */
async function listStatsUsers(): Promise<StatsUser[]> {
    const pages = await Promise.all([...dojoCohorts, NO_COHORT].map(listCohortUsers));
    return pages.flat();
}

async function listCohortUsers(cohort: string): Promise<StatsUser[]> {
    const names: Record<string, string> = { '#cohort': 'dojoCohort' };
    const projection = STATS_USER_ATTRIBUTES.map((path) =>
        path
            .split('.')
            .map((part) => {
                const [name, index = ''] = part.split(/(?=\[)/);
                const placeholder = `#${name}`;
                names[placeholder] = name;
                return placeholder + index;
            })
            .join('.'),
    ).join(', ');

    const users: StatsUser[] = [];
    let startKey: Record<string, AttributeValue> | undefined;
    do {
        const output = await dynamo.send(
            new QueryCommand({
                TableName: USER_TABLE,
                IndexName: 'CohortIdx',
                KeyConditionExpression: '#cohort = :cohort',
                ExpressionAttributeNames: names,
                ExpressionAttributeValues: { ':cohort': { S: cohort } },
                ProjectionExpression: projection,
                ExclusiveStartKey: startKey,
            }),
        );
        users.push(...(output.Items ?? []).map((item) => unmarshall(item) as StatsUser));
        startKey = output.LastEvaluatedKey;
    } while (startKey);
    return users;
}

/** Returns the saved daily snapshots, oldest first. */
async function listHistory(): Promise<AdminStatsSnapshot[]> {
    const history: AdminStatsSnapshot[] = [];
    let startKey: Record<string, AttributeValue> | undefined;
    do {
        const output = await dynamo.send(
            new QueryCommand({
                TableName: adminStatsHistoryTable,
                KeyConditionExpression: '#type = :type',
                ExpressionAttributeNames: { '#type': 'type' },
                ExpressionAttributeValues: { ':type': { S: HISTORY_KEY } },
                ExclusiveStartKey: startKey,
            }),
        );
        for (const item of output.Items ?? []) {
            const { type: _type, ...snapshot } = unmarshall(item);
            history.push(snapshot as AdminStatsSnapshot);
        }
        startKey = output.LastEvaluatedKey;
    } while (startKey);
    return history;
}
