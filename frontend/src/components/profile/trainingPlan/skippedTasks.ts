import { WeeklyPlan } from '@/database/user';
import { CLASSICAL_GAMES_TASK_ID, SCHEDULE_CLASSICAL_GAME_TASK_ID } from './suggestedTasks';

/** The id the graduation card uses when it is skipped. */
export const GRADUATION_SKIP_ID = 'graduation';

/**
 * Returns the skipped ids after toggling the given ids. If every one of them is
 * already skipped they are all restored; otherwise the missing ones are skipped.
 * The ids are toggled together because some cards skip more than one task at once.
 * @param current The ids currently skipped.
 * @param ids The ids to toggle.
 */
export function toggleSkippedIds(current: string[], ids: string[]): string[] {
    const skipped = new Set(current);
    if (ids.every((id) => skipped.has(id))) {
        return current.filter((id) => !ids.includes(id));
    }
    return [...current, ...ids.filter((id) => !skipped.has(id))];
}

/**
 * Groups skipped ids into the units they are restored in. Skipping the
 * schedule-a-game card also skips the classical games task, so the two are
 * restored together; every other id stands alone.
 * @param skipped The ids currently skipped.
 */
export function groupSkippedIds(skipped: string[]): string[][] {
    const groups: string[][] = [];
    const hasSchedule = skipped.includes(SCHEDULE_CLASSICAL_GAME_TASK_ID);

    for (const id of skipped) {
        if (id === SCHEDULE_CLASSICAL_GAME_TASK_ID) {
            groups.push(
                skipped.includes(CLASSICAL_GAMES_TASK_ID)
                    ? [SCHEDULE_CLASSICAL_GAME_TASK_ID, CLASSICAL_GAMES_TASK_ID]
                    : [SCHEDULE_CLASSICAL_GAME_TASK_ID],
            );
        } else if (id === CLASSICAL_GAMES_TASK_ID && hasSchedule) {
            continue;
        } else if (!groups.some((group) => group.includes(id))) {
            groups.push([id]);
        }
    }
    return groups;
}

/**
 * Returns the plan's tasks with every day from today to the end of the week
 * cleared. The suggestion algorithm refills empty days, so this is how a restored
 * task gets a chance to come back: a saved plan is otherwise only rebuilt when it
 * still contains a skipped task, which a restore never leaves behind.
 * @param plan The saved weekly plan.
 * @param now The current time.
 */
export function clearUpcomingDays(plan: WeeklyPlan, now = new Date()): WeeklyPlan['tasks'] {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const end = new Date(plan.endDate);
    const day = new Date(end);
    day.setDate(day.getDate() - 7);

    const tasks = plan.tasks.map((t) => [...t]);
    for (; day.getTime() < end.getTime(); day.setDate(day.getDate() + 1)) {
        if (day.getTime() >= today.getTime()) {
            tasks[day.getDay()] = [];
        }
    }
    return tasks;
}
