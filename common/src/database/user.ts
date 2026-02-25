import { getNormalizedRating, isCustom } from '../ratings/ratings';
import { TimeManagementAggregate } from '../ratings/timeManagement';
import { ExamType } from './exam';
import { RatingSystem } from './ratingSystem';
import { CustomTask, RequirementProgress } from './requirement';

export { RatingSystem };

/** A summary of a user's performance on a single exam. */
export interface UserExamSummary {
    /** The type of the exam this summary refers to. */
    examType: ExamType;

    /** The cohort range of the exam this summary refers to. */
    cohortRange: string;

    /** The date the user took the exam, in ISO format. */
    createdAt: string;

    /** The rating the user got on the exam, as determined by the exam's linear regression. */
    rating: number;
}

export interface User {
    username: string;
    displayName: string;
    discordUsername: string;
    discordId?: string;
    dojoCohort: string;
    bio: string;
    coachBio?: string;

    ratingSystem: RatingSystem;
    ratings: Partial<Record<RatingSystem, Rating>>;
    ratingHistories?: Record<RatingSystem, RatingHistory[]>;

    /** The user's time management rating aggregate. */
    timeManagementRating?: TimeManagementAggregate;

    progress: Record<string, RequirementProgress>;
    disableBookingNotifications: boolean;
    disableCancellationNotifications: boolean;
    isAdmin: boolean;
    isCalendarAdmin: boolean;
    isTournamentAdmin: boolean;
    isBetaTester: boolean;
    isCoach: boolean;
    createdAt: string;
    updatedAt: string;
    numberOfGraduations: number;
    previousCohort: string;
    graduationCohorts?: string[];
    lastGraduatedAt: string;

    enableLightMode: boolean;
    /** Whether to enable zen mode. */
    enableZenMode: boolean;
    timezoneOverride: string;
    timeFormat: TimeFormat;

    hasCreatedProfile: boolean;

    customTasks?: CustomTask[];

    openingProgress?: Record<
        string,
        {
            exercises?: boolean[];
        }
    >;

    tutorials?: Record<string, boolean>;
    minutesSpent?: Record<MinutesSpentKey, number>;

    followerCount: number;
    followingCount: number;

    referralSource: string;

    notificationSettings?: UserNotificationSettings;

    totalDojoScore: number;

    purchasedCourses?: Record<string, boolean>;

    /** The user's subscription status. This must be a top-level attribute because it is a Dynamo GSI key. */
    subscriptionStatus: SubscriptionStatus;
    /** The user's subscription tier. This must be a top-level attribute because it is a Dynamo GSI key. */
    subscriptionTier?: SubscriptionTier;
    /** The user's stripe payment info. */
    paymentInfo?: PaymentInfo;

    coachInfo?: CoachInfo;

    /** The set of club ids the user is a member of. */
    clubs?: string[];

    /** A map from exam id to the user's summary for that exam. */
    exams: Record<string, UserExamSummary>;

    /** The IDs of the user's pinned tasks. */
    pinnedTasks?: string[];

    /** The day the user's week starts on. Sunday is 0; Saturday is 6. */
    weekStart: 0 | 1 | 2 | 3 | 4 | 5 | 6;

    /** The user's work goal settings. */
    workGoal?: WorkGoalSettings;

    /** The user's history of the work goal. New entries are added only when the work goal is changed. */
    workGoalHistory?: WorkGoalHistory[];

    /** The user's weekly training plan. */
    weeklyPlan?: WeeklyPlan;

    /** The user's schedule of upcoming classical games. */
    gameSchedule?: GameScheduleEntry[];

    /**
     * A map from puzzle theme to the user's overview stats for that theme.
     * The user's overall stats will be under the theme OVERALL.
     */
    puzzles?: Record<string, PuzzleThemeOverview>;

    /** The user's firebase cloud messaging tokens. */
    firebaseTokens?: string[];

    /** The id of the user's game review cohort, if they are a member of the Game & Profile review tier. */
    gameReviewCohortId?: string;

    /** The time already on the user's timer, if it is paused. */
    timerSeconds?: number;

    /** The date the timer was last started or unpaused. If the timer is not running or paused, it will be empty. */
    timerStartedAt?: string;
}

/**
 * Returns the subscription status for the given user.
 * @param user The user to get the subscription status for.
 */
