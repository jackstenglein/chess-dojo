import {
    Requirement,
    RequirementCategory,
    RequirementStatus,
    ScoreboardDisplay,
} from '@/database/requirement';
import { SubscriptionStatus, User } from '@/database/user';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getOverallocation, trimPinnedMinutes } from './pinSchedule';
import { TaskSuggestionAlgorithm } from './suggestedTasks';

const cohort = '1000-1100';
const MONDAY = 1;
const TUESDAY = 2;

function createRequirement(id: string, category: RequirementCategory): Requirement {
    return {
        id,
        status: RequirementStatus.Active,
        category,
        name: id,
        dailyName: id,
        description: '',
        freeDescription: '',
        counts: { [cohort]: 30 },
        startCount: 0,
        numberOfCohorts: -1,
        unitScore: 1,
        totalScore: 0,
        scoreboardDisplay: ScoreboardDisplay.ProgressBar,
        progressBarSuffix: '',
        updatedAt: '2026-09-01T00:00:00.000Z',
        sortPriority: id,
        expirationDays: -1,
        isFree: true,
        atomic: false,
        expectedMinutes: 30,
    };
}

const pinned = createRequirement('pinned', RequirementCategory.Tactics);
const requirements = [
    pinned,
    createRequirement('games', RequirementCategory.Games),
    createRequirement('middlegames', RequirementCategory.Middlegames),
    createRequirement('endgame', RequirementCategory.Endgame),
    createRequirement('opening', RequirementCategory.Opening),
];

function minutesOn(day: number, minutes: number): number[] {
    const result = [0, 0, 0, 0, 0, 0, 0];
    result[day] = minutes;
    return result;
}

function createUser(overrides: Partial<User> = {}): User {
    return {
        username: 'test-user',
        dojoCohort: cohort,
        progress: {},
        weekStart: 0,
        subscriptionStatus: SubscriptionStatus.Subscribed,
        workGoal: { minutesPerDay: [60, 60, 60, 60, 60, 60, 60] },
        ...overrides,
    } as User;
}

function planFor(user: User, day: number) {
    const result = new TaskSuggestionAlgorithm(
        user,
        requirements,
        requirements,
        [],
    ).getWeeklySuggestions();
    return result.suggestionsByDay[day].map((s) => ({ id: s.task.id, minutes: s.goalMinutes }));
}

describe('scheduled pinned tasks', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // A Monday.
        vi.setSystemTime(new Date(2026, 8, 14, 12));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('fills the whole day with a pinned task that takes all of its time', () => {
        const user = createUser({
            pinnedTasks: [pinned.id],
            pinnedTaskMinutes: { [pinned.id]: minutesOn(MONDAY, 60) },
        });

        expect(planFor(user, MONDAY)).toEqual([{ id: pinned.id, minutes: 60 }]);
    });

    it('suggests tasks only for the time the pinned tasks leave free', () => {
        const user = createUser({
            pinnedTasks: [pinned.id],
            pinnedTaskMinutes: { [pinned.id]: minutesOn(MONDAY, 30) },
            workGoal: { minutesPerDay: [90, 90, 90, 90, 90, 90, 90] },
        });

        const plan = planFor(user, MONDAY);
        expect(plan[0]).toEqual({ id: pinned.id, minutes: 30 });
        expect(plan).toHaveLength(3);
        expect(plan.slice(1).every((t) => t.minutes === 30)).toBe(true);
    });

    it('leaves a pinned task off the days it has no time', () => {
        const user = createUser({
            pinnedTasks: [pinned.id],
            pinnedTaskMinutes: { [pinned.id]: minutesOn(TUESDAY, 30) },
        });

        expect(planFor(user, MONDAY).map((t) => t.id)).not.toContain(pinned.id);
        expect(planFor(user, TUESDAY)).toContainEqual({ id: pinned.id, minutes: 30 });
    });

    it('keeps the pinned time when it is more than the day allows', () => {
        const user = createUser({
            pinnedTasks: [pinned.id],
            pinnedTaskMinutes: { [pinned.id]: minutesOn(MONDAY, 120) },
        });

        expect(planFor(user, MONDAY)).toEqual([{ id: pinned.id, minutes: 120 }]);
    });

    it('still shares the day with a pinned task that has no schedule', () => {
        const user = createUser({ pinnedTasks: [pinned.id] });

        const plan = planFor(user, MONDAY);
        expect(plan[0].id).toBe(pinned.id);
        expect(plan.reduce((sum, t) => sum + t.minutes, 0)).toBe(60);
    });
});

describe('getOverallocation', () => {
    it('reports a day whose pinned tasks need more than the planned time', () => {
        const user = createUser({
            pinnedTasks: ['a', 'b'],
            pinnedTaskMinutes: { a: minutesOn(MONDAY, 45), b: minutesOn(MONDAY, 45) },
        });

        expect(getOverallocation(user, MONDAY)).toEqual({
            dayIndex: MONDAY,
            allocated: 90,
            goal: 60,
        });
        expect(getOverallocation(user, TUESDAY)).toBeUndefined();
    });

    it('ignores minutes left behind by an unpinned task', () => {
        const user = createUser({
            pinnedTasks: ['a'],
            pinnedTaskMinutes: { a: minutesOn(MONDAY, 30), b: minutesOn(MONDAY, 90) },
        });

        expect(getOverallocation(user, MONDAY)).toBeUndefined();
    });
});

describe('trimPinnedMinutes', () => {
    it('scales each task down to its share of the day', () => {
        const result = trimPinnedMinutes(
            ['a', 'b'],
            { a: minutesOn(MONDAY, 60), b: minutesOn(MONDAY, 30) },
            MONDAY,
            60,
        );

        expect(result.a[MONDAY]).toBe(40);
        expect(result.b[MONDAY]).toBe(20);
    });

    it('never goes over the day and leaves other days alone', () => {
        const a = minutesOn(MONDAY, 50);
        a[TUESDAY] = 90;
        const result = trimPinnedMinutes(
            ['a', 'b', 'c'],
            { a, b: minutesOn(MONDAY, 50), c: minutesOn(MONDAY, 50) },
            MONDAY,
            10,
        );

        expect(result.a[MONDAY] + result.b[MONDAY] + result.c[MONDAY]).toBeLessThanOrEqual(10);
        expect(result.a[TUESDAY]).toBe(90);
    });
});
