import { PuzzlebaseTaxonomy } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { PuzzleTags } from '@jackstenglein/chess-dojo-common/src/puzzlebase/tags';

/** A bucket and the themes of a puzzle that belong to it. */
export interface TagGroup {
    /** The bucket. Empty for themes that do not belong to any known bucket. */
    bucket: string;
    /** Whether the puzzle itself is tagged with the bucket (rather than only one of its themes). */
    hasBucketTag: boolean;
    /** The puzzle's themes in this bucket, alphabetically. */
    themes: string[];
}

/**
 * Groups a puzzle's tags by bucket. Groups follow the taxonomy's bucket order, so a puzzle always
 * lists, for example, its Tactics themes before its Middlegame themes. Themes within a group are
 * alphabetical.
 */
export function groupTags(taxonomy: PuzzlebaseTaxonomy, tags: PuzzleTags): TagGroup[] {
    const groups: TagGroup[] = [];
    const bucketOrder = Object.keys(taxonomy.buckets);

    // A theme listed under several buckets is shown once, under the first of the puzzle's own
    // buckets that lists it. If the puzzle has none of them, under the first bucket that does.
    const groupOf = (theme: string): string | undefined => {
        const listedUnder = bucketOrder.filter((bucket) =>
            taxonomy.buckets[bucket].includes(theme),
        );
        return listedUnder.find((bucket) => tags.buckets.includes(bucket)) ?? listedUnder[0];
    };

    for (const bucket of bucketOrder) {
        const themes = tags.themes
            .filter((theme) => groupOf(theme) === bucket)
            .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        const hasBucketTag = tags.buckets.includes(bucket);
        if (hasBucketTag || themes.length > 0) {
            groups.push({ bucket, hasBucketTag, themes });
        }
    }

    // Buckets that are no longer in the taxonomy keep showing rather than silently disappearing.
    for (const bucket of tags.buckets) {
        if (!bucketOrder.includes(bucket)) {
            groups.push({ bucket, hasBucketTag: true, themes: [] });
        }
    }

    const known = new Set(bucketOrder.flatMap((bucket) => taxonomy.buckets[bucket]));
    const orphans = tags.themes.filter((theme) => !known.has(theme));
    if (orphans.length > 0) {
        groups.push({ bucket: '', hasBucketTag: false, themes: orphans });
    }

    return groups;
}
