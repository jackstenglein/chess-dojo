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
    getStarterCredits,
    getStarterSteps,
    isStarterPlanActive,
    STARTER_PLAN_LAUNCH_DATE,
    StarterStepId,
} from './starterPlan';
import {
    withStarterPlanFinished,
    withStarterTask,
    withStarterTaskCredited,
} from './starterProgress';

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

function checkbox(id: string, category: RequirementCategory, overrides: Partial<Requirement> = {}) {
    return createRequirement(id, category, {
        counts: { [cohort]: 1 },
        atomic: true,
        scoreboardDisplay: ScoreboardDisplay.Checkbox,
        ...overrides,
    });
}

const welcomeA = checkbox('welcome-a', RequirementCategory.Welcome);
const welcomeB = checkbox('welcome-b', RequirementCategory.Welcome);
const archivedWelcome = checkbox('welcome-old', RequirementCategory.Welcome, {
    status: RequirementStatus.Archived,
});
const classical = createRequirement(CLASSICAL_GAMES_TASK_ID, RequirementCategory.Games);
const annotate = createRequirement(ANNOTATE_GAMES_TASK_ID, RequirementCategory.Games);
const algorithm2 = checkbox('algo-2', RequirementCategory.Endgame, {
    name: 'Complete Algorithm #2',
    sortPriority: 'endgame.algo.02',
});
const algorithm1 = checkbox('algo-1', RequirementCategory.Endgame, {
    name: 'Complete Algorithm #1',
    sortPriority: 'endgame.algo.01',
});
const endgameSparring = createRequirement('endgame-sparring', RequirementCategory.Endgame, {
    name: 'Sparring Position #1',
    sortPriority: 'endgame.algo.00',
});
const masterGamesGuide = checkbox('master-guide', RequirementCategory.Games, {
    name: 'Read the Master Games Guide',
    sortPriority: 'middlegame.00',
});
const masterGames = createRequirement('master-games', RequirementCategory.Games, {
    name: 'Study Master Games',
    sortPriority: 'middlegame.01',
});
const requirements = [
    welcomeA,
    welcomeB,
    archivedWelcome,
    classical,
    annotate,
    algorithm2,
    algorithm1,
    endgameSparring,
    masterGamesGuide,
    masterGames,
];

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

/** Returns tutorials with each of the given tasks marked done on the starter plan. */
function markedDone(...ids: string[]) {
    let tutorials = {};
    for (const id of ids) {
        tutorials = withStarterTask(tutorials, id, 20, new Date('2026-11-21T10:00:00.000Z'));
    }
    return tutorials;
}

function stepsFor(user: User, hasDojoRushRun = false) {
    return getStarterSteps({ user, requirements, timeline: [], hasDojoRushRun });
}

function step(user: User, id: StarterStepId) {
    return stepsFor(user).find((s) => s.id === id);
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

    it('is not active once the member has finished the starter plan', () => {
        const user = createUser({ tutorials: withStarterPlanFinished({}) });
        expect(isStarterPlanActive(user)).toBe(false);
    });
});

