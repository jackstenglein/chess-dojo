import { BatchGetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { ClubMember } from '@jackstenglein/chess-dojo-common/src/database/club';
import { Event, EventStatus, EventType } from '@jackstenglein/chess-dojo-common/src/database/event';
import {
    GameReviewCohort,
    GameReviewCohortMember,
    SetGameReviewCohortsRequest,
    setGameReviewCohortsRequestSchema,
} from '@jackstenglein/chess-dojo-common/src/liveClasses/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    ChannelType,
    Client,
    Events,
    GatewayIntentBits,
    Guild,
    GuildChannelEditOptions,
    OverwriteType,
    PermissionFlagsBits,
    TextChannel,
} from 'discord.js';
import { RRule } from 'rrule';
import { v4 as uuidv4 } from 'uuid';
import {
    ApiError,
    errToApiGatewayProxyResultV2,
    parseEvent,
    requireUserInfo,
    success,
} from '../../directoryService/api';
import {
    CLUB_TABLE,
    dynamo,
    getUser,
    LIVE_CLASSES_TABLE,
    UpdateItemBuilder,
    USER_TABLE,
} from '../../directoryService/database';

const EVENTS_TABLE = `${process.env.stage}-events`;
const DISCORD_GUILD_ID = process.env.discordPrivateGuildId || '';
const DISCORD_CATEGORY_ID = process.env.discordLiveClassesCategoryId || '';
const DISCORD_LIVE_CLASSES_ROLE_ID = process.env.discordLiveClassesRoleId || '';
const DISCORD_SENSEI_ROLE_ID = process.env.discordSenseiRoleId || '';

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

        const request = parseEvent(event, setGameReviewCohortsRequestSchema);
        const cohorts = await handleRequest(request);
        return success({ gameReviewCohorts: cohorts });
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};

/**
 * Handles updating game review cohorts and related resources
 * to match the given request. Returns the list of new game review cohorts.
 */
async function handleRequest(request: SetGameReviewCohortsRequest) {
    const discordClient = await getDiscordClient();

    const newCohorts: GameReviewCohort[] = [];
    for (const cohort of request.gameReviewCohorts) {
        if (Object.values(cohort.members).length === 0) {
            continue;
        }

        if (!cohort.id) {
            cohort.id = uuidv4();
        }

        // Strip backend-enriched fields before persisting
        for (const [key, member] of Object.entries(cohort.members)) {
            const { dojoCohort: _, ...rest } = member;
            cohort.members[key] = rest as typeof member;
        }

        const builder = new UpdateItemBuilder<GameReviewCohort>()
            .key('type', 'GAME_REVIEW_COHORT')
            .key('id', cohort.id)
            .set('name', cohort.name)
            .set('members', cohort.members)
            .return('ALL_NEW')
            .table(LIVE_CLASSES_TABLE);

        if (!cohort.peerReviewEventId) {
            const eventId = await createPeerReviewEvent(cohort);
            builder.set('peerReviewEventId', eventId);
        }
        if (!cohort.senseiReviewEventId) {
            const eventId = await createSenseiReviewEvent(cohort);
            builder.set('senseiReviewEventId', eventId);
        }

        if (cohort.discordChannelId) {
            builder.set('discordChannelId', cohort.discordChannelId);
        } else {
            const discordChannelId = await createDiscordChannel(
                discordClient,
                cohort.name,
                cohort.members,
            );
            builder.set('discordChannelId', discordChannelId);
        }

        const newCohort = await builder.send();
        if (!newCohort) {
            throw new ApiError({
                statusCode: 500,
                publicMessage: `Failed to update game review cohort ${cohort.name}`,
                privateMessage: `Dynamo update command did not return new item`,
            });
        }
        newCohorts.push(newCohort);

        await setUserGameReviewCohortIds(newCohort);
        await setClub(newCohort);
        if (cohort.discordChannelId) {
            await updateDiscordChannel(discordClient, cohort.discordChannelId, newCohort);
        }
    }

    return newCohorts;
}

/**
 * @returns A logged-in and ready discord client.
 */
async function getDiscordClient() {
    const client = new Client({
        intents: [GatewayIntentBits.Guilds],
    });
    const readyClientPromise = new Promise<Client<true>>((resolve) => {
        client.once(Events.ClientReady, (readyClient) => resolve(readyClient));
    });
    await client.login(process.env.discordAuth);
    const readyClient = await readyClientPromise;
    return readyClient;
}

/**
 * Creates a Discord channel with the given name and members.
 * @param client The Discord client to use.
 * @param name The name of the channel.
 * @param members The members to add to the channel.
 * @returns The id of the new channel.
 */
