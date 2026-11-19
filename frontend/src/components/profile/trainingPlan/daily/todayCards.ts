import { CustomTask, Requirement } from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { GameScheduleEntry } from '@/database/user';
import {
    getUpcomingGameSchedule,
    SCHEDULE_CLASSICAL_GAME_TASK_ID,
    SuggestedTask,
} from '../suggestedTasks';
import { isDailyTaskDone } from './DailyCard';

/** A card on Today: the task and whether it is done for the day. */
export interface TodayCard {
    suggestion: SuggestedTask;
    done: boolean;
}

/**
 * Returns the cards to show on Today, with the tasks still to do before the ones
 * already done (keeping the planned order within each group). Cards are today's
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
            done:
                suggestion.task.id === SCHEDULE_CLASSICAL_GAME_TASK_ID
                    ? gameScheduled
                    : isDailyTaskDone(
                          workedByTask.get(suggestion.task.id) ?? 0,
                          suggestion.goalMinutes,
                      ),
        }));
    // A stable sort keeps the planned order within each group.
    return cards.sort((a, b) => Number(a.done) - Number(b.done));
}