describe('getStarterSteps', () => {
    it('lists every step with nothing done', () => {
        const steps = stepsFor(createUser());

        expect(steps.map((s) => s.id)).toEqual([
            StarterStepId.Welcome,
            StarterStepId.DojoRush,
            StarterStepId.MasterGame,
            StarterStepId.EndgameAlgorithm,
            StarterStepId.ClassicalGame,
            StarterStepId.AnnotateGame,
        ]);
        expect(steps.every((s) => !s.complete)).toBe(true);
    });

    it('ignores archived welcome tasks', () => {
        const welcome = step(createUser(), StarterStepId.Welcome);
        expect(welcome?.tasks.map((t) => t.task.id)).toEqual(['welcome-a', 'welcome-b']);
    });

    it('leaves the training partner and weekly training plans guides out', () => {
        const guides = [
            checkbox('partner-guide', RequirementCategory.Welcome, {
                name: 'Read the Training Partner Guide',
            }),
            checkbox('weekly-guide', RequirementCategory.Welcome, {
                name: 'Read the Weekly Training Plans Guide',
            }),
        ];
        const steps = getStarterSteps({
            user: createUser(),
            requirements: [welcomeA, ...guides],
            timeline: [],
            hasDojoRushRun: false,
        });
        expect(steps[0].tasks.map((t) => t.task.id)).toEqual(['welcome-a']);
    });

    it('counts tasks marked done on the starter plan without real progress', () => {
        const user = createUser({ tutorials: markedDone(welcomeA.id, CLASSICAL_GAMES_TASK_ID) });

        expect(step(user, StarterStepId.Welcome)).toMatchObject({ current: 1, total: 2 });
        expect(step(user, StarterStepId.ClassicalGame)?.complete).toBe(true);
        expect(user.progress).toEqual({});
    });

    it('also counts tasks already done in real progress', () => {
        const user = createUser({
            progress: { [CLASSICAL_GAMES_TASK_ID]: progress(CLASSICAL_GAMES_TASK_ID, 1) },
        });
        const classicalStep = step(user, StarterStepId.ClassicalGame);
        expect(classicalStep?.complete).toBe(true);
        expect(classicalStep?.tasks[0].record).toBeUndefined();
    });

    it('ignores real progress when previewing as a new member', () => {
        const user = createUser({
            tutorials: markedDone(welcomeA.id),
            progress: {
                [welcomeB.id]: progress(welcomeB.id, 1),
                [CLASSICAL_GAMES_TASK_ID]: progress(CLASSICAL_GAMES_TASK_ID, 5),
            },
        });
        const steps = getStarterSteps({
            user,
            requirements,
            timeline: [],
            hasDojoRushRun: false,
            ignoreRealProgress: true,
        });

        expect(steps.find((s) => s.id === StarterStepId.Welcome)).toMatchObject({
            current: 1,
            total: 2,
        });
        expect(steps.find((s) => s.id === StarterStepId.ClassicalGame)?.complete).toBe(false);
    });

    it('does not count a task starting value as real progress', () => {
        const user = createUser({
            progress: { [CLASSICAL_GAMES_TASK_ID]: progress(CLASSICAL_GAMES_TASK_ID, 2) },
        });
        const steps = getStarterSteps({
            user,
            requirements: [{ ...classical, startCount: 2 }],
            timeline: [],
            hasDojoRushRun: false,
        });
        expect(steps.find((s) => s.id === StarterStepId.ClassicalGame)?.complete).toBe(false);
    });

    it("points at the cohort's first endgame algorithm and its master games task", () => {
        const user = createUser();
        // Endgame sparring positions are not algorithms, and guides are not master games.
        expect(step(user, StarterStepId.EndgameAlgorithm)?.tasks[0].task.id).toBe(algorithm1.id);
        expect(step(user, StarterStepId.MasterGame)?.tasks[0].task.id).toBe(masterGames.id);
    });

    it('shows a later algorithm the member has already done', () => {
        const user = createUser({ progress: { [algorithm2.id]: progress(algorithm2.id, 1) } });
        const algorithmStep = step(user, StarterStepId.EndgameAlgorithm);
        expect(algorithmStep?.complete).toBe(true);
        expect(algorithmStep?.tasks[0].task.id).toBe(algorithm2.id);
    });

    it('leaves out steps whose tasks the cohort does not have', () => {
        const steps = getStarterSteps({
            user: createUser(),
            requirements: [classical],
            timeline: [],
            hasDojoRushRun: false,
        });
        expect(steps.map((s) => s.id)).toEqual([
            StarterStepId.Welcome,
            StarterStepId.DojoRush,
            StarterStepId.ClassicalGame,
        ]);
        // A cohort without welcome tasks has nothing left to do in that step.
        expect(steps[0].complete).toBe(true);
    });

    it('completes the Dojo Rush step after a run', () => {
        const rush = stepsFor(createUser(), true).find((s) => s.id === StarterStepId.DojoRush);
        expect(rush?.complete).toBe(true);
    });
});

describe('getStarterCredits', () => {
    it('credits each task marked done with its minutes and date', () => {
        const user = createUser({
            tutorials: markedDone(welcomeA.id, CLASSICAL_GAMES_TASK_ID, algorithm1.id),
            progress: { [CLASSICAL_GAMES_TASK_ID]: progress(CLASSICAL_GAMES_TASK_ID, 4) },
        });
        const credits = getStarterCredits(user, stepsFor(user), []);

        expect(
            credits.map(({ task, previousCount, newCount, minutes, date }) => ({
                id: task.id,
                previousCount,
                newCount,
                minutes,
                date,
            })),
        ).toEqual([
            {
                id: welcomeA.id,
                previousCount: 0,
                newCount: 1,
                minutes: 20,
                date: '2026-11-21T10:00:00.000Z',
            },
            {
                // Only one of the algorithm's positions was asked for, so only its
                // time is credited and the task is not completed.
                id: algorithm1.id,
                previousCount: 0,
                newCount: 0,
                minutes: 20,
                date: '2026-11-21T10:00:00.000Z',
            },
            {
                id: CLASSICAL_GAMES_TASK_ID,
                previousCount: 4,
                newCount: 5,
                minutes: 20,
                date: '2026-11-21T10:00:00.000Z',
            },
        ]);
    });

    it('skips tasks already credited and tasks only done in real progress', () => {
        const user = createUser({
            tutorials: withStarterTaskCredited(markedDone(welcomeA.id), welcomeA.id),
            progress: { [ANNOTATE_GAMES_TASK_ID]: progress(ANNOTATE_GAMES_TASK_ID, 1) },
        });
        expect(getStarterCredits(user, stepsFor(user), [])).toEqual([]);
    });
});
