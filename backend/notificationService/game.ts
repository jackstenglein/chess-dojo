'use strict';

import { GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { Game, PositionComment } from '@jackstenglein/chess-dojo-common/src/database/game';
import {
    GameCommentEvent,
    GameReviewEvent,
    GameReviewSubmittedEvent,
    NotificationEventTypes,
    NotificationTypes,
} from '@jackstenglein/chess-dojo-common/src/database/notification';
import { ApiError } from '../directoryService/api';
import { dynamo, UpdateItemBuilder } from '../directoryService/database';
import { sendDirectMessage } from './discord';
import { getNotificationSettings } from './user';

const gameTable = `${process.env.stage}-games`;
const notificationTable = `${process.env.stage}-notifications`;

type GameProjection = Pick<Game, 'cohort' | 'id' | 'headers' | 'positionComments' | 'owner'>;

/**
 * Creates notifications for GameCommentEvents.
 * @param event The event to create notifications for.
 */
export async function handleGameComment(event: GameCommentEvent) {
    const getGameOutput = await dynamo.send(
        new GetItemCommand({
            Key: {
                cohort: { S: event.game.cohort },
                id: { S: event.game.id },
            },
            ProjectionExpression: `cohort, #id, headers, positionComments, #owner`,
            ExpressionAttributeNames: {
                '#owner': 'owner',
                '#id': 'id',
            },
            TableName: gameTable,
        }),
    );
    if (!getGameOutput.Item) {
        throw new ApiError({
            statusCode: 404,
            publicMessage: `Invalid request: game ${event.game.cohort}/${event.game.id} not found`,
        });
    }

    const game = unmarshall(getGameOutput.Item) as GameProjection;
    const comment = game.positionComments[event.comment.fen]?.[event.comment.id];
    if (!comment) {
        throw new ApiError({
            statusCode: 404,
            publicMessage: `Invalid request: comment ${event.comment.fen} / ${event.comment.id} not found`,
        });
    }

    const notifiedUsers = new Set<string>();
    const parentIds = comment.parentIds?.split(',') ?? [];
    let parent: PositionComment | undefined = undefined;
    for (const parentId of parentIds) {
        if (!parent) {
            parent = game.positionComments[comment.fen]?.[parentId];
        } else {
            parent = parent.replies[parentId];
        }

        if (!parent) {
            break;
        }
        if (
            parent.owner.username === comment.owner.username ||
            notifiedUsers.has(parent.owner.username)
        ) {
            continue;
        }

        notifiedUsers.add(parent.owner.username);
        await putCommentReplyNotification(game, parent.owner.username);
    }

    if (!comment.parentIds && comment.owner.username !== game.owner) {
        await putNewCommentNotification(game);
    }
}

/**
 * Saves a game comment reply notification to the database.
 * @param game The game the comment reply was left on.
 * @param username The username to notify.
 */
async function putCommentReplyNotification(game: GameProjection, username: string) {
    const user = await getNotificationSettings(username);
    if (!user) {
        console.error(`Unable to add comment reply notification for user ${username}: not found`);
        return;
    }
    if (user.notificationSettings?.siteNotificationSettings?.disableGameCommentReplies) {
        console.log(`Skipping user ${username} as gameCommentReplies are disabled`);
        return;
    }

    const input = new UpdateItemBuilder()
        .key('username', username)
        .key('id', `${NotificationTypes.GAME_COMMENT_REPLY}|${game.cohort}|${game.id}`)
        .set('type', NotificationTypes.GAME_COMMENT_REPLY)
        .set('updatedAt', new Date().toISOString())
        .set('gameCommentMetadata', {
            cohort: game.cohort,
            id: game.id,
            headers: game.headers,
        })
        .add('count', 1)
        .table(notificationTable)
        .build();
    const result = await dynamo.send(input);
    console.log(`Successfully created gameCommentReply notification for ${username}: `, result);
}

/**
 * Saves a new game comment notification to the database.
 * @param game The game the comment was left on.
 */
async function putNewCommentNotification(game: GameProjection) {
    const user = await getNotificationSettings(game.owner);
    if (!user) {
        console.error(`Unable to add new comment notification for user ${game.owner}: not found`);
        return;
    }
    if (user.notificationSettings?.siteNotificationSettings?.disableGameComment) {
        console.log(`Skipping user ${game.owner} as gameComment is disabled`);
        return;
    }

    const input = new UpdateItemBuilder()
        .key('username', game.owner)
        .key('id', `${NotificationTypes.GAME_COMMENT}|${game.cohort}|${game.id}`)
        .set('type', NotificationTypes.GAME_COMMENT)
        .set('updatedAt', new Date().toISOString())
        .set('gameCommentMetadata', {
            cohort: game.cohort,
            id: game.id,
            headers: game.headers,
        })
        .add('count', 1)
        .table(notificationTable)
        .build();
    const result = await dynamo.send(input);
    console.log(`Successfully created game comment notification for user ${game.owner}: `, result);
}

/**
 * Creates notifications for a completed game review.
 * @param event The event to create notifications for.
 */
export async function handleGameReview(event: GameReviewEvent) {
    const getGameOutput = await dynamo.send(
        new GetItemCommand({
            Key: {
                cohort: { S: event.game.cohort },
                id: { S: event.game.id },
            },
            ProjectionExpression: `cohort, #id, headers, #owner, review`,
            ExpressionAttributeNames: {
                '#owner': 'owner',
                '#id': 'id',
            },
            TableName: gameTable,
        }),
    );
    if (!getGameOutput.Item) {
        throw new ApiError({
            statusCode: 404,
            publicMessage: `Invalid request: game ${event.game.cohort}/${event.game.id} not found`,
        });
    }

    const game = unmarshall(getGameOutput.Item) as Pick<
        Game,
        'cohort' | 'id' | 'headers' | 'owner' | 'review'
    >;
    const user = await getNotificationSettings(game.owner);
    if (!user) {
        return;
    }

    const input = new UpdateItemBuilder()
        .key('username', user.username)
        .key('id', `${NotificationTypes.GAME_REVIEW_COMPLETE}|${game.cohort}|${game.id}`)
        .set('type', NotificationTypes.GAME_REVIEW_COMPLETE)
        .set('updatedAt', new Date().toISOString())
        .set('gameReviewMetadata', {
            cohort: game.cohort,
            id: game.id,
            headers: game.headers,
            reviewer: game.review?.reviewer,
        })
        .add('count', 1)
        .table(notificationTable)
        .build();
    await dynamo.send(input);
    console.log(
        `Successfully created ${NotificationTypes.GAME_REVIEW_COMPLETE} notification for ${game.owner}`,
    );
}

const frontendHost = process.env.frontendHost;

/**
 * Sends Discord DM notifications to senseis when a game is submitted for review.
 * @param event The event to create notifications for.
 */
export async function handleGameReviewSubmitted(event: GameReviewSubmittedEvent) {
    const getGameOutput = await dynamo.send(
        new GetItemCommand({
            Key: {
                cohort: { S: event.game.cohort },
                id: { S: event.game.id },
            },
            ProjectionExpression: `cohort, #id, headers, #owner, review`,
            ExpressionAttributeNames: {
                '#owner': 'owner',
                '#id': 'id',
            },
            TableName: gameTable,
        }),
    );
    if (!getGameOutput.Item) {
        throw new ApiError({
            statusCode: 404,
            publicMessage: `Invalid request: game ${event.game.cohort}/${event.game.id} not found`,
        });
    }

    const game = unmarshall(getGameOutput.Item) as Pick<
        Game,
        'cohort' | 'id' | 'headers' | 'owner' | 'review'
    >;

    const senseiDiscordIds = (process.env.senseiDiscordIds || '').split(',').filter(Boolean);
    const message = gameReviewSubmittedMessage(game);

    for (const discordId of senseiDiscordIds) {
        try {
            await sendDirectMessage(discordId, message);
            console.log(
                `Successfully sent Discord message to ${discordId} for ${NotificationEventTypes.GAME_REVIEW_SUBMITTED}`,
            );
        } catch (err) {
            console.error(
                `Failed to send ${NotificationEventTypes.GAME_REVIEW_SUBMITTED} Discord DM to ${discordId}:`,
                err,
            );
        }
    }
}

/**
 * Returns the Discord message text for a game review submitted notification.
 * @param game The game that was submitted for review.
 */
function gameReviewSubmittedMessage(game: Pick<Game, 'headers' | 'review'>): string {
    const white = game.headers?.White ?? 'Unknown';
    const black = game.headers?.Black ?? 'Unknown';
    const result = game.headers?.Result ?? '*';
    const reviewType = game.review?.type ?? 'Unknown';

    return `📋 **New game submitted for review!**

**${white}** vs **${black}**
Result: ${result}
Review Type: ${reviewType}

[View review queue](${frontendHost}/games/review)`;
}
