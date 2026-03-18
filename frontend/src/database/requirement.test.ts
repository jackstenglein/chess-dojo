import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    CustomTask,
    getCurrentCount,
    Requirement,
    RequirementCategory,
    RequirementStatus,
    ScoreboardDisplay,
} from './requirement';
import { TimelineEntry } from './timeline';

const testCohort = 'cohort';
const testCohort2 = 'cohort2';
const testCohort3 = 'cohort3';

const requirementNormal: Requirement = {
    id: 'If51a94d8-305a-4c3a-a2c3-f7d521765ca2D',
    status: RequirementStatus.Active,
    category: RequirementCategory.Tactics,
    name: 'TestRequirement',
    shortName: 'TestReq',
    dailyName: 'DailyTestReq',
    description: 'Test Description',
    freeDescription: 'Test Free Description',
    counts: {
        [testCohort]: 10,
        [testCohort2]: 20,
        [testCohort3]: 30,
    },
    startCount: 2,
    numberOfCohorts: 3,
    unitScore: 0.01,
    totalScore: 0.1,
    scoreboardDisplay: ScoreboardDisplay.ProgressBar,
    progressBarSuffix: 'suffix',
    updatedAt: '2023-01-01T00:00:00Z',
    sortPriority: '1',
    expirationDays: 30,
    isFree: true,
    atomic: true,
    expectedMinutes: 10,
};

const requirementAllCohorts: Requirement = {
    ...requirementNormal,
    numberOfCohorts: 1,
};

const customTaskNormal: CustomTask = {
    id: 'If51a94d8-305a-4c3a-a2c3-f7d521765ca2D',
    owner: 'user',
    name: 'TestCustom',
    description: 'Test Description',
    counts: {
        [testCohort]: 10,
    },
    scoreboardDisplay: ScoreboardDisplay.ProgressBar,
    category: RequirementCategory.Tactics,
    updatedAt: '2023-01-01T00:00:00Z',
    numberOfCohorts: 1,
    progressBarSuffix: 'suffix',
    startCount: 2,
};

const customTaskNoStartCount: CustomTask = {
    id: 'If51a94d8-305a-4c3a-a2c3-f7d521765ca2D',
    owner: 'user',
    name: 'TestCustom',
    description: 'Test Description',
    counts: {
        [testCohort]: 10,
    },
    scoreboardDisplay: ScoreboardDisplay.ProgressBar,
    category: RequirementCategory.Tactics,
    updatedAt: '2023-01-01T00:00:00Z',
    numberOfCohorts: 1,
    progressBarSuffix: 'suffix',
};

const progressNormal = {
    requirementId: requirementNormal.id,
    counts: {
        [testCohort]: 5,
    },
    minutesSpent: {
        [testCohort]: 10,
    },
    updatedAt: '2023-01-01T00:00:00Z',
};

const timelineEntryNormal: TimelineEntry = {
    id: 'b2c6b6c3-5f37-4993-ae5b-8031397d320b',
    owner: 'user',
    ownerDisplayName: 'User',
    cohort: testCohort,
    requirementId: requirementNormal.id,
    requirementName: requirementNormal.name,
    requirementCategory: requirementNormal.category,
    scoreboardDisplay: requirementNormal.scoreboardDisplay,
    progressBarSuffix: requirementNormal.progressBarSuffix,
    totalCount: requirementNormal.counts[testCohort],
    previousCount: 5,
    newCount: 6,
    dojoPoints: 10,
    totalDojoPoints: 20,
    minutesSpent: 10,
    totalMinutesSpent: 20,
    createdAt: '2023-01-01T00:00:00Z',
    notes: '',
    comments: null,
    reactions: null,
};

