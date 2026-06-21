import { getCohortRangeInt } from '@jackstenglein/chess-dojo-common/src/database/cohort';
import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { LiveClass } from '@jackstenglein/chess-dojo-common/src/liveClasses/api';

const RECORDING_DATE_REGEX = /\d{4}(-|\/)\d{2}(-|\/)\d{2}/;

/**
 * Formats a recording date string.
 * @param dateStr - The date string to format.
 * @returns The formatted date string.
 */
export function formatRecordingDate(dateStr: string): string {
    const match = RECORDING_DATE_REGEX.exec(dateStr);
    return match ? match[0] : dateStr;
}

/**
 * Checks if a live class matches a search query.
 * @param c - The live class to check.
 * @param query - The search query to check.
 * @returns True if the live class matches the search query.
 */
export function matchesSearch(c: LiveClass, query: string): boolean {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
        c.name.toLowerCase().includes(q) ||
        c.teacher?.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false)
    );
}

/**
 * Gets the unique tags from a list of live classes.
 * @param classes - The live classes to get the unique tags from.
 * @returns The unique tags.
 */
export function getUniqueTags(classes: LiveClass[]): string[] {
    const set = new Set<string>();
    for (const c of classes) {
        for (const tag of c.tags ?? []) {
            if (tag.trim()) set.add(tag.trim());
        }
    }
    return [...set].sort();
}

/**
 * Checks if a live class matches a tag filter.
 * @param c - The live class to check.
 * @param selectedTags - The tags to check.
 * @returns True if the live class matches the tag filter.
 */
export function matchesTagFilter(c: LiveClass, selectedTags: string[]): boolean {
    if (selectedTags.length === 0) return true;
    const classTags = new Set(c.tags ?? []);
    return selectedTags.some((t) => classTags.has(t) || c.type === t);
}

/** The cohort levels for filtering live classes. */
export const COHORT_LEVELS = [
    { value: 'all', label: 'All Levels', min: 0, max: Infinity },
    { value: 'beginner', label: 'Beginner (0-1000)', min: 0, max: 1000 },
    { value: 'intermediate', label: 'Intermediate (1000-1500)', min: 1000, max: 1500 },
    { value: 'advanced', label: 'Advanced (1500-2000)', min: 1500, max: 2000 },
    { value: 'expert', label: 'Expert (2000+)', min: 2000, max: Infinity },
] as const;

/** The value of a cohort level. */
export type CohortLevelValue = (typeof COHORT_LEVELS)[number]['value'];

/**
 * Checks if two ranges overlap.
 * @param a - The first range.
 * @param b - The second range.
 * @returns True if the ranges overlap.
 */
function rangesOverlap(a: { min: number; max: number }, b: { min: number; max: number }): boolean {
    return a.min <= b.max && b.min <= a.max;
}

/**
 * Checks if a live class matches a cohort level.
 * @param c - The live class to check.
 * @param level - The cohort level to check.
 * @returns True if the live class matches the cohort level.
 */
export function matchesCohortLevel(c: LiveClass, level: CohortLevelValue): boolean {
    if (level === 'all') return true;
    const levelDef = COHORT_LEVELS.find((l) => l.value === level);
    if (!levelDef || levelDef.value === 'all') return true;

    const [min, max] = getCohortRangeInt(c.cohortRange);
    return rangesOverlap({ min, max }, { min: levelDef.min, max: levelDef.max });
}

/**
 * Compares two live classes for sorting.
 * @param a - The first live class to compare.
 * @param b - The second live class to compare.
 * @returns A negative number if the first live class sorts before the second, a positive number if the first live class sorts after the second, or 0 if they are equal.
 */
export function compareLiveClasses(a: LiveClass, b: LiveClass): number {
    if (a.type !== b.type) {
        if (a.type === SubscriptionTier.Lecture) return -1;
        if (b.type === SubscriptionTier.Lecture) return 1;
    }

    const [aMin, aMax] = getCohortRangeInt(a.cohortRange);
    const [bMin, bMax] = getCohortRangeInt(b.cohortRange);

    if (aMin !== bMin) {
        return aMin - bMin;
    }
    if (aMax !== bMax) {
        return aMax - bMax;
    }

    return a.name.localeCompare(b.name);
}
