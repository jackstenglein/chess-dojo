import {
    Requirement,
    RequirementCategory,
    RequirementStatus,
    ScoreboardDisplay,
} from '@/database/requirement';
import { SubscriptionStatus, User } from '@/database/user';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDefaultLogMinutes } from './pinSchedule';
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

describe('getDefaultLogMinutes', () => {
    const user = createUser({
        pinnedTasks: ['pinned'],
        pinnedTaskMinutes: { pinned: minutesOn(MONDAY, 45) },
    });

    it('uses the time planned for the task today', () => {
        const today = [{ task: { id: 'pinned' }, goalMinutes: 20 }];
        expect(getDefaultLogMinutes('pinned', today, user, MONDAY)).toBe(20);
    });

    it("falls back to the pin's minutes for today", () => {
        expect(getDefaultLogMinutes('pinned', [], user, MONDAY)).toBe(45);
    });

    it('falls back to 30 minutes otherwise', () => {
        expect(getDefaultLogMinutes('pinned', [], user, TUESDAY)).toBe(30);
        expect(getDefaultLogMinutes('other', undefined, user, MONDAY)).toBe(30);
        const unplanned = [{ task: { id: 'other' }, goalMinutes: 0 }];
        expect(getDefaultLogMinutes('other', unplanned, user, MONDAY)).toBe(30);
    });
});
