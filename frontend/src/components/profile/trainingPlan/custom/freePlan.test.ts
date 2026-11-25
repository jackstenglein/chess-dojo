import {
    CustomTaskCategory,
    Requirement,
    RequirementCategory,
    RequirementStatus,
    ScoreboardDisplay,
} from '@/database/requirement';
import { User } from '@/database/user';
import { describe, expect, it } from 'vitest';
import {
    buildFreePlan,
    buildFreeTask,
    FREE_PLAN_CATEGORIES,
    getFreeTaskFields,
    getLockedTaskCount,
    isFreeStarterPlanDone,
    SampleTasks,
} from './freePlan';

const cohort = '1000-1100';

function requirement(id: string, isFree: boolean, category = RequirementCategory.Tactics) {
    return {
        id,
        status: RequirementStatus.Active,
        category,
        name: id,
        description: '',
        freeDescription: '',
        counts: { [cohort]: 1 },
        startCount: 0,
        numberOfCohorts: 1,
        unitScore: 1,
        totalScore: 0,
        scoreboardDisplay: ScoreboardDisplay.Checkbox,
        progressBarSuffix: '',
        updatedAt: '2026-09-01T00:00:00.000Z',
        sortPriority: id,
        expirationDays: -1,
        isFree,
        atomic: true,
        expectedMinutes: 30,
    } as Requirement;
}

function user(done: string[]): User {
    return {
        username: 'u',
        dojoCohort: cohort,
        progress: Object.fromEntries(
            done.map((id) => [
                id,
                {
                    requirementId: id,
                    counts: { [cohort]: 1, ALL_COHORTS: 1 },
                    minutesSpent: {},
                    updatedAt: '',
                },
            ]),
        ),
    } as unknown as User;
}

describe('buildFreeTask', () => {
    it('measures in the chosen unit', () => {
        const task = buildFreeTask(
            {
                name: ' Najdorf ',
                description: '',
                category: RequirementCategory.Opening,
                goal: 300,
                startCount: 0,
                unit: 'Minutes',
            },
            'u',
        );
        expect(task.name).toBe('Najdorf');
        expect(task.scoreboardDisplay).toBe(ScoreboardDisplay.Minutes);
        expect(task.counts[cohort]).toBe(300);
        expect(task.progressBarSuffix).toBe('Minutes');
    });

    it('makes a checkbox for the check unit', () => {
        const task = buildFreeTask(
            {
                name: 'Read',
                description: '',
                category: RequirementCategory.Endgame,
                goal: 50,
                startCount: 3,
                unit: 'check',
            },
            'u',
        );
        expect(task.scoreboardDisplay).toBe(ScoreboardDisplay.Checkbox);
        expect(task.counts[cohort]).toBe(1);
        expect(task.startCount).toBe(0);
        expect(getFreeTaskFields(task).unit).toBe('check');
    });

    it('round-trips the editor fields', () => {
        const fields = {
            name: 'Book',
            description: 'd',
            category: RequirementCategory.Middlegames as CustomTaskCategory,
            goal: 12,
            startCount: 2,
            unit: 'Chapters' as const,
        };
        expect(getFreeTaskFields(buildFreeTask(fields, 'u', 'id'))).toEqual(fields);
    });
});

describe('buildFreePlan', () => {
    it('makes one bucket per category with its sample task', () => {
        const sample = {
            name: 'Sample',
            description: '',
            goal: 10,
            startCount: 0,
            unit: 'Games' as const,
        };
        const samples = Object.fromEntries(
            FREE_PLAN_CATEGORIES.map((c) => [c, sample]),
        ) as SampleTasks;
        const names = Object.fromEntries(FREE_PLAN_CATEGORIES.map((c) => [c, c])) as Record<
            string,
            string
        >;
        const { plan, tasks } = buildFreePlan('u', 'My Plan', names, samples);
        expect(plan.buckets.map((b) => b.category)).toEqual(FREE_PLAN_CATEGORIES);
        expect(tasks).toHaveLength(5);
        plan.buckets.forEach((b, i) => {
            expect(b.taskIds).toEqual([tasks[i].id]);
            expect(tasks[i].category).toBe(b.category);
        });
    });
});

describe('isFreeStarterPlanDone', () => {
    const requirements = [
        requirement('free1', true),
        requirement('free2', true),
        requirement('paid1', false),
        requirement('paid2', false),
        requirement('grad', true, RequirementCategory.Graduation),
    ];

    it('is done once the Dojo Starter Plan is finished', () => {
        const u = { ...user([]), tutorials: { StarterPlan: true } } as User;
        expect(isFreeStarterPlanDone(u, requirements, [])).toBe(true);
    });

    it('is done when every free task is complete', () => {
        expect(isFreeStarterPlanDone(user(['free1', 'free2']), requirements, [])).toBe(true);
    });

    it('is not done with free tasks left', () => {
        expect(isFreeStarterPlanDone(user(['free1']), requirements, [])).toBe(false);
    });

    it('is not done with no free tasks', () => {
        expect(isFreeStarterPlanDone(user([]), [], [])).toBe(false);
    });

    it('counts the paid tasks as locked', () => {
        expect(getLockedTaskCount(user([]), requirements)).toBe(2);
    });
});
