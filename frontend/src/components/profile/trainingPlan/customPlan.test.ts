import { CustomPlan, User } from '@/database/user';
import { describe, expect, it } from 'vitest';
import { makeTask } from './__fixtures__/tasks';
import {
    addTasksToBucket,
    createCustomPlan,
    getActivePlan,
    getPlanTaskIds,
    removeTaskFromPlans,
    replacePlan,
    resolvePlanTasks,
    switchPlanUpdate,
    unpinTasksUpdate,
} from './customPlan';

function makePlan(overrides: Partial<CustomPlan> = {}): CustomPlan {
    return {
        id: 'plan-1',
        owner: 'test-user',
        name: 'My Plan',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        buckets: [
            { id: 'bucket-1', name: 'Tactics', taskIds: ['task-1', 'task-2'] },
            { id: 'bucket-2', name: 'Endgame', taskIds: ['task-3'] },
        ],
        ...overrides,
    };
}

function makeUser(overrides: Partial<User> = {}): User {
    return {
        username: 'test-user',
        progress: {},
        customPlans: [makePlan()],
        activePlanId: 'plan-1',
        ...overrides,
    } as User;
}

describe('getActivePlan', () => {
    it('returns undefined when no plan is active', () => {
        expect(getActivePlan(makeUser({ activePlanId: undefined }))).toBeUndefined();
        expect(getActivePlan(makeUser({ activePlanId: '' }))).toBeUndefined();
    });

    it('returns the active plan', () => {
        expect(getActivePlan(makeUser())?.id).toBe('plan-1');
    });

    it('returns undefined when the active plan no longer exists', () => {
        expect(getActivePlan(makeUser({ activePlanId: 'deleted' }))).toBeUndefined();
    });
});

describe('getPlanTaskIds', () => {
    it('collects ids across buckets without duplicates', () => {
        const plan = makePlan({
            buckets: [
                { id: 'b1', name: 'A', taskIds: ['t1', 't2'] },
                { id: 'b2', name: 'B', taskIds: ['t2', 't3'] },
            ],
        });
        expect(getPlanTaskIds(plan)).toEqual(new Set(['t1', 't2', 't3']));
    });
});

describe('createCustomPlan', () => {
    it('creates a plan with an id, owner and timestamps', () => {
        const plan = createCustomPlan('My Plan', 'test-user', []);
        expect(plan.id).toBeTruthy();
        expect(plan.owner).toBe('test-user');
        expect(plan.name).toBe('My Plan');
        expect(plan.buckets).toEqual([]);
        expect(plan.createdAt).toBeTruthy();
        expect(plan.updatedAt).toBeTruthy();
    });
});

describe('resolvePlanTasks', () => {
    it('resolves requirements and custom tasks, skipping unknown ids', () => {
        const plan = makePlan({
            buckets: [{ id: 'b1', name: 'A', taskIds: ['req-1', 'custom-1', 'gone'] }],
        });
        const requirement = makeTask({ id: 'req-1' });
        const customTask = { id: 'custom-1', name: 'My Task' };
        const tasks = resolvePlanTasks(plan, [requirement], [customTask as never]);
        expect(tasks.get('req-1')).toBe(requirement);
        expect(tasks.get('custom-1')).toBe(customTask);
        expect(tasks.has('gone')).toBe(false);
    });
});

describe('replacePlan', () => {
    it('replaces the matching plan and stamps updatedAt', () => {
        const plans = [makePlan(), makePlan({ id: 'plan-2', name: 'Other' })];
        const updated = replacePlan(plans, { ...plans[0], name: 'Renamed' });
        expect(updated[0].name).toBe('Renamed');
        expect(updated[0].updatedAt).not.toBe('2026-01-01T00:00:00Z');
        expect(updated[1]).toBe(plans[1]);
    });
});

