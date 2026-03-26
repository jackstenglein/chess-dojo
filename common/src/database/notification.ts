import { z } from 'zod';
import { RoundRobinSchema } from '../roundRobin/api';

/** The types of events that generate notifications. */
const NotificationEventTypeSchema = z.enum([
    /** A comment is left on a game */
    'GAME_COMMENT',
    /** A sensei game review is completed */
    'GAME_REVIEW_COMPLETE',
    /** A game is submitted for sensei review */
    'GAME_REVIEW_SUBMITTED',
    /** A user gets a new follower */
    'NEW_FOLLOWER',
    /** A comment is left on a timeline entry */
    'TIMELINE_COMMENT',
    /** An emoji reaction is left on a timeline entry */
    'TIMELINE_REACTION',
    /** Someone requests to join a club */
    'NEW_CLUB_JOIN_REQUEST',
    /** A request to join a club is approved */
    'CLUB_JOIN_REQUEST_APPROVED',
    /** An event is booked */
    'EVENT_BOOKED',
    /** Users are invited to an event on the calendar */
    'CALENDAR_INVITE',
    /** A round robin tournament has started */
    'ROUND_ROBIN_START',
    /** A user has created their subscription */
    'SUBSCRIPTION_CREATED',
    /** A blog post has been published */
    'BLOG_PUBLISHED',
]);

/** The types of a notification event. */
export const NotificationEventTypes = NotificationEventTypeSchema.enum;

/** The type of a notification event when a comment is left on a game. */
const GameCommentEventSchema = z.object({
    /** The type of the event. */
    type: z.literal(NotificationEventTypes.GAME_COMMENT),
    /** The game the comment was left on. */
    game: z.object({
        /** The cohort of the game. */
        cohort: z.string(),
        /** The id of the game. */
        id: z.string(),
    }),
    /** The comment left on the game. */
    comment: z.object({
        /** The normalized FEN the comment was left on. */
        fen: z.string(),
        /** The id of the comment. */
        id: z.string(),
    }),
});

/** The type of a notification event when a comment is left on a game. */
export type GameCommentEvent = z.infer<typeof GameCommentEventSchema>;

/** The type of a notification event when a game review is completed. */
const GameReviewEventSchema = z.object({
    /** The type of the event. */
    type: z.literal(NotificationEventTypes.GAME_REVIEW_COMPLETE),
    /** The game the review was left on. */
    game: z.object({
        /** The cohort of the game. */
        cohort: z.string(),
        /** The id of the game. */
        id: z.string(),
    }),
});

/** The type of a notification event when a game review is completed. */
export type GameReviewEvent = z.infer<typeof GameReviewEventSchema>;

/** The type of a notification event when a game is submitted for sensei review. */
const GameReviewSubmittedEventSchema = z.object({
    /** The type of the event. */
    type: z.literal(NotificationEventTypes.GAME_REVIEW_SUBMITTED),
    /** The game submitted for review. */
    game: z.object({
        /** The cohort of the game. */
        cohort: z.string(),
        /** The id of the game. */
        id: z.string(),
    }),
});

/** The type of a notification event when a game is submitted for sensei review. */
export type GameReviewSubmittedEvent = z.infer<typeof GameReviewSubmittedEventSchema>;

/** The type of a notification event when a user gets a new follower. */
const NewFollowerEventSchema = z.object({
    /** The type of the event. */
    type: z.literal(NotificationEventTypes.NEW_FOLLOWER),
    /** The username of the person who was followed. */
    username: z.string(),
    /** The person who followed the given username. */
    follower: z.object({
        /** The username of the follower. */
        username: z.string(),
        /** The display name of the follower. */
        displayName: z.string(),
        /** The cohort of the follower. */
        cohort: z.string(),
    }),
});

/** The type of a notification event when a user gets a new follower. */
export type NewFollowerEvent = z.infer<typeof NewFollowerEventSchema>;

/** The type of a notification event when a comment is left on a timeline entry. */
export const TimelineCommentEventSchema = z.object({
    /** The type of the event. */
    type: z.literal(NotificationEventTypes.TIMELINE_COMMENT),
    /** The owner of the timeline entry that was commented on. */
    owner: z.string(),
    /** The id of the timeline entry that was commented on. */
    id: z.string(),
    /** The id of the comment that was created. */
    commentId: z.string(),
});

