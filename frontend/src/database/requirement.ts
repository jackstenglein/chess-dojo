import {
    CustomTask,
    CustomTaskCategory,
    RequirementCategory,
    RequirementProgress,
    ScoreboardDisplay,
} from '@jackstenglein/chess-dojo-common/src/database/requirement';
import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { isObject } from './scoreboard';
import { TimelineEntry } from './timeline';
import { isFree, User } from './user';

export { RequirementCategory, ScoreboardDisplay };

export type { CustomTask, CustomTaskCategory, RequirementProgress };

/** The status of a requirement. */
export enum RequirementStatus {
    /** The requirement is actively in use. */
    Active = 'ACTIVE',

    /**
     * The requirement is no longer in use. Currently this status is not actually used.
     * We instead have just deleted old requirements.
     */
    Archived = 'ARCHIVED',
}

/** A position in a requirement. */
export interface Position {
    /** The title of the position. */
    title: string;

    /** The FEN of the position. */
    fen: string;

    /** The time limit in seconds that the position should be played at. */
    limitSeconds: number;

    /** The increment in seconds that the position should be played at. */
    incrementSeconds: number;

    /** The expected result of the position. */
    result: string;
}

/**
 * Returns true if obj is of type CustomTaskCategory.
 */
export function isCustomTaskCategory(obj: unknown): obj is CustomTaskCategory {
    return (
        typeof obj === 'string' &&
        (obj === RequirementCategory.Games ||
            obj === RequirementCategory.Tactics ||
            obj === RequirementCategory.Middlegames ||
            obj === RequirementCategory.Endgame ||
            obj === RequirementCategory.Opening)
    );
}

/** A requirement in the training plan. */
export interface Requirement {
    /** The id of the requirement. */
    id: string;

    /** The status of the requirement. */
    status: RequirementStatus;

    /** The category of the requirement. */
    category: RequirementCategory;

    /** The name of the requirement. */
    name: string;

    /**
     * An optional short name for the requirement, which is displayed in certain contexts
     * like the pie charts.
     */
    shortName?: string;

    /**
     * The optional daily name for the requirement, which is displayed in contexts
     * like the training plan daily tab.
     */
    dailyName?: string;

    /** The description of the requirement. */
    description: string;

    /** The description of the requirement for free-tier users. */
    freeDescription: string;

    /**
     * A map from the cohort to the target count necessary to complete the
     * requirement. For requirements that carry progress over across cohorts,
     * the special value ALL_COHORTS is used as a key.
     */
    counts: Record<string, number>;

    /**
     * The starting count of the requirement, if it doesn't start at 0. For
     * example, the Polgar M2s start at 306.
     */
    startCount: number;

    /**
     * The number of cohorts the requirement needs to be completed in before it
     * stops being suggested. For requirements that restart their progress in every
     * cohort, this is the special value -1.
     */
    numberOfCohorts: number;

    /** The amount of dojo points awarded for each unit of the requirement completed. */
    unitScore: number;

    /** An optional map from the cohort to an override of the unitScore value. */
    unitScoreOverride?: Record<string, number>;

    /**
     * An optional amount of dojo points that is applied only when the requirement is
     * fully complete. If present, this overrides the unit score and no dojo
     * points are awarded until this value is applied.
     */
    totalScore: number;

    /** A list of video embed URLs associated with the requirement. */
    videoUrls?: string[];

    /** A list of positions associated with the requirement. */
    positions?: Position[];

    /** The scoreboard display of the requirement. */
    scoreboardDisplay: ScoreboardDisplay;

    /** An optional string that is used to label the count of the progress bar. */
    progressBarSuffix: string;

    /** The last time the requirement was updated. */
    updatedAt: string;

    /** A string which is used to sort the requirement relative to other requirements. */
    sortPriority: string;

    /** The number of days before progress on the requirement expires. */
    expirationDays: number;

    /** Whether the requirement is visible to free-tier users. */
    isFree: boolean;

    /**
     * A list of requirement IDs which must be completed before this requirement
     * can be updated.
     */
    blockers?: string[];

    /**
     * Indicates whether the task must be fully complete before the suggested
     * task algorithm skips over it.
     */
    atomic: boolean;

    /** The expected amount of time it takes to complete a task. */
    expectedMinutes: number;

    /** The subscription tiers that can view this requirement. */
    subscriptionTiers?: SubscriptionTier[];
}

/**
 * Returns whether obj is a Requirement.
 * @param obj The object to check
 * @returns Whether obj is a Requirement.
 */
export function isRequirement(obj: unknown): obj is Requirement {
    return isObject(obj) && obj.sortPriority !== undefined;
}

