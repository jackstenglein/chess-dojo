import { isComplete } from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { User } from '@/database/user';
import { PlanTask } from '../customPlan';
import { MINIMUM_TASKS } from '../suggestedTasks';

/** The completion of a set of plan tasks. */
export interface PlanProgress {
    /** The number of completed tasks. */
    completed: number;
    /** The total number of tasks. */
    total: number;
    /** The percent of tasks completed, rounded. 0 when there are no tasks. */
    percent: number;
}

/**
 * Returns whether the user has completed the given plan task. Ongoing minimum
 * tasks (such as playing classical games) never count as complete.
 */
export function isPlanTaskComplete(
    task: PlanTask,
    user: User,
    cohort: string,
    timeline: TimelineEntry[],
): boolean {
    if (MINIMUM_TASKS.has(task.id)) {
        return false;
    }
    return isComplete(cohort, task, user.progress[task.id], timeline, false);
}

/**
 * Returns the completion of the given plan tasks, counting each task once.
 * @param tasks The tasks.
 * @param user The user whose progress to use.
 * @param cohort The cohort to check completion for.
 * @param timeline The user's timeline.
 */
export function getPlanProgress(
    tasks: PlanTask[],
    user: User,
    cohort: string,
    timeline: TimelineEntry[],
): PlanProgress {
    const total = tasks.length;
    const completed = tasks.filter((t) => isPlanTaskComplete(t, user, cohort, timeline)).length;
    return { completed, total, percent: total > 0 ? Math.round((100 * completed) / total) : 0 };
}