/** The type of a notification event when a comment is left on a timeline entry. */
export type TimelineCommentEvent = z.infer<typeof TimelineCommentEventSchema>;

/** The type of a notification event when a reaction is left on a timeline entry. */
export const TimelineReactionEventSchema = z.object({
    /** The type of the event. */
    type: z.literal(NotificationEventTypes.TIMELINE_REACTION),
    /** The owner of the timeline entry that was reacted on. */
    owner: z.string(),
    /** The id of the timeline entry that was reacted on. */
    id: z.string(),
});

/** The type of a notification event when a reaction is left on a timeline entry. */
export type TimelineReactionEvent = z.infer<typeof TimelineReactionEventSchema>;

/** The type of a notification event when someone requests to join a club. */
export const ClubJoinRequesetEventSchema = z.object({
    /** The type of the event. */
    type: z.literal(NotificationEventTypes.NEW_CLUB_JOIN_REQUEST),
    /** The id of the club that was requested to join. */
    id: z.string(),
    /** The name of the club that was requested to join. */
    name: z.string(),
    /** The owner of the club that was requested to join. */
    owner: z.string(),
});

/** The type of a notification event when someone requests to join a club. */
export type ClubJoinRequestEvent = z.infer<typeof ClubJoinRequesetEventSchema>;

/** The type of a notification event when a request to join a club is approved. */
export const ClubJoinRequestApprovedEventSchema = z.object({
    /** The type of the event. */
    type: z.literal(NotificationEventTypes.CLUB_JOIN_REQUEST_APPROVED),
    /** The id of the club that was joined. */
    id: z.string(),
    /** The name of the club that was joined. */
    name: z.string(),
    /** The user that was approved. */
    username: z.string(),
});

/** The type of a notification event when a request to join a club is approved. */
export type ClubJoinRequestApprovedEvent = z.infer<typeof ClubJoinRequestApprovedEventSchema>;

/** The type of a notification event when an event is booked. */
const EventBookedEventSchema = z.object({
    /** The type of the event. */
    type: z.literal(NotificationEventTypes.EVENT_BOOKED),
    /** The id of the event that was booked. */
    id: z.string(),
    /** The username of the owner of the event. */
    owner: z.string(),
    /** Whether the meeting is a group meeting or not. */
    isGroup: z.boolean(),
});

/** The type of a notification event when an event is booked. */
export type EventBookedEvent = z.infer<typeof EventBookedEventSchema>;

/** The type of a notification event when users are invited to a calendar event. */
const CalendarInviteEventSchema = z.object({
    /** The type of the event. */
    type: z.literal(NotificationEventTypes.CALENDAR_INVITE),
    /** The id of the event. */
    id: z.string(),
});

/** The type of a notification event when users are invited to a calendar event. */
export type CalendarInviteEvent = z.infer<typeof CalendarInviteEventSchema>;

/** The type of a notification event when a round robin tournament starts. */
const RoundRobinStartEventSchema = z.object({
    /** The type of the event. */
    type: z.literal(NotificationEventTypes.ROUND_ROBIN_START),
    /** The tournament that started */
    tournament: RoundRobinSchema,
});

/** The type of a notification event when a round robin tournament starts. */
export type RoundRobinStartEvent = z.infer<typeof RoundRobinStartEventSchema>;

/** The type of a notification event when a user has created their subscription. */
const SubscriptionCreatedEventSchema = z.object({
    /** The type of the event. */
    type: z.literal(NotificationEventTypes.SUBSCRIPTION_CREATED),
    /** The username of the user that created the subscription. */
    username: z.string(),
});

/** The type of a notification event when a user has created their subscription. */
export type SubscriptionCreatedEvent = z.infer<typeof SubscriptionCreatedEventSchema>;

/** The type of a notification event when a blog post is published. */
const BlogPublishedEventSchema = z.object({
    /** The type of the event. */
    type: z.literal(NotificationEventTypes.BLOG_PUBLISHED),
    /** The id of the blog post that was published. */
    blogId: z.string(),
    /** The title of the blog post. */
    title: z.string(),
    /** The subtitle of the blog post. */
    subtitle: z.string(),
    /** The description of the blog post. */
    description: z.string(),
    /** The cover image of the blog post. */
    coverImage: z.string().optional(),
});

/** The type of a notification event when a blog post is published. */
export type BlogPublishedEvent = z.infer<typeof BlogPublishedEventSchema>;

