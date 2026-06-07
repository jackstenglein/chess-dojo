import { GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import {
    DiscordAuthRequestSchema,
    DiscordConnectRequest,
} from '@jackstenglein/chess-dojo-common/src/auth/discord';
import {
    getSearchKey,
    getSubscriptionTier,
    SubscriptionTier,
    User,
} from '@jackstenglein/chess-dojo-common/src/database/user';
import { APIGatewayProxyHandlerV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import axios from 'axios';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseEvent,
    requireUserInfo,
    success,
} from '../directoryService/api';
import { dynamo, UpdateItemBuilder } from '../directoryService/database';
import {
    DISCORD_BOT_TOKEN,
    DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET,
    DISCORD_DEFAULT_REDIRECT_URI,
    DISCORD_GUILD_ID,
    DISCORD_TOKEN_URL,
    DISCORD_USER_URL,
    DiscordTokenResponse,
    DiscordUserResponse,
    FREE_UNVERIFIED_ROLE_ID,
    FreeCohortRoleId,
    LIVE_CLASSES_ROLE_ID,
    PaidCohortRoleId,
    USER_TABLE,
} from './constants';

/**
 * Handles requests to connect or disconnect a user's Discord account.
 * @param event The API gateway event that prompted the request.
 * @returns The updated Discord username/id for connect requests and an empty
 * response for disconnect requests.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event:', JSON.stringify(event));
        const userInfo = requireUserInfo(event);
        const request = parseEvent(event, DiscordAuthRequestSchema);

        const getUserOutput = await dynamo.send(
            new GetItemCommand({
                Key: { username: { S: userInfo.username } },
                TableName: USER_TABLE,
            }),
        );
        if (!getUserOutput.Item) {
            throw new ApiError({
                statusCode: 404,
                publicMessage: `User ${userInfo.username} not found`,
            });
        }
        const user = unmarshall(getUserOutput.Item) as User;

        if (request.mode === 'connect') {
            return handleConnectRequest(user, request);
        }
        return handleDisconnectRequest(user);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Handles a request to connect a Discord account. The user's discord identity
 * is fetched using the OAuth2 code, the user is added to the guild and their
 * Discord username and id are saved in their ChessDojo user profile.
 * @param user The user to add to the discord server.
 * @param request The connect request to process.
 * @returns The updated Discord username and id of the user.
 */
async function handleConnectRequest(
    user: User,
    request: DiscordConnectRequest,
): Promise<APIGatewayProxyResultV2> {
    const params = new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: request.code,
        redirect_uri: request.redirectUri || DISCORD_DEFAULT_REDIRECT_URI,
    });

    const tokenResponse = await axios.post<DiscordTokenResponse>(DISCORD_TOKEN_URL, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const userResponse = await axios.get<DiscordUserResponse>(DISCORD_USER_URL, {
        headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` },
    });

    const roles = getRoles(user);
    if (roles.some((r) => !r)) {
        throw new ApiError({
            statusCode: 400,
            publicMessage: `Invalid cohort: ${user.dojoCohort}`,
        });
    }

    console.log(`Adding user ${user.username} to guild`);
    const addResponse = await axios.put(
        `https://discord.com/api/guilds/${DISCORD_GUILD_ID}/members/${userResponse.data.id}`,
        { access_token: tokenResponse.data.access_token, roles },
        {
            headers: {
                Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                'Content-Type': 'application/json',
            },
        },
    );

    if (addResponse.status === 204) {
        const patchResponse = await addRoles(userResponse.data.id, roles);
        if (patchResponse) {
            console.log(
                `User ${user.username} already in guild. Successfully set roles: `,
                patchResponse,
            );
        } else {
            console.log(
                `User ${user.username} already in guild and has correct roles. No change made.`,
            );
        }
    } else {
        console.log(`User ${user.username} successfully added to guild: `, addResponse);
    }

    user.discordUsername = userResponse.data.username;
    const input = new UpdateItemBuilder()
        .key('username', user.username)
        .set('discordUsername', userResponse.data.username)
        .set('discordId', userResponse.data.id)
        .set('searchKey', getSearchKey(user))
        .table(USER_TABLE)
        .build();
    await dynamo.send(input);
    console.log(`Discord username and id updated on user ${user.username}`);

    return success({
        discordUsername: userResponse.data.username,
        discordId: userResponse.data.id,
    });
}

/**
 * Adds the provided roles to the given discord ID. If the given ID already
 * has all these roles, no change is made.
 * @param discordId The Discord ID to add the roles to.
 * @param roles The roles to set on the user.
 */
async function addRoles(discordId: string, roles: string[]) {
    const getResponse = await axios.get<{ roles?: string[] }>(
        `https://discord.com/api/guilds/${DISCORD_GUILD_ID}/members/${discordId}`,
        { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } },
    );
    const newRoles = roles.filter((r) => !getResponse.data.roles?.includes(r));
    if (newRoles.length === 0) {
        return;
    }

    roles = [...(getResponse.data.roles ?? []), ...newRoles];
    return await axios.patch(
        `https://discord.com/api/guilds/${DISCORD_GUILD_ID}/members/${discordId}`,
        { roles },
        {
            headers: {
                Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                'Content-Type': 'application/json',
            },
        },
    );
}

/**
 * Handles a request to disconnect a Discord account. The user is removed from the
 * guild and their Discord username and id are removed from their ChessDojo user
 * profile.
 * @param user The user to disconnect from Discord.
 * @returns An empty API gateway proxy result.
 */
async function handleDisconnectRequest(user: User): Promise<APIGatewayProxyResultV2> {
    if (user.discordId) {
        console.log(`Removing user ${user.username} (${user.discordId}) from the guild`);
        await axios.delete(
            `https://discord.com/api/guilds/${DISCORD_GUILD_ID}/members/${user.discordId}`,
            { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } },
        );
        console.log(`User ${user.username} (${user.discordId}) successfully removed from guild`);
    }

    user.discordUsername = '';
    const input = new UpdateItemBuilder()
        .key('username', user.username)
        .remove('discordUsername')
        .remove('discordId')
        .set('searchKey', getSearchKey(user))
        .table(USER_TABLE)
        .build();
    await dynamo.send(input);
    console.log(`Discord username and id removed from user ${user.username}`);

    return success(null);
}

/**
 * Returns the discord roles for the given user based on their subscription tier.
 * @param user The user to get the roles for.
 */
function getRoles(user: User): string[] {
    const subscriptionTier = getSubscriptionTier(user);
    if (subscriptionTier === SubscriptionTier.Basic) {
        return [PaidCohortRoleId[user.dojoCohort]];
    }

    if (
        subscriptionTier === SubscriptionTier.Lecture ||
        subscriptionTier === SubscriptionTier.GameReview
    ) {
        return [PaidCohortRoleId[user.dojoCohort], LIVE_CLASSES_ROLE_ID];
    }

    return [FreeCohortRoleId[user.dojoCohort], FREE_UNVERIFIED_ROLE_ID];
}
