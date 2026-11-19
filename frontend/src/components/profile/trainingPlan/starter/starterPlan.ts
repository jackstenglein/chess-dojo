import {
    getCurrentCount,
    getTotalCount,
    isComplete,
    Requirement,
    RequirementCategory,
    RequirementStatus,
    ScoreboardDisplay,
} from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { User } from '@/database/user';
import { ANNOTATE_GAMES_TASK_ID, CLASSICAL_GAMES_TASK_ID } from '../suggestedTasks';
import { getStarterTasks, isStarterPlanFinished, StarterTaskRecord } from './starterProgress';

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
    EndgameAlgorithm = 'endgameAlgorithm',
    MiddlegameSparring = 'middlegameSparring',
    DojoRush = 'dojoRush',
}

/** A task within a starter step and whether the user has done it. */
export interface StarterStepTask {
    task: Requirement;
    done: boolean;
    /** The user's starter record of the task, if they marked it done on the starter plan. */
    record?: StarterTaskRecord;
}

export interface StarterStep {
    id: StarterStepId;
    /** Whether the step is done. */
    complete: boolean;
    /** How many of the step's tasks are done. */
    current: number;
    /** How many tasks the step has. */
    total: number;
    /** The tasks to do for the step. Empty for the Dojo Rush step, which has no task. */
    tasks: StarterStepTask[];
}

/**
 * Returns whether the starter plan replaces the training plan for the user: a member
 * who joined after the launch and has not yet finished the starter plan.
 */
export function isStarterPlanActive(user: User): boolean {
    if (isStarterPlanFinished(user.tutorials)) {
        return false;
    }
    return !!user.createdAt && user.createdAt >= STARTER_PLAN_LAUNCH_DATE;
}

/**
 * Returns whether the user has already done the task in their real progress, for
 * example by logging it from another page. Counted tasks need one more than their
 * starting value; other tasks need to be complete.
 */
function isDoneInProgress(user: User, task: Requirement, timeline: TimelineEntry[]): boolean {
    if (task.id === CLASSICAL_GAMES_TASK_ID || task.id === ANNOTATE_GAMES_TASK_ID) {
        const count = getCurrentCount({
            cohort: user.dojoCohort,
            requirement: task,
            progress: user.progress[task.id],
            timeline,
        });
        return count - (task.startCount || 0) >= 1;
    }
    return isComplete(user.dojoCohort, task, user.progress[task.id], timeline);
}

/**
 * Returns the steps of the starter plan and how far the user is through each one.
 * A task counts as done if the user marked it done on the starter plan or has
 * already done it in their real progress.
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
    const records = getStarterTasks(user.tutorials);

    const toStepTask = (task: Requirement): StarterStepTask => ({
        task,
        record: records[task.id],
        done: !!records[task.id] || isDoneInProgress(user, task, timeline),
    });

    const step = (id: StarterStepId, tasks: StarterStepTask[]): StarterStep => {
        const current = tasks.filter((t) => t.done).length;
        return { id, tasks, current, total: tasks.length, complete: current >= tasks.length };
    };

    const steps: StarterStep[] = [
        step(
            StarterStepId.Welcome,
            active.filter((r) => r.category === RequirementCategory.Welcome).map(toStepTask),
        ),
    ];

    for (const [id, taskId] of [
        [StarterStepId.ClassicalGame, CLASSICAL_GAMES_TASK_ID],
        [StarterStepId.AnnotateGame, ANNOTATE_GAMES_TASK_ID],
    ] as const) {
        const task = active.find((r) => r.id === taskId);
        if (task) {
            steps.push(step(id, [toStepTask(task)]));
        }
    }

    for (const [id, tasks] of [
        [StarterStepId.EndgameAlgorithm, active.filter(isEndgameAlgorithm)],
        [StarterStepId.MiddlegameSparring, active.filter(isMiddlegameSparring)],
    ] as const) {
        const chosen = chooseOneOf(tasks.map(toStepTask));
        if (chosen) {
            steps.push(step(id, [chosen]));
        }
    }

    steps.push({
        id: StarterStepId.DojoRush,
        complete: hasDojoRushRun,
        current: hasDojoRushRun ? 1 : 0,
        total: 1,
        tasks: [],
    });
    return steps;
}

/** Whether the task is one of the numbered endgame algorithms (e.g. "Complete Algorithm #1"). */
export function isEndgameAlgorithm(task: Requirement): boolean {
    return task.category === RequirementCategory.Endgame && /algorithm/i.test(task.name);
}

/**
 * Whether the task is a middlegame sparring position. The guide to middlegame
 * sparring is in the same category but is reading, not sparring, so it is left out.
 */
export function isMiddlegameSparring(task: Requirement): boolean {
    return (
        task.category === RequirementCategory.Middlegames &&
        /sparring/i.test(task.name) &&
        !/guide/i.test(task.name)
    );
}

/**
 * Picks the task for a step that asks for one of several tasks: one the user has
 * already done, or else the first in training plan order, which is the one meant to
 * be done first in the cohort. Returns undefined if there are no tasks.
 */
function chooseOneOf(tasks: StarterStepTask[]): StarterStepTask | undefined {
    const ordered = [...tasks].sort((a, b) =>
        (a.task.sortPriority ?? '').localeCompare(b.task.sortPriority ?? ''),
    );
    return ordered.find((t) => t.done) ?? ordered[0];
}

/** A progress update that credits a starter task to the user's real progress. */
export interface StarterCredit {
    task: Requirement;
    previousCount: number;
    newCount: number;
    minutes: number;
    /** When the user marked the task done, in ISO 8601. */
    date: string;
}

/**
 * Returns the progress updates that move the user's starter tasks into their real
 * progress when they finish the starter plan. Each task marked done on the starter
 * plan and not yet credited adds one to a counted task or completes a checkbox task.
 * A checkbox task already complete in real progress is credited with its time only.
 */
export function getStarterCredits(
    user: User,
    steps: StarterStep[],
    timeline: TimelineEntry[],
): StarterCredit[] {
    const credits: StarterCredit[] = [];
    for (const { task, record } of steps.flatMap((s) => s.tasks)) {
        if (!record || record.credited) {
            continue;
        }
        const previousCount = getCurrentCount({
            cohort: user.dojoCohort,
            requirement: task,
            progress: user.progress[task.id],
            timeline,
        });
        const totalCount = getTotalCount(user.dojoCohort, task, true);
        const isCheckbox = task.scoreboardDisplay === ScoreboardDisplay.Checkbox || totalCount <= 1;
        const newCount = isCheckbox ? Math.max(previousCount, totalCount) : previousCount + 1;
        credits.push({
            task,
            previousCount,
            newCount,
            minutes: record.minutes,
            date: record.completedAt,
        });
    }
    return credits;
}
