import { WeeklyPlan } from '@/database/user';
import { describe, expect, it } from 'vitest';
import {
    clearUpcomingDays,
    GRADUATION_SKIP_ID,
    groupSkippedIds,
    toggleSkippedIds,
} from './skippedTasks';
import { CLASSICAL_GAMES_TASK_ID, SCHEDULE_CLASSICAL_GAME_TASK_ID } from './suggestedTasks';

describe('toggleSkippedIds', () => {
    it('skips an id that is not skipped', () => {
        expect(toggleSkippedIds(['a'], ['b'])).toEqual(['a', 'b']);
    });

    it('restores an id that is skipped', () => {
        expect(toggleSkippedIds(['a', 'b'], ['b'])).toEqual(['a']);
    });

    it('restores ids together when all of them are skipped', () => {
        expect(toggleSkippedIds(['a', 'b', 'c'], ['a', 'c'])).toEqual(['b']);
    });

    it('skips the missing ids when only some are skipped, without duplicates', () => {
        expect(toggleSkippedIds(['a'], ['a', 'b'])).toEqual(['a', 'b']);
    });
});

describe('groupSkippedIds', () => {
    it('keeps ordinary ids as their own groups', () => {
        expect(groupSkippedIds(['a', GRADUATION_SKIP_ID])).toEqual([['a'], [GRADUATION_SKIP_ID]]);
    });

    it('restores the schedule-a-game card together with classical games', () => {
        expect(
            groupSkippedIds([CLASSICAL_GAMES_TASK_ID, 'a', SCHEDULE_CLASSICAL_GAME_TASK_ID]),
        ).toEqual([['a'], [SCHEDULE_CLASSICAL_GAME_TASK_ID, CLASSICAL_GAMES_TASK_ID]]);
    });

    it('keeps classical games on its own when the schedule card was not skipped', () => {
        expect(groupSkippedIds([CLASSICAL_GAMES_TASK_ID])).toEqual([[CLASSICAL_GAMES_TASK_ID]]);
    });
});

describe('clearUpcomingDays', () => {
    const day = (i: number) => [{ id: `task-${i}`, minutes: 30 }];

    it('clears today and later days, and keeps earlier ones', () => {
        // Week of Sun 2026-09-20 to Sat 2026-09-26; today is Thursday.
        const plan = {
            endDate: new Date(2026, 8, 27).toISOString(),
            tasks: [0, 1, 2, 3, 4, 5, 6].map(day),
        } as WeeklyPlan;
        const tasks = clearUpcomingDays(plan, new Date(2026, 8, 24, 15, 0));
        expect(tasks.map((t) => t.length)).toEqual([1, 1, 1, 1, 0, 0, 0]);
    });

    it('follows the week order when the week starts on Monday', () => {
        // Week of Mon 2026-09-21 to Sun 2026-09-27; today is Saturday, so Saturday
        // and Sunday (index 0, the last day of this week) are cleared.
        const plan = {
            endDate: new Date(2026, 8, 28).toISOString(),
            tasks: [0, 1, 2, 3, 4, 5, 6].map(day),
        } as WeeklyPlan;
        const tasks = clearUpcomingDays(plan, new Date(2026, 8, 26, 9, 0));
        expect(tasks.map((t) => t.length)).toEqual([0, 1, 1, 1, 1, 1, 0]);
    });

    it('does not change the plan it was given', () => {
        const plan = {
            endDate: new Date(2026, 8, 27).toISOString(),
            tasks: [0, 1, 2, 3, 4, 5, 6].map(day),
        } as WeeklyPlan;
        clearUpcomingDays(plan, new Date(2026, 8, 24));
        expect(plan.tasks.every((t) => t.length === 1)).toBe(true);
    });
});
