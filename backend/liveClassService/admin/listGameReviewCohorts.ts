import { AttributeValue, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { getCohortRangeInt } from '@jackstenglein/chess-dojo-common/src/database/cohort';
import { SubscriptionTier, User } from '@jackstenglein/chess-dojo-common/src/database/user';
import { GameReviewCohort } from '@jackstenglein/chess-dojo-common/src/liveClasses/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    requireUserInfo,
    success,
} from '../../directoryService/api';
import { dynamo, getUser, LIVE_CLASSES_TABLE, USER_TABLE } from '../../directoryService/database';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: ', event);
        const userInfo = requireUserInfo(event);
        const user = await getUser(userInfo.username);
        if (!user.isAdmin) {
            throw new ApiError({
                statusCode: 403,
                publicMessage: `You must be an admin to perform this action`,
            });
        }

        const output = await dynamo.send(
            new ScanCommand({
                TableName: LIVE_CLASSES_TABLE,
            }),
        );

        const gameReviewCohorts = (output.Items?.map((item) => unmarshall(item)) ??
            []) as GameReviewCohort[];
        const [users, lectureTierUsers] = await Promise.all([
            getUsersByTier(SubscriptionTier.GameReview),
            getUsersByTier(SubscriptionTier.Lecture),
        ]);
        const lectureUsers = lectureTierUsers.map((u) => ({
            username: u.username,
            displayName: u.displayName,
            dojoCohort: u.dojoCohort,
        }));

        // Build a map of username -> dojoCohort from game review users
        const userCohortMap = new Map<string, string>();
        for (const u of users) {
            userCohortMap.set(u.username, u.dojoCohort);
        }

        // Enrich each cohort member with their dojoCohort
        for (const cohort of gameReviewCohorts) {
            for (const [username, member] of Object.entries(cohort.members)) {
                const dojoCohort = userCohortMap.get(username);
                if (dojoCohort) {
                    cohort.members[username] = { ...member, dojoCohort };
                }
            }
        }

        // Sort cohorts by the minimum member rating (lowest first)
        gameReviewCohorts.sort((a, b) => {
            const minA = getMinMemberRating(a);
            const minB = getMinMemberRating(b);
            return minA - minB;
        });

        const unassignedUsers = users.filter(
            (u) => !gameReviewCohorts.some((grc) => grc.members[u.username]),
        );

        return success({ gameReviewCohorts, unassignedUsers, lectureUsers });
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

async function getUsersByTier(tier: SubscriptionTier): Promise<User[]> {
    let exclusiveStartKey: Record<string, AttributeValue> | undefined = undefined;
    const users: User[] = [];

    do {
        const input = new QueryCommand({
            KeyConditionExpression: '#subscriptionTier = :tier',
            ExpressionAttributeNames: { '#subscriptionTier': 'subscriptionTier' },
            ExpressionAttributeValues: { ':tier': { S: tier } },
            IndexName: `SubscriptionTierIdx`,
            TableName: USER_TABLE,
            ExclusiveStartKey: exclusiveStartKey,
        });

        const output = await dynamo.send(input);
        users.push(...(output.Items?.map((u) => unmarshall(u) as User) ?? []));
        exclusiveStartKey = output.LastEvaluatedKey;
    } while (exclusiveStartKey);

    return users;
}

/** Returns the minimum member rating in a cohort, or Infinity if it has no members. */
function getMinMemberRating(cohort: GameReviewCohort): number {
    const members = Object.values(cohort.members);
    if (members.length === 0) {
        return Infinity;
    }
    return Math.min(
        ...members.map((m) => {
            const [min] = getCohortRangeInt(m.dojoCohort);
            return min >= 0 ? min : Infinity;
        }),
    );
}
