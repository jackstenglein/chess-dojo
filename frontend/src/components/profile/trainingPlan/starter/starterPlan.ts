import {
    getCurrentCount,
    isComplete,
    Requirement,
    RequirementCategory,
    RequirementStatus,
} from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { User } from '@/database/user';
import { ANNOTATE_GAMES_TASK_ID, CLASSICAL_GAMES_TASK_ID } from '../suggestedTasks';

/**
 * The key in user.tutorials marking that the user has finished (or skipped) the
 * starter plan and moved on to the full training plan.
 */
export const STARTER_PLAN_TUTORIAL = 'StarterPlan';

/**
 * Only accounts created on or after this date get the starter plan, so existing
 * members keep the training plan they already use. Set this to the release date.
 */
export const STARTER_PLAN_LAUNCH_DATE = '2026-11-19T00:00:00.000Z';

/** The steps of the starter plan, in the order they are shown. */
export enum StarterStepId {
    Welcome = 'welcome',
    ClassicalGame = 'classicalGame',
    AnnotateGame = 'annotateGame',
    DojoRush = 'dojoRush',
}

export interface StarterStep {
    id: StarterStepId;
    /** Whether the step is done. */
    complete: boolean;
    /** How much of the step is done, e.g. 2 of the 4 welcome tasks. */
    current: number;
    /** How much of the step there is to do. */
    total: number;
    /** The training plan task behind the step, if it has one. */
    task?: Requirement;
    /** For the welcome step, its tasks. */
    tasks?: Requirement[];
}

/**
 * Returns whether the starter plan replaces the daily and weekly plan for the user:
 * a member who joined after the launch and has not yet moved on to the full plan.
 */
export function isStarterPlanActive(user: User): boolean {
    if (user.tutorials?.[STARTER_PLAN_TUTORIAL]) {
        return false;
    }
    return !!user.createdAt && user.createdAt >= STARTER_PLAN_LAUNCH_DATE;
}

/**
 * Returns how many times the user has done a counted task, not counting the
 * task's starting value. A missing task counts as not started.
 */
function countDone(user: User, task: Requirement | undefined, timeline: TimelineEntry[]): number {
    if (!task) {
        return 0;
    }
    const count = getCurrentCount({
        cohort: user.dojoCohort,
        requirement: task,
        progress: user.progress[task.id],
        timeline,
    });
    return Math.max(0, count - (task.startCount || 0));
}

/**
 * Returns the steps of the starter plan and how far the user is through each one.
 * @param user The user following the starter plan.
 * @param requirements The tasks of the user's cohort.
 * @param timeline The user's timeline.
 * @param hasDojoRushRun Whether the user has finished a Dojo Rush run.
 */
export function getStarterSteps({
    user,
    requirements,
    timeline,
    hasDojoRushRun,
}: {
    user: User;
    requirements: Requirement[];
    timeline: TimelineEntry[];
    hasDojoRushRun: boolean;
}): StarterStep[] {
    const active = requirements.filter((r) => r.status === RequirementStatus.Active);

    const welcomeTasks = active.filter((r) => r.category === RequirementCategory.Welcome);
    const welcomeDone = welcomeTasks.filter((r) =>
        isComplete(user.dojoCohort, r, user.progress[r.id]),
    ).length;

    const classicalTask = active.find((r) => r.id === CLASSICAL_GAMES_TASK_ID);
    const classicalDone = Math.min(1, countDone(user, classicalTask, timeline));

    const annotateTask = active.find((r) => r.id === ANNOTATE_GAMES_TASK_ID);
    const annotateDone = Math.min(1, countDone(user, annotateTask, timeline));

    return [
        {
            id: StarterStepId.Welcome,
            complete: welcomeDone >= welcomeTasks.length,
            current: welcomeDone,
            total: welcomeTasks.length,
            tasks: welcomeTasks,
        },
        {
            id: StarterStepId.ClassicalGame,
            complete: classicalDone >= 1,
            current: classicalDone,
            total: 1,
            task: classicalTask,
        },
        {
            id: StarterStepId.AnnotateGame,
            complete: annotateDone >= 1,
            current: annotateDone,
            total: 1,
            task: annotateTask,
        },
        {
            id: StarterStepId.DojoRush,
            complete: hasDojoRushRun,
            current: hasDojoRushRun ? 1 : 0,
            total: 1,
        },
    ];
}
