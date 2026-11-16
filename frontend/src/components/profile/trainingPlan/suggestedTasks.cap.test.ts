import {
    Requirement,
    RequirementCategory,
    RequirementStatus,
    ScoreboardDisplay,
} from '@/database/requirement';
import { SubscriptionStatus, User } from '@/database/user';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskSuggestionAlgorithm } from './suggestedTasks';

const cohort = '1000-1100';
const todayIndex = 2;

function createRequirement(id: string, category: RequirementCategory): Requirement {
    return {
        id,
        status: RequirementStatus.Active,
        category,
        name: id,
        description: '',
        freeDescription: '',
        counts: { [cohort]: 1 },
        startCount: 0,
        numberOfCohorts: -1,
        unitScore: 1,
        totalScore: 0,
        scoreboardDisplay: ScoreboardDisplay.ProgressBar,
        progressBarSuffix: 'tasks',
        updatedAt: '2026-09-01T00:00:00.000Z',
        sortPriority: id,
        expirationDays: -1,
        isFree: true,
        atomic: false,
        expectedMinutes: 30,
    };
}

function createUser(overrides: Partial<User> = {}): User {
    return {
        username: 'test-user',
        dojoCohort: cohort,
        progress: {},
        weekStart: 0,
        subscriptionStatus: SubscriptionStatus.Subscribed,
        ...overrides,
    } as User;
}

describe('TaskSuggestionAlgorithm suggestion cap', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 8, 15, 12));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('limits automatic suggestions when a saved task is retained', () => {
        const completed = createRequirement('completed', RequirementCategory.Games);
        const requirements = [
            completed,
            createRequirement('games', RequirementCategory.Games),
            createRequirement('tactics', RequirementCategory.Tactics),
            createRequirement('middlegames', RequirementCategory.Middlegames),
        ];
        const tasks = new Array(7).fill(0).map(() => [] as { id: string; minutes: number }[]);
        tasks[todayIndex] = [{ id: completed.id, minutes: 60 }];
        const user = createUser({
            progress: {
                [completed.id]: {
                    requirementId: completed.id,
                    counts: { [cohort]: 1 },
                    minutesSpent: { [cohort]: 60 },
                    updatedAt: '2026-09-15T10:00:00.000Z',
                },
            },
            weeklyPlan: {
                endDate: '2026-09-21T00:00:00.000Z',
                tasks,
                progressUpdatedAt: '2026-09-14T10:00:00.000Z',
                pinnedTasks: [],
                nextGame: '',
            },
        });

        const result = new TaskSuggestionAlgorithm(
            user,
            requirements,
            requirements,
            [],
        ).getWeeklySuggestions();

        const todaySuggestions = result.suggestionsByDay[todayIndex];
        expect(todaySuggestions).toHaveLength(3);
        expect(todaySuggestions.map(({ task }) => task.id)).toContain(completed.id);
    });

    it('keeps all explicitly pinned tasks when there are more than the automatic cap', () => {
        const requirements = [
            createRequirement('games', RequirementCategory.Games),
            createRequirement('tactics', RequirementCategory.Tactics),
            createRequirement('middlegames', RequirementCategory.Middlegames),
            createRequirement('endgame', RequirementCategory.Endgame),
        ];
        const user = createUser({ pinnedTasks: requirements.map((task) => task.id) });

        const result = new TaskSuggestionAlgorithm(
            user,
            requirements,
            requirements,
            [],
        ).getWeeklySuggestions();

        expect(result.suggestionsByDay[todayIndex].map(({ task }) => task.id)).toEqual(
            requirements.map((task) => task.id),
        );
    });
});

