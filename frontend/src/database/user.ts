import {
    dojoCohorts,
    getCohortRangeInt,
} from '@jackstenglein/chess-dojo-common/src/database/cohort';
import {
    CoachInfo,
    User as CommonUser,
    DiscordNotificationSettings,
    EmailNotificationSettings,
    GameScheduleEntry,
    getSubscriptionStatus,
    MinutesSpentKey,
    PaymentInfo,
    Rating,
    RatingHistory,
    RatingSystem,
    SiteNotificationSettings,
    SubscriptionStatus,
    TimeFormat,
    UserExamSummary,
    UserNotificationSettings,
    UserSummary,
    WeeklyPlan,
    WorkGoalHistory,
    WorkGoalSettings,
} from '@jackstenglein/chess-dojo-common/src/database/user';
import {
    getMinRatingBoundary,
    getNormalizedRating,
    getRatingBoundary,
    isCustom,
    ratingBoundaries,
} from '@jackstenglein/chess-dojo-common/src/ratings/ratings';
import { AuthTokens } from 'aws-amplify/auth';
import { ScoreboardSummary } from './scoreboard';

// TODO: migrate re-exports.
export {
    dojoCohorts,
    getMinRatingBoundary,
    getNormalizedRating,
    getRatingBoundary,
    isCustom,
    RatingSystem,
    SubscriptionStatus,
    TimeFormat,
};

export type {
    CoachInfo,
    DiscordNotificationSettings,
    EmailNotificationSettings,
    GameScheduleEntry,
    MinutesSpentKey,
    PaymentInfo,
    Rating,
    RatingHistory,
    SiteNotificationSettings,
    UserExamSummary,
    UserNotificationSettings,
    UserSummary,
    WeeklyPlan,
    WorkGoalHistory,
    WorkGoalSettings,
};

/** The user as returned by Cognito. */
export interface CognitoUser {
    /** The user's username. */
    username: string;

    /** The user's authentication tokens. */
    tokens?: AuthTokens;
}

export interface User extends CommonUser {
    cognitoUser?: CognitoUser;
}

export function formatRatingSystem(ratingSystem: RatingSystem | string): string {
    switch (ratingSystem) {
        case RatingSystem.Chesscom:
            return 'Chess.com Rapid';
        case RatingSystem.Lichess:
            return 'Lichess Classical';
        case RatingSystem.Fide:
            return 'FIDE';
        case RatingSystem.Uscf:
            return 'USCF';
        case RatingSystem.Ecf:
            return 'ECF';
        case RatingSystem.Cfc:
            return 'CFC';
        case RatingSystem.Dwz:
            return 'DWZ';
        case RatingSystem.Acf:
            return 'ACF';
        case RatingSystem.Knsb:
            return 'KNSB';
        case RatingSystem.Custom:
        case RatingSystem.Custom2:
        case RatingSystem.Custom3:
            return 'Custom';
        case RatingSystem.TimeManagement:
            return 'Time Management';
    }
    return ratingSystem;
}

export function parseUser(apiResponse: Omit<User, 'cognitoUser'>, cognitoUser?: CognitoUser): User {
    return {
        ...apiResponse,
        cognitoUser,
    };
}

export function getStartRating(user?: User | ScoreboardSummary): number {
    if (!user) {
        return 0;
    }
    return getSystemStartRating(user, user.ratingSystem);
}

export function getSystemStartRating(
    user: User | ScoreboardSummary | undefined,
    ratingSystem: RatingSystem,
): number {
    if (!user) {
        return 0;
    }
    const rating = user.ratings[ratingSystem];
    return rating?.startRating || 0;
}

export function getCurrentRating(user?: User | ScoreboardSummary): number {
    if (!user) {
        return 0;
    }
    return getSystemCurrentRating(user, user.ratingSystem);
}

export function getSystemCurrentRating(
    user: User | ScoreboardSummary | undefined,
    ratingSystem: RatingSystem,
): number {
    if (!user) {
        return 0;
    }
    const rating = user.ratings[ratingSystem];
    return rating?.currentRating || 0;
}

export function getRatingUsername(user: User | undefined, ratingSystem: RatingSystem): string {
    if (!user) {
        return '';
    }
    const rating = user.ratings[ratingSystem];
    return rating?.username || '';
}

export function hideRatingUsername(user: User | undefined, ratingSystem: RatingSystem): boolean {
    if (!user) {
        return true;
    }
    const rating = user.ratings[ratingSystem];
    return rating?.hideUsername || false;
}

