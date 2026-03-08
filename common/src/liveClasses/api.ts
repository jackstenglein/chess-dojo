import { z } from 'zod';
import { Event } from '../database/event';
import { SubscriptionTier } from '../database/user';

/** Matches the S3 key of a live class recording. */
export const S3_LIVE_CLASS_KEY_REGEX = new RegExp(
    `^(${SubscriptionTier.GameReview}|${SubscriptionTier.Lecture})/(.*)/(.*) \\((\\d{4}-\\d{2}-\\d{2}).*\\)$`,
);

/** Verifies the type of a request to get a recording. */
export const getRecordingRequestSchema = z.object({
    /** The S3 key of the recording to get. */
    s3Key: z.string().regex(S3_LIVE_CLASS_KEY_REGEX),
});

/** A request to get a recording. */
export type GetRecordingRequest = z.infer<typeof getRecordingRequestSchema>;

/** The data for a live class. */
export interface LiveClass {
    /** The name of the class. */
    name: string;
    /** The type of the class. */
    type: SubscriptionTier.GameReview | SubscriptionTier.Lecture;
    /** The cohort range of the class. */
    cohortRange: string;
    /** The tags of the class. */
    tags: string[];
    /** The teacher of the class. */
    teacher: string;
    /** The description of the class. */
    description: string;
    /** The cover image URL of the class. */
    imageUrl: string;
    /** The recordings of the class. */
    recordings: {
        /** The date of the recording. */
        date: string;
        /** The S3 key of the recording. */
        s3Key: string;
    }[];
}

/** A cohort of users in the Game & Profile Review tier. */
export interface GameReviewCohort {
    /** The primary key of the DynamoDB table. Always GAME_REVIEW_COHORT. */
    type: 'GAME_REVIEW_COHORT';
    /** The id of the game review cohort. */
    id: string;
    /** The name of the game review cohort. */
    name: string;
    /** The discord channel ID for the cohort. */
    discordChannelId: string;
    /** The members of the cohort. */
    members: Record<string, GameReviewCohortMember>;
    /** The id of the calendar event for the peer review session. */
    peerReviewEventId: string;
    /** The peer review event. Output only, will not be saved to the database. */
    peerReviewEvent?: Event;
    /** The id of the calendar event for the sensei review session. */
    senseiReviewEventId: string;
    /** The sensei review event. Output only, will not be saved to the database. */
    senseiReviewEvent?: Event;
    /** The date the queue order of a member was last reset. */
    queueLastResetAt?: string;
}

/** Verifies the shape of a GameReviewCohortMember. */
const gameReviewCohortMemberSchema = z.object({
    /** The username of the member. */
    username: z.string(),
    /** The display name of the member. */
    displayName: z.string(),
    /** The date the member joined the queue. */
    queueDate: z.string(),
    /** Whether the user's queue position is paused. */
    paused: z.boolean().optional(),
    /** The member's dojo cohort. Output only, enriched by the backend. */
    dojoCohort: z.string().optional(),
});

/** A member of a game review cohort. */
export type GameReviewCohortMember = z.infer<typeof gameReviewCohortMemberSchema>;

/** Verifies the type of a request to get a game review cohort. */
export const getGameReviewCohortRequestSchema = z.object({
    /** The id of the cohort to get. */
    id: z.string(),
});

/** A request to get a game review cohort. */
export type GetGameReviewCohortRequest = z.infer<typeof getGameReviewCohortRequestSchema>;

/** Verifies the type of a ResetQueueDate request. */
export const resetQueueDateRequestSchema = z.object({
    /** The id of the game review cohort the user is in. */
    id: z.string(),
    /** The username of the user to reset the queue date for. */
    username: z.string(),
});

/**
 * A request to reset the game review queue date for a given user. The user's queue
 * date will be set to the current date.
 */
export type ResetQueueDateRequest = z.infer<typeof resetQueueDateRequestSchema>;

/** Verifies the type of a PauseQueueDate request. */
export const pauseQueueDateRequestSchema = z.object({
    /** The id of the game review cohort the user is in. */
    id: z.string(),
    /** The username of the user to pause/unpause the queue date for. */
    username: z.string(),
    /** Whether the user should be paused or unpaused. */
    pause: z.boolean(),
});

/**
 * A request to pause/unpause the game review queue date for a given user. If paused, the
 * user will be skipped over in the queue, but will maintain their queue date when they
 * unpause.
 */
export type PauseQueueDateRequest = z.infer<typeof pauseQueueDateRequestSchema>;

/** Verifies the type of a SetGameReviewCohorts request. */
export const setGameReviewCohortsRequestSchema = z.object({
    gameReviewCohorts: z
        .object({
            /** The id of the game review cohort. Not included for new cohorts. */
            id: z.string().optional(),
            /** The name of the game review cohort. */
            name: z.string(),
            /** The discord channel ID for the cohort. Not included for new cohorts. */
            discordChannelId: z.string().optional(),
            /** The members of the cohort. */
            members: z.record(z.string(), gameReviewCohortMemberSchema),
            /**
             * The id of the calendar event for the peer review session. Not included
             * for new cohorts or if a new peer review event is being created.
             */
            peerReviewEventId: z.string().optional(),
            /**
             * The recurrence rule for the peer review session. Required if peerReviewEventId
             * is not included.
             */
            peerReviewRrule: z.string().optional(),
            /**
             * The Google Meet URL for the peer review session. Required if peerReviewEventId
             * is not included.
             */
            peerReviewGoogleMeetUrl: z.string().optional(),
            /**
             * The id of the calendar event for the sensei review session. Not included
             * for new cohorts or if a new sensei review event is being created.
             */
            senseiReviewEventId: z.string().optional(),
            /**
             * The recurrence rule for the sensei review session. Required if senseiReviewEventId
             * is not included.
             */
            senseiReviewRrule: z.string().optional(),
            /**
             * The Google Meet URL for the sensei review session. Required if senseiReviewEventId
             * is not included.
             */
            senseiReviewGoogleMeetUrl: z.string().optional(),
        })
        .array(),
});

/** A request to set the game review cohorts. */
export type SetGameReviewCohortsRequest = z.infer<typeof setGameReviewCohortsRequestSchema>;