async function createDiscordChannel(
    client: Client,
    name: string,
    members: Record<string, GameReviewCohortMember>,
): Promise<string> {
    const guild = client.guilds.cache.get(DISCORD_GUILD_ID);
    if (!guild) {
        throw new ApiError({
            statusCode: 500,
            publicMessage: `Failed to find Discord guild`,
            privateMessage: `Discord guild ${DISCORD_GUILD_ID} not found`,
        });
    }

    const createChannelInput = {
        name: name.toLowerCase().replaceAll(' ', '-'),
        type: ChannelType.GuildText,
        parent: DISCORD_CATEGORY_ID,
        permissionOverwrites: await getPermissionOverwrites(client, guild, members),
    } as const;
    console.log('Create Channel Input: ', createChannelInput);

    const channel = await guild.channels.create(createChannelInput);
    return channel.id;
}

/**
 * Updates a Discord channel so its name and permissions match the given GameReviewCohort.
 * @param client The Discord client to use.
 * @param channelId The id of the channel to update.
 * @param cohort The GameReviewCohort to match.
 */
async function updateDiscordChannel(client: Client, channelId: string, cohort: GameReviewCohort) {
    const guild = client.guilds.cache.get(DISCORD_GUILD_ID);
    if (!guild) {
        throw new ApiError({
            statusCode: 500,
            publicMessage: `Failed to find Discord guild`,
            privateMessage: `Discord guild ${DISCORD_GUILD_ID} not found`,
        });
    }

    const channel = client.channels.cache.get(channelId) as TextChannel;
    if (!channel) {
        throw new ApiError({
            statusCode: 500,
            publicMessage: `Failed to update Discord channel permissions`,
            privateMessage: `Channel id ${channelId} not found`,
        });
    }

    await channel.edit({
        name: cohort.name.toLowerCase().replaceAll(' ', '-'),
        permissionOverwrites: await getPermissionOverwrites(client, guild, cohort.members),
    });
}

async function getPermissionOverwrites(
    client: Client,
    guild: Guild,
    members: Record<string, GameReviewCohortMember>,
): Promise<GuildChannelEditOptions['permissionOverwrites']> {
    const memberIds = await getDiscordIds(Object.values(members).map((m) => m.username));
    return [
        {
            type: OverwriteType.Role,
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
        },
        {
            type: OverwriteType.Role,
            id: DISCORD_LIVE_CLASSES_ROLE_ID,
            deny: [PermissionFlagsBits.ViewChannel],
        },
        {
            type: OverwriteType.Role,
            id: DISCORD_SENSEI_ROLE_ID,
            allow: [PermissionFlagsBits.ViewChannel],
        },
        {
            type: OverwriteType.Member,
            id: client.user?.id || '',
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.ManageRoles,
            ],
        },
        ...memberIds.map((id) => ({
            type: OverwriteType.Member,
            id,
            allow: [PermissionFlagsBits.ViewChannel],
        })),
    ];
}

/**
 * Returns the Discord ids for the given Dojo usernames. The ids
 * may not be returned in the same order as the usernames.
 * @param usernames The usernames to fetch the Discord ids for.
 * @returns The Discord ids, not necessarily in the same order as the usernames.
 */
async function getDiscordIds(usernames: string[]): Promise<string[]> {
    const input = new BatchGetItemCommand({
        RequestItems: {
            [USER_TABLE]: {
                Keys: usernames.map((u) => ({ username: { S: u } })),
                ProjectionExpression: '#discordId',
                ExpressionAttributeNames: { '#discordId': 'discordId' },
            },
        },
    });
    const output = await dynamo.send(input);
    if (!output.Responses?.[USER_TABLE]) {
        throw new ApiError({
            statusCode: 500,
            publicMessage: `DynamoDB BatchGetItem failure`,
            privateMessage: `Failed to get discord ids with input: ${input}`,
        });
    }

    return output.Responses[USER_TABLE].map((data) => unmarshall(data))
        .map((user) => user.discordId)
        .filter((id) => id);
}

/**
 * Creates a new peer review event for the given game reivew cohort.
 * @param cohort The game review cohort to create the event for.
 * @returns The id of the created event.
 */
async function createPeerReviewEvent(
    cohort: SetGameReviewCohortsRequest['gameReviewCohorts'][0],
): Promise<string> {
    if (!cohort.id) {
        throw new ApiError({
            statusCode: 500,
            publicMessage: `Failed to create peer review event`,
            privateMessage: `Cohort id is empty`,
        });
    }
    if (!cohort.peerReviewRrule) {
        throw new ApiError({
            statusCode: 400,
            publicMessage: `Unable to create peer review event for cohort ${cohort.name}: rrule is missing`,
        });
    }
    if (!cohort.peerReviewGoogleMeetUrl) {
        throw new ApiError({
            statusCode: 400,
            publicMessage: `Unable to create peer review event for cohort ${cohort.name}: Google Meet URL is missing`,
        });
    }
    return await createEvent({
        title: `${cohort.name} Peer Review`,
        description: `The peer review session for ${cohort.name}. Reivew a game (or multiple if there is time) from the first user in the review queue that is not paused. Try to improve the existing annotations of the game(s) and develop some questions about what was going on in the game(s). A few days later, you will meet with the sensei and share your perspective and questions.`,
        location: cohort.peerReviewGoogleMeetUrl,
        rrule: cohort.peerReviewRrule,
        cohortId: cohort.id,
    });
}

