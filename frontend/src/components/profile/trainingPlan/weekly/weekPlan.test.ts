import { Requirement, RequirementCategory } from '@/database/requirement';
import { describe, expect, it } from 'vitest';
import { makeEntry, makeTask } from '../__fixtures__/tasks';
import { SCHEDULE_CLASSICAL_GAME_TASK } from '../suggestedTasks';
import {
    getCategoryTotals,
    getCellState,
    getChipDisplay,
    getWeekDays,
    getWeekRows,
    WeekCell,
    WeekDay,
} from './weekPlan';

// Week of Sunday 2026-09-20; "now" is Thursday afternoon.
const WEEK_START = new Date(2026, 8, 20).toISOString();
const NOW = new Date(2026, 8, 24, 15, 0);
const at = (day: number, hour = 12) => new Date(2026, 8, 20 + day, hour).toISOString();

const today: WeekDay = { dayIndex: 4, start: '', end: '', isToday: true, isPast: false };
const past: WeekDay = { dayIndex: 1, start: '', end: '', isToday: false, isPast: true };
const cell = (goalMinutes: number, workedMinutes: number): WeekCell => ({
    goalMinutes,
    workedMinutes,
});

describe('getWeekDays', () => {
    it('marks today and the days before it', () => {
        const days = getWeekDays(WEEK_START, 0, NOW);
        expect(days.map((d) => d.dayIndex)).toEqual([0, 1, 2, 3, 4, 5, 6]);
        expect(days.map((d) => d.isToday)).toEqual([
            false,
            false,
            false,
            false,
            true,
            false,
            false,
        ]);
        expect(days.map((d) => d.isPast)).toEqual([true, true, true, true, false, false, false]);
    });

    it('orders the days from the user week start', () => {
        const days = getWeekDays(new Date(2026, 8, 21).toISOString(), 1, NOW);
        expect(days.map((d) => d.dayIndex)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    });
});

describe('getCellState', () => {
    it('reads each combination of plan, time and day', () => {
        expect(getCellState(cell(0, 0), today)).toBe('none');
        expect(getCellState(cell(30, 0), today)).toBe('pending');
        expect(getCellState(cell(30, 10), today)).toBe('pending');
        expect(getCellState(cell(30, 30), today)).toBe('done');
        expect(getCellState(cell(30, 10), past)).toBe('missed');
        expect(getCellState(cell(0, 20), today)).toBe('extra');
    });
});

describe('getChipDisplay', () => {
    it('shows the planned time for a task not yet started', () => {
        expect(getChipDisplay(cell(30, 0), today)).toMatchObject({
            looksDone: false,
            timeKind: 'goal',
            percent: 0,
        });
    });

    it('fills a partly done task in proportion and shows its progress', () => {
        expect(getChipDisplay(cell(30, 10), today)).toMatchObject({
            looksDone: false,
            timeKind: 'partial',
        });
        expect(getChipDisplay(cell(30, 10), today).percent).toBeCloseTo(33.33, 1);
    });

    it('fills a partly done task on a past day too', () => {
        expect(getChipDisplay(cell(30, 15), past)).toMatchObject({
            timeKind: 'partial',
            percent: 50,
        });
    });

    it('shows a finished task as done with no fill', () => {
        expect(getChipDisplay(cell(30, 45), today)).toMatchObject({
            looksDone: true,
            timeKind: 'goal',
            percent: 0,
        });
    });

    it('shows unplanned time as done, with its amount only on current days', () => {
        expect(getChipDisplay(cell(0, 20), today)).toMatchObject({
            looksDone: true,
            timeKind: 'extra',
        });
        expect(getChipDisplay(cell(0, 20), past)).toMatchObject({
            looksDone: true,
            timeKind: 'none',
        });
    });
});

describe('getWeekRows', () => {
    const polgar = makeTask({ id: 'polgar' });
    const endgame = makeTask({ id: 'endgame' });
    const extra = makeTask({ id: 'extra' });
    const weekDays = getWeekDays(WEEK_START, 0, NOW);
    const suggestionsByDay = [
        [],
        [{ task: polgar, goalMinutes: 30 }],
        [
            { task: polgar, goalMinutes: 30 },
            { task: endgame, goalMinutes: 30 },
        ],
        [{ task: SCHEDULE_CLASSICAL_GAME_TASK, goalMinutes: 0 }],
        [{ task: endgame, goalMinutes: 0 }],
        [],
        [],
    ];
    const findTask = (id: string) => [polgar, endgame, extra].find((t) => t.id === id);

    it('builds one row per task with its plan and time for each day', () => {
        const rows = getWeekRows({
            weekDays,
            suggestionsByDay,
            timeline: [makeEntry('polgar', at(1), 20), makeEntry('extra', at(1), 40)],
            pinnedTaskIds: new Set(),
            findTask,
        });

        expect(rows.map((r) => r.task.id)).toEqual(['polgar', 'endgame', 'extra']);
        expect(rows[0].cells.map((c) => c.goalMinutes)).toEqual([0, 30, 30, 0, 0, 0, 0]);
        expect(rows[0].cells[1].workedMinutes).toBe(20);
        expect(rows[2].cells[1]).toEqual({ goalMinutes: 0, workedMinutes: 40 });
    });

    it('leaves out the schedule-a-game placeholder', () => {
        const rows = getWeekRows({
            weekDays,
            suggestionsByDay,
            timeline: [],
            pinnedTaskIds: new Set(),
            findTask,
        });
        expect(rows.some((r) => r.task.id === SCHEDULE_CLASSICAL_GAME_TASK.id)).toBe(false);
    });

    it('keeps a pinned task that has no time on a day', () => {
        const rows = getWeekRows({
            weekDays,
            suggestionsByDay: [[], [], [], [], [{ task: extra, goalMinutes: 0 }], [], []],
            timeline: [],
            pinnedTaskIds: new Set(['extra']),
            findTask,
        });
        expect(rows.map((r) => r.task.id)).toEqual(['extra']);
    });

    it('ignores time logged outside the week', () => {
        const rows = getWeekRows({
            weekDays,
            suggestionsByDay,
            timeline: [makeEntry('polgar', at(-3), 60)],
            pinnedTaskIds: new Set(),
            findTask,
        });
        expect(rows[0].cells.every((c) => c.workedMinutes === 0)).toBe(true);
    });
});

describe('getCategoryTotals', () => {
    const tactics1 = makeTask({ id: 't1', category: RequirementCategory.Tactics });
    const tactics2 = makeTask({ id: 't2', category: RequirementCategory.Tactics });
    const opening = makeTask({ id: 'o1', category: RequirementCategory.Opening });
    const games = makeTask({ id: 'g1', category: RequirementCategory.Games });
    const row = (task: Requirement, cells: [number, number][]) => ({
        task,
        cells: cells.map(([goalMinutes, workedMinutes]) => ({ goalMinutes, workedMinutes })),
    });

    it('adds up each category across its tasks and days, in plan order', () => {
        const totals = getCategoryTotals([
            row(opening, [[30, 0]]),
            row(tactics1, [
                [30, 30],
                [30, 10],
            ]),
            row(tactics2, [[45, 0]]),
            row(games, [[0, 40]]),
        ]);
        expect(totals).toEqual([
            { category: RequirementCategory.Games, goalMinutes: 0, workedMinutes: 40 },
            { category: RequirementCategory.Tactics, goalMinutes: 105, workedMinutes: 40 },
            { category: RequirementCategory.Opening, goalMinutes: 30, workedMinutes: 0 },
        ]);
    });

    it('leaves out a category with nothing planned or logged', () => {
        expect(getCategoryTotals([row(opening, [[0, 0]])])).toEqual([]);
    });
});
