import { GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { availabilityTypeString, Event } from '@jackstenglein/chess-dojo-common/src/database/event';
import {
    getEventEnd,
    getEventStart,
} from '@jackstenglein/chess-dojo-common/src/database/eventTimes';
import {
    CalendarInviteEvent,
    EventBookedEvent,
    NotificationEventTypes,
    NotificationTypes,
} from '@jackstenglein/chess-dojo-common/src/database/notification';
import { ApiError } from '../directoryService/api';
import { dynamo, UpdateItemBuilder } from '../directoryService/database';
import { getGuildMember, sendDirectMessage } from './discord';
import { getNotificationSettings, PartialUser } from './user';

const frontendHost = process.env.frontendHost;
const eventTable = `${process.env.stage}-events`;
const notificationTable = `${process.env.stage}-notifications`;

/**
 * Creates notifications for EventBookedEvents (booked meetings on the calendar).
 * @param event The event to create notifications for.
 */
export async function handleEventBooked(event: EventBookedEvent) {
    const user = await getNotificationSettings(event.owner);
    if (!user) {
        return;
    }

    if (
        user.discordUsername &&
        !user.notificationSettings?.discordNotificationSettings?.disableMeetingBooking
    ) {
        const discordId = user.discordId ?? (await getGuildMember(user.discordUsername)).user.id;
        await sendDirectMessage(discordId, eventBookedDiscordMessage(event));
        console.log(
            `Successfully sent Discord message to ${user.username} for ${NotificationEventTypes.EVENT_BOOKED}`,
        );
    }
}

/**
 * Returns the text of the notification message for the given event.
 * @param event The event to get the notification text for.
 */
function eventBookedDiscordMessage(event: EventBookedEvent): string {
    if (event.isGroup) {
        return `Hello, someone just joined your group meeting! View it [**here**](<${frontendHost}/meeting/${event.id}>)`;
    }
    return `Hello, someone has just booked a meeting with you! View it [**here**](<${frontendHost}/meeting/${event.id}>).`;
}

/**
 * Creates notifications for calendar invites.
 * @param event The event to create notifications for.
 */
export async function handleCalendarInvite(event: CalendarInviteEvent) {
    const calendarEvent = await getEvent(event.id);
    if (!calendarEvent) {
        throw new ApiError({
            statusCode: 404,
            publicMessage: `Calendar event ${event.id} not found`,
        });
    }

    const owner = await getNotificationSettings(calendarEvent.owner);
    if (!owner) {
        return;
    }
    const ownerDiscordId =
        owner.discordId ??
        (owner.discordUsername ? (await getGuildMember(owner.discordUsername)).user.id : undefined);

    for (const invitee of calendarEvent.invited ?? []) {
        const user = await getNotificationSettings(invitee.username);
        if (!user) {
            continue;
        }
        await Promise.all([
            handleCalendarInviteSite(user, calendarEvent),
            handleCalendarInviteDiscord(user, calendarEvent, ownerDiscordId),
        ]);
    }
}

/**
 * Returns the calendar event with the given id.
 * @param id The id of the event to fetch.
 */
async function getEvent(id: string): Promise<Event | undefined> {
    const getEventOutput = await dynamo.send(
        new GetItemCommand({
            Key: { id: { S: id } },
            TableName: eventTable,
        }),
    );
    if (!getEventOutput.Item) {
        return undefined;
    }
    return unmarshall(getEventOutput.Item) as Event;
}

/**
 * Creates a calendar invite site notification for the given user and event.
 * @param user The user to create the notification for.
 * @param event The calendar event the user was invited to.
 */
async function handleCalendarInviteSite(user: PartialUser, event: Event) {
    if (user.notificationSettings?.siteNotificationSettings?.disableCalendarInvite) {
        return;
    }

    const input = new UpdateItemBuilder()
        .key('username', user.username)
        .key('id', `${NotificationTypes.CALENDAR_INVITE}|${event.id}`)
        .set('type', NotificationTypes.CALENDAR_INVITE)
        .set('updatedAt', new Date().toISOString())
        .set('calendarInviteMetadata', {
            id: event.id,
            ownerDisplayName: event.ownerDisplayName,
            startTime: getEventStart(event).toISOString(),
        })
        .add('count', 1)
        .table(notificationTable)
        .build();
    await dynamo.send(input);
    console.log(
        `Successfully created ${NotificationTypes.CALENDAR_INVITE} notification for ${user.username}`,
    );
}

/**
 * Creates a calendar invite Discord notification for the given user and event.
 * @param user The user to send a Discord DM.
 * @param event The calendar event the user was invited to.
 * @param ownerDiscordId The Discord id of the owner of the event.
 */
async function handleCalendarInviteDiscord(
    user: PartialUser,
    event: Event,
    ownerDiscordId?: string,
) {
    if (
        !user.discordUsername ||
        user.notificationSettings?.discordNotificationSettings?.disableCalendarInvite
    ) {
        return;
    }

    const discordId = user.discordId ?? (await getGuildMember(user.discordUsername)).user.id;
    await sendDirectMessage(discordId, calendarInviteDiscordMessage(event, ownerDiscordId));
    console.log(
        `Successfully sent Discord message to ${user.username} for ${NotificationEventTypes.CALENDAR_INVITE}`,
    );
}

/**
 * Returns the text of the calendar invite discord DM notification.
 * @param event The event the user was invited to.
 * @param ownerDiscordId The discord id of the owner of the event.
 * @returns The text of the calendar invite discord DM notification.
 */
function calendarInviteDiscordMessage(event: Event, ownerDiscordId?: string): string {
    let message = `${ownerDiscordId ? `<@${ownerDiscordId}>` : event.ownerDisplayName} has invited you to a meeting on the ChessDojo calendar!
    
<t:${getEventStart(event).getTime() / 1000}:f> — <t:${getEventEnd(event).getTime() / 1000}:t>`;

    if (event.title) {
        message += `\n**Title:** ${event.title}`;
    }
    if (event.description) {
        message += `\n**Description:** ${event.description}`;
    }
    if (event.types) {
        message += '\n**Types:** ';
        message += event.types.map((t) => availabilityTypeString(t)).join(', ');
    }
    message += `\n[**Click to Book**](${frontendHost}/calendar/availability/${event.id})`;
    return message;
}