export const ALL_COHORTS = 'ALL_COHORTS';

export const cohortColors: Record<string, string> = {
    '0-300': '#f8d0f5',
    '300-400': '#eb92c8',
    '400-500': '#c768bc',
    '500-600': '#f1e156',
    '600-700': '#c8c71d',
    '700-800': '#a3951b',
    '800-900': '#eea44f',
    '900-1000': '#d97333',
    '1000-1100': '#9b4007',
    '1100-1200': '#70ec50',
    '1200-1300': '#71c44e',
    '1300-1400': '#0c5c03',
    '1400-1500': '#5551ec',
    '1500-1600': '#004aad',
    '1600-1700': '#003375',
    '1700-1800': '#ae03ff',
    '1800-1900': '#ac00c8',
    '1900-2000': '#6b017d',
    '2000-2100': '#fd0304',
    '2100-2200': '#c21818',
    '2200-2300': '#951313',
    '2300-2400': '#bd4804',
    '2400+': '#9e3b00',
};

export function compareCohorts(a: string, b: string): number {
    const aInt = parseInt(a);
    const bInt = parseInt(b);
    if (aInt < bInt) {
        return -1;
    }
    return 1;
}

/**
 * Returns true if lhs > rhs
 * @param lhs The left-hand cohort to compare.
 * @param rhs The right-hand cohort to compare.
 */
export function isCohortGreater(lhs: string, rhs: string): boolean {
    return parseInt(lhs) > parseInt(rhs);
}

/**
 * Returns true if lhs < rhs
 * @param lhs The left-hand cohort to compare.
 * @param rhs The right-hand cohort to compare.
 */
export function isCohortLess(lhs: string, rhs: string): boolean {
    return parseInt(lhs) < parseInt(rhs);
}

/**
 * Returns true if the provided cohort is in the given half-open range [inclusive, exclusive).
 * @param cohort The cohort to check.
 * @param range The range to check. Does not have to be a real cohort (Ex: 1500-2000 or 2000+).
 */
export function isCohortInRange(cohort: string | undefined, range: string): boolean {
    if (!cohort) {
        return false;
    }

    const minCohort = parseInt(range);
    const maxCohort = range.split('-').length > 1 ? parseInt(range.split('-')[1]) : undefined;
    const userCohort = parseInt(cohort);

    if (!maxCohort) {
        return userCohort >= minCohort;
    }
    return userCohort >= minCohort && userCohort < maxCohort;
}

/**
 * Returns true if rating is in the provided half-open range [inclusive, exclusive).
 * @param rating The rating to check.
 * @param range The range to check. Does not have to be a real cohort (Ex: 1500-2000 or 2000+).
 */
export function isRatingInRange(rating: number, range: string): boolean {
    const [minCohort, maxCohort] = getCohortRangeInt(range);
    return rating >= minCohort && rating < maxCohort;
}

/**
 * Returns a list of cohorts within the given cohort range (inclusive).
 * @param minCohort The minimum cohort to include. If not provided, start at 0-300.
 * @param maxCohort The maximum cohort to include. If not provided, end at 2400+.
 * @returns A list of cohorts between minCohort and maxCohort.
 */
export function getCohortRange(
    minCohort: string | undefined,
    maxCohort: string | undefined,
): string[] {
    const min = Math.max(minCohort ? dojoCohorts.indexOf(minCohort) : 0, 0);
    const max = Math.min(
        maxCohort ? dojoCohorts.indexOf(maxCohort) + 1 : dojoCohorts.length,
        dojoCohorts.length,
    );
    return dojoCohorts.slice(min, max);
}

/**
 * Returns the cohort that the normalized rating fits into.
 * @param rating The normalized rating to convert to a cohort.
 * @returns The cohort or undefined if the rating is invalid.
 */
export function normalizedRatingToCohort(rating: number): string | undefined {
    if (rating < 0) {
        return undefined;
    }
    for (const cohort of dojoCohorts) {
        if (isRatingInRange(rating, cohort)) {
            return cohort;
        }
    }
    return undefined;
}

