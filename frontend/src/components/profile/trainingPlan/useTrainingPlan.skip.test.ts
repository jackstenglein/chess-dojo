import { User, WeeklyPlan } from '@/database/user';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTrainingPlan } from './useTrainingPlan';

const mocks = vi.hoisted(() => ({
    updateUser: vi.fn<(update: { weeklyPlan: WeeklyPlan }) => void>(),
    apiUpdateUser: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/auth/Auth', () => ({
    useAuth: () => ({ user: { username: 'me' }, updateUser: mocks.updateUser }),
}));
vi.mock('@/api/Api', () => ({ useApi: () => ({ updateUser: mocks.apiUpdateUser }) }));
vi.mock('@/api/cache/requirements', () => ({
    useRequirements: () => ({ request: {}, requirements: [] }),
}));

// Week of Sunday 2026-09-20. The clock is fixed to Thursday of that week below.
const plan: WeeklyPlan = {
    endDate: new Date(2026, 8, 27).toISOString(),
    tasks: [0, 1, 2, 3, 4, 5, 6].map((i) => [{ id: `task-${i}`, minutes: 30 }]),
    progressUpdatedAt: '',
    nextGame: '',
    skippedTasks: [],
};

function renderPlan(weeklyPlan: WeeklyPlan) {
    return renderHook(({ user }) => useTrainingPlan(user), {
        initialProps: { user: { username: 'me', weeklyPlan } as unknown as User },
    });
}

const savedPlan = () =>
    (mocks.updateUser.mock.lastCall?.[0] as { weeklyPlan: WeeklyPlan }).weeklyPlan;

describe('useTrainingPlan skipping', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 8, 24, 15, 0));
    });

    it('skips a task without touching the plan, and offers an undo', () => {
        const { result } = renderPlan(plan);
        act(() => result.current.toggleSkip('task-5'));

        expect(savedPlan().skippedTasks).toEqual(['task-5']);
        expect(savedPlan().tasks).toEqual(plan.tasks);
        expect(result.current.lastSkipped).toEqual(['task-5']);
    });

    it('undoes a skip by saving back the exact plan from before it', () => {
        const { result } = renderPlan(plan);
        act(() => result.current.toggleSkip('task-5'));
        act(() => result.current.undoSkip());

        expect(savedPlan()).toBe(plan);
        expect(result.current.lastSkipped).toBeUndefined();
    });

    it('restores a skipped task and clears the rest of the week so it is rebuilt', () => {
        const { result } = renderPlan({ ...plan, skippedTasks: ['task-5'] });
        act(() => result.current.toggleSkip('task-5'));

        expect(savedPlan().skippedTasks).toEqual([]);
        // Thursday onward is cleared for the suggestion algorithm to refill.
        expect(savedPlan().tasks.map((t) => t.length)).toEqual([1, 1, 1, 1, 0, 0, 0]);
        expect(result.current.lastSkipped).toBeUndefined();
    });

    it('does nothing without a weekly plan', () => {
        const { result } = renderHook(() => useTrainingPlan({ username: 'me' } as User));
        act(() => result.current.toggleSkip('task-5'));
        expect(mocks.updateUser).not.toHaveBeenCalled();
    });
});

describe('useTrainingPlan swapping', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 8, 24, 15, 0));
    });

    it('swaps a task on today, keeping its time, and offers an undo', () => {
        const { result } = renderPlan(plan);
        let swapped = false;
        act(() => {
            swapped = result.current.swapTask('task-4', 'other');
        });

        expect(swapped).toBe(true);
        expect(savedPlan().tasks[4]).toEqual([{ id: 'other', minutes: 30 }]);
        expect(result.current.lastSwap).toEqual({ fromId: 'task-4', toId: 'other' });
    });

    it('undoes a swap by saving back the exact plan from before it', () => {
        const { result } = renderPlan(plan);
        act(() => {
            result.current.swapTask('task-4', 'other');
        });
        act(() => result.current.undoSwap());

        expect(savedPlan()).toBe(plan);
        expect(result.current.lastSwap).toBeUndefined();
    });

    it('does nothing for a task that is not on today', () => {
        const { result } = renderPlan(plan);
        let swapped = true;
        act(() => {
            swapped = result.current.swapTask('task-5', 'other');
        });
        expect(swapped).toBe(false);
        expect(mocks.updateUser).not.toHaveBeenCalled();
    });
});