export function getSubscriptionStatus(user?: User): SubscriptionStatus {
    return user?.subscriptionStatus ?? SubscriptionStatus.NotSubscribed;
}

/**
 * Returns the subscription tier for the given user.
 * @param user The user to get the subscription tier for.
 */
export function getSubscriptionTier(user?: User): SubscriptionTier {
    if (getSubscriptionStatus(user) !== SubscriptionStatus.Subscribed) {
        return SubscriptionTier.Free;
    }
    return user?.subscriptionTier || SubscriptionTier.Basic;
}

export interface WorkGoalSettings {
    /**
     * A list of the minutes the user wants to work per day of the week.
     * In conjunction with minutesPerTask, this affects how many tasks the
     * user is suggested. Sunday is index 0; Saturday is index 6.
     */
    minutesPerDay: number[];
}

export interface WorkGoalHistory {
    /** The date the user set the work goal, in ISO 8601. */
    date: string;
    /** The user's work goal on the given date. */
    workGoal: WorkGoalSettings;
}

export interface WeeklyPlan {
    /** The exclusive date the weekly plan ends, in ISO 8601. */
    endDate: string;
    /**
     * The tasks in the plan, in a list ordered by the index of the day of the week.
     * Sunday is index 0; Saturday is index 6.
     */
    tasks: {
        /** The id of the task. */
        id: string;
        /** The work goal of the task in minutes. */
        minutes: number;
    }[][];
    /**
     * The date (in ISO 8601) the user's progress was most recently updated when the weekly plan
     * was last generated.
     */
    progressUpdatedAt: string;
    /** The ids of the user's pinned tasks (in order) when the weekly plan was last generated. */
    pinnedTasks?: string[];
    /** The date (in ISO 8601) of the user's next scheduled game when the weekly plan was last generated. */
    nextGame: string;
    /** The ids of the user's skipped tasks (in order) when the weekly plan was last generated. */
    skippedTasks?: string[];
}

export interface GameScheduleEntry {
    /** The date the game(s) will be played, in ISO 8601 format. */
    date: string;
    /** The number of games that will be played. */
    count: number;
}

export type UserSummary = Pick<User, 'username' | 'displayName' | 'dojoCohort'>;

/** A summary of a user's performance on a single exam. */
export interface UserExamSummary {
    /** The type of the exam this summary refers to. */
    examType: ExamType;

    /** The cohort range of the exam this summary refers to. */
    cohortRange: string;

    /** The date the user took the exam, in ISO format. */
    createdAt: string;

    /** The rating the user got on the exam, as determined by the exam's linear regression. */
    rating: number;
}

export interface PuzzleThemeOverview {
    /** The user's rating for the theme. */
    rating: number;
    /** The user's rating deviation for the theme. */
    ratingDeviation: number;
    /** The user's rating volatility for the theme. */
    volatility: number;
    /** The number of times a user has played a puzzle with the theme. */
    plays: number;
    /** The time the theme was last played, in ISO 8601. */
    lastPlayed: string;
}

export interface PaymentInfo {
    /** The stripe customer id or a special value for non-stripe subscriptions. */
    customerId: string;
    /** The stripe subscription id or a special value for non-stripe subscriptions. */
    subscriptionId: string;
}

export interface CoachInfo {
    stripeId: string;
    onboardingComplete: boolean;
}

export interface UserNotificationSettings {
    discordNotificationSettings?: DiscordNotificationSettings;
    emailNotificationSettings?: EmailNotificationSettings;
    siteNotificationSettings?: SiteNotificationSettings;
}

export interface DiscordNotificationSettings {
    disableMeetingBooking: boolean;
    disableMeetingCancellation: boolean;
    disableCalendarInvite: boolean;
    disableRoundRobinStart: boolean;
}

export interface EmailNotificationSettings {
    disableNewsletter: boolean;
    disableInactiveWarning: boolean;
    disableRoundRobinStart: boolean;
    disableSubscriptionCreated: boolean;
}

export interface SiteNotificationSettings {
    disableGameComment: boolean;
    disableGameCommentReplies: boolean;
    disableNewFollower: boolean;
    disableNewsfeedComment: boolean;
    disableNewsfeedReaction: boolean;
    disableCalendarInvite: boolean;
    hideCohortPromptUntil?: string;
}

