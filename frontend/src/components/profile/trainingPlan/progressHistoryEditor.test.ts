import {
    Requirement,
    RequirementCategory,
    RequirementStatus,
    ScoreboardDisplay,
} from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import {
    getProgressSummary,
    getTimelineUpdate,
    HistoryItem,
    validateItems,
} from './progressHistoryEditor';

const requirement: Requirement = {
    id: 'classical-games',
    status: RequirementStatus.Active,
    category: RequirementCategory.Games,
    name: 'Play Classical Games',
    description: '',
    freeDescription: '',
    counts: { '1400-1500': 40 },
    startCount: 0,
    numberOfCohorts: 1,
    unitScore: 1,
    totalScore: 0,
    scoreboardDisplay: ScoreboardDisplay.Yearly,
    progressBarSuffix: 'games',
    updatedAt: '2026-01-01T00:00:00.000Z',
    sortPriority: 'games',
    expirationDays: -1,
    isFree: false,
    atomic: false,
    expectedMinutes: 0,
};

const tc = (key: 'fieldRequired' | 'mustBeInteger') => key;

function makeEntry(index: number): TimelineEntry {
    const date = `2026-01-${`${(index % 28) + 1}`.padStart(2, '0')}T12:00:00.000Z`;
    return {
        owner: 'test',
        id: `entry-${index}`,
        ownerDisplayName: 'Test User',
        cohort: '1400-1500',
        requirementId: requirement.id,
        requirementName: requirement.name,
        requirementCategory: RequirementCategory.Games,
        scoreboardDisplay: ScoreboardDisplay.Yearly,
        progressBarSuffix: 'games',
        totalCount: 40,
        previousCount: index,
        newCount: index + 1,
        dojoPoints: 1,
        totalDojoPoints: index + 1,
        minutesSpent: 30,
        totalMinutesSpent: (index + 1) * 30,
        date,
        createdAt: date,
        notes: `notes ${index}`,
        comments: [],
        reactions: {},
    };
}

function makeItem(index: number, deleted = false): HistoryItem {
    const entry = makeEntry(index);
    return {
        date: DateTime.fromISO(entry.date || entry.createdAt),
        count: '1',
        hours: '0',
        minutes: '30',
        notes: entry.notes,
        entry,
        index,
        deleted,
        cohort: '1400-1500',
        isNew: false,
    };
}

describe('progressHistoryEditor', () => {
    it('summarizes draft counts and time without building a save payload', () => {
        const items = [makeItem(0), makeItem(1), makeItem(2)];

        expect(getProgressSummary(requirement, items, '1400-1500')).toEqual({
            cohortCount: 3,
            totalCount: 3,
            cohortTime: 90,
            totalTime: 90,
        });
    });

    it('ignores deleted rows in draft summaries and save payloads', () => {
        const items = [makeItem(0), makeItem(1, true), makeItem(2)];

        expect(getProgressSummary(requirement, items, '1400-1500')).toEqual({
            cohortCount: 2,
            totalCount: 2,
            cohortTime: 60,
            totalTime: 60,
        });

        const update = getTimelineUpdate(requirement, items, tc);
        expect(update.deleted).toEqual([items[1].entry]);
        expect(update.progress.counts?.ALL_COHORTS).toBe(2);
        expect(update.progress.minutesSpent['1400-1500']).toBe(60);
    });

    it('validates invalid draft values only when validation is requested', () => {
        const invalid = makeItem(0);
        invalid.count = 'abc';
        invalid.hours = '1.5';

        expect(getProgressSummary(requirement, [invalid], '1400-1500')).toEqual({
            cohortCount: 0,
            totalCount: 0,
            cohortTime: 30,
            totalTime: 30,
        });

        expect(validateItems([invalid], tc)).toEqual({
            0: {
                count: 'mustBeInteger',
                hours: 'mustBeInteger',
            },
        });
    });
});