/**
 * Creates a new sensei review event for the given game reivew cohort.
 * @param cohort The game review cohort to create the event for.
 * @returns The id of the created event.
 */
async function createSenseiReviewEvent(
    cohort: SetGameReviewCohortsRequest['gameReviewCohorts'][0],
): Promise<string> {
    if (!cohort.id) {
        throw new ApiError({
            statusCode: 500,
            publicMessage: `Failed to create sensei review event`,
            privateMessage: `Cohort id is empty`,
        });
    }
    if (!cohort.senseiReviewRrule) {
        throw new ApiError({
            statusCode: 400,
            publicMessage: `Unable to create sensei review event for cohort ${cohort.name}: rrule is missing`,
        });
    }
    if (!cohort.senseiReviewGoogleMeetUrl) {
        throw new ApiError({
            statusCode: 400,
            publicMessage: `Unable to create sensei review event for cohort ${cohort.name}: Google Meet URL is missing`,
        });
    }
    return await createEvent({
        title: `${cohort.name} Sensei Review`,
        description: `The sensei review session for ${cohort.name}. The sensei will cover the same user from the previous peer review session. The sensei will begin by looking at the user's profile, and then look at the game(s) of the user. The sensei will share their perspective on the game and answer the questions the students came up with during the peer review session.`,
        location: cohort.senseiReviewGoogleMeetUrl,
        rrule: cohort.senseiReviewRrule,
        cohortId: cohort.id,
    });
}

/**
 * Creates a new event with the given parameters.
 * @param title The title of the event.
 * @param description The description of the event.
 * @param location The location of the event.
 * @param rrule The recurrence rule of the event.
 * @param cohortId The game review cohort id associated with the event.
 * @returns The id of the created event.
 */
async function createEvent({
    title,
    description,
    location,
    rrule,
    cohortId,
}: {
    title: string;
    description: string;
    location: string;
    rrule: string;
    cohortId: string;
}): Promise<string> {
    const options = RRule.parseString(rrule);
    if (!options.dtstart) {
        throw new ApiError({
            statusCode: 400,
            publicMessage: `Unable to create event ${title}: rrule does not include dtstart`,
        });
    }

    const endTime = new Date(options.dtstart);
    endTime.setHours(endTime.getHours() + 1);

    const event: Event = {
        id: uuidv4(),
        type: EventType.GameReviewTier,
        owner: 'admin',
        ownerDisplayName: 'Admin',
        ownerCohort: '2400+',
        title,
        startTime: options.dtstart.toISOString(),
        endTime: endTime.toISOString(),
        rrule,
        cohorts: [],
        status: EventStatus.Scheduled,
        location,
        description,
        maxParticipants: 0,
        participants: {},
        messages: [],
        gameReviewCohortId: cohortId,
    };

    await dynamo.send(
        new PutItemCommand({
            Item: marshall(event),
            TableName: EVENTS_TABLE,
        }),
    );
    return event.id;
}

/**
 * Sets the gameReviewCohortId field on the given cohort's members
 * to match the cohort's id.
 * @param cohort The cohort to update the members for.
 */
async function setUserGameReviewCohortIds(cohort: GameReviewCohort) {
    for (const member of Object.keys(cohort.members)) {
        await new UpdateItemBuilder()
            .key('username', member)
            .set('gameReviewCohortId', cohort.id)
            .return('NONE')
            .table(USER_TABLE)
            .send();
    }
}

/**
 * Sets the club for the game review cohort.
 * @param cohort The game review cohort to set the club for.
 */
async function setClub(cohort: GameReviewCohort) {
    const members = Object.values(cohort.members).reduce(
        (acc, item) => {
            acc[item.username] = {
                username: item.username,
                joinedAt: item.queueDate,
            };
            return acc;
        },
        {} as Record<string, ClubMember>,
    );

    await new UpdateItemBuilder()
        .key('id', cohort.id)
        .set('name', cohort.name)
        .set('description', `Club for members of the Game+Profile Review ${cohort.name}.`)
        .set('shortDescription', `Club for members of the Game+Profile Review ${cohort.name}.`)
        .set('owner', 'admin')
        .set('memberCount', Object.entries(cohort.members).length)
        .set('members', members)
        .set('approvalRequired', true)
        .set('allowFreeTier', false)
        .set('joinRequests', {})
        .setIfNotExists('createdAt', new Date().toISOString())
        .set('updatedAt', new Date().toISOString())
        .return('NONE')
        .table(CLUB_TABLE)
        .send();
}
