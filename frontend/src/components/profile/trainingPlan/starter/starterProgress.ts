/**
 * Storage for a new member's starter plan progress.
 *
 * Starter progress is kept apart from the user's real task progress until the
 * starter plan is finished. It is saved in user.tutorials, a map of string keys to
 * booleans the backend already stores, by encoding each record into its key:
 *
 *   starter:<taskId>:<minutes>:<completedAt ms>   a task marked done
 *   starterCredited:<taskId>                      that task was credited to real progress
 *   StarterPlan                                   the starter plan is finished
 *   StarterPlanStarted                            an existing member chose to start it
 *   starterResetAt:<ms>                           when the starter plan was last reset
 *
 * Task ids are UUIDs and contain no colons. If the backend gains a dedicated field,
 * only this file needs to change.
 */

/** The key marking that the user has finished (or skipped) the starter plan. */
export const STARTER_PLAN_FINISHED_KEY = 'StarterPlan';

/** The key marking that a member chose to start the starter plan ("New to Dojo? Start here"). */
export const STARTER_PLAN_STARTED_KEY = 'StarterPlanStarted';

const TASK_PREFIX = 'starter:';
const CREDITED_PREFIX = 'starterCredited:';
const RESET_PREFIX = 'starterResetAt:';

export type Tutorials = Record<string, boolean>;

/** A task the user marked done on the starter plan. */
export interface StarterTaskRecord {
    taskId: string;
    /** The minutes the user spent on the task. */
    minutes: number;
    /** When the user marked the task done, in ISO 8601. */
    completedAt: string;
    /** Whether the task has been credited to the user's real progress. */
    credited: boolean;
}

/** Returns whether the user has finished (or skipped) the starter plan. */
export function isStarterPlanFinished(tutorials?: Tutorials): boolean {
    return !!tutorials?.[STARTER_PLAN_FINISHED_KEY];
}

/** Returns the tasks the user has marked done on the starter plan, keyed by task id. */
export function getStarterTasks(tutorials?: Tutorials): Record<string, StarterTaskRecord> {
    const records: Record<string, StarterTaskRecord> = {};
    for (const [key, value] of Object.entries(tutorials ?? {})) {
        if (!value || !key.startsWith(TASK_PREFIX)) {
            continue;
        }
        const [taskId, minutes, completedAt] = key.slice(TASK_PREFIX.length).split(':');
        const date = new Date(Number(completedAt));
        if (!taskId || isNaN(Number(minutes)) || isNaN(date.getTime())) {
            continue;
        }
        records[taskId] = {
            taskId,
            minutes: Number(minutes),
            completedAt: date.toISOString(),
            credited: !!tutorials?.[`${CREDITED_PREFIX}${taskId}`],
        };
    }
    return records;
}

/** Returns a copy of tutorials without the record of the given task. */
export function withoutStarterTask(tutorials: Tutorials | undefined, taskId: string): Tutorials {
    const prefix = `${TASK_PREFIX}${taskId}:`;
    return Object.fromEntries(
        Object.entries(tutorials ?? {}).filter(([key]) => !key.startsWith(prefix)),
    );
}

/** Returns a copy of tutorials with the given task marked done, replacing any older record. */
export function withStarterTask(
    tutorials: Tutorials | undefined,
    taskId: string,
    minutes: number,
    completedAt: Date,
): Tutorials {
    const wholeMinutes = Math.max(0, Math.round(minutes));
    return {
        ...withoutStarterTask(tutorials, taskId),
        [`${TASK_PREFIX}${taskId}:${wholeMinutes}:${completedAt.getTime()}`]: true,
    };
}

/** Returns a copy of tutorials with the given task marked as credited to real progress. */
export function withStarterTaskCredited(
    tutorials: Tutorials | undefined,
    taskId: string,
): Tutorials {
    return { ...tutorials, [`${CREDITED_PREFIX}${taskId}`]: true };
}

/** Returns a copy of tutorials with all starter plan progress removed. */
export function withoutStarterProgress(tutorials: Tutorials | undefined): Tutorials {
    return Object.fromEntries(
        Object.entries(tutorials ?? {}).filter(
            ([key]) =>
                key !== STARTER_PLAN_FINISHED_KEY &&
                key !== STARTER_PLAN_STARTED_KEY &&
                !key.startsWith(TASK_PREFIX) &&
                !key.startsWith(CREDITED_PREFIX) &&
                !key.startsWith(RESET_PREFIX),
        ),
    );
}

/** Returns whether the member chose to start the starter plan and hasn't finished it since. */
export function isStarterPlanStarted(tutorials?: Tutorials): boolean {
    return !!tutorials?.[STARTER_PLAN_STARTED_KEY] && !isStarterPlanFinished(tutorials);
}

/**
 * Returns a copy of tutorials with the starter plan started by the member's choice. A
 * member who skipped or finished it before can start it again; tasks already credited
 * to their real progress stay credited.
 */
export function withStarterPlanStarted(tutorials: Tutorials | undefined): Tutorials {
    const rest = Object.fromEntries(
        Object.entries(tutorials ?? {}).filter(([key]) => key !== STARTER_PLAN_FINISHED_KEY),
    );
    return { ...rest, [STARTER_PLAN_STARTED_KEY]: true };
}

/** Returns a copy of tutorials with the starter plan marked finished. */
export function withStarterPlanFinished(tutorials: Tutorials | undefined): Tutorials {
    return { ...tutorials, [STARTER_PLAN_FINISHED_KEY]: true };
}

/**
 * Returns a copy of tutorials with all starter plan progress removed and the time of
 * the reset remembered, so progress from before the reset (such as earlier Dojo Rush
 * runs) can be ignored.
 */
export function withStarterReset(tutorials: Tutorials | undefined, date: Date): Tutorials {
    return { ...withoutStarterProgress(tutorials), [`${RESET_PREFIX}${date.getTime()}`]: true };
}

/** Returns when the starter plan was last reset, in milliseconds, if it ever was. */
export function getStarterResetAt(tutorials: Tutorials | undefined): number | undefined {
    const key = Object.keys(tutorials ?? {}).find(
        (k) => k.startsWith(RESET_PREFIX) && tutorials?.[k],
    );
    const time = Number(key?.slice(RESET_PREFIX.length));
    return key && !isNaN(time) ? time : undefined;
}
