import {
    Requirement,
    RequirementCategory,
    RequirementStatus,
    ScoreboardDisplay,
} from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';

export const COHORT = '1400-1500';

/** Builds a requirement for tests. Only the fields a test cares about need passing. */
export function makeTask(overrides: Partial<Requirement> = {}): Requirement {
    return {
        id: 'task',
        status: RequirementStatus.Active,
        category: RequirementCategory.Tactics,
        name: 'Solve Puzzles',
        description: '',
        freeDescription: '',
        counts: { [COHORT]: 100 },
        startCount: 0,
        numberOfCohorts: 1,
        unitScore: 0,
        totalScore: 0,
        scoreboardDisplay: ScoreboardDisplay.ProgressBar,
        progressBarSuffix: 'Puzzles',
        updatedAt: '2026-01-01T00:00:00Z',
        sortPriority: '',
        expirationDays: -1,
        isFree: false,
        atomic: false,
        expectedMinutes: 30,
        ...overrides,
    };
}

/** Builds a timeline entry logging minutes against a task on a date. */
export function makeEntry(
    requirementId: string,
    date: string,
    minutesSpent: number,
): TimelineEntry {
    return {
        requirementId,
        date,
        createdAt: date,
        minutesSpent,
    } as TimelineEntry;
}
