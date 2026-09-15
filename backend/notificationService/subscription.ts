import {
    GameReviewSignupEvent,
    NotificationEventTypes,
    SubscriptionCreatedEvent,
} from '@jackstenglein/chess-dojo-common/src/database/notification';
import {
    SubscriptionStatus,
    SubscriptionTier,
} from '@jackstenglein/chess-dojo-common/src/database/user';
import { sendEmailTemplate } from './email';
import { sendSenseiDirectMessages } from './sensei';
import { PartialUser, getNotificationSettings } from './user';

/**
 * Sends an email notification for a user starting a subscription.
 * @param event The event to send the email for.
 */
export async function handleSubscriptionCreated(event: SubscriptionCreatedEvent) {
    const user = await getNotificationSettings(event.username);
    if (!user || user.notificationSettings?.emailNotificationSettings?.disableSubscriptionCreated) {
        return;
    }

    await sendEmailTemplate(
        'subscription/subscriptionCreated',
        { name: user.displayName },
        [user.email],
        'ChessDojo <welcome@mail.chessdojo.club>',
    );
    console.log(
        `Successfully sent email to ${user.username} for ${NotificationEventTypes.SUBSCRIPTION_CREATED}`,
    );
}

/**
 * Sends Discord DM notifications to senseis when a user signs up for Game & Profile Review.
 * @param event The event to send the notification for.
 */
export async function handleGameReviewSignup(event: GameReviewSignupEvent) {
    const user = await getNotificationSettings(event.username);
    if (!user) {
        console.error(
            `Unable to send Game Review signup notification: ${event.username} not found`,
        );
        return;
    }

    if (
        user.subscriptionStatus !== SubscriptionStatus.Subscribed ||
        user.subscriptionTier !== SubscriptionTier.GameReview
    ) {
        console.log(
            `Skipping Game Review signup notification for ${user.username}: user is ${user.subscriptionStatus}/${user.subscriptionTier}`,
        );
        return;
    }

    await sendSenseiDirectMessages(
        NotificationEventTypes.GAME_REVIEW_SIGNUP,
        gameReviewSignupMessage(user),
    );
}

/** Returns the Discord message text for a Game & Profile Review signup notification. */
export function gameReviewSignupMessage(
    user: Pick<
        PartialUser,
        'username' | 'displayName' | 'dojoCohort' | 'discordId' | 'discordUsername'
    >,
): string {
    const displayName = user.displayName || user.username;
    const dojoCohort = user.dojoCohort || 'Unknown';
    const discord = user.discordId ? `<@${user.discordId}>` : user.discordUsername || 'Not linked';
    const frontendHost = process.env.frontendHost || '';

    return `**New Game & Profile Review signup**

${displayName} (${user.username}) needs to be assigned to a Game & Profile Review group.
Dojo cohort: ${dojoCohort}
Discord: ${discord}

[Open profile](<${frontendHost}/profile/${user.username}>)
[Open Game Review admin](<${frontendHost}/admin/game-review>)`;
}