export function shouldPromptGraduation(user?: User): boolean {
    if (!user?.dojoCohort || !user.ratingSystem) {
        return false;
    }
    if (isCustom(user.ratingSystem)) {
        return false;
    }
    const cohortBoundaries = ratingBoundaries[user.dojoCohort];
    if (!cohortBoundaries) {
        return false;
    }

    const ratingBoundary = cohortBoundaries[user.ratingSystem];
    if (!ratingBoundary) {
        return false;
    }

    return getCurrentRating(user) >= ratingBoundary;
}

const ONE_MONTH = 1000 * 60 * 60 * 24 * 30;
const THREE_MONTHS = 1000 * 60 * 60 * 24 * 90;

/**
 * Returns whether the user should be prompted to demote themselves. Demotion is currently prompted when
 * they are 25 points or more below their current cohort for 90 days. If the user has already graduated
 * from their previous cohort, they will not be prompted to demote.
 * @param user The user to potentially prompt for demotion.
 * @returns True if the user should be prompted to demote.
 */
export function shouldPromptDemotion(user?: User): boolean {
    if (!user?.dojoCohort || !user.ratingSystem) {
        return false;
    }
    if (isCustom(user.ratingSystem)) {
        return false;
    }
    const cohortBefore = dojoCohorts[dojoCohorts.indexOf(user.dojoCohort) - 1];
    if (cohortBefore && user.graduationCohorts?.includes(cohortBefore)) {
        return false;
    }

    const minRating = getMinRatingBoundary(user.dojoCohort, user.ratingSystem) - 25;
    if (getCurrentRating(user) >= minRating) {
        return false;
    }

    const history = user.ratingHistories?.[user.ratingSystem];
    if (!history) {
        return false;
    }

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setTime(new Date().getTime() - THREE_MONTHS);
    const threeMonthsAgoStr = threeMonthsAgo.toISOString();

    let haveFullHistory = false;
    for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].date >= threeMonthsAgoStr && history[i].rating >= minRating) {
            return false;
        }
        if (history[i].date < threeMonthsAgoStr) {
            haveFullHistory = true;
            break;
        }
    }
    return haveFullHistory;
}

/**
 * Checks if user has hidden the cohort prompt for demotion/graduation.
 * A user hides the prompt until a date stored in the hideCohortPromptUntil field.
 * @param user The user that might have hidden the cohort prompt
 * @returns True if the user has hidden the cohort prompt
 */
export function isCohortPromptHidden(user?: User): boolean {
    if (!user) {
        return false;
    }

    const hideCohortPromptUntil =
        user?.notificationSettings?.siteNotificationSettings?.hideCohortPromptUntil;
    if (!hideCohortPromptUntil) {
        return false;
    }

    const hideUntilDate = Date.parse(hideCohortPromptUntil);
    if (!hideUntilDate) {
        return false;
    }

    const now = new Date().getTime();
    return now < hideUntilDate;
}

/**
 * Creates a partial user object where hideCohortPrompt is one month (30 days) after todays date.
 * @param user In order to update the hideCohortPromptUntil field, all the fields in the
 * UserNotificationSettings and SiteNotificationSettings needs to be provided.
 * @returns A partial User object
 */
export function getPartialUserHideCohortPrompt(user?: User): Partial<User> {
    const siteNotificationSettings = user?.notificationSettings?.siteNotificationSettings ?? {
        disableGameComment: false,
        disableGameCommentReplies: false,
        disableNewFollower: false,
        disableNewsfeedComment: false,
        disableNewsfeedReaction: false,
        disableCalendarInvite: false,
    };
    const oneMonthForward = new Date();
    oneMonthForward.setTime(new Date().getTime() + ONE_MONTH);
    return {
        notificationSettings: {
            ...user?.notificationSettings,
            siteNotificationSettings: {
                ...siteNotificationSettings,
                hideCohortPromptUntil: oneMonthForward.toISOString(),
            },
        },
    };
}

export function hasCreatedProfile(user?: User): boolean {
    if (
        !user ||
        user.dojoCohort === '' ||
        user.dojoCohort === 'NO_COHORT' ||
        user.displayName.trim() === '' ||
        (user.ratingSystem as string) === '' ||
        !user.hasCreatedProfile
    ) {
        return false;
    }
    return dojoCohorts.includes(user.dojoCohort);
}

export function isActive(user: User): boolean {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 31);

    return user.updatedAt >= monthAgo.toISOString();
}

/**
 * Returns true if the given user is on the free tier.
 * @param user The user to check
 */
export function isFree(user: User | undefined): boolean {
    return getSubscriptionStatus(user) !== SubscriptionStatus.Subscribed;
}
