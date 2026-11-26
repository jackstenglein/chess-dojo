import {
    CustomTask,
    CustomTaskCategory,
    isComplete,
    Requirement,
    RequirementCategory,
    ScoreboardDisplay,
} from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { CustomPlan, CustomPlanBucket, dojoCohorts, User } from '@/database/user';
import { v4 as uuidv4 } from 'uuid';
import { createCustomPlan } from '../customPlan';
import { isStarterPlanFinished } from '../starter/starterProgress';
import { MINIMUM_TASKS } from '../suggestedTasks';
import { getBucketCategory } from './bucketColors';

/** The number of tasks a free-tier user can put in each bucket of their plan. */
export const FREE_PLAN_MAX_TASKS_PER_BUCKET = 3;

/** The categories of the buckets in a free-tier plan, in display order. */
export const FREE_PLAN_CATEGORIES: CustomTaskCategory[] = [
    RequirementCategory.Games,
    RequirementCategory.Tactics,
    RequirementCategory.Opening,
    RequirementCategory.Middlegames,
    RequirementCategory.Endgame,
];

/** The translation key (in profile.trainingPlan.freePlan) of each category's bucket name. */
export const FREE_BUCKET_NAME_KEYS = {
    [RequirementCategory.Games]: 'bucketGames',
    [RequirementCategory.Tactics]: 'bucketTactics',
    [RequirementCategory.Opening]: 'bucketOpenings',
    [RequirementCategory.Middlegames]: 'bucketMiddlegames',
    [RequirementCategory.Endgame]: 'bucketEndgames',
} as const satisfies Record<CustomTaskCategory, string>;

/**
 * Returns the plan's buckets in FREE_PLAN_CATEGORIES order, so plans saved with an
 * older order show like new ones. Buckets of other categories go last, in their order.
 */
export function sortFreePlanBuckets<T extends Pick<CustomPlanBucket, 'name' | 'category'>>(
    buckets: T[],
): T[] {
    const rank = (bucket: T) => {
        const category = getBucketCategory(bucket);
        const index = category ? FREE_PLAN_CATEGORIES.indexOf(category as CustomTaskCategory) : -1;
        return index < 0 ? FREE_PLAN_CATEGORIES.length : index;
    };
    return buckets
        .map((bucket, i) => ({ bucket, i }))
        .sort((a, b) => rank(a.bucket) - rank(b.bucket) || a.i - b.i)
        .map(({ bucket }) => bucket);
}

/** The unit a free-plan task measures its progress in. 'check' is a simple checkbox. */
export const TASK_UNITS = [
    'Games',
    'Minutes',
    'Puzzles',
    'Pages',
    'Chapters',
    'Exercises',
    'Sessions',
    'check',
] as const;
export type TaskUnit = (typeof TASK_UNITS)[number];

/** The fields of a free-plan task the user edits. */
export interface FreeTaskFields {
    name: string;
    description: string;
    category: CustomTaskCategory;
    /** The goal, in units. Ignored for the 'check' unit. */
    goal: number;
    /** The count the user starts at, in units. Ignored for the 'check' unit. */
    startCount: number;
    unit: TaskUnit;
}

/**
 * Builds a custom task from the fields of the free-plan task editor. The task
 * counts the same in every cohort, so it keeps working after a cohort change.
 * @param fields The task's fields.
 * @param owner The username of the task's owner.
 * @param id The id of the task being edited. A new id is made if not set.
 */
export function buildFreeTask(fields: FreeTaskFields, owner: string, id?: string): CustomTask {
    const isCheck = fields.unit === 'check';
    const goal = isCheck ? 1 : fields.goal;
    let scoreboardDisplay = ScoreboardDisplay.ProgressBar;
    if (isCheck || goal === 1) {
        scoreboardDisplay = ScoreboardDisplay.Checkbox;
    } else if (fields.unit === 'Minutes') {
        scoreboardDisplay = ScoreboardDisplay.Minutes;
    }

    return {
        id: id || uuidv4(),
        owner,
        name: fields.name.trim(),
        description: fields.description.trim(),
        startCount: isCheck ? 0 : fields.startCount,
        counts: Object.fromEntries(dojoCohorts.map((c) => [c, goal])),
        scoreboardDisplay,
        category: fields.category,
        numberOfCohorts: 1,
        progressBarSuffix: isCheck ? '' : fields.unit,
        updatedAt: new Date().toISOString(),
    };
}

