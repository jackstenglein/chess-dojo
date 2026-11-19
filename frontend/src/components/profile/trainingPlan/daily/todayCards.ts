import {
    CustomTask,
    getTotalCount,
    isComplete,
    Requirement,
    RequirementCategory,
    ScoreboardDisplay,
} from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { GameScheduleEntry, User } from '@/database/user';
import {
    getUpcomingGameSchedule,
    MINIMUM_TASKS,
    SCHEDULE_CLASSICAL_GAME_TASK_ID,
    SuggestedTask,
} from '../suggestedTasks';
import { taskDisplayName } from '../taskDisplayName';
import { splitDisplayName } from '../taskVerb';
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

/**
 * Returns whether the task is simply done or not done, like the Welcome to the
 * Dojo tasks, guides or a single checkbox, rather than measured by time logged.
 * @param task The task.
 * @param cohort The cohort to count the task's checkboxes in.
 */
export function isCheckOffTask(task: Requirement | CustomTask, cohort: string): boolean {
    return (
        task.category === RequirementCategory.Welcome ||
        isGuideTask(task, cohort) ||
        (task.scoreboardDisplay === ScoreboardDisplay.Checkbox &&
            getTotalCount(cohort, task, true) <= 1)
    );
}

/**
 * Returns whether the task is a guide to read, like "Read Tactics Guide".
 * @param task The task.
 * @param cohort The cohort used for the task's display name.
 */
export function isGuideTask(task: Requirement | CustomTask, cohort: string): boolean {
    return splitDisplayName(taskDisplayName({ task, cohort })).verb === 'guide';
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
    showSuggestions = true,
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
    /** Whether to include the plan's suggestions; if not, only pinned and logged tasks. */
    showSuggestions?: boolean;
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
        .filter((t) =>
            showSuggestions
                ? t.task.id === SCHEDULE_CLASSICAL_GAME_TASK_ID ||
                  t.goalMinutes > 0 ||
                  pinnedTaskIds.has(t.task.id)
                : pinnedTaskIds.has(t.task.id),
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
                    : isCheckOffTask(suggestion.task, user.dojoCohort)
                      ? isTaskFinished(user, suggestion.task, timeline)
                      : isDailyTaskDone(
                            workedByTask.get(suggestion.task.id) ?? 0,
                            suggestion.goalMinutes,
                            isTaskFinished(user, suggestion.task, timeline),
                        ),
        }));
    // Tasks still to do come first, then the ones done; within each, planned tasks
    // before unplanned ones. Planned tasks keep their planned order (the sort is
    // stable); unplanned ones go from the least time logged today to the most.
    const rank = (card: TodayCard) => (card.done ? 2 : 0) + (card.planned ? 0 : 1);
    const logged = (card: TodayCard) => workedByTask.get(card.suggestion.task.id) ?? 0;
    return cards.sort((a, b) => rank(a) - rank(b) || (a.planned ? 0 : logged(a) - logged(b)));
}
