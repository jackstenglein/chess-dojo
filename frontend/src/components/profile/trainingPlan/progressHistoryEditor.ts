import {
    CustomTask,
    getCurrentScore,
    getTotalCount,
    isRequirement,
    Requirement,
    RequirementProgress,
    ScoreboardDisplay,
} from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { ALL_COHORTS, compareCohorts, dojoCohorts, User } from '@/database/user';
import deepEqual from 'deep-equal';
import { DateTime } from 'luxon';
import { v4 as uuidv4 } from 'uuid';

const NUMBER_REGEX = /^[0-9]*$/;
const NEGATIVE_NUMBER_REGEX = /^-?[0-9]*$/;

export interface HistoryItem {
    date: DateTime | null;
    count: string;
    hours: string;
    minutes: string;
    notes: string;
    entry: TimelineEntry;
    index: number;
    deleted: boolean;
    cohort: string;
    /** True if this entry was added in the current session and not yet saved */
    isNew?: boolean;
}

export interface HistoryItemError {
    date?: string;
    count?: string;
    hours?: string;
    minutes?: string;
}

export interface ProgressHistorySummary {
    cohortCount: number;
    cohortTime: number;
    totalCount: number;
    totalTime: number;
}

type TranslateCommon = (key: 'fieldRequired' | 'mustBeInteger') => string;

export function createNewEntry(
    requirement: Requirement | CustomTask,
    cohort: string,
    index: number,
    user: User,
): HistoryItem {
    const now = DateTime.now().toUTC();
    const id = `${now.toISODate()}_${uuidv4()}`;

    const cohortOptions = requirement.counts[ALL_COHORTS]
        ? dojoCohorts
        : Object.keys(requirement.counts).sort(compareCohorts);
    if (!cohortOptions.includes(cohort)) {
        cohort = cohortOptions[0];
    }

    const totalCount = getTotalCount(cohort, requirement);

    return {
        date: now,
        count: '',
        hours: '',
        minutes: '',
        notes: '',
        cohort,
        index,
        deleted: false,
        isNew: true,
        entry: {
            owner: user.username,
            id,
            ownerDisplayName: user.displayName,
            requirementId: requirement.id,
            requirementName: isRequirement(requirement)
                ? requirement.shortName || requirement.name
                : requirement.name,
            requirementCategory: requirement.category,
            isCustomRequirement: !isRequirement(requirement),
            scoreboardDisplay: requirement.scoreboardDisplay,
            progressBarSuffix: requirement.progressBarSuffix,
            cohort,
            totalCount,
            previousCount: 0,
            newCount: 0,
            dojoPoints: 0,
            totalDojoPoints: 0,
            minutesSpent: 0,
            totalMinutesSpent: 0,
            date: now.toISO() ?? '',
            createdAt: now.toISO() ?? '',
            notes: '',
            comments: [],
            reactions: {},
        },
    };
}

export function validateItems(
    items: HistoryItem[],
    tc: TranslateCommon,
): Record<number, HistoryItemError> {
    const errors: Record<number, HistoryItemError> = {};

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.deleted) continue;

        const itemErrors: HistoryItemError = {};

        if (item.date === null) {
            itemErrors.date = tc('fieldRequired');
        }
        if (
            item.count !== '' &&
            (!NEGATIVE_NUMBER_REGEX.test(item.count) || isNaN(parseInt(item.count)))
        ) {
            itemErrors.count = tc('mustBeInteger');
        }
        if (item.hours !== '' && (!NUMBER_REGEX.test(item.hours) || isNaN(parseInt(item.hours)))) {
            itemErrors.hours = tc('mustBeInteger');
        }
        if (
            item.minutes !== '' &&
            (!NUMBER_REGEX.test(item.minutes) || isNaN(parseInt(item.minutes)))
        ) {
            itemErrors.minutes = tc('mustBeInteger');
        }

        if (Object.keys(itemErrors).length > 0) {
            errors[i] = itemErrors;
        }
    }

    return errors;
}

function parseDraftInteger(value: string): number {
    if (!/^-?[0-9]+$/.test(value)) {
        return 0;
    }
    return parseInt(value, 10);
}

