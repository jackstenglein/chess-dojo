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
    getProgressResets,
    isFreeStarterPlanDone,
    sortFreePlanBuckets,
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
    it('makes one empty bucket per category', () => {
        const names = Object.fromEntries(FREE_PLAN_CATEGORIES.map((c) => [c, c])) as Record<
            string,
            string
        >;
        const plan = buildFreePlan('u', 'My Plan', names);
        expect(plan.name).toBe('My Plan');
        expect(plan.buckets.map((b) => b.category)).toEqual(FREE_PLAN_CATEGORIES);
        expect(plan.buckets.map((b) => b.name)).toEqual(FREE_PLAN_CATEGORIES);
        plan.buckets.forEach((b) => expect(b.taskIds).toEqual([]));
    });
});

describe('sortFreePlanBuckets', () => {
    it('puts openings before middlegames and endgames, other buckets last', () => {
        const bucket = (name: string, category?: RequirementCategory) => ({ name, category });
        const sorted = sortFreePlanBuckets([
            bucket('Extra'),
            bucket('E', RequirementCategory.Endgame),
            bucket('M', RequirementCategory.Middlegames),
            bucket('O', RequirementCategory.Opening),
            bucket(RequirementCategory.Tactics),
            bucket('G', RequirementCategory.Games),
        ]);
        expect(sorted.map((b) => b.name)).toEqual([
            'G',
            RequirementCategory.Tactics,
            'O',
            'M',
            'E',
            'Extra',
        ]);
    });
});

describe('getProgressResets', () => {
    it('lists the plan tasks with a count above 0', () => {
        const names = Object.fromEntries(FREE_PLAN_CATEGORIES.map((c) => [c, c])) as Record<
            string,
            string
        >;
        const plan = buildFreePlan('u', 'My Plan', names);
        plan.buckets[0].taskIds = ['a', 'b'];
        plan.buckets[1].taskIds = ['c', 'd'];
        const progress = {
            a: { requirementId: 'a', counts: { ALL_COHORTS: 4 }, minutesSpent: {}, updatedAt: '' },
            b: {
                requirementId: 'b',
                counts: { ALL_COHORTS: 0 },
                minutesSpent: { x: 30 },
                updatedAt: '',
            },
            c: { requirementId: 'c', counts: { '1500-1600': 1 }, minutesSpent: {}, updatedAt: '' },
            outside: {
                requirementId: 'outside',
                counts: { ALL_COHORTS: 9 },
                minutesSpent: {},
                updatedAt: '',
            },
        } as unknown as User['progress'];
        expect(getProgressResets(plan, progress)).toEqual([
            { requirementId: 'a', previousCount: 4 },
            { requirementId: 'c', previousCount: 1 },
        ]);
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
