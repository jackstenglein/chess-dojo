import { User } from './user';

/**
 * Represents a single row of data in the summary scoreboards
 * (IE: full dojo and follower scoreboards).
 */
export type ScoreboardSummary = Pick<
    User,
    | 'canViewTraining'
    | 'username'
    | 'displayName'
    | 'graduationCohorts'
    | 'previousCohort'
    | 'ratingSystem'
    | 'ratings'
    | 'dojoCohort'
    | 'totalDojoScore'
    | 'minutesSpent'
>;

export function isObject(obj: unknown): obj is Record<string, unknown> {
    return typeof obj === 'object' && obj !== null;
}

/**
 * Returns true if the provided object is a ScoreboardSummary.
 * @param obj The object to check.
 * @returns True if the object is a ScoreboardSummary.
 */
export function isScoreboardSummary(obj: unknown): obj is ScoreboardSummary {
    return isObject(obj) && obj.progress === undefined;
}