/**
 * A function which can be used to sort Requirements.
 * @param a The first Requirement to compare.
 * @param b The second Requirement to compare.
 * @returns A number which indicates whether a comes before, after or is equal to b.
 */
export function compareRequirements(a: Requirement, b: Requirement) {
    if (a.sortPriority === undefined || b.sortPriority === undefined) {
        return 0;
    }
    return a.sortPriority.localeCompare(b.sortPriority);
}

/**
 * Optionally clamps the provided count to the range prescribed by the requirement.
 * @param cohort The cohort to use when getting the count.
 * @param requirement The requirement to get the count for.
 * @param count The count to clamp.
 * @param clamp Whether to clamp. If false, count is returned unchanged.
 * @returns The clamped count.
 */
function clampCount(
    cohort: string,
    requirement: Requirement | CustomTask,
    count: number,
    clamp?: boolean,
): number {
    if (clamp) {
        return Math.max(
            Math.min(count, requirement.counts[cohort] || 0),
            requirement.startCount || 0,
        );
    }
    return count;
}

/**
 * Gets the current count of a user's progress in a given requirement, optionally
 * clamping to the requirement's range.
 * @param cohort The cohort to get the count for.
 * @param requirement The requirement or custom task to get the count for.
 * @param progress The user's progress in the requirement.
 * @param clamp Whether to clamp the count.
 * @returns The user's current count on the requirement.
 */
export function getCurrentCount({
    cohort,
    requirement,
    progress,
    clamp,
    timeline,
}: {
    cohort: string;
    requirement?: Requirement | CustomTask;
    progress?: RequirementProgress;
    clamp?: boolean;
    timeline?: TimelineEntry[];
}): number {
    if (!requirement) {
        return 0;
    }
    if (isRequirement(requirement) && requirement.scoreboardDisplay === ScoreboardDisplay.NonDojo) {
        return 0;
    }
    if (
        isRequirement(requirement) &&
        requirement.scoreboardDisplay === ScoreboardDisplay.Yearly &&
        timeline
    ) {
        return getYearlyCount({ cohort, requirement, timeline, clamp });
    }

    if (isExpired(requirement, progress)) {
        return 0;
    }
    if (!progress) {
        return requirement.startCount || 0;
    }
    if (!progress.counts) {
        return requirement.startCount || 0;
    }
    if (requirement.numberOfCohorts === 1 || requirement.numberOfCohorts === 0) {
        return clampCount(
            cohort,
            requirement,
            progress.counts.ALL_COHORTS || requirement.startCount || 0,
            clamp,
        );
    }
    if (!progress.counts?.[cohort]) {
        return requirement.startCount || 0;
    }

    if (
        requirement.numberOfCohorts > 1 &&
        Object.keys(progress.counts || {}).length >= requirement.numberOfCohorts
    ) {
        if (progress.counts?.[cohort] !== undefined) {
            return clampCount(cohort, requirement, progress.counts[cohort], clamp);
        }

        return clampCount(
            cohort,
            requirement,
            Math.max(...Object.values(progress.counts || {})),
            clamp,
        );
    }

    if (requirement.counts?.[cohort] === undefined) {
        cohort = Object.keys(requirement.counts)[0];
    }
    return clampCount(cohort, requirement, progress.counts?.[cohort] || 0, clamp);
}

function getYearlyCount({
    cohort,
    requirement,
    timeline,
    clamp,
}: {
    cohort: string;
    requirement: Requirement;
    timeline: TimelineEntry[];
    clamp?: boolean;
}): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 365);
    const cutoff = cutoffDate.toISOString();
    let count = requirement.startCount || 0;

    for (const entry of timeline) {
        if ((entry.date || entry.createdAt) >= cutoff && entry.requirementId === requirement.id) {
            count += entry.newCount - entry.previousCount;
        }
    }

    return clampCount(cohort, requirement, count, clamp);
}

/**
 * Returns the total count for the given cohort and requirement.
 * @param cohort The cohort to get the total count for.
 * @param requirement The requirement to get the total count for.
 * @returns The total count for the given cohort and requirement.
 */
export function getTotalCount(
    cohort: string,
    requirement: Requirement | CustomTask,
    fallback?: boolean,
): number {
    return (
        requirement.counts[cohort] ??
        (fallback ? Object.values(requirement.counts).sort((a, b) => b - a)[0] : 0)
    );
}

/**
 * Returns the total time spent in the given cohort for the requirement progress.
 * @param cohort The cohort to get the time for.
 * @param progress The requirement progress to get the time for.
 * @returns
 */
