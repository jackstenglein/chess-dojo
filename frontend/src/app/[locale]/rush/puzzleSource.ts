import { PuzzleRushPuzzle } from '@jackstenglein/chess-dojo-common/src/puzzles/rush/api';
import { PUZZLE_RUSH_RATING_WINDOW } from '@jackstenglein/chess-dojo-common/src/puzzles/rush/rating';

/** Where the demo gets its puzzles. A run asks for one puzzle at a time. */
export interface RushPuzzleSource {
    /**
     * Returns a puzzle near the given search rating that is not in `excludeIds`,
     * or undefined when there is none to give.
     */
    next(rating: number, excludeIds: string[]): Promise<PuzzleRushPuzzle | undefined>;
}

/**
 * The windows to try around the search rating, in order. The same three steps as
 * the backend handler in backend/puzzleService/puzzleRush/get.ts.
 */
const RATING_WINDOWS = [
    PUZZLE_RUSH_RATING_WINDOW,
    PUZZLE_RUSH_RATING_WINDOW * 2,
    PUZZLE_RUSH_RATING_WINDOW * 4,
];

export interface PackSourceOptions {
    /** Puzzles from this visitor's earlier runs. Passed over while fresh ones remain. */
    avoidIds?: Iterable<string>;
    /** Returns a number in [0, 1). Tests pass a fixed sequence. */
    random?: () => number;
}

/**
 * Serves puzzles from a fixed list, picking at random inside the rating window the
 * way the API does. The list is small, so when the widest window is empty it falls
 * back to the puzzle closest in rating instead of ending the run.
 */
export function createPackSource(
    puzzles: PuzzleRushPuzzle[],
    { avoidIds, random = Math.random }: PackSourceOptions = {},
): RushPuzzleSource {
    const avoid = new Set(avoidIds);
    const pick = (candidates: PuzzleRushPuzzle[]) =>
        candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];

    return {
        next(rating, excludeIds) {
            const excluded = new Set(excludeIds);
            const available = puzzles.filter((puzzle) => !excluded.has(puzzle.id));
            if (available.length === 0) {
                return Promise.resolve(undefined);
            }

            for (const window of RATING_WINDOWS) {
                const inWindow = available.filter(
                    (puzzle) => Math.abs(puzzle.rating - rating) <= window,
                );
                const fresh = inWindow.filter((puzzle) => !avoid.has(puzzle.id));
                if (fresh.length > 0) {
                    return Promise.resolve(pick(fresh));
                }
                if (inWindow.length > 0) {
                    return Promise.resolve(pick(inWindow));
                }
            }

            const closest = available.reduce((best, puzzle) =>
                Math.abs(puzzle.rating - rating) < Math.abs(best.rating - rating) ? puzzle : best,
            );
            return Promise.resolve(closest);
        },
    };
}

/**
 * Serves puzzles from the app's own endpoint, POST /puzzle/rush/next. That route
 * sits behind a login today, so this only works for logged-out visitors once the
 * route is opened. Tries twice, like the app.
 */
export function createApiSource(): RushPuzzleSource {
    return {
        async next(rating, excludeIds) {
            const { getPuzzleRushPuzzle } = await import('@/api/puzzleApi');
            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    const response = await getPuzzleRushPuzzle({ rating, excludeIds });
                    return response.data.puzzle;
                } catch {
                    // Try once more, then give up on this puzzle.
                }
            }
            return undefined;
        },
    };
}

/** True when the build is set to use the real endpoint instead of the bundled pack. */
export function usesApiSource(): boolean {
    return process.env.NEXT_PUBLIC_RUSH_DEMO_SOURCE === 'api';
}

/**
 * Loads the source for a run. The bundled pack is a separate chunk, fetched the
 * first time this is called, so it costs nothing until a visitor starts playing.
 */
export async function loadRushPuzzleSource(avoidIds?: Iterable<string>): Promise<RushPuzzleSource> {
    if (usesApiSource()) {
        return createApiSource();
    }
    const pack = await import('./pack/puzzlePack.json');
    return createPackSource(pack.default.puzzles, { avoidIds });
}
