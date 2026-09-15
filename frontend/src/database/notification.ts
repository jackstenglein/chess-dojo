import { toDojoDateString, toDojoTimeString } from '@/components/calendar/displayDate';
import {
    Notification,
    NotificationTypes,
} from '@jackstenglein/chess-dojo-common/src/database/notification';

export type { Notification };

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

/**
 * Returns the title for the given notification.
 * @param notification The notification to get the title for.
 * @param t The translation function.
 * @returns The title for the given notification.
 */
export function getTitle(notification: Notification, t: TranslateFn): string {
    switch (notification.type) {
        case NotificationTypes.GAME_COMMENT:
        case NotificationTypes.GAME_COMMENT_REPLY:
            return `${notification.gameCommentMetadata?.headers.White} - ${notification.gameCommentMetadata?.headers.Black}`;
        case NotificationTypes.GAME_REVIEW_COMPLETE:
            return `${notification.gameReviewMetadata?.headers.White} - ${notification.gameReviewMetadata?.headers.Black}`;
        case NotificationTypes.NEW_FOLLOWER:
            return t('newFollowerTitle');
        case NotificationTypes.TIMELINE_COMMENT:
        case NotificationTypes.TIMELINE_REACTION:
            return `${notification.timelineCommentMetadata?.name}`;
        case NotificationTypes.EXPLORER_GAME:
            if (notification.count === 1) {
                return `${notification.explorerGameMetadata?.[0].headers.White} - ${notification.explorerGameMetadata?.[0].headers.Black}`;
            }
            return t('explorerGameTitle', { count: notification.count ?? 0 });
        case NotificationTypes.NEW_CLUB_JOIN_REQUEST:
            return `${notification.clubMetadata?.name}`;
        case NotificationTypes.CLUB_JOIN_REQUEST_APPROVED:
            return `${notification.clubMetadata?.name}`;
        case NotificationTypes.CALENDAR_INVITE:
            return t('calendarInviteTitle');
        case NotificationTypes.ROUND_ROBIN_START:
            return t('roundRobinStartTitle', {
                cohort: notification.roundRobinStartMetadata?.cohort ?? '',
                name: notification.roundRobinStartMetadata?.name ?? '',
            });
    }
}

export function getDescription(notification: Notification, t: TranslateFn): string {
    const count = notification.count || 1;

    switch (notification.type) {
        case NotificationTypes.GAME_COMMENT:
            return t('gameCommentDescription');
        case NotificationTypes.GAME_COMMENT_REPLY:
            return t('gameCommentReplyDescription', { count });
        case NotificationTypes.GAME_REVIEW_COMPLETE:
            return t('gameReviewCompleteDescription', {
                reviewer: notification.gameReviewMetadata?.reviewer.displayName ?? '',
            });
        case NotificationTypes.NEW_FOLLOWER:
            return `${notification.newFollowerMetadata?.displayName}`;
        case NotificationTypes.TIMELINE_COMMENT:
            return t('timelineCommentDescription', { count });
        case NotificationTypes.TIMELINE_REACTION:
            return t('timelineReactionDescription', { count });
        case NotificationTypes.EXPLORER_GAME:
            if (notification.count === 1) {
                return t('explorerGameDescription');
            }
            return '';
        case NotificationTypes.NEW_CLUB_JOIN_REQUEST:
            return t('clubJoinRequestDescription', { count });
        case NotificationTypes.CLUB_JOIN_REQUEST_APPROVED:
            return t('clubJoinApprovedDescription');
        case NotificationTypes.CALENDAR_INVITE: {
            const start = new Date(notification.calendarInviteMetadata?.startTime || '');
            return t('calendarInviteDescription', {
                owner: notification.calendarInviteMetadata?.ownerDisplayName ?? '',
                date: toDojoDateString(start, undefined, undefined),
                time: toDojoTimeString(start, undefined, undefined),
            });
        }
        case NotificationTypes.ROUND_ROBIN_START:
            return ``;
    }
}