export function getDraftProgress(
    requirement: Requirement | CustomTask | undefined,
    items: HistoryItem[],
): RequirementProgress & { counts: Record<string, number> } {
    const progress: RequirementProgress & { counts: Record<string, number> } = {
        requirementId: requirement?.id || '',
        minutesSpent: {},
        counts: {},
        updatedAt: '',
    };

    if (!requirement) {
        return progress;
    }

    for (const item of items) {
        if (item.deleted) continue;

        const cohort =
            requirement.numberOfCohorts === 0 || requirement.numberOfCohorts === 1
                ? ALL_COHORTS
                : item.cohort;

        const minutesSpent = 60 * parseDraftInteger(item.hours) + parseDraftInteger(item.minutes);
        progress.minutesSpent[item.cohort] =
            (progress.minutesSpent[item.cohort] ?? 0) + minutesSpent;

        const previousCount = progress.counts[cohort] ?? (requirement.startCount || 0);
        const newCount =
            item.entry.scoreboardDisplay === ScoreboardDisplay.Minutes
                ? previousCount + minutesSpent
                : previousCount + parseDraftInteger(item.count);
        progress.counts[cohort] = newCount;
    }

    return progress;
}

export function summarizeProgress(
    progress: RequirementProgress,
    cohort: string,
): ProgressHistorySummary {
    const cohortCount = progress.counts?.ALL_COHORTS ?? progress.counts?.[cohort] ?? 0;
    const totalCount = Object.values(progress.counts ?? {}).reduce((sum, value) => sum + value, 0);
    const cohortTime = progress.minutesSpent[cohort] ?? 0;
    const totalTime = Object.values(progress.minutesSpent).reduce((sum, value) => sum + value, 0);

    return { cohortCount, cohortTime, totalCount, totalTime };
}

export function getProgressSummary(
    requirement: Requirement | CustomTask | undefined,
    items: HistoryItem[],
    cohort: string,
): ProgressHistorySummary {
    return summarizeProgress(getDraftProgress(requirement, items), cohort);
}

export function getTimelineUpdate(
    requirement: Requirement | CustomTask | undefined,
    items: HistoryItem[],
    tc: TranslateCommon,
): {
    progress: RequirementProgress;
    updated: TimelineEntry[];
    deleted: TimelineEntry[];
    errors: Record<number, HistoryItemError>;
} {
    const errors = validateItems(items, tc);

    if (!requirement || Object.keys(errors).length > 0) {
        return {
            progress: { requirementId: requirement?.id || '', minutesSpent: {}, updatedAt: '' },
            updated: [],
            deleted: [],
            errors,
        };
    }

    const updated: TimelineEntry[] = [];
    const deleted: TimelineEntry[] = [];
    const progress: RequirementProgress & { counts: Record<string, number> } = {
        requirementId: requirement.id,
        minutesSpent: {},
        counts: {},
        updatedAt: '',
    };

    for (const item of items) {
        if (item.deleted) {
            deleted.push(item.entry);
            continue;
        }

        const cohort =
            requirement.numberOfCohorts === 0 || requirement.numberOfCohorts === 1
                ? ALL_COHORTS
                : item.cohort;

        const minutesSpent = 60 * parseDraftInteger(item.hours) + parseDraftInteger(item.minutes);
        progress.minutesSpent[item.cohort] =
            (progress.minutesSpent[item.cohort] ?? 0) + minutesSpent;

        const previousCount = progress.counts[cohort] ?? (requirement.startCount || 0);
        const newCount =
            item.entry.scoreboardDisplay === ScoreboardDisplay.Minutes
                ? previousCount + minutesSpent
                : previousCount + parseDraftInteger(item.count);
        progress.counts[cohort] = newCount;

        let previousScore = 0;
        let newScore = 0;
        if (isRequirement(requirement)) {
            previousScore = getCurrentScore(item.cohort, requirement, {
                counts: { [ALL_COHORTS]: previousCount, [item.cohort]: previousCount },
            } as unknown as RequirementProgress);
            newScore = getCurrentScore(item.cohort, requirement, {
                counts: { [ALL_COHORTS]: newCount, [item.cohort]: newCount },
            } as unknown as RequirementProgress);
        }

        const newEntry = {
            ...item.entry,
            cohort: item.cohort,
            notes: item.notes,
            date: item.date?.toUTC().toISO() || item.entry.createdAt,
            previousCount,
            newCount,
            dojoPoints: newScore - previousScore,
            totalDojoPoints: newScore,
            minutesSpent,
            totalMinutesSpent: progress.minutesSpent[item.cohort],
        };

        if (!deepEqual(item.entry, newEntry)) {
            updated.push(newEntry);
        }
    }

    return { progress, updated, deleted, errors };
}
