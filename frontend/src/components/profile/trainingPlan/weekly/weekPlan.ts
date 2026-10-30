import { CustomTask, Requirement, RequirementCategory } from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { SCHEDULE_CLASSICAL_GAME_TASK_ID } from '../suggestedTasks';

/** One day's column in the weekly grid. */
export interface WeekDay {
    /** The day of the week, where Sunday is 0. */
    dayIndex: number;
    /** The ISO start of the day. */
    start: string;
    /** The ISO end of the day (exclusive). */
    end: string;
    /** Whether the day is today. */
    isToday: boolean;
    /** Whether the day has already ended. */
    isPast: boolean;
}

/** A task's plan and progress on one day. */
export interface WeekCell {
    /** The suggested minutes for the day, or 0 when the task was not planned. */
    goalMinutes: number;
    /** The minutes logged on the day. */
    workedMinutes: number;
}

/** One task's row in the weekly grid. */
export interface WeekRow {
    task: Requirement | CustomTask;
    /** The cells for the task, in the same order as the week's days. */
    cells: WeekCell[];
}

/** The state a task is in on one day. */
type CellState = 'none' | 'done' | 'missed' | 'pending' | 'extra';

export function getCellState(cell: WeekCell, day: WeekDay): CellState {
    if (cell.goalMinutes === 0) {
        return cell.workedMinutes > 0 ? 'extra' : 'none';
    }
    if (cell.workedMinutes >= cell.goalMinutes) {
        return 'done';
    }
    return day.isPast ? 'missed' : 'pending';
}

/**
 * Returns the days of the week containing startDate, in the order the user's week
 * starts on.
 */
export function getWeekDays(startDate: string, weekStart: number, now = new Date()): WeekDay[] {
    const nowIso = now.toISOString();
    return Array.from({ length: 7 }, (_, i) => {
        const dayIndex = (i + weekStart) % 7;
        const start = getDayOfWeekAfterDate(new Date(startDate), dayIndex);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        const endIso = end.toISOString();
        return {
            dayIndex,
            start,
            end: endIso,
            isToday: start <= nowIso && nowIso < endIso,
            isPast: endIso <= nowIso,
        };
    });
}

/**
 * Builds one row per task that is planned, pinned or worked on during the week.
 * Rows are ordered by the first day the task appears.
 */
export function getWeekRows({
    weekDays,
    suggestionsByDay,
    timeline,
    pinnedTaskIds,
    findTask,
}: {
    weekDays: WeekDay[];
    suggestionsByDay: { task: Requirement | CustomTask; goalMinutes: number }[][];
    timeline: TimelineEntry[];
    pinnedTaskIds: Set<string>;
    findTask: (id: string) => Requirement | CustomTask | undefined;
}): WeekRow[] {
    const rows = new Map<string, WeekRow>();
    const getRow = (task: Requirement | CustomTask) => {
        let row = rows.get(task.id);
        if (!row) {
            row = {
                task,
                cells: weekDays.map(() => ({ goalMinutes: 0, workedMinutes: 0 })),
            };
            rows.set(task.id, row);
        }
        return row;
    };

    weekDays.forEach((day, i) => {
        for (const suggestion of suggestionsByDay[day.dayIndex] ?? []) {
            // The schedule-a-game suggestion is a placeholder with no real task behind it.
            if (suggestion.task.id === SCHEDULE_CLASSICAL_GAME_TASK_ID) {
                continue;
            }
            if (suggestion.goalMinutes > 0 || pinnedTaskIds.has(suggestion.task.id)) {
                getRow(suggestion.task).cells[i].goalMinutes += suggestion.goalMinutes;
            }
        }
    });

    for (const entry of timeline) {
        const date = entry.date || entry.createdAt;
        const i = weekDays.findIndex((day) => date >= day.start && date < day.end);
        if (i < 0) {
            continue;
        }
        const task = rows.get(entry.requirementId)?.task ?? findTask(entry.requirementId);
        if (task) {
            getRow(task).cells[i].workedMinutes += entry.minutesSpent;
        }
    }

    // Map preserves insertion order, which is already by first appearance: planned
    // tasks were inserted day by day, and extra tasks after them.
    return [...rows.values()];
}

function getDayOfWeekAfterDate(reference: Date, day: number): string {
    reference.setHours(0, 0, 0, 0);
    if (reference.getDay() < day) {
        reference.setDate(reference.getDate() + day - reference.getDay());
    } else if (reference.getDay() > day) {
        reference.setDate(reference.getDate() + 7 - reference.getDay() + day);
    }
    return reference.toISOString();
}

/** How a task line should be drawn for one day. */
interface ChipDisplay {
    state: CellState;
    /** Drawn as done: green, with a check. Unplanned time counts as done. */
    looksDone: boolean;
    /** Which time to show: the plan, unplanned time as "+40m", progress, or none. */
    timeKind: 'goal' | 'extra' | 'partial' | 'none';
    /** How much of the line to fill, from 0 to 100, for partly done tasks. */
    percent: number;
}

/**
 * Returns how to draw a task's line on one day. A planned task with some but not
 * all of its time logged is filled in proportion, on any day. Unplanned time shows
 * as done; on past days its amount is left off, since it is history.
 */
export function getChipDisplay(cell: WeekCell, day: WeekDay): ChipDisplay {
    const state = getCellState(cell, day);
    const isPartial = (state === 'pending' || state === 'missed') && cell.workedMinutes > 0;
    return {
        state,
        looksDone: state === 'done' || state === 'extra',
        timeKind:
            state === 'extra' ? (day.isPast ? 'none' : 'extra') : isPartial ? 'partial' : 'goal',
        percent:
            isPartial && cell.goalMinutes > 0
                ? Math.min(100, (100 * cell.workedMinutes) / cell.goalMinutes)
                : 0,
    };
}

/** The order categories are listed in, matching the full training plan. */
const CATEGORY_ORDER: string[] = [
    RequirementCategory.Welcome,
    RequirementCategory.Games,
    RequirementCategory.Tactics,
    RequirementCategory.Middlegames,
    RequirementCategory.Endgame,
    RequirementCategory.Opening,
    RequirementCategory.Graduation,
    RequirementCategory.NonDojo,
];

/** A category's expected and logged time for the week. */
export interface CategoryTotal {
    category: RequirementCategory;
    goalMinutes: number;
    workedMinutes: number;
}

/**
 * Totals the week's planned and logged time by category, in the order of the full
 * training plan. Time logged on a task that wasn't planned still counts toward its
 * category: the training happened.
 */
export function getCategoryTotals(rows: WeekRow[]): CategoryTotal[] {
    const totals = new Map<RequirementCategory, CategoryTotal>();
    for (const row of rows) {
        const category = row.task.category;
        let total = totals.get(category);
        if (!total) {
            total = { category, goalMinutes: 0, workedMinutes: 0 };
            totals.set(category, total);
        }
        for (const cell of row.cells) {
            total.goalMinutes += cell.goalMinutes;
            total.workedMinutes += cell.workedMinutes;
        }
    }
    const rank = (c: string) => {
        const i = CATEGORY_ORDER.indexOf(c);
        return i < 0 ? CATEGORY_ORDER.length : i;
    };
    return [...totals.values()]
        .filter((t) => t.goalMinutes > 0 || t.workedMinutes > 0)
        .sort((a, b) => rank(a.category) - rank(b.category));
}
