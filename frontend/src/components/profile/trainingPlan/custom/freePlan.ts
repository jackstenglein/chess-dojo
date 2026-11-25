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

/** The number of tasks a free-tier user can put in each bucket of their plan. */
export const FREE_PLAN_MAX_TASKS_PER_BUCKET = 3;

/** The categories of the buckets in a free-tier plan, in display order. */
export const FREE_PLAN_CATEGORIES: CustomTaskCategory[] = [
    RequirementCategory.Games,
    RequirementCategory.Tactics,
    RequirementCategory.Middlegames,
    RequirementCategory.Endgame,
    RequirementCategory.Opening,
];

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

/** The sample task the plan starts with in each bucket. */
export type SampleTasks = Record<CustomTaskCategory, Omit<FreeTaskFields, 'category'>>;

/**
 * Builds a free-tier plan with one bucket per category, each holding its sample
 * task, and the sample tasks themselves.
 * @param owner The username of the plan's owner.
 * @param planName The name of the plan.
 * @param bucketNames The name of each category's bucket.
 * @param samples The sample task of each category.
 */
export function buildFreePlan(
    owner: string,
    planName: string,
    bucketNames: Record<CustomTaskCategory, string>,
    samples: SampleTasks,
): { plan: CustomPlan; tasks: CustomTask[] } {
    const tasks: CustomTask[] = [];
    const buckets: CustomPlanBucket[] = FREE_PLAN_CATEGORIES.map((category) => {
        const task = buildFreeTask({ ...samples[category], category }, owner);
        tasks.push(task);
        return { id: uuidv4(), name: bucketNames[category], category, taskIds: [task.id] };
    });
    return { plan: createCustomPlan(planName, owner, buckets), tasks };
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
