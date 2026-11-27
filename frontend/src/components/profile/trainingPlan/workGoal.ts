import { WorkGoalSettings } from '@/database/user';

/** The names of the days of the week. */
export const DAY_NAMES = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
] as const;

/** The abbreivations of the days of the week. */
export const DAY_ABBREVIATIONS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** The default work goal settings if the user has not saved any. */
export const DEFAULT_WORK_GOAL: WorkGoalSettings = {
    minutesPerDay: DAY_NAMES.map(() => 60),
} as const;

/**
 * Returns the user's goal for a whole week, in minutes.
 * @param workGoal The user's work goal, or undefined to use the default.
 */
export function getWeeklyGoalMinutes(workGoal?: WorkGoalSettings): number {
    return (workGoal ?? DEFAULT_WORK_GOAL).minutesPerDay.reduce((sum, m) => sum + m, 0);
}

/**
 * Returns the user's goal for one day of the week, in minutes.
 * @param workGoal The user's work goal, or undefined to use the default.
 * @param dayIndex The day of the week (Sunday is 0).
 */
export function getDailyGoalMinutes(
    workGoal: WorkGoalSettings | undefined,
    dayIndex: number,
): number {
    return (workGoal ?? DEFAULT_WORK_GOAL).minutesPerDay[dayIndex] ?? 0;
}

/** The minimum minutes to spend per task. */
export const DEFAULT_MINUTES_PER_TASK = 30;
