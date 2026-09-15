import { GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { User } from '@jackstenglein/chess-dojo-common/src/database/user';
import { dynamo } from '../directoryService/database';

const userTable = `${process.env.stage}-users`;

export type PartialUser = Pick<
    User,
    | 'username'
    | 'displayName'
    | 'dojoCohort'
    | 'discordId'
    | 'discordUsername'
    | 'notificationSettings'
    | 'subscriptionStatus'
    | 'subscriptionTier'
> & { email: string };

/**
 * Gets the notification settings of the user with the provided username from the database.
 * @param username The username to fetch.
 * @returns The user or undefined if not found.
 */
export async function getNotificationSettings(username: string): Promise<PartialUser | undefined> {
    const getUserOutput = await dynamo.send(
        new GetItemCommand({
            Key: {
                username: { S: username },
            },
            ProjectionExpression: `username, displayName, dojoCohort, email, discordId, discordUsername, notificationSettings, subscriptionStatus, subscriptionTier`,
            TableName: userTable,
        }),
    );
    if (!getUserOutput.Item) {
        return undefined;
    }
    return unmarshall(getUserOutput.Item) as PartialUser;
}
