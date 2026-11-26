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
