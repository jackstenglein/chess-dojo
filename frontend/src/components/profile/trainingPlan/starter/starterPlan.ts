import {
    getCohortScore,
    getCurrentCount,
    getTotalCount,
    getTotalScore,
    isComplete,
    Requirement,
    RequirementCategory,
    RequirementStatus,
    ScoreboardDisplay,
} from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { isFree, User } from '@/database/user';
import { ANNOTATE_GAMES_TASK_ID, CLASSICAL_GAMES_TASK_ID } from '../suggestedTasks';
import {
    getStarterTasks,
    isStarterPlanFinished,
    isStarterPlanStarted,
    isStarterTaskUndone,
    StarterTaskRecord,
} from './starterProgress';

/**
 * Only accounts created on or after this date get the starter plan, so existing
 * members keep the training plan they already use. It is set per environment with
 * NEXT_PUBLIC_STARTER_PLAN_LAUNCH_DATE in ISO 8601 (e.g. 2027-01-15T00:00:00.000Z),
 * to the day the starter plan goes live there. While it is unset, no one gets the
 * starter plan, though it can still be previewed in local development.
 */
export const STARTER_PLAN_LAUNCH_DATE: string | undefined =
    process.env.NEXT_PUBLIC_STARTER_PLAN_LAUNCH_DATE || undefined;