describe('requirement.ts', () => {
    describe('getCurrentCount', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2023-01-15T00:00:00Z'));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('returns 0 for undefined requirement', () => {
            const count = getCurrentCount({
                cohort: testCohort,
                requirement: undefined,
                progress: progressNormal,
                timeline: [timelineEntryNormal],
            });

            expect(count).toBe(0);
        });

        it('returns startCount for undefined progress (requirement)', () => {
            const count = getCurrentCount({
                cohort: testCohort,
                requirement: requirementNormal,
                progress: undefined,
                timeline: [timelineEntryNormal],
            });

            expect(count).toBe(2);
        });

        it('returns startCount for undefined progress (custom task)', () => {
            const count = getCurrentCount({
                cohort: testCohort,
                requirement: customTaskNormal,
                progress: undefined,
                timeline: [timelineEntryNormal],
            });

            expect(count).toBe(2);
        });

        it('returns 0 for undefined progress with no start count', () => {
            const count = getCurrentCount({
                cohort: testCohort,
                requirement: customTaskNoStartCount,
                progress: undefined,
                timeline: [timelineEntryNormal],
            });

            expect(count).toBe(0);
        });

        it('returns startCount for undefined progress.count (requirement)', () => {
            const count = getCurrentCount({
                cohort: testCohort,
                requirement: requirementNormal,
                progress: {
                    requirementId: requirementNormal.id,
                    counts: undefined,
                    minutesSpent: {
                        [testCohort]: 10,
                    },
                    updatedAt: '2023-01-01T00:00:00Z',
                },
                timeline: [timelineEntryNormal],
            });

            expect(count).toBe(2);
        });

        it('returns startCount for undefined progress.count (custom task)', () => {
            const count = getCurrentCount({
                cohort: testCohort,
                requirement: customTaskNormal,
                progress: {
                    requirementId: customTaskNormal.id,
                    counts: undefined,
                    minutesSpent: {
                        [testCohort]: 10,
                    },
                    updatedAt: '2023-01-01T00:00:00Z',
                },
                timeline: [timelineEntryNormal],
            });

            expect(count).toBe(2);
        });

        it('returns 0 for undefined progress.count with no start count', () => {
            const count = getCurrentCount({
                cohort: testCohort,
                requirement: customTaskNoStartCount,
                progress: {
                    requirementId: customTaskNoStartCount.id,
                    counts: undefined,
                    minutesSpent: {
                        [testCohort]: 10,
                    },
                    updatedAt: '2023-01-01T00:00:00Z',
                },
                timeline: [timelineEntryNormal],
            });

            expect(count).toBe(0);
        });

        it('returns startCount for progress.count cohort miss (not ALL_COHORTS)', () => {
            const count = getCurrentCount({
                cohort: 'missingCohort',
                requirement: requirementNormal,
                progress: progressNormal,
                timeline: [timelineEntryNormal],
            });

            expect(count).toBe(2);
        });

        it('returns startCount for progress.count cohort miss (ALL_COHORTS)', () => {
            const count = getCurrentCount({
                cohort: 'missingCohort',
                requirement: requirementAllCohorts,
                progress: {
                    ...progressNormal,
                    requirementId: requirementAllCohorts.id,
                },
                timeline: [timelineEntryNormal],
            });

            expect(count).toBe(2);
        });

        it('returns 0 for nondojo score display', () => {
            const count = getCurrentCount({
                cohort: testCohort,
                requirement: {
                    ...requirementNormal,
                    scoreboardDisplay: ScoreboardDisplay.NonDojo,
                },
                progress: progressNormal,
                timeline: [timelineEntryNormal],
            });

            expect(count).toBe(0);
        });

        it('returns 0 for expired requirement', () => {
            const count = getCurrentCount({
                cohort: testCohort,
                requirement: {
                    ...requirementNormal,
                    expirationDays: 1,
                },
                progress: progressNormal,
                timeline: [timelineEntryNormal],
            });

            expect(count).toBe(0);
        });

        it('returns startCount for ALL_COHORTS with no progress', () => {
            const count = getCurrentCount({
                cohort: testCohort,
                requirement: requirementAllCohorts,
                progress: progressNormal,
                timeline: [timelineEntryNormal],
            });

            expect(count).toBe(2);
        });

        it('returns 0 for ALL_COHORTS with no progress and no startCount', () => {
            const count = getCurrentCount({
                cohort: testCohort,
                requirement: {
                    ...requirementAllCohorts,
                    startCount: 0,
                },
                progress: progressNormal,
                timeline: [timelineEntryNormal],
            });

            expect(count).toBe(0);
        });

        it('is correct for ALL_COHORTS with progress', () => {
            const count = getCurrentCount({
                cohort: testCohort,
                requirement: requirementAllCohorts,
                progress: {
                    ...progressNormal,
                    counts: {
                        ALL_COHORTS: 5,
                    },
                },
                timeline: [timelineEntryNormal],
            });

            expect(count).toBe(5);
        });

        it('does not clamp upper bound for ALL_COHORTS if not asked to', () => {
            const count = getCurrentCount({
                cohort: testCohort,
                requirement: requirementAllCohorts,
                progress: {
                    ...progressNormal,
                    counts: {
                        ALL_COHORTS: 15,
                    },
                },
                timeline: [timelineEntryNormal],
            });

            expect(count).toBe(15);
        });

        it('clamps upper bound for ALL_COHORTS when asked to', () => {
            const count = getCurrentCount({
                cohort: testCohort,
                requirement: requirementAllCohorts,
                progress: {
                    ...progressNormal,
                    counts: {
                        ALL_COHORTS: 15,
                    },
                },
                timeline: [timelineEntryNormal],
                clamp: true,
            });

            expect(count).toBe(10);
        });
    });
});
