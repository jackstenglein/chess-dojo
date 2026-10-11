import { PuzzlebasePuzzle } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';

/** How many puzzles have each bucket and each theme. */
export interface TagCounts {
    buckets: Record<string, number>;
    themes: Record<string, number>;
}

/** Counts the puzzles that have each bucket and each theme. */
export function countTags(puzzles: Pick<PuzzlebasePuzzle, 'buckets' | 'themes'>[]): TagCounts {
    const counts: TagCounts = { buckets: {}, themes: {} };
    for (const puzzle of puzzles) {
        for (const bucket of puzzle.buckets) {
            counts.buckets[bucket] = (counts.buckets[bucket] ?? 0) + 1;
        }
        for (const theme of puzzle.themes) {
            counts.themes[theme] = (counts.themes[theme] ?? 0) + 1;
        }
    }
    return counts;
}