/**
 * Returns the editor fields of an existing custom task.
 * @param task The task to edit.
 */
export function getFreeTaskFields(task: CustomTask): FreeTaskFields {
    const isCheck = task.scoreboardDisplay === ScoreboardDisplay.Checkbox;
    const unit = TASK_UNITS.find((u) => u === task.progressBarSuffix);
    return {
        name: task.name,
        description: task.description,
        category: task.category,
        goal: Object.values(task.counts)[0] ?? 1,
        startCount: task.startCount ?? 0,
        unit: isCheck ? 'check' : (unit ?? 'Sessions'),
    };
}

/**
 * Builds an empty free-tier plan with one bucket per category, for the user to
 * fill with their own tasks.
 * @param owner The username of the plan's owner.
 * @param planName The name of the plan.
 * @param bucketNames The name of each category's bucket.
 */
export function buildFreePlan(
    owner: string,
    planName: string,
    bucketNames: Record<CustomTaskCategory, string>,
): CustomPlan {
    const buckets: CustomPlanBucket[] = FREE_PLAN_CATEGORIES.map((category) => ({
        id: uuidv4(),
        name: bucketNames[category],
        category,
        taskIds: [],
    }));
    return createCustomPlan(planName, owner, buckets);
}

/** A task of the plan whose progress a reset sets back to 0. */
export interface ProgressReset {
    requirementId: string;
    /** The task's count before the reset. */
    previousCount: number;
}

/**
 * Returns the tasks of the plan that have progress to reset: those with a
 * count logged above 0. Time spent is history and is not reset.
 * @param plan The plan.
 * @param progress The user's progress, by task id.
 */
export function getProgressResets(plan: CustomPlan, progress: User['progress']): ProgressReset[] {
    return plan.buckets
        .flatMap((b) => b.taskIds)
        .flatMap((id) => {
            const count = Math.max(0, ...Object.values(progress[id]?.counts ?? {}));
            return count > 0 ? [{ requirementId: id, previousCount: count }] : [];
        });
}

/** Categories that are not counted as Dojo plan tasks here. */
const EXCLUDED_CATEGORIES = new Set<string>([
    RequirementCategory.Graduation,
    RequirementCategory.NonDojo,
    RequirementCategory.SuggestedTasks,
    RequirementCategory.Pinned,
]);

/** Returns the Dojo plan tasks of the user's cohort, leaving out ongoing ones. */
function getCohortTasks(user: User, requirements: Requirement[]): Requirement[] {
    return requirements.filter(
        (r) =>
            r.counts[user.dojoCohort] !== undefined &&
            !EXCLUDED_CATEGORIES.has(r.category) &&
            !MINIMUM_TASKS.has(r.id),
    );
}

/**
 * Returns the number of tasks in the user's cohort plan that the free tier
 * leaves out: what joining the full program unlocks.
 * @param user The user.
 * @param requirements All requirements.
 */
export function getLockedTaskCount(user: User, requirements: Requirement[]): number {
    return getCohortTasks(user, requirements).filter((r) => !r.isFree).length;
}

/**
 * Returns whether a free-tier user is done with the free part of the Dojo plan:
 * they finished the Dojo Starter Plan, or (members who joined before it) they
 * completed every free task of their cohort. Ongoing tasks don't count.
 * @param user The user.
 * @param requirements All requirements.
 * @param timeline The user's timeline.
 */
export function isFreeStarterPlanDone(
    user: User,
    requirements: Requirement[],
    timeline: TimelineEntry[],
): boolean {
    if (isStarterPlanFinished(user.tutorials)) {
        return true;
    }
    const free = getCohortTasks(user, requirements).filter((r) => r.isFree);
    return (
        free.length > 0 &&
        free.every((r) => isComplete(user.dojoCohort, r, user.progress[r.id], timeline, false))
    );
}
