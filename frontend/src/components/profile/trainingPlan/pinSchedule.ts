import { User } from '@/database/user';
import { DEFAULT_MINUTES_PER_TASK, DEFAULT_WORK_GOAL } from './workGoal';

/** The minutes given to each day when a task is first pinned. */
export const DEFAULT_PINNED_MINUTES = DEFAULT_MINUTES_PER_TASK;

/**
 * Returns the minutes set aside for a pinned task on the given day of the week, or
 * undefined when the task has no schedule (it is planned every day and shares the
 * day's time with the suggested tasks).
 */
export function getPinnedMinutes(
    pinnedTaskMinutes: Record<string, number[]> | undefined,
    taskId: string,
    dayIndex: number,
): number | undefined {
    const minutes = pinnedTaskMinutes?.[taskId];
    if (!minutes) {
        return undefined;
    }
    return minutes[dayIndex] ?? 0;
}

/**
 * Returns the minutes set aside for scheduled pinned tasks on the given day of the
 * week. Pinned tasks without a schedule are not counted.
 */
export function getAllocatedMinutes(
    pinnedTaskIds: string[],
    pinnedTaskMinutes: Record<string, number[]> | undefined,
    dayIndex: number,
): number {
    let total = 0;
    for (const id of pinnedTaskIds) {
        total += getPinnedMinutes(pinnedTaskMinutes, id, dayIndex) ?? 0;
    }
    return total;
}

/** Returns the user's planned minutes for the given day of the week. */
export function getDayGoal(user: Pick<User, 'workGoal'>, dayIndex: number): number {
    return (user.workGoal || DEFAULT_WORK_GOAL).minutesPerDay[dayIndex] ?? 0;
}

/** Returns true if the two pinned task minute maps hold the same minutes for the given ids. */
export function pinnedMinutesMatch(
    pinnedTaskIds: string[],
    lhs: Record<string, number[]> | undefined,
    rhs: Record<string, number[]> | undefined,
): boolean {
    for (const id of pinnedTaskIds) {
        const a = lhs?.[id];
        const b = rhs?.[id];
        if (!a && !b) {
            continue;
        }
        if (a?.length !== b?.length || a?.some((m, i) => m !== b?.[i])) {
            return false;
        }
    }
    return true;
}

/**
 * Returns the time to prefill when logging training on a task: the time planned
 * for it today, else the minutes its pin sets aside today, else the default 30.
 * @param taskId The task being logged.
 * @param todaySuggestions Today's planned tasks.
 * @param user The user, for their pinned task minutes.
 * @param dayIndex Today's day of the week. Sunday is 0; Saturday is 6.
 */
export function getDefaultLogMinutes(
    taskId: string,
    todaySuggestions: { task: { id: string }; goalMinutes: number }[] | undefined,
    user: Pick<User, 'pinnedTasks' | 'pinnedTaskMinutes'>,
    dayIndex: number,
): number {
    const planned = todaySuggestions?.find((s) => s.task.id === taskId)?.goalMinutes ?? 0;
    if (planned > 0) {
        return planned;
    }
    const pinned = user.pinnedTasks?.includes(taskId)
        ? getPinnedMinutes(user.pinnedTaskMinutes, taskId, dayIndex)
        : undefined;
    return pinned && pinned > 0 ? pinned : DEFAULT_MINUTES_PER_TASK;
}
