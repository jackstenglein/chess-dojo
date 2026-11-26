import { PuzzleTags } from '@jackstenglein/chess-dojo-common/src/puzzlebase/tags';

/** Returns the buckets and themes that are on `before` but not on `after`. */
export function removedTags(before: PuzzleTags, after: PuzzleTags): string[] {
    return [
        ...before.buckets.filter((b) => !after.buckets.includes(b)),
        ...before.themes.filter((t) => !after.themes.includes(t)),
    ];
}
