import { TimelineEntry } from '@/database/timeline';
import { GameScheduleEntry } from '@/database/user';
import {
    getUpcomingGameSchedule,
    SCHEDULE_CLASSICAL_GAME_TASK_ID,
    SuggestedTask,
} from '../suggestedTasks';

/**
 * Counts today's tasks and how many are done. A task with a time goal is done once
 * its goal is met. Scheduling a game is a card of its own with no time to log: it
 * counts as a task, and it is done once a game is on the calendar.
 * @returns The number of tasks and the number done.
 */
export function getTodaySummary({
    suggestions,
    timeline,
    startDate,
    endDate,
    gameSchedule,
}: {
    suggestions: SuggestedTask[];
    timeline: TimelineEntry[];
    startDate: string;
    endDate: string;
    gameSchedule?: GameScheduleEntry[];
}): { taskCount: number; doneCount: number } {
    const timed = suggestions.filter(
        (s) => s.goalMinutes > 0 && s.task.id !== SCHEDULE_CLASSICAL_GAME_TASK_ID,
    );
    const hasScheduleTask = suggestions.some((s) => s.task.id === SCHEDULE_CLASSICAL_GAME_TASK_ID);
    const scheduleDone = hasScheduleTask && getUpcomingGameSchedule(gameSchedule).length > 0;

    const timedDone = timed.filter((s) => {
        let worked = 0;
        for (const entry of timeline) {
            const date = entry.date || entry.createdAt;
            if (entry.requirementId === s.task.id && date >= startDate && date < endDate) {
                worked += entry.minutesSpent;
            }
        }
        return worked >= s.goalMinutes;
    }).length;

    return {
        taskCount: timed.length + (hasScheduleTask ? 1 : 0),
        doneCount: timedDone + (scheduleDone ? 1 : 0),
    };
}
