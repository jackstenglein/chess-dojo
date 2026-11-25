import { CustomTask, RequirementCategory, ScoreboardDisplay } from '@/database/requirement';
import { SubscriptionStatus, User } from '@/database/user';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COHORT, makeTask } from './__fixtures__/tasks';
import { SCHEDULE_CLASSICAL_GAME_TASK_ID } from './suggestedTasks';
import { useWeeklyTrainingPlan } from './useTrainingPlan';

const mocks = vi.hoisted(() => ({
    apiUpdateUser: vi.fn(() => Promise.resolve()),
}));

// Custom plans are a free-tier feature, so the user is on the free tier and the
// tasks are free ones.
const requirements = [
    makeTask({
        id: 'games-1',
        category: RequirementCategory.Games,
        unitScore: 1,
        numberOfCohorts: -1,
        isFree: true,
    }),
    makeTask({
        id: 'tactics-1',
        category: RequirementCategory.Tactics,
        unitScore: 1,
        numberOfCohorts: -1,
        isFree: true,
    }),
    makeTask({
        id: 'endgame-1',
        category: RequirementCategory.Endgame,
        unitScore: 1,
        numberOfCohorts: -1,
        isFree: true,
    }),
    makeTask({
        id: 'other-cohort-1',
        category: RequirementCategory.Opening,
        counts: { '2000-2100': 10 },
        unitScore: 1,
        numberOfCohorts: -1,
        isFree: true,
    }),
    makeTask({
        id: 'non-dojo-1',
        category: RequirementCategory.NonDojo,
        scoreboardDisplay: ScoreboardDisplay.NonDojo,
        isFree: true,
    }),
];

vi.mock('@/auth/Auth', () => ({
    useAuth: () => ({ user: { username: 'me' }, updateUser: vi.fn() }),
}));
vi.mock('@/api/Api', () => ({ useApi: () => ({ updateUser: mocks.apiUpdateUser }) }));
vi.mock('@/api/cache/requirements', () => ({
    useRequirements: () => ({ request: { isLoading: () => false }, requirements }),
}));
vi.mock('../activity/useTimeline', () => ({
    useTimelineContext: () => ({ entries: [] }),
}));

function makeUser(overrides: Partial<User> = {}): User {
    return {
        username: 'me',
        dojoCohort: COHORT,
        progress: {},
        weekStart: 0,
        subscriptionStatus: SubscriptionStatus.NotSubscribed,
        customPlans: [
            {
                id: 'plan-1',
                owner: 'me',
                name: 'My Plan',
                createdAt: '2026-01-01T00:00:00Z',
                updatedAt: '2026-01-01T00:00:00Z',
                buckets: [{ id: 'bucket-1', name: 'Tactics', taskIds: ['tactics-1'] }],
            },
        ],
        ...overrides,
    } as User;
}

function suggestedIds(result: { current: ReturnType<typeof useWeeklyTrainingPlan> }) {
    return new Set(result.current.suggestionsByDay.flatMap((day) => day.map((s) => s.task.id)));
}

