import { Requirement, RequirementCategory } from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { User } from '@/database/user';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getScoreChartData, Timeframe } from './activity';

function makeTimelineEntry(overrides: Partial<TimelineEntry>): TimelineEntry {
    return {
        owner: 'test-user',
        id: '2026-04-20_abc',
        ownerDisplayName: 'Test User',
        requirementId: '',
        requirementName: 'Test Requirement',
        requirementCategory: RequirementCategory.Tactics,
        cohort: '',
        scoreboardDisplay: 'UNSPECIFIED' as never,
        progressBarSuffix: '',
        totalCount: 100,
        previousCount: 0,
        newCount: 1,
        dojoPoints: 0,
        totalDojoPoints: 0,
        minutesSpent: 0,
        totalMinutesSpent: 0,
        createdAt: new Date().toISOString(),
        notes: '',
        comments: null,
        reactions: null,
        ...overrides,
    } as TimelineEntry;
}

function makeRequirement(overrides: Partial<Requirement>): Requirement {
    return {
        id: '',
        status: '' as never,
        category: RequirementCategory.Tactics,
        name: 'Test Requirement',
        shortName: '',
        description: '',
        freeDescription: '',
        unitScore: 1,
        unitScoreOverride: {},
        totalScore: 0,
        startCount: 0,
        numberOfCohorts: 1,
        counts: { '1200-1300': 100 },
        videoUrls: [],
        positions: [],
        scoreboardDisplay: 'UNSPECIFIED' as never,
        progressBarSuffix: '',
        expirationDays: 0,
        isCohortSpecific: false,
        isFree: false,
        atomic: false,
        expectedMinutes: 0,
        updatedAt: '',
        sortPriority: '',
        ...overrides,
    } as Requirement;
}

describe('getScoreChartData', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-04-20T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('uses entry.dojoPoints for timeframe-filtered score', () => {
        const requirement = makeRequirement({
            id: 'polgar-mates-2',
            category: RequirementCategory.Tactics,
            startCount: 306,
            unitScore: 0.5,
            counts: { '1200-1300': 500 },
        });

        const entry = makeTimelineEntry({
            requirementId: 'polgar-mates-2',
            requirementCategory: RequirementCategory.Tactics,
            cohort: '1200-1300',
            previousCount: 306,
            newCount: 310,
            dojoPoints: 2,
            date: new Date().toISOString(),
        });

        const user = { progress: {} } as unknown as User;

        const result = getScoreChartData(user, ['1200-1300'], Timeframe.Last7Days, [entry], '', [
            requirement,
        ]);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe(RequirementCategory.Tactics);
        expect(result[0].value).toBe(2);
    });

    it('accumulates dojoPoints from multiple entries in the same category', () => {
        const requirement = makeRequirement({
            id: 'polgar-mates-2',
            category: RequirementCategory.Tactics,
            startCount: 306,
            unitScore: 0.5,
            counts: { '1200-1300': 500 },
        });

        const entries = [
            makeTimelineEntry({
                requirementId: 'polgar-mates-2',
                requirementCategory: RequirementCategory.Tactics,
                cohort: '1200-1300',
                previousCount: 310,
                newCount: 315,
                dojoPoints: 2.5,
                date: new Date().toISOString(),
            }),
            makeTimelineEntry({
                requirementId: 'polgar-mates-2',
                requirementCategory: RequirementCategory.Tactics,
                cohort: '1200-1300',
                previousCount: 306,
                newCount: 310,
                dojoPoints: 2,
                date: new Date().toISOString(),
            }),
        ];

        const user = { progress: {} } as unknown as User;

        const result = getScoreChartData(user, ['1200-1300'], Timeframe.Last7Days, entries, '', [
            requirement,
        ]);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe(RequirementCategory.Tactics);
        expect(result[0].value).toBe(4.5);
    });

    it('excludes entries outside the timeframe', () => {
        const requirement = makeRequirement({
            id: 'polgar-mates-2',
            category: RequirementCategory.Tactics,
            counts: { '1200-1300': 500 },
        });

        const oldDate = new Date('2026-01-01T12:00:00Z').toISOString();

        const entry = makeTimelineEntry({
            requirementId: 'polgar-mates-2',
            requirementCategory: RequirementCategory.Tactics,
            cohort: '1200-1300',
            dojoPoints: 5,
            date: oldDate,
            createdAt: oldDate,
        });

        const user = { progress: {} } as unknown as User;

        const result = getScoreChartData(user, ['1200-1300'], Timeframe.Last7Days, [entry], '', [
            requirement,
        ]);

        expect(result).toHaveLength(0);
    });

    it('shows per-requirement breakdown when category is specified', () => {
        const requirement = makeRequirement({
            id: 'polgar-mates-2',
            name: 'Polgar Mates in 2',
            shortName: 'Polgar M2',
            category: RequirementCategory.Tactics,
            startCount: 306,
            counts: { '1200-1300': 500 },
        });

        const entry = makeTimelineEntry({
            requirementId: 'polgar-mates-2',
            requirementCategory: RequirementCategory.Tactics,
            cohort: '1200-1300',
            previousCount: 306,
            newCount: 310,
            dojoPoints: 2,
            date: new Date().toISOString(),
        });

        const user = { progress: {} } as unknown as User;

        const result = getScoreChartData(
            user,
            ['1200-1300'],
            Timeframe.Last7Days,
            [entry],
            RequirementCategory.Tactics,
            [requirement],
        );

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Polgar M2');
        expect(result[0].value).toBe(2);
    });

    it('skips entries with zero dojoPoints in category view', () => {
        const requirement = makeRequirement({
            id: 'some-task',
            category: RequirementCategory.Tactics,
            counts: { '1200-1300': 100 },
        });

        const entry = makeTimelineEntry({
            requirementId: 'some-task',
            requirementCategory: RequirementCategory.Tactics,
            cohort: '1200-1300',
            dojoPoints: 0,
            date: new Date().toISOString(),
        });

        const user = { progress: {} } as unknown as User;

        const result = getScoreChartData(
            user,
            ['1200-1300'],
            Timeframe.Last7Days,
            [entry],
            RequirementCategory.Tactics,
            [requirement],
        );

        expect(result).toHaveLength(0);
    });
});