export function getTotalTime(cohort: string, progress?: RequirementProgress): number {
    if (!progress) {
        return 0;
    }
    return progress.minutesSpent[cohort] || 0;
}

/**
 * Converts the given number of minutes to a user-facing display string.
 * @param value The number of minutes to display.
 * @returns The user-facing display string.
 */
export function formatTime(value: number): string {
    const hours = Math.floor(value / 60);
    const minutes = Math.round(value % 60);
    if (hours === 0) {
        return `${minutes}m`;
    }
    if (minutes === 0) {
        return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
}

/**
 * Returns true if the given requirement progress indicates the user has
 * completed the requirement in the given cohort.
 * @param cohort The cohort to check.
 * @param requirement The requirement to check.
 * @param progress The progress to check.
 * @param timeline The user's timeline for yearly tasks.
 * @param fallback Whether to fallback to the highest count when fetching the total count of the task.
 * @returns True if the requirement is complete.
 */
export function isComplete(
    cohort: string,
    requirement: Requirement | CustomTask,
    progress: RequirementProgress | undefined,
    timeline?: TimelineEntry[],
    fallback?: boolean,
): boolean {
    if (requirement.scoreboardDisplay === ScoreboardDisplay.NonDojo) {
        return false;
    }
    return (
        getCurrentCount({ cohort, requirement, progress, timeline }) >=
        getTotalCount(cohort, requirement, fallback)
    );
}

/**
 * Returns true if the given progress is expired for the given requirement.
 * @param requirement The requirement to check.
 * @param progress The progress to check.
 * @returns True if the progress is expired.
 */
export function isExpired(
    requirement: Requirement | CustomTask,
    progress?: RequirementProgress,
): boolean {
    if (!progress) {
        return false;
    }

    if (!isRequirement(requirement)) {
        return false;
    }

    if (requirement.expirationDays > 0) {
        const expirationDate = new Date(progress.updatedAt);
        expirationDate.setDate(expirationDate.getDate() + requirement.expirationDays);

        if (new Date().getTime() > expirationDate.getTime()) {
            return true;
        }
    }
    return false;
}

/**
 * Returns the current dojo points value of the given progress.
 * @param cohort The cohort to get the dojo points for.
 * @param requirement The requirement to get the dojo points for.
 * @param progress The progress to get the dojo points for.
 * @param timeline The user's timeline for yearly tasks.
 * @returns The current dojo points of the given progress.
 */
export function getCurrentScore(
    cohort: string,
    requirement: Requirement,
    progress: RequirementProgress | undefined,
    timeline?: TimelineEntry[],
) {
    if (!progress) {
        return 0;
    }

    if (requirement.totalScore) {
        if (isComplete(cohort, requirement, progress, timeline)) {
            return requirement.totalScore;
        }
        return 0;
    }

    const unitScore = getUnitScore(cohort, requirement);
    const currentCount = getCurrentCount({ cohort, requirement, progress, clamp: true, timeline });
    return Math.max(currentCount - requirement.startCount, 0) * unitScore;
}

/**
 * Returns the total possible dojo points for the given cohort and set of requirements.
 * @param cohort The cohort to get the total possible points for.
 * @param requirements The set of requirements to get the total possible points for.
 * @returns The total possible dojo points for the cohort and requirements.
 */
export function getTotalScore(cohort: string | undefined, requirements: Requirement[]) {
    if (!cohort) {
        return 0;
    }

    const totalScore = requirements.reduce((sum, r) => {
        if (r.totalScore) {
            return sum + r.totalScore;
        }
        let unitScore = r.unitScore;
        if (r.unitScoreOverride?.[cohort] !== undefined) {
            unitScore = r.unitScoreOverride[cohort];
        }
        const count = r.counts[cohort] || 0;
        return sum + (count - r.startCount) * unitScore;
    }, 0);

    return totalScore;
}

/**
 * Returns the Dojo points remaining uncompleted in the requirement.
 * @param cohort The cohort to get the points for.
 * @param requirement The requirement to get the points for.
 * @param progress The progress to get the points for.
 * @param timeline The user's timeline for yearly tasks.
 */
export function getRemainingScore(
    cohort: string,
    requirement: Requirement,
    progress: RequirementProgress | undefined,
    timeline: TimelineEntry[],
): number {
    const total = getTotalScore(cohort, [requirement]);
    const current = getCurrentScore(cohort, requirement, progress, timeline);
    return total - current;
}

/**
 * Returns the user's dojo points for the given cohort and set of requirements.
 * @param user The user to get the dojo points for.
 * @param cohort The cohort to get the dojo points for.
 * @param requirements The requirements to get the dojo points for.
 * @param timeline The user's timeline for yearly tasks.
 * @returns The user's dojo points for the given cohort and requirements.
 */
export function getCohortScore(
    user: User,
    cohort: string | undefined,
    requirements: Requirement[],
    timeline: TimelineEntry[],
): number {
    if (!cohort) {
        return 0;
    }

    let score = 0;
    for (const requirement of requirements) {
        score += getCurrentScore(cohort, requirement, user.progress[requirement.id], timeline);
    }
    return Math.round(score * 100) / 100;
}

/**
 * Returns the dojo score for the given user, cohort, requirement category and requirements.
 * @param user The user to get the score for.
 * @param cohort The cohort to get the score for.
 * @param category The requirement category to get the score for.
 * @param requirements The set of requirements to get the score for.
 * @param timeline The user's timeline for yearly tasks.
 * @returns The dojo score for the given parameters.
 */
export function getCategoryScore(
    user: User,
    cohort: string | undefined,
    category: string,
    requirements: Requirement[],
    timeline: TimelineEntry[],
): number {
    if (!cohort) {
        return 0;
    }

    let score = 0;
    for (const requirement of requirements) {
        if (requirement.category === category) {
            score += getCurrentScore(cohort, requirement, user.progress[requirement.id], timeline);
        }
    }
    return Math.round(score * 100) / 100;
}

/**
 * Returns the total possible dojo score for the given cohort, requirement category and requirements.
 * @param cohort The cohort to get the score for.
 * @param category The requirement category to get the score for.
 * @param requirements The set of requirements to get the score for.
 * @returns The total possible dojo score for the given parameters.
 */
export function getTotalCategoryScore(
    cohort: string | undefined,
    category: string,
    requirements: Requirement[],
) {
    if (!cohort) {
        return 0;
    }

    return getTotalScore(
        cohort,
        requirements.filter((r) => r.category === category),
    );
}

/**
 * Returns the percentage of Dojo points remaining uncompleted in the category.
 * @param user The user to get the Dojo points for.
 * @param cohort The cohort to get the Dojo points for.
 * @param category The category to get the Dojo points for.
 * @param requirements The list of requirements to get the Dojo points for.
 */
export function getRemainingCategoryScorePercent(
    user: User,
    cohort: string,
    category: string,
    requirements: Requirement[],
    timeline: TimelineEntry[],
): number {
    const total = getTotalCategoryScore(cohort, category, requirements);
    const score = getCategoryScore(user, cohort, category, requirements, timeline);
    return (total - score) / total;
}

/**
 * Returns the unit score of the requirement for the given cohort.
 * @param cohort The cohort to get the unit score for.
 * @param requirement The requirement to get the unit score for.
 * @returns The unit score of the requirement for the given cohort.
 */
export function getUnitScore(cohort: string, requirement: Requirement): number {
    if (requirement.unitScoreOverride?.[cohort] !== undefined) {
        return requirement.unitScoreOverride[cohort];
    }
    return requirement.unitScore;
}

/**
 * Returns whether the given requirement is currently blocked for the given user/cohort.
 * @param cohort The cohort to check.
 * @param user The user to check.
 * @param requirement The requirement to check.
 * @param requirements The list of all requirements which could be blockers.
 * @returns An object containing a boolean field and a user-facing reason if blocked.
 */
export function isBlocked(
    cohort: string,
    user: User,
    requirement: Requirement | CustomTask,
    requirements: Requirement[],
    timeline: TimelineEntry[],
): { isBlocked: boolean; reason?: string } {
    if (!isRequirement(requirement)) {
        return { isBlocked: false };
    }

    if (!requirement.blockers || requirement.blockers.length === 0) {
        return { isBlocked: false };
    }

    const requirementMap = requirements.reduce<Record<string, Requirement>>((acc, r) => {
        acc[r.id] = r;
        return acc;
    }, {});

    const isFreeTier = isFree(user);

    for (const blockerId of requirement.blockers) {
        const blocker = requirementMap[blockerId];
        if (
            blocker &&
            (blocker.isFree || !isFreeTier) &&
            !isComplete(cohort, blocker, user.progress[blockerId], timeline)
        ) {
            return {
                isBlocked: true,
                reason: `This task is locked until you complete ${blocker.category} - ${blocker.name}.`,
            };
        }
    }
    return { isBlocked: false };
}

/**
 * Returns true if the given task can be pinned to the daily suggestions.
 * @param task The task to check.
 * @returns True if the task can be pinned.
 */
export function isPinnable(task: Requirement | CustomTask): boolean {
    return task.scoreboardDisplay !== ScoreboardDisplay.Hidden;
}