describe('useWeeklyTrainingPlan with a custom plan', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 8, 24, 15, 0));
    });

    it('only suggests tasks in the active plan', () => {
        const { result } = renderHook(() =>
            useWeeklyTrainingPlan(makeUser({ activePlanId: 'plan-1' })),
        );
        expect(result.current.activePlan?.id).toBe('plan-1');
        expect(suggestedIds(result)).toEqual(new Set(['tactics-1']));
    });

    it('suggests tasks outside the plan when the Dojo plan is active', () => {
        const { result } = renderHook(() => useWeeklyTrainingPlan(makeUser()));
        expect(result.current.activePlan).toBeUndefined();
        const ids = suggestedIds(result);
        expect(ids.has('games-1')).toBe(true);
        expect(ids.has('endgame-1')).toBe(true);
    });

    it('does not suggest pinned tasks outside the active plan', () => {
        const { result } = renderHook(() =>
            useWeeklyTrainingPlan(makeUser({ activePlanId: 'plan-1', pinnedTasks: ['games-1'] })),
        );
        const ids = suggestedIds(result);
        expect(ids.has('games-1')).toBe(false);
        expect(ids.has('tactics-1')).toBe(true);
        expect(ids.has('endgame-1')).toBe(false);
    });

    it('suggests pinned tasks that are in the active plan', () => {
        const { result } = renderHook(() =>
            useWeeklyTrainingPlan(makeUser({ activePlanId: 'plan-1', pinnedTasks: ['tactics-1'] })),
        );
        expect(suggestedIds(result).has('tactics-1')).toBe(true);
    });

    it('shows no tasks for a new empty plan, even with pins and a saved week', () => {
        const { result } = renderHook(() =>
            useWeeklyTrainingPlan(
                makeUser({
                    activePlanId: 'empty-plan',
                    pinnedTasks: ['games-1'],
                    customPlans: [
                        {
                            id: 'empty-plan',
                            owner: 'me',
                            name: 'Fresh Start',
                            createdAt: '2026-01-01T00:00:00Z',
                            updatedAt: '2026-01-01T00:00:00Z',
                            buckets: [],
                        },
                    ],
                    // A stale weekly plan from the Dojo plan, including the
                    // schedule-a-game pseudo task.
                    weeklyPlan: {
                        endDate: new Date(2026, 8, 27).toISOString(),
                        tasks: [0, 1, 2, 3, 4, 5, 6].map((i) => [
                            {
                                id: i === 4 ? SCHEDULE_CLASSICAL_GAME_TASK_ID : 'games-1',
                                minutes: 30,
                            },
                        ]),
                        progressUpdatedAt: '',
                        nextGame: '',
                    },
                }),
            ),
        );
        expect(suggestedIds(result).size).toBe(0);
    });

    it('falls back to the Dojo plan when the active plan no longer exists', () => {
        const { result } = renderHook(() =>
            useWeeklyTrainingPlan(makeUser({ activePlanId: 'deleted-plan' })),
        );
        expect(result.current.activePlan).toBeUndefined();
        expect(suggestedIds(result).has('games-1')).toBe(true);
    });

    it('suggests every kind of task in the plan, taking turns between buckets', () => {
        const customTask = {
            id: 'custom-1',
            owner: 'me',
            name: 'My Task',
            category: RequirementCategory.NonDojo,
            counts: { [COHORT]: 1 },
            scoreboardDisplay: ScoreboardDisplay.NonDojo,
            progressBarSuffix: '',
        } as unknown as CustomTask;
        const user = makeUser({
            activePlanId: 'plan-2',
            customTasks: [customTask],
            customPlans: [
                {
                    id: 'plan-2',
                    owner: 'me',
                    name: 'Mixed',
                    createdAt: '2026-01-01T00:00:00Z',
                    updatedAt: '2026-01-01T00:00:00Z',
                    buckets: [
                        { id: 'a', name: 'Mine', taskIds: ['custom-1'] },
                        { id: 'b', name: 'Openings', taskIds: ['other-cohort-1'] },
                        { id: 'c', name: 'Extra', taskIds: ['non-dojo-1'] },
                    ],
                },
            ],
        });

        const { result } = renderHook(() => useWeeklyTrainingPlan(user));

        expect(suggestedIds(result)).toEqual(new Set(['custom-1', 'other-cohort-1', 'non-dojo-1']));
        const firsts = new Set(
            result.current.suggestionsByDay.filter((d) => d.length).map((d) => d[0].task.id),
        );
        expect(firsts.size).toBeGreaterThan(1);
    });

    it('suggests nothing from a plan whose tasks are all done', () => {
        const { result } = renderHook(() =>
            useWeeklyTrainingPlan(
                makeUser({
                    activePlanId: 'plan-1',
                    progress: {
                        'tactics-1': {
                            requirementId: 'tactics-1',
                            counts: { [COHORT]: 100 },
                            minutesSpent: {},
                            updatedAt: '2026-09-01T00:00:00Z',
                        },
                    },
                }),
            ),
        );
        expect(suggestedIds(result).size).toBe(0);
    });
});