/** The schema of an event that generates notifications. */
export const NotificationEventSchema = z.discriminatedUnion('type', [
    NewFollowerEventSchema,
    GameCommentEventSchema,
    GameReviewEventSchema,
    GameReviewSubmittedEventSchema,
    TimelineCommentEventSchema,
    TimelineReactionEventSchema,
    ClubJoinRequesetEventSchema,
    ClubJoinRequestApprovedEventSchema,
    EventBookedEventSchema,
    CalendarInviteEventSchema,
    RoundRobinStartEventSchema,
    SubscriptionCreatedEventSchema,
    BlogPublishedEventSchema,
]);

/** An event that generates notifications. */
export type NotificationEvent = z.infer<typeof NotificationEventSchema>;

/** The types of notifications. */
const NotificationTypeSchema = z.enum([
    /** A comment is left on a game */
    'GAME_COMMENT',

    /** A reply is left on a game comment */
    'GAME_COMMENT_REPLY',

    /** A game was added with a position the user follows */
    'EXPLORER_GAME',

    /** A user gets a new follower */
    'NEW_FOLLOWER',

    /** A comment is left on a timeline entry */
    'TIMELINE_COMMENT',

    /** An emoji reaction is left on a timeline entry */
    'TIMELINE_REACTION',

    /** Someone requests to join a club */
    'NEW_CLUB_JOIN_REQUEST',

    /** A request to join a club is approved */
    'CLUB_JOIN_REQUEST_APPROVED',

    /** A sensei game review is completed */
    'GAME_REVIEW_COMPLETE',

    /** Invited to an event on the calendar */
    'CALENDAR_INVITE',

    /** A round robin tournament has started */
    'ROUND_ROBIN_START',
]);

/** The types of notifications. */
export const NotificationTypes = NotificationTypeSchema.enum;

/** The type of a notification. */
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

/**
 *  Data for a notification.
 */
export interface Notification {
    /** The id of the Notification. */
    id: string;

    /** The type of the Notification. */
    type: NotificationType;

    /** The time the Notification was last updated. */
    updatedAt: string;

    /** The number of unread instances of this notification. */
    count: number;

    /** Metadata for a game comment Notification. */
    gameCommentMetadata?: {
        /** The cohort of the Game. */
        cohort: string;

        /** The id of the Game. */
        id: string;

        /** The headers of the Game. */
        headers: Record<string, string>;
    };

    /** Metadata for a game review Notification. */
    gameReviewMetadata?: {
        /** The cohort of the Game. */
        cohort: string;

        /** The id of the Game. */
        id: string;

        /** The headers of the Game. */
        headers: Record<string, string>;

        /** The reviewer of the Game. */
        reviewer: {
            /** The username of the reviewer. */
            username: string;

            /** The display name of the reviewer. */
            displayName: string;

            /** The cohort of the reviewer. */
            cohort: string;
        };
    };

    /** Metadata for a new follower notification. */
    newFollowerMetadata?: {
        /** The username of the new follower. */
        username: string;

        /** The display name of the new follower. */
        displayName: string;

        /** The cohort of the new follower. */
        cohort: string;
    };

    /** Metadata for a timeline comment notification */
    timelineCommentMetadata?: {
        /** The owner of the associated timeline entry */
        owner: string;

        /** The id of the associated timeline entry */
        id: string;

        /** The requirement name of the associated timeline entry */
        name: string;
    };

    /** Metadata about the ExplorerGame. */
    explorerGameMetadata?: {
        /** The normalized FEN of the position. */
        normalizedFen: string;

        /** The cohort the game was in. */
        cohort: string;

        /** The id of the game. */
        id: string;

        /** The result of the ExplorerGame, as related to the position. */
        result: string;

        /** The headers of the game. */
        headers: Record<string, string>;
    }[];

    /** Metadata for a club join request notification. */
    clubMetadata?: {
        /** The id of the club. */
        id: string;

        /** The name of the club. */
        name: string;
    };

    /** Metadata for an invite to a calendar event. */
    calendarInviteMetadata?: {
        /** The id of the event. */
        id: string;
        /** The display name of the owner of the event. */
        ownerDisplayName: string;
        /** The start time of the event. */
        startTime: string;
    };

    /** Metadata for a round robin starting. */
    roundRobinStartMetadata?: {
        /** The cohort of the tournament. */
        cohort: string;
        /** The startsAt of the tournament. */
        startsAt: string;
        /** The name of the tournament. */
        name: string;
    };
}
