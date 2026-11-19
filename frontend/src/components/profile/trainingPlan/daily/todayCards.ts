import { CustomTask, isComplete, Requirement } from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { GameScheduleEntry, User } from '@/database/user';
import {
    getUpcomingGameSchedule,
    MINIMUM_TASKS,
    SCHEDULE_CLASSICAL_GAME_TASK_ID,
    SuggestedTask,
} from '../suggestedTasks';
import { isDailyTaskDone } from './DailyCard';

/**
 * Returns whether the task itself is finished, e.g. a checkbox task that was
 * checked off. Tasks that are minimums (like playing classical games) never are.
 * @param user The user.
 * @param task The task.
 * @param timeline The user's timeline, for yearly tasks.
 */
export function isTaskFinished(
    user: Pick<User, 'dojoCohort' | 'progress'>,
    task: Requirement | CustomTask,
    timeline: TimelineEntry[],
): boolean {
    return (
        !MINIMUM_TASKS.has(task.id) &&
        isComplete(user.dojoCohort, task, user.progress[task.id], timeline, true)
    );
}

/** A card on Today: the task, whether it was planned for today, and whether it is done. */
export interface TodayCard {
    suggestion: SuggestedTask;
    /** Whether the task had time planned today (rather than only being logged or pinned). */
    planned: boolean;
    done: boolean;
}

/**
 * Returns the cards to show on Today: the tasks still to do, then the ones done,
 * with planned tasks before unplanned ones in each (keeping the planned order
 * within each group). Cards are today's
 * suggestions with planned time, pinned tasks and tasks logged today without being
 * planned. Skipped tasks are left out: they are listed under "Skipped this week".
 */
export function getTodayCards({
    suggestions,
    extraTasks,
    pinnedTaskIds,
    skippedTaskIds,
    timeline,
    startDate,
    endDate,
    gameSchedule,
    user,
}: {
    /** Today's suggested tasks. */
    suggestions: SuggestedTask[];
    /** Tasks logged today that weren't suggested. */
    extraTasks: (Requirement | CustomTask)[];
    pinnedTaskIds: Set<string>;
    skippedTaskIds?: string[];
    timeline: TimelineEntry[];
    /** The start of today, in ISO 8601. */
    startDate: string;
    /** The start of tomorrow, in ISO 8601. */
    endDate: string;
    gameSchedule?: GameScheduleEntry[];
    /** The user, to tell which tasks are already finished. */
    user: Pick<User, 'dojoCohort' | 'progress'>;
}): TodayCard[] {
    const workedByTask = new Map<string, number>();
    for (const entry of timeline) {
        const date = entry.date || entry.createdAt;
        if (date >= startDate && date < endDate) {
            workedByTask.set(
                entry.requirementId,
                (workedByTask.get(entry.requirementId) ?? 0) + entry.minutesSpent,
            );
        }
    }
    const gameScheduled = getUpcomingGameSchedule(gameSchedule).length > 0;

    const cards = suggestions
        .filter(
            (t) =>
                t.task.id === SCHEDULE_CLASSICAL_GAME_TASK_ID ||
                t.goalMinutes > 0 ||
                pinnedTaskIds.has(t.task.id),
        )
        .concat(extraTasks.map((task) => ({ task, goalMinutes: 0 })))
        .filter((suggestion) => !skippedTaskIds?.includes(suggestion.task.id))
        .map((suggestion) => ({
            suggestion,
            planned:
                suggestion.goalMinutes > 0 ||
                suggestion.task.id === SCHEDULE_CLASSICAL_GAME_TASK_ID,
            done:
                suggestion.task.id === SCHEDULE_CLASSICAL_GAME_TASK_ID
                    ? gameScheduled
                    : isDailyTaskDone(
                          workedByTask.get(suggestion.task.id) ?? 0,
                          suggestion.goalMinutes,
                          isTaskFinished(user, suggestion.task, timeline),
                      ),
        }));
    // Tasks still to do come first, then the ones done; within each, planned tasks
    // before unplanned ones. A stable sort keeps the planned order in a group.
    const rank = (card: TodayCard) => (card.done ? 2 : 0) + (card.planned ? 0 : 1);
    return cards.sort((a, b) => rank(a) - rank(b));
}
