'use strict';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { Event, EventStatus, EventType } from '@jackstenglein/chess-dojo-common/src/database/event';
import { sendChannelMessage } from '../notificationService/discord';

const dynamo = new DynamoDBClient({ region: 'us-east-1' });
const EVENTS_TABLE = process.env.eventsTable || '';

const CHANNEL_ID = process.env.discordScheduleChannelId || '';

export const handler = async () => {
    console.log('postWeeklySchedule handler started');

    const now = new Date();
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const result = await dynamo.send(
        new ScanCommand({
            TableName: EVENTS_TABLE,
            FilterExpression:
                '#type IN (:lecture, :gameReview) AND #status = :scheduled AND startTime >= :now AND startTime <= :weekLater',
            ExpressionAttributeNames: {
                '#type': 'type',
                '#status': 'status',
            },
            ExpressionAttributeValues: {
                ':lecture': { S: EventType.LectureTier },
                ':gameReview': { S: EventType.GameReviewTier },
                ':scheduled': { S: EventStatus.Scheduled },
                ':now': { S: now.toISOString() },
                ':weekLater': { S: weekLater.toISOString() },
            },
        }),
    );

    const events = (result.Items ?? [])
        .map((item) => unmarshall(item) as Event)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const message = formatScheduleMessage(events);

    await sendChannelMessage(CHANNEL_ID, message);

    console.log('postWeeklySchedule completed');
};

function formatScheduleMessage(events: Event[]): string {
    if (events.length === 0) {
        return '📅 **Upcoming Week Schedule**\n\nNo live classes scheduled for next week.';
    }

    const lectures = events.filter((e) => e.type === EventType.LectureTier);
    const gameReviews = events.filter((e) => e.type === EventType.GameReviewTier);

    let message = '📅 **Upcoming Week Live Class Schedule**\n\n';

    if (lectures.length > 0) {
        message += '🎓 **Lecture Sessions**\n';
        for (const e of lectures) {
            const ts = Math.floor(new Date(e.startTime).getTime() / 1000);
            message += `• ${e.title} — <t:${ts}:F>\n`;
        }
        message += '\n';
    }

    if (gameReviews.length > 0) {
        message += '♟️ **Game Review Sessions**\n';
        for (const e of gameReviews) {
            const ts = Math.floor(new Date(e.startTime).getTime() / 1000);
            message += `• ${e.title} — <t:${ts}:F>\n`;
        }
    }

    return message.trim();
}