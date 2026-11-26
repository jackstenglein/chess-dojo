import { z } from 'zod';
import { PuzzlebasePuzzle, PuzzlebaseTaxonomy } from './api';
import { addBucket, addTheme, PuzzleTags, removeBucket, removeTheme } from './tags';

/*
 * Anyone who plays a puzzle can suggest tags for it. A suggestion is never a tag: it waits in a
 * review pile until a Puzzle Contributor accepts or dismisses it. Each person has at most one
 * suggestion per puzzle, and sending another replaces it.
 */

/**
 * Verifies a request to suggest changes to a puzzle's tags: tags to add, and tags to take off.
 * Sending none withdraws the person's suggestion.
 */
export const SuggestTagsRequestSchema = z.object({
    buckets: z.string().array().max(10).default([]),
    themes: z.string().array().max(30).default([]),
    /** Tags the puzzle has that the person thinks do not belong. */
    removeBuckets: z.string().array().max(10).default([]),
    removeThemes: z.string().array().max(30).default([]),
});
export type SuggestTagsRequest = z.infer<typeof SuggestTagsRequestSchema>;

/** Verifies a contributor's decision on the suggested tags of one puzzle, by tag name. */
export const ResolveSuggestionsRequestSchema = z.object({
    /**
     * Tags to act on: one the puzzle lacks is added, one it has is taken off. They leave the
     * review pile.
     */
    accept: z.string().array().max(40).default([]),
    /** Tags to dismiss. They are removed from the review pile and not added. */
    reject: z.string().array().max(40).default([]),
});
export type ResolveSuggestionsRequest = z.infer<typeof ResolveSuggestionsRequestSchema>;

/**
 * What came of a suggestion. A Puzzle Contributor's suggestion is applied to the puzzle at once,
 * and the updated puzzle is returned. Anyone else's goes to the review pile.
 */
export interface SuggestTagsResponse {
    applied: boolean;
    puzzle?: PuzzlebasePuzzle;
}

/** One person's suggested tags for one puzzle, as stored. */
export interface PuzzleSuggestion {
    puzzleId: string;
    username: string;
    displayName: string;
    /** Tags to add. */
    buckets: string[];
    themes: string[];
    /** Tags to take off. Missing in suggestions saved before removals existed. */
    removeBuckets?: string[];
    removeThemes?: string[];
    createdAt: string;
}

/** One suggested tag on a puzzle, and who wants it. */
export interface SuggestedTag {
    name: string;
    kind: 'bucket' | 'theme';
    /** Whether it is suggested to add the tag to the puzzle, or to take it off. */
    action: 'add' | 'remove';
    /** How many different people suggested it. */
    count: number;
    /** Display names of the people who suggested it, earliest first. */
    suggestedBy: string[];
}

/** Everything suggested for one puzzle, most wanted first. */
export interface SuggestionSummary {
    puzzleId: string;
    tags: SuggestedTag[];
}

/** Whether a suggestion has no tags left in it. */
export const isEmptySuggestion = (
    s: Pick<PuzzleSuggestion, 'buckets' | 'themes' | 'removeBuckets' | 'removeThemes'>,
) =>
    s.buckets.length === 0 &&
    s.themes.length === 0 &&
    (s.removeBuckets ?? []).length === 0 &&
    (s.removeThemes ?? []).length === 0;

/**
 * Keeps only the suggested tags the puzzle does not have yet, so the pile holds only things a
 * contributor could actually add.
 */
export function newTagsFor(
    puzzle: Pick<PuzzlebasePuzzle, 'buckets' | 'themes'>,
    tags: PuzzleTags,
): PuzzleTags {
    return {
        buckets: [...new Set(tags.buckets)].filter((b) => !puzzle.buckets.includes(b)),
        themes: [...new Set(tags.themes)].filter((t) => !puzzle.themes.includes(t)),
    };
}

/**
 * Keeps only the tags the puzzle has, out of ones suggested to take off, so the pile holds only
 * things a contributor could actually do.
 */
export function removalsFor(
    puzzle: Pick<PuzzlebasePuzzle, 'buckets' | 'themes'>,
    tags: { removeBuckets?: string[]; removeThemes?: string[] },
): { removeBuckets: string[]; removeThemes: string[] } {
    return {
        removeBuckets: [...new Set(tags.removeBuckets ?? [])].filter((b) =>
            puzzle.buckets.includes(b),
        ),
        removeThemes: [...new Set(tags.removeThemes ?? [])].filter((t) =>
            puzzle.themes.includes(t),
        ),
    };
}