/** The steps of the starter plan, in the order they are shown. */
export enum StarterStepId {
    Welcome = 'welcome',
    DojoRush = 'dojoRush',
    MasterGame = 'masterGame',
    EndgameAlgorithm = 'endgameAlgorithm',
    ClassicalGame = 'classicalGame',
    AnnotateGame = 'annotateGame',
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
 * who joined after the launch and has not yet finished the starter plan. No one does
 * while the launch date is unset.
 * @param user The user to check.
 * @param launchDate The launch date, in ISO 8601. Defaults to STARTER_PLAN_LAUNCH_DATE.
 */
export function isStarterPlanActive(
    user: User,
    launchDate: string | undefined = STARTER_PLAN_LAUNCH_DATE,
): boolean {
    if (isStarterPlanFinished(user.tutorials)) {
        return false;
    }
    if (isStarterPlanStarted(user.tutorials)) {
        // An existing member chose to start it.
        return true;
    }
    if (!launchDate) {
        return false;
    }
    const launch = new Date(launchDate).getTime();
    const created = new Date(user.createdAt ?? '').getTime();
    return !isNaN(launch) && !isNaN(created) && created >= launch;
}

/** How long a member must have logged no training to be offered the starter plan. */
export const STARTER_SUGGESTION_INACTIVE_DAYS = 31;

/** The share of the member's program, by Dojo points, below which they are offered it. */
export const STARTER_SUGGESTION_MAX_PERCENT = 10;

/**
 * Returns whether to offer an existing member the starter plan ("New to Dojo? Start
 * here"): they are not on it, have logged no training for over a month (or never, and
 * joined over a month ago), and have done less than 10% of their cohort's program.
 * @param user The member.
 * @param requirements The tasks of the member's cohort they have access to.
 * @param timeline The member's timeline.
 * @param now The current time, for tests.
 */
export function isStarterPlanSuggested({
    user,
    requirements,
    timeline,
    now = new Date(),
}: {
    user: User;
    requirements: Requirement[];
    timeline: TimelineEntry[];
    now?: Date;
}): boolean {
    if (isStarterPlanActive(user) || requirements.length === 0) {
        return false;
    }

    const lastActivity = timeline.reduce<string>(
        (latest, entry) => (entry.createdAt > latest ? entry.createdAt : latest),
        user.createdAt ?? '',
    );
    const lastActivityTime = new Date(lastActivity).getTime();
    const inactiveSince = now.getTime() - STARTER_SUGGESTION_INACTIVE_DAYS * 24 * 60 * 60 * 1000;
    if (isNaN(lastActivityTime) || lastActivityTime > inactiveSince) {
        return false;
    }

    const totalScore = getTotalScore(user.dojoCohort, requirements);
    if (totalScore <= 0) {
        return false;
    }
    const score = getCohortScore(user, user.dojoCohort, requirements, timeline);
    return (100 * score) / totalScore < STARTER_SUGGESTION_MAX_PERCENT;
}

/**
 * Whether the starter plan asks for one of the task's count rather than all of it:
 * one classical game, one annotation, one master game.
 */
function isCountedTask(user: User, task: Requirement): boolean {
    return (
        task.scoreboardDisplay !== ScoreboardDisplay.Checkbox &&
        getTotalCount(user.dojoCohort, task, true) > 1
    );
}

/**
 * Returns whether the user has already done the task in their real progress, for
 * example by logging it from another page. Counted tasks need one more than their
 * starting value; other tasks need to be complete.
 */
function isDoneInProgress(user: User, task: Requirement, timeline: TimelineEntry[]): boolean {
    if (isCountedTask(user, task)) {
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
    ignoreRealProgress = false,
}: {
    user: User;
    requirements: Requirement[];
    timeline: TimelineEntry[];
    hasDojoRushRun: boolean;
    /** Count only tasks marked done on the starter plan, as for a brand-new member. */
    ignoreRealProgress?: boolean;
}): StarterStep[] {
    // Free members only get free tasks: the first free endgame algorithm, and no
    // master games step, since Study Master Games is for paid members.
    const freeOnly = isFree(user);
    const active = requirements.filter(
        (r) => r.status === RequirementStatus.Active && (!freeOnly || r.isFree),
    );
    const records = getStarterTasks(user.tutorials);

    const toStepTask = (task: Requirement): StarterStepTask => ({
        task,
        record: records[task.id],
        done:
            !!records[task.id] ||
            (!ignoreRealProgress &&
                // A task the member undid here stays open, whatever their real progress.
                !isStarterTaskUndone(user.tutorials, task.id) &&
                isDoneInProgress(user, task, timeline)),
    });

    const step = (id: StarterStepId, tasks: StarterStepTask[]): StarterStep => {
        const current = tasks.filter((t) => t.done).length;
        return { id, tasks, current, total: tasks.length, complete: current >= tasks.length };
    };

    const steps: StarterStep[] = [
        step(StarterStepId.Welcome, active.filter(isStarterWelcomeTask).map(toStepTask)),
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

    steps.push({
        id: StarterStepId.DojoRush,
        complete: hasDojoRushRun,
        current: hasDojoRushRun ? 1 : 0,
        total: 1,
        tasks: [],
    });

    for (const [id, tasks] of [
        [StarterStepId.EndgameAlgorithm, active.filter(isEndgameAlgorithm)],
        [StarterStepId.MasterGame, active.filter(isMasterGamesTask)],
    ] as const) {
        const chosen = chooseOneOf(tasks.map(toStepTask));
        if (chosen) {
            steps.push(step(id, [chosen]));
        }
    }

    // StarterStepId lists the steps in the order they are shown.
    const order = Object.values(StarterStepId);
    return steps.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

/**
 * Welcome to the Dojo tasks left out of the starter plan: the training partner guide
 * and the weekly training plans guide, which matter once the member is on the full
 * plan. They stay in the Welcome to the Dojo category there.
 */
const EXCLUDED_WELCOME_TASKS = [/training partner/i, /weekly training plan/i];

/** Whether the task is a Welcome to the Dojo task included in the starter plan. */
export function isStarterWelcomeTask(task: Requirement): boolean {
    return (
        task.category === RequirementCategory.Welcome &&
        !EXCLUDED_WELCOME_TASKS.some((pattern) => pattern.test(task.name))
    );
}

/** Whether the task is one of the numbered endgame algorithms (e.g. "Complete Algorithm #1"). */
export function isEndgameAlgorithm(task: Requirement): boolean {
    return task.category === RequirementCategory.Endgame && /algorithm/i.test(task.name);
}

/** Whether the task is the cohort's "Study Master Games" task, not a guide about it. */
export function isMasterGamesTask(task: Requirement): boolean {
    return /master games/i.test(task.name) && !/guide/i.test(task.name);
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
 * Whether the starter plan asks for only the first position of the task: endgame
 * algorithms have several positions, but the starter plan asks for one, so finishing
 * it does not complete the whole algorithm.
 */
export function isOnePositionTask(task: Requirement): boolean {
    return isEndgameAlgorithm(task);
}

/**
 * Returns the progress updates that move the user's starter tasks into their real
 * progress when they finish the starter plan. Each task marked done on the starter
 * plan and not yet credited adds one to a counted task or completes a checkbox task.
 * A checkbox task already complete in real progress, and a task the starter plan only
 * asked one position of, is credited with its time only.
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
        const newCount = isOnePositionTask(task)
            ? previousCount
            : isCheckbox
              ? Math.max(previousCount, totalCount)
              : previousCount + 1;
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
