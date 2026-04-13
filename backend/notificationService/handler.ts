'use strict';

import { GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import {
    NewFollowerEvent,
    NotificationEvent,
    NotificationEventSchema,
    NotificationEventTypes,
} from '@jackstenglein/chess-dojo-common/src/database/notification';
import { User } from '@jackstenglein/chess-dojo-common/src/database/user';
import { SQSEvent, SQSHandler } from 'aws-lambda';
import { ApiError } from '../directoryService/api';
import { dynamo, UpdateItemBuilder } from '../directoryService/database';
import { handleClubJoinRequest, handleClubJoinRequestApproved } from './club';
import { handleCalendarInvite, handleEventBooked } from './events';
import { handleGameComment, handleGameReview, handleGameReviewSubmitted } from './game';
import { handleBlogPublished } from './blog';
import { handleRoundRobinStart } from './roundRobin';
import { handleSubscriptionCreated } from './subscription';
import { handleTimelineComment, handleTimelineReaction } from './timeline';

const userTable = process.env.stage + '-users';
const notificationTable = process.env.stage + '-notifications';

/**
 * Handles messages sent to the notification events SQS queue. Notification
 * events are events that may generate notifications, whether on the site,
 * in Discord or through email.
 * @param event The SQS event that triggered the handler.
 */
export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
    console.log('Event: %j', event);
    for (const message of event.Records) {
        try {
            const notificationEvent = NotificationEventSchema.parse(JSON.parse(message.body));
            await handleEvent(notificationEvent);
        } catch (err) {
            console.error('Error while processing message:', message, err);
        }
    }
};

function handleEvent(event: NotificationEvent) {
    switch (event.type) {
        case NotificationEventTypes.GAME_COMMENT:
            return handleGameComment(event);
        case NotificationEventTypes.GAME_REVIEW_COMPLETE:
            return handleGameReview(event);
        case NotificationEventTypes.GAME_REVIEW_SUBMITTED:
            return handleGameReviewSubmitted(event);
        case NotificationEventTypes.NEW_FOLLOWER:
            return handleNewFollower(event);
        case NotificationEventTypes.TIMELINE_COMMENT:
            return handleTimelineComment(event);
        case NotificationEventTypes.TIMELINE_REACTION:
            return handleTimelineReaction(event);
        case NotificationEventTypes.NEW_CLUB_JOIN_REQUEST:
            return handleClubJoinRequest(event);
        case NotificationEventTypes.CLUB_JOIN_REQUEST_APPROVED:
            return handleClubJoinRequestApproved(event);
        case NotificationEventTypes.EVENT_BOOKED:
            return handleEventBooked(event);
        case NotificationEventTypes.CALENDAR_INVITE:
            return handleCalendarInvite(event);
        case NotificationEventTypes.ROUND_ROBIN_START:
            return handleRoundRobinStart(event);
        case NotificationEventTypes.SUBSCRIPTION_CREATED:
            return handleSubscriptionCreated(event);
        case NotificationEventTypes.BLOG_PUBLISHED:
            return handleBlogPublished(event);
        default:
            throw new ApiError({
                statusCode: 400,
                publicMessage: `Invalid notification event type: ${(event as any).type}`,
            });
    }
}

/**
 * Creates notifications for NewFollowerEvents.
 * @param event The event to create notifications for.
 */
async function handleNewFollower(event: NewFollowerEvent) {
    const getItemOutput = await dynamo.send(
        new GetItemCommand({
            Key: {
                username: { S: event.username },
            },
            TableName: userTable,
        }),
    );
    if (!getItemOutput.Item) {
        throw new ApiError({
            statusCode: 404,
            publicMessage: `Invalid request: username ${event.username} not found `,
        });
    }

    const user = unmarshall(getItemOutput.Item) as User;
    if (user.notificationSettings?.siteNotificationSettings?.disableNewFollower) {
        return;
    }

    const input = new UpdateItemBuilder()
        .key('username', user.username)
        .key('id', `${event.type}|${event.follower.username}`)
        .set('type', event.type)
        .set('updatedAt', new Date().toISOString())
        .set('newFollowerMetadata', event.follower)
        .add('count', 1)
        .table(notificationTable)
        .build();
    const result = await dynamo.send(input);
    console.log('handleNewFollower result: ', result);
}