export type MinutesSpentKey =
    | 'ALL_TIME'
    | 'LAST_7_DAYS'
    | 'LAST_30_DAYS'
    | 'LAST_90_DAYS'
    | 'LAST_365_DAYS'
    | 'NON_DOJO'
    | 'ALL_COHORTS_ALL_TIME'
    | 'ALL_COHORTS_LAST_7_DAYS'
    | 'ALL_COHORTS_LAST_30_DAYS'
    | 'ALL_COHORTS_LAST_90_DAYS'
    | 'ALL_COHORTS_LAST_365_DAYS'
    | 'ALL_COHORTS_NON_DOJO';

export interface Rating {
    username?: string;
    hideUsername: boolean;
    startRating: number;
    currentRating: number;
    name?: string;
    isProvisional?: boolean;
}

export interface RatingHistory {
    date: string;
    rating: number;
}

export enum SubscriptionStatus {
    Subscribed = 'SUBSCRIBED',
    Canceled = 'CANCELED',
    NotSubscribed = 'NOT_SUBSCRIBED',
}

export enum SubscriptionTier {
    Free = 'FREE',
    Basic = 'BASIC',
    Lecture = 'LECTURE',
    GameReview = 'GAME_REVIEW',
}

export enum TimeFormat {
    Default = '',
    TwelveHour = '12',
    TwentyFourHour = '24',
}

/**
 * Gets the search key for the given user. The search key has its own
 * index in the Dynamo table and allows for quickly finding users based on a
 * given field.
 * @param user The user to get the search key for.
 */
export function getSearchKey(user: User): string {
    let searchKey = `display:${user.displayName}`;
    if (user.discordUsername) {
        searchKey += `_discord:${user.discordUsername}`;
    }
    for (const [system, rating] of Object.entries(user.ratings)) {
        if (rating.username && !rating.hideUsername) {
            searchKey += `_${system}:${rating.username}`;
        }
    }
    return searchKey.toLowerCase();
}

/** If the user's rating deviation is >= this value, they are considered provisional. */
export const PROVISIONAL_PUZZLE_RATING_DEVIATION = 110;

/**
 * Returns the puzzle overview for the given user/theme.
 * @param user The user to get the overview for.
 * @param theme The theme to get the overview for.
 * @returns The puzzle overview for the given user/theme.
 */
export function getPuzzleOverview(
    user: Pick<User, 'puzzles' | 'ratingSystem' | 'ratings'>,
    theme: string,
): PuzzleThemeOverview {
    if (user.puzzles?.[theme]) {
        return adjustRatingDeviation(user.puzzles[theme]);
    }

    const rating = user.ratings[user.ratingSystem]?.currentRating;
    if (!rating || rating <= 0) {
        return {
            rating: 1000,
            ratingDeviation: 350,
            volatility: 0.06,
            plays: 0,
            lastPlayed: new Date().toISOString(),
        };
    }

    if (isCustom(user.ratingSystem)) {
        return {
            rating,
            ratingDeviation: 350,
            volatility: 0.06,
            plays: 0,
            lastPlayed: new Date().toISOString(),
        };
    }

    return {
        rating: getNormalizedRating(rating, user.ratingSystem),
        ratingDeviation: 200,
        volatility: 0.06,
        plays: 0,
        lastPlayed: new Date().toISOString(),
    };
}

const millisecondsPerWeek = 1000 * 60 * 60 * 24 * 7;

/**
 * Adjusts the rating deviation for the given overview to account for periods of
 * inactivity. For each week since the theme was last played, the rating deviation
 * is updated.
 * @param overview The overview to update.
 * @returns The overview with the rating deviation adjusted for inactivity.
 */
function adjustRatingDeviation(overview: PuzzleThemeOverview): PuzzleThemeOverview {
    if (!overview.lastPlayed) {
        return overview;
    }

    const lastPlayed = new Date(overview.lastPlayed);
    const now = new Date();
    const timeDifference = Math.abs(now.getTime() - lastPlayed.getTime());
    const weeksSinceLastPlayed = Math.round(timeDifference / millisecondsPerWeek);
    for (let i = 0; i < weeksSinceLastPlayed; i++) {
        overview.ratingDeviation = Math.sqrt(
            overview.ratingDeviation ** 2 + overview.volatility ** 2,
        );
    }
    return overview;
}
