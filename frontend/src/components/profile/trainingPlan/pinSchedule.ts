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

export interface Overallocation {
    /** The day of the week. Sunday is 0; Saturday is 6. */
    dayIndex: number;
    /** The minutes set aside for pinned tasks that day. */
    allocated: number;
    /** The minutes the user planned to work that day. */
    goal: number;
}

/**
 * Returns the day's overallocation, or undefined when the pinned tasks fit in the
 * time the user planned for the day.
 */
export function getOverallocation(
    user: Pick<User, 'workGoal' | 'pinnedTasks' | 'pinnedTaskMinutes'>,
    dayIndex: number,
): Overallocation | undefined {
    const allocated = getAllocatedMinutes(user.pinnedTasks ?? [], user.pinnedTaskMinutes, dayIndex);
    const goal = getDayGoal(user, dayIndex);
    return allocated > goal ? { dayIndex, allocated, goal } : undefined;
}

/**
 * Scales the pinned tasks' minutes on the given day down so they fit in the goal.
 * Each task keeps its share of the day, rounded down to 5 minutes, and keeps at
 * least 5 minutes so it stays on the plan. If that is still over the goal (more
 * tasks than 5-minute slots), the later tasks are dropped from the day.
 * @returns A new pinned task minutes map; the input is not changed.
 */
export function trimPinnedMinutes(
    pinnedTaskIds: string[],
    pinnedTaskMinutes: Record<string, number[]>,
    dayIndex: number,
    goal: number,
): Record<string, number[]> {
    const result: Record<string, number[]> = {};
    for (const [id, minutes] of Object.entries(pinnedTaskMinutes)) {
        result[id] = [...minutes];
    }

    const ids = pinnedTaskIds.filter((id) => (result[id]?.[dayIndex] ?? 0) > 0);
    const allocated = ids.reduce((sum, id) => sum + result[id][dayIndex], 0);
    if (allocated <= goal) {
        return result;
    }

    let remaining = goal;
    for (const id of ids) {
        const share = Math.floor((result[id][dayIndex] * goal) / allocated / 5) * 5;
        const minutes = Math.min(Math.max(5, share), remaining);
        result[id][dayIndex] = minutes;
        remaining -= minutes;
    }
    return result;
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