describe('addTasksToBucket', () => {
    it('appends new ids and skips duplicates', () => {
        const plan = addTasksToBucket(makePlan(), 'bucket-1', ['task-2', 'task-4']);
        expect(plan.buckets[0].taskIds).toEqual(['task-1', 'task-2', 'task-4']);
        expect(plan.buckets[1].taskIds).toEqual(['task-3']);
    });
});

describe('removeTaskFromPlans', () => {
    it('removes the task from every bucket of every plan', () => {
        const plans = [makePlan(), makePlan({ id: 'plan-2' })];
        const updated = removeTaskFromPlans(plans, 'task-2');
        for (const plan of updated) {
            expect(plan.buckets[0].taskIds).toEqual(['task-1']);
        }
    });
});

describe('switchPlanUpdate', () => {
    const plan1 = makePlan();
    const plan2 = makePlan({ id: 'plan-2' });

    it('saves the Dojo pins and starts a new plan with no pins', () => {
        const user = {
            customPlans: [plan1],
            pinnedTasks: ['dojo-task'],
            pinnedTaskMinutes: { 'dojo-task': [30, 0, 0, 0, 0, 0, 0] },
        } as unknown as User;

        expect(switchPlanUpdate(user, 'plan-1')).toEqual({
            activePlanId: 'plan-1',
            pinnedTasks: [],
            pinnedTaskMinutes: {},
            planPins: {
                dojo: {
                    pinnedTasks: ['dojo-task'],
                    pinnedTaskMinutes: { 'dojo-task': [30, 0, 0, 0, 0, 0, 0] },
                },
            },
        });
    });

    it("restores the target plan's pins and saves the current plan's", () => {
        const user = {
            customPlans: [plan1, plan2],
            activePlanId: 'plan-1',
            pinnedTasks: ['task-1'],
            planPins: {
                dojo: { pinnedTasks: ['dojo-task'] },
                'plan-2': { pinnedTasks: ['task-3'] },
            },
        } as unknown as User;

        expect(switchPlanUpdate(user, '')).toEqual({
            activePlanId: '',
            pinnedTasks: ['dojo-task'],
            pinnedTaskMinutes: {},
            planPins: {
                'plan-1': { pinnedTasks: ['task-1'], pinnedTaskMinutes: {} },
                'plan-2': { pinnedTasks: ['task-3'] },
            },
        });
    });

    it('only sets the active plan when it does not change', () => {
        const user = { customPlans: [plan1], activePlanId: 'plan-1' } as unknown as User;
        expect(switchPlanUpdate(user, 'plan-1')).toEqual({ activePlanId: 'plan-1' });
    });
});

describe('unpinTasksUpdate', () => {
    const plan1 = makePlan();

    it('unpins from the active plan', () => {
        const user = {
            customPlans: [plan1],
            activePlanId: 'plan-1',
            pinnedTasks: ['task-1', 'task-2'],
            pinnedTaskMinutes: { 'task-1': [10, 0, 0, 0, 0, 0, 0] },
        } as unknown as User;

        expect(unpinTasksUpdate(user, 'plan-1', new Set(['task-1']))).toEqual({
            pinnedTasks: ['task-2'],
            pinnedTaskMinutes: {},
        });
    });

    it('unpins from an inactive plan', () => {
        const user = {
            customPlans: [plan1],
            pinnedTasks: ['dojo-task'],
            planPins: { 'plan-1': { pinnedTasks: ['task-1', 'task-2'] } },
        } as unknown as User;

        expect(unpinTasksUpdate(user, 'plan-1', new Set(['task-2']))).toEqual({
            planPins: { 'plan-1': { pinnedTasks: ['task-1'], pinnedTaskMinutes: {} } },
        });
    });

    it('returns an empty update when nothing is pinned', () => {
        const user = { customPlans: [plan1], pinnedTasks: ['other'] } as unknown as User;
        expect(unpinTasksUpdate(user, '', new Set(['task-1']))).toEqual({});
    });
});
