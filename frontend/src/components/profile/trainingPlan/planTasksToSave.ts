import { WeeklyPlan } from '@/database/user';
import { SuggestedTask } from './suggestedTasks';

/**
 * Returns the weekly plan's tasks to save. Days already past keep exactly what the
 * saved plan has for them: the past is never rebuilt, so a task the page can't
 * look up at the moment (for example while the task list is still loading) can't
 * erase what was planned on an earlier day.
 * @param savedPlan The plan currently saved, if any.
 * @param suggestionsByDay The suggestions just worked out, indexed by day of the week.
 * @param endDate The end of the current week, in ISO 8601.
 * @param now The current time.
 *
 * Today also keeps its skipped tasks (they're hidden, not shown), so restoring one
 * later the same day brings it back as it was planned.
 */
export function planTasksToSave(
    savedPlan: WeeklyPlan | undefined,
    suggestionsByDay: SuggestedTask[][],
    endDate: string,
    now = new Date(),
): WeeklyPlan['tasks'] {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const sameWeek = savedPlan?.endDate === endDate;

    const pastDays = new Set<number>();
    if (sameWeek) {
        const day = new Date(endDate);
        day.setDate(day.getDate() - 7);
        for (; day.getTime() < today.getTime(); day.setDate(day.getDate() + 1)) {
            pastDays.add(day.getDay());
        }
    }

    const skipped = new Set(savedPlan?.skippedTasks ?? []);
    return suggestionsByDay.map((day, idx) => {
        if (sameWeek && savedPlan && pastDays.has(idx)) {
            return savedPlan.tasks[idx].map((t) => ({ ...t }));
        }
        const tasks = day.map((suggestion) => ({
            id: suggestion.task.id,
            minutes: suggestion.goalMinutes,
        }));
        if (sameWeek && savedPlan && idx === today.getDay()) {
            for (const t of savedPlan.tasks[idx]) {
                if (skipped.has(t.id) && !tasks.some((task) => task.id === t.id)) {
                    tasks.push({ ...t });
                }
            }
        }
        return tasks;
    });
}
