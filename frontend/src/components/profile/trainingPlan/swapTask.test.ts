import { RequirementCategory, ScoreboardDisplay } from '@/database/requirement';
import { ALL_COHORTS, WeeklyPlan } from '@/database/user';
import { describe, expect, it } from 'vitest';
import { COHORT, makeTask } from './__fixtures__/tasks';
import { getSwapCandidates, swapInPlan } from './swapTask';

const current = makeTask({
    id: 'polgar',
    category: RequirementCategory.Tactics,
    sortPriority: 'b',
});
const tactics = (id: string, extra = {}) =>
    makeTask({ id, category: RequirementCategory.Tactics, ...extra });

const base = {
    task: current,
    cohort: COHORT,
    progress: {},
    timeline: [],
    todayIds: ['polgar'],
    subscriptionTier: 'BASIC',
};

describe('getSwapCandidates', () => {
    it('offers other unfinished tasks in the same category, in plan order', () => {
        const candidates = getSwapCandidates({
            ...base,
            requirements: [
                current,
                tactics('late', { sortPriority: 'c' }),
                tactics('early', { sortPriority: 'a' }),
                makeTask({ id: 'endgame', category: RequirementCategory.Endgame }),
            ],
        });
        expect(candidates.map((c) => c.id)).toEqual(['early', 'late']);
    });

    it('leaves out finished, skipped and already-planned tasks', () => {
        const done = tactics('done', {
            scoreboardDisplay: ScoreboardDisplay.Checkbox,
            counts: { [COHORT]: 1 },
        });
        const candidates = getSwapCandidates({
            ...base,
            requirements: [done, tactics('skipped'), tactics('planned'), tactics('open')],
            progress: {
                done: {
                    requirementId: 'done',
                    counts: { [ALL_COHORTS]: 1 },
                    minutesSpent: {},
                    updatedAt: '',
                },
            },
            todayIds: ['polgar', 'planned'],
            skippedIds: ['skipped'],
        });
        expect(candidates.map((c) => c.id)).toEqual(['open']);
    });

    it('leaves out tasks for another cohort or subscription', () => {
        const candidates = getSwapCandidates({
            ...base,
            requirements: [
                tactics('other-cohort', { counts: { '2000-2100': 10 } }),
                tactics('premium', { subscriptionTiers: ['GAME_REVIEW' as never] }),
                tactics('open'),
            ],
        });
        expect(candidates.map((c) => c.id)).toEqual(['open']);
    });
});

describe('getSwapCandidates with empty lists stored as null', () => {
    it('treats null custom tasks and skipped ids as none', () => {
        const candidates = getSwapCandidates({
            ...base,
            requirements: [tactics('open')],
            customTasks: null,
            skippedIds: null,
        });
        expect(candidates.map((c) => c.id)).toEqual(['open']);
    });
});

describe('swapInPlan', () => {
    const plan = {
        tasks: [
            [],
            [],
            [],
            [],
            [
                { id: 'a', minutes: 20 },
                { id: 'polgar', minutes: 45 },
            ],
            [{ id: 'polgar', minutes: 30 }],
            [],
        ],
    } as unknown as WeeklyPlan;

    it('replaces the task on that day only, keeping its place and time', () => {
        const next = swapInPlan(plan, 4, 'polgar', 'endgame');
        expect(next.tasks[4]).toEqual([
            { id: 'a', minutes: 20 },
            { id: 'endgame', minutes: 45 },
        ]);
        expect(next.tasks[5]).toEqual([{ id: 'polgar', minutes: 30 }]);
    });

    it('does not change the plan it was given', () => {
        swapInPlan(plan, 4, 'polgar', 'endgame');
        expect(plan.tasks[4][1].id).toBe('polgar');
    });
});