/** Takes the named tags out of a suggestion, whether to add or to remove. Names match regardless of case. */
export function withoutTags(suggestion: PuzzleSuggestion, names: string[]): PuzzleSuggestion {
    const drop = new Set(names.map((n) => n.toLowerCase()));
    const keep = (name: string) => !drop.has(name.toLowerCase());
    return {
        ...suggestion,
        buckets: suggestion.buckets.filter(keep),
        themes: suggestion.themes.filter(keep),
        removeBuckets: (suggestion.removeBuckets ?? []).filter(keep),
        removeThemes: (suggestion.removeThemes ?? []).filter(keep),
    };
}

/**
 * Groups suggestions by puzzle. Within a puzzle the tags most people want come first, then by name.
 * Puzzles come in id order.
 */
export function summarizeSuggestions(suggestions: PuzzleSuggestion[]): SuggestionSummary[] {
    const byPuzzle = new Map<string, Map<string, SuggestedTag>>();
    const earliestFirst = [...suggestions].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    for (const suggestion of earliestFirst) {
        const tags = byPuzzle.get(suggestion.puzzleId) ?? new Map<string, SuggestedTag>();
        const entries: [string, 'bucket' | 'theme', 'add' | 'remove'][] = [
            ...suggestion.buckets.map((n) => [n, 'bucket', 'add'] as [string, 'bucket', 'add']),
            ...suggestion.themes.map((n) => [n, 'theme', 'add'] as [string, 'theme', 'add']),
            ...(suggestion.removeBuckets ?? []).map(
                (n) => [n, 'bucket', 'remove'] as [string, 'bucket', 'remove'],
            ),
            ...(suggestion.removeThemes ?? []).map(
                (n) => [n, 'theme', 'remove'] as [string, 'theme', 'remove'],
            ),
        ];
        for (const [name, kind, action] of entries) {
            const key = `${action}:${name}`;
            const tag = tags.get(key) ?? { name, kind, action, count: 0, suggestedBy: [] };
            tag.count += 1;
            tag.suggestedBy.push(suggestion.displayName);
            tags.set(key, tag);
        }
        byPuzzle.set(suggestion.puzzleId, tags);
    }

    return [...byPuzzle.entries()]
        .map(([puzzleId, tags]) => ({
            puzzleId,
            tags: [...tags.values()].sort(
                (a, b) => b.count - a.count || a.name.localeCompare(b.name),
            ),
        }))
        .filter((summary) => summary.tags.length > 0)
        .sort((a, b) => a.puzzleId.localeCompare(b.puzzleId));
}

/**
 * Acts on the accepted tags. A tag the puzzle does not have is added, and a theme brings its bucket
 * with it. A tag the puzzle has is taken off; taking off a bucket takes off the themes that were
 * only there because of it. Names that are not in the taxonomy are returned in `unknown`, so the
 * caller can report them.
 */
export function acceptTags(
    taxonomy: PuzzlebaseTaxonomy,
    current: PuzzleTags,
    names: string[],
): { tags: PuzzleTags; unknown: string[] } {
    let tags = current;
    const unknown: string[] = [];
    const themes = new Set(Object.values(taxonomy.buckets).flat());
    for (const name of names) {
        if (name in taxonomy.buckets) {
            tags = tags.buckets.includes(name)
                ? removeBucket(taxonomy, tags, name)
                : addBucket(tags, name, taxonomy);
        } else if (themes.has(name)) {
            tags = tags.themes.includes(name)
                ? removeTheme(tags, name)
                : addTheme(taxonomy, tags, name);
        } else {
            unknown.push(name);
        }
    }
    return { tags, unknown };
}

/**
 * Makes the suggested changes to a puzzle's tags: adds the tags to add (a theme brings its bucket),
 * then takes off the ones to remove (a bucket takes its themes with it).
 */
export function applyTagChanges(
    taxonomy: PuzzlebaseTaxonomy,
    current: PuzzleTags,
    changes: Pick<PuzzleSuggestion, 'buckets' | 'themes' | 'removeBuckets' | 'removeThemes'>,
): PuzzleTags {
    let tags = current;
    for (const bucket of changes.buckets) tags = addBucket(tags, bucket, taxonomy);
    for (const theme of changes.themes) tags = addTheme(taxonomy, tags, theme);
    for (const bucket of changes.removeBuckets ?? []) tags = removeBucket(taxonomy, tags, bucket);
    for (const theme of changes.removeThemes ?? []) tags = removeTheme(tags, theme);
    return tags;
}

/** Every tag name a suggestion mentions, to add or to remove. */
export function suggestedNames(
    s: Pick<PuzzleSuggestion, 'buckets' | 'themes' | 'removeBuckets' | 'removeThemes'>,
): string[] {
    return [...s.buckets, ...s.themes, ...(s.removeBuckets ?? []), ...(s.removeThemes ?? [])];
}
