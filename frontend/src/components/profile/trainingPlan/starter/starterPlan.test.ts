import {
    Requirement,
    RequirementCategory,
    RequirementStatus,
    ScoreboardDisplay,
} from '@/database/requirement';
import { ALL_COHORTS, SubscriptionStatus, User } from '@/database/user';
import { describe, expect, it } from 'vitest';
import { ANNOTATE_GAMES_TASK_ID, CLASSICAL_GAMES_TASK_ID } from '../suggestedTasks';
import {
    getStarterSteps,
    isStarterPlanActive,
    STARTER_PLAN_LAUNCH_DATE,
    STARTER_PLAN_TUTORIAL,
    StarterStepId,
} from './starterPlan';

const cohort = '1000-1100';

function createRequirement(
    id: string,
    category: RequirementCategory,
    overrides: Partial<Requirement> = {},
): Requirement {
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
        numberOfCohorts: 1,
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
        ...overrides,
    };
}

const welcomeA = createRequirement('welcome-a', RequirementCategory.Welcome, {
    counts: { [cohort]: 1 },
    atomic: true,
    scoreboardDisplay: ScoreboardDisplay.Checkbox,
});
const welcomeB = createRequirement('welcome-b', RequirementCategory.Welcome, {
    counts: { [cohort]: 1 },
    atomic: true,
    scoreboardDisplay: ScoreboardDisplay.Checkbox,
});
const archivedWelcome = createRequirement('welcome-old', RequirementCategory.Welcome, {
    status: RequirementStatus.Archived,
});
const classical = createRequirement(CLASSICAL_GAMES_TASK_ID, RequirementCategory.Games);
const annotate = createRequirement(ANNOTATE_GAMES_TASK_ID, RequirementCategory.Games);
const requirements = [welcomeA, welcomeB, archivedWelcome, classical, annotate];

function progress(id: string, count: number) {
    return {
        requirementId: id,
        counts: { [cohort]: count, [ALL_COHORTS]: count },
        minutesSpent: { [cohort]: 0 },
        updatedAt: '2026-11-20T00:00:00.000Z',
    };
}

function createUser(overrides: Partial<User> = {}): User {
    return {
        username: 'new-member',
        dojoCohort: cohort,
        progress: {},
        weekStart: 0,
        createdAt: '2026-11-20T00:00:00.000Z',
        subscriptionStatus: SubscriptionStatus.Subscribed,
        ...overrides,
    } as User;
}

describe('isStarterPlanActive', () => {
    it('is active for members who joined after the launch', () => {
        expect(isStarterPlanActive(createUser())).toBe(true);
        expect(isStarterPlanActive(createUser({ createdAt: STARTER_PLAN_LAUNCH_DATE }))).toBe(true);
    });

    it('is not active for members who joined before the launch', () => {
        expect(isStarterPlanActive(createUser({ createdAt: '2025-01-01T00:00:00.000Z' }))).toBe(
            false,
        );
    });

    it('is not active once the member has moved on to the full plan', () => {
        const user = createUser({ tutorials: { [STARTER_PLAN_TUTORIAL]: true } });
        expect(isStarterPlanActive(user)).toBe(false);
    });
});

describe('getStarterSteps', () => {
    it('starts with nothing done and ignores archived welcome tasks', () => {
        const steps = getStarterSteps({
            user: createUser(),
            requirements,
            timeline: [],
            hasDojoRushRun: false,
        });

        expect(steps.map((s) => s.id)).toEqual([
            StarterStepId.Welcome,
            StarterStepId.ClassicalGame,
            StarterStepId.AnnotateGame,
            StarterStepId.DojoRush,
        ]);
        expect(steps.every((s) => !s.complete)).toBe(true);
        expect(steps[0].tasks?.map((t) => t.id)).toEqual(['welcome-a', 'welcome-b']);
        expect(steps[0].total).toBe(2);
    });

    it('counts partial welcome progress', () => {
        const steps = getStarterSteps({
            user: createUser({ progress: { [welcomeA.id]: progress(welcomeA.id, 1) } }),
            requirements,
            timeline: [],
            hasDojoRushRun: false,
        });
        expect(steps[0]).toMatchObject({ complete: false, current: 1, total: 2 });
    });

    it('completes every step once the member has done one of each', () => {
        const user = createUser({
            progress: {
                [welcomeA.id]: progress(welcomeA.id, 1),
                [welcomeB.id]: progress(welcomeB.id, 1),
                [CLASSICAL_GAMES_TASK_ID]: progress(CLASSICAL_GAMES_TASK_ID, 3),
                [ANNOTATE_GAMES_TASK_ID]: progress(ANNOTATE_GAMES_TASK_ID, 1),
            },
        });
        const steps = getStarterSteps({ user, requirements, timeline: [], hasDojoRushRun: true });

        expect(steps.every((s) => s.complete)).toBe(true);
        // Extra classical games do not count past the one the step asks for.
        expect(steps[1]).toMatchObject({ current: 1, total: 1 });
    });

    it('does not count a task starting value as progress', () => {
        const classicalFromTwo = { ...classical, startCount: 2 };
        const user = createUser({
            progress: { [CLASSICAL_GAMES_TASK_ID]: progress(CLASSICAL_GAMES_TASK_ID, 2) },
        });
        const steps = getStarterSteps({
            user,
            requirements: [classicalFromTwo],
            timeline: [],
            hasDojoRushRun: false,
        });
        expect(steps[1].complete).toBe(false);
    });

    it('treats the welcome step as done when the cohort has no welcome tasks', () => {
        const steps = getStarterSteps({
            user: createUser(),
            requirements: [classical, annotate],
            timeline: [],
            hasDojoRushRun: false,
        });
        expect(steps[0].complete).toBe(true);
    });
});
