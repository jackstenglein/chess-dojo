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

function createRequirement(id: string, status: RequirementStatus): Requirement {
    return {
        id,
        status,
        category: RequirementCategory.Games,
        name: 'Play Blundergames',
        dailyName: 'Play Blundergames - {{time}}',
        description: '',
        freeDescription: '',
        counts: { [cohort]: 30 },
        startCount: 0,
        numberOfCohorts: -1,
        unitScore: 1,
        totalScore: 0,
        scoreboardDisplay: ScoreboardDisplay.ProgressBar,
        progressBarSuffix: 'games',
        updatedAt: '2026-09-01T00:00:00.000Z',
        sortPriority: id,
        expirationDays: -1,
        isFree: true,
        atomic: false,
        expectedMinutes: 30,
    };
}

function createUser(pinnedTasks?: string[]): User {
    return {
        username: 'test-user',
        dojoCohort: cohort,
        progress: {},
        pinnedTasks,
        weekStart: 0,
        subscriptionStatus: SubscriptionStatus.Subscribed,
    } as User;
}

describe('TaskSuggestionAlgorithm', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 8, 14, 12));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('does not suggest archived requirements', () => {
        const archived = createRequirement('archived-blundergames', RequirementStatus.Archived);
        const active = createRequirement('active-blundergames', RequirementStatus.Active);
        const requirements = [archived, active];

        const result = new TaskSuggestionAlgorithm(
            createUser(),
            requirements,
            requirements,
            [],
        ).getWeeklySuggestions();
        const taskIds = result.suggestionsByDay.flat().map(({ task }) => task.id);

        expect(taskIds).toContain(active.id);
        expect(taskIds).not.toContain(archived.id);
    });

    it('does not suggest archived pinned requirements', () => {
        const archived = createRequirement('archived-blundergames', RequirementStatus.Archived);

        const result = new TaskSuggestionAlgorithm(
            createUser([archived.id]),
            [],
            [archived],
            [],
        ).getWeeklySuggestions();
        const taskIds = result.suggestionsByDay.flat().map(({ task }) => task.id);

        expect(taskIds).not.toContain(archived.id);
    });
});
