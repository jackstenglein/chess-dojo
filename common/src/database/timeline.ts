import { ScoreboardDisplay } from './requirement';

/** The categories of a requirement. */
export enum RequirementCategory {
    Welcome = 'Welcome to the Dojo',
    Games = 'Games + Analysis',
    Tactics = 'Tactics',
    Middlegames = 'Middlegames + Strategy',
    Endgame = 'Endgame',
    Opening = 'Opening',
    Graduation = 'Graduation',
    NonDojo = 'Non-Dojo',
    SuggestedTasks = 'Suggested Tasks',
    Pinned = 'Pinned Tasks',
}

/** A single entry in a user's timeline. */
export interface TimelineEntry {
    /** The user that created the timeline entry and the partition key of the table. */
    owner: string;
    /** The unique id of the timeline entry and the sort key of the table. */
    id: string;
    /** The display name of the owner. */
    ownerDisplayName: string;
    /** The cohort that was updated. */
    cohort: string;
    /** The id of the requirement updated in this entry. */
    requirementId: string;
    /** The name of the requirement updated in this entry. */
    requirementName: string;
    /** The category of the requirement updated in this entry. */
    requirementCategory: RequirementCategory;
    /** The scoreboard display of the requirement. */
    scoreboardDisplay: ScoreboardDisplay;
    /** The progress bar suffix of the requirement. */
    progressBarSuffix: string;
    /** Whether the requirement updated was a custom task. */
    isCustomRequirement?: boolean;
    /** The total count the user must meet to complete the task. */
    totalCount: number;
    /** The user's count prior to this update. */
    previousCount: number;
    /** The user's new count after this update. */
    newCount: number;
    /** The dojo points earned in this update. */
    dojoPoints: number;
    /** The total dojo points earned after this update. */
    totalDojoPoints: number;
    /** The minutes spent in this update. */
    minutesSpent: number;
    /** The total minutes spent after this update. */
    totalMinutesSpent: number;
    /** The date the user set when updating the task, in ISO 8601. */
    date?: string;
    /** The time in ISO 8601 that this timeline entry was created. */
    createdAt: string;
    /** Information on graduation, if this timeline entry is for a graduation. */
    graduationInfo?: TimelineGraduationInfo;
    /** Information on a published game, if this timeline entry is for a published game. */
    gameInfo?: TimelineGameInfo;
    /** The notes the user left on the activity. */
    notes: string;
    /** Comments left by users on the timeline entry. */
    comments: Comment[] | null;
    /** Reactions left by users on the timeline entry, mapped by their usernames. */
    reactions: Record<string, Reaction> | null;
}

export interface Comment {
    /** The username of the person that posted the comment. */
    owner: string;
    /** The display name of the person that posted the comment. */
    ownerDisplayName: string;
    /** The cohort of the person that posted the comment. */
    ownerCohort: string;
    /** The previous cohort of the person that posted the comment. */
    ownerPreviousCohort: string;
    /** The id of the comment. */
    id: string;
    /** The time the comment was created, in ISO 8601. */
    createdAt: string;
    /** The time the comment was updated, in ISO 8601. */
    updatedAt: string;
    /** The text content of the comment. */
    content: string;
    /** The id of the root top-level comment this is a reply to. Absent for top-level comments. */
    parentId?: string;
}

/** Metadata for a graduation timeline entry. */
export interface TimelineGraduationInfo {
    /** The comments left by the user when graduating. */
    comments: string;
    /** The user's total dojo points when graduating. */
    dojoScore: number;
    /** The user's new cohort after graduating. */
    newCohort: string;
    /** The user's time spent when graduating. */
    dojoMinutes: number;
    /** The user's non dojo time spent when graduating. */
    nonDojoMinutes: number;
    /** The number of games annotated when graduating. */
    gamesAnnotated?: number;
}

/** Metadata for a published game timeline entry. */
export interface TimelineGameInfo {
    /** The id of the game. */
    id: string;
    /** The headers of the game. */
    headers: Record<string, string>;
}

/** A reaction on a timeline entry. */
export interface Reaction {
    /** The username of the person that reacted. */
    username: string;
    /** The display name of the person that reacted. */
    displayName: string;
    /** The cohort of the person that reacted. */
    cohort: string;
    /** The time the reaction was last changed, in ISO 8601. */
    updatedAt: string;
    /** The reaction types set by the user. */
    types?: string[];
}

/**
 * Special requirement ids in the timeline which do not have a
 * real requirement associated with them.
 */
export enum TimelineSpecialRequirementId {
    GameSubmission = 'GameSubmission',
    Graduation = 'Graduation',
}