describe('TaskSuggestionAlgorithm pinned task time', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 8, 15, 12));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const categories = [
        RequirementCategory.Games,
        RequirementCategory.Tactics,
        RequirementCategory.Middlegames,
        RequirementCategory.Endgame,
        RequirementCategory.Opening,
    ];

    function planToday(pinnedCount: number, goal: number, extra: Requirement[] = []) {
        const pinned = Array.from({ length: pinnedCount }, (_, i) =>
            createRequirement(`pinned-${i}`, categories[i % categories.length]),
        );
        const requirements = [...pinned, ...extra];
        const user = createUser({
            pinnedTasks: pinned.map((t) => t.id),
            workGoal: { minutesPerDay: new Array<number>(7).fill(goal) },
        });
        const result = new TaskSuggestionAlgorithm(
            user,
            requirements,
            requirements,
            [],
        ).getWeeklySuggestions();
        return result.suggestionsByDay[todayIndex].map(({ task, goalMinutes }) => ({
            id: task.id,
            goalMinutes,
        }));
    }

    it.each([
        [4, 60, [15, 15, 15, 15]],
        [4, 90, [25, 25, 20, 20]],
        [5, 120, [25, 25, 25, 25, 20]],
        [3, 60, [20, 20, 20]],
    ])('gives all %i pinned tasks time within a %i minute goal', (count, goal, minutes) => {
        const today = planToday(count, goal);
        expect(today.map((s) => s.goalMinutes)).toEqual(minutes);
        expect(today.reduce((sum, s) => sum + s.goalMinutes, 0)).toBe(goal);
    });

    it('gives pinned tasks time before suggested tasks', () => {
        const today = planToday(2, 60, [
            createRequirement('suggested', RequirementCategory.Endgame),
        ]);
        expect(today.filter((s) => s.goalMinutes > 0).map((s) => s.id)).toEqual([
            'pinned-0',
            'pinned-1',
        ]);
    });

    it('keeps the minutes set on scheduled pins even past the day goal', () => {
        const scheduled = createRequirement('scheduled', RequirementCategory.Tactics);
        const unscheduled = createRequirement('unscheduled', RequirementCategory.Endgame);
        const suggested = createRequirement('suggested', RequirementCategory.Opening);
        const requirements = [scheduled, unscheduled, suggested];
        const user = createUser({
            pinnedTasks: [scheduled.id, unscheduled.id],
            pinnedTaskMinutes: { [scheduled.id]: new Array<number>(7).fill(90) },
            workGoal: { minutesPerDay: new Array<number>(7).fill(60) },
        });
        const result = new TaskSuggestionAlgorithm(
            user,
            requirements,
            requirements,
            [],
        ).getWeeklySuggestions();
        expect(
            result.suggestionsByDay[todayIndex].map(({ task, goalMinutes }) => [
                task.id,
                goalMinutes,
            ]),
        ).toEqual([
            ['scheduled', 90],
            ['unscheduled', 30],
        ]);
    });

    it('leaves a rest day empty', () => {
        expect(planToday(2, 0).every((s) => s.goalMinutes === 0)).toBe(true);
    });

    it.each([
        [25, 'pinA:25 pinB:25 suggested:10'],
        [30, 'pinA:30 pinB:30'],
        [28, 'pinA:28 pinB:28'],
    ])('only plans a suggested task with at least 10 minutes left (pins at %im)', (pin, plan) => {
        const requirements = [
            createRequirement('pinA', RequirementCategory.Tactics),
            createRequirement('pinB', RequirementCategory.Endgame),
            createRequirement('suggested', RequirementCategory.Opening),
        ];
        const user = createUser({
            pinnedTasks: ['pinA', 'pinB'],
            pinnedTaskMinutes: {
                pinA: new Array<number>(7).fill(pin),
                pinB: new Array<number>(7).fill(pin),
            },
            workGoal: { minutesPerDay: new Array<number>(7).fill(60) },
        });
        const result = new TaskSuggestionAlgorithm(
            user,
            requirements,
            requirements,
            [],
        ).getWeeklySuggestions();
        expect(
            result.suggestionsByDay[todayIndex]
                .filter(({ goalMinutes }) => goalMinutes > 0)
                .map(({ task, goalMinutes }) => `${task.id}:${goalMinutes}`)
                .join(' '),
        ).toBe(plan);
    });

    it('keeps a pinned task from another cohort when the saved plan is reloaded', () => {
        const pins = [
            RequirementCategory.Games,
            RequirementCategory.Tactics,
            RequirementCategory.Middlegames,
            RequirementCategory.Endgame,
        ].map((category, i) => createRequirement(`pin${i}`, category));
        // The last pin is not in the user's cohort.
        const cohortRequirements = pins.slice(0, 3);
        const pinnedTaskMinutes = Object.fromEntries(
            pins.map((p) => [p.id, new Array<number>(7).fill(30)]),
        );
        const settings = {
            pinnedTasks: pins.map((p) => p.id),
            pinnedTaskMinutes,
            workGoal: { minutesPerDay: new Array<number>(7).fill(120) },
        };

        const first = new TaskSuggestionAlgorithm(
            createUser(settings),
            cohortRequirements,
            pins,
            [],
        ).getWeeklySuggestions();
        const reloaded = new TaskSuggestionAlgorithm(
            createUser({
                ...settings,
                weeklyPlan: {
                    endDate: first.endDate,
                    tasks: first.suggestionsByDay.map((day) =>
                        day.map((s) => ({ id: s.task.id, minutes: s.goalMinutes })),
                    ),
                    progressUpdatedAt: first.progressUpdatedAt,
                    nextGame: first.nextGame,
                    pinnedTasks: settings.pinnedTasks,
                    pinnedTaskMinutes,
                },
            }),
            cohortRequirements,
            pins,
            [],
        ).getWeeklySuggestions();

        for (const day of [todayIndex, todayIndex + 1]) {
            expect(reloaded.suggestionsByDay[day].map((s) => s.task.id)).toEqual([
                'pin0',
                'pin1',
                'pin2',
                'pin3',
            ]);
        }
    });
});
