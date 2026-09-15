import axios from 'axios';
import {
    ChannelType,
    Client,
    Events,
    GatewayIntentBits,
    GuildMember,
    MessageCreateOptions,
    TextChannel,
} from 'discord.js';
import { ApiError } from '../directoryService/api';

const privateGuildId = process.env.discordPrivateGuildId || '';

/**
 * @returns A logged-in and ready discord client.
 */
async function getClient() {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    const readyClientPromise = new Promise<Client<true>>((resolve) => {
        client.once(Events.ClientReady, (readyClient) => resolve(readyClient));
    });
    await client.login(process.env.discordAuth);
    const readyClient = await readyClientPromise;
    return readyClient;
}

/**
 * Sends the given message in the given channel.
 * @param channelId The id of the channel to send a message in.
 * @param message The message to send.
 */
export async function sendChannelMessage(channelId: string, message: string) {
    const client = await getClient();
    const channel = client.channels.cache.get(channelId);
    await (channel as TextChannel | undefined)?.send(message);
}

/**
 * Sends the given embed message in the given channel.
 * @param channelId The id of the channel to send the embed in.
 * @param options The message options including embeds.
 */
export async function sendChannelEmbed(channelId: string, options: MessageCreateOptions) {
    const client = await getClient();
    const channel = client.channels.cache.get(channelId);
    await (channel as TextChannel | undefined)?.send(options);
}

/**
 * Creates a private thread in the given channel.
 * @param channelId The channel to contain the thread.
 * @param threadName The name of the thread.
 * @returns The thread's id.
 */
export async function createPrivateThread(
    channelId: string,
    threadName: string,
): Promise<string | undefined> {
    const client = await getClient();
    const channel = client.channels.cache.get(channelId);
    const thread = await (channel as TextChannel | undefined)?.threads.create({
        name: threadName,
        type: ChannelType.PrivateThread,
        invitable: true,
    });
    return thread?.id;
}

/**
 * Adds the given user IDs to the given thread.
 * @param threadId The thread to add users to.
 * @param users The ids of the users to add.
 */
export async function addMembersToThread(threadId: string, users: string[]) {
    for (const user of users) {
        try {
            await axios.put(
                `https://discord.com/api/channels/${threadId}/thread-members/${user}`,
                {},
                {
                    headers: {
                        Authorization: `Bot ${process.env.discordAuth}`,
                        'Content-Type': 'application/json',
                    },
                },
            );
        } catch (err) {
            console.error(`Failed to add user ${user} to thread ${threadId}: `, err);
        }
    }
}

/**
 * Sends the given direct message to the given user.
 * @param discordId The id of the user to DM.
 * @param message The message to send.
 */
export async function sendDirectMessage(discordId: string, message: string) {
    const client = await getClient();
    await client.users.send(discordId, message);
}

/**
 * Returns the guild member with the given username.
 * @param discordUsername The discord username of the member to fetch.
 */
export async function getGuildMember(discordUsername: string): Promise<GuildMember> {
    const client = await getClient();
    const guild = client.guilds.cache.get(privateGuildId);
    if (!guild) {
        throw new ApiError({
            statusCode: 500,
            publicMessage: 'Internal server error',
            privateMessage: 'Failed to get Discord guild',
        });
    }

    discordUsername = discordUsername.split('#')[0];
    const members = await guild.members.search({ query: discordUsername, limit: 1000 });
    discordUsername = discordUsername.trim().toLowerCase();
    for (const member of members.values()) {
        if (member.user.username.toLowerCase() === discordUsername) {
            return member;
        }
    }

    throw new ApiError({
        statusCode: 404,
        publicMessage: `Discord username ${discordUsername} not found in the ChessDojo server`,
    });
}
