import { PuzzlebasePuzzle } from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { linesFromSolution } from '@jackstenglein/chess-dojo-common/src/puzzlebase/lines';
import { TacticsPuzzle } from '../tactics/tacticsPuzzles';

/** The top of the rating range slider. Puzzles above it can still be reached with the top end. */
export const RATING_SLIDER_MAX = 3000;

/** How long a session lasts: a number of minutes, or until the member stops. */
export type SessionLength = number | 'unlimited';

/** The session lengths on offer, in minutes. */
export const SESSION_MINUTES = [10, 20, 30, 60] as const;

/** The range that covers every puzzle: all ratings. */
export const ALL_RATINGS: [number, number] = [0, RATING_SLIDER_MAX];

/** How many puzzles are fetched at a time. More are fetched as the member gets through them. */
export const PUZZLES_PER_BATCH = 15;

/** How far either side of a member's rating the puzzles they are offered by default go. */
const DEFAULT_RATING_SPREAD = 200;

/** The range used for a member with no rating yet. */
const UNRATED_RANGE: [number, number] = [800, 1200];

/** The puzzle ratings offered by default: a window around the member's own rating. */
export function defaultRatingWindow(userRating: number): [number, number] {
    if (!Number.isFinite(userRating) || userRating <= 0) {
        return UNRATED_RANGE;
    }
    return [
        Math.max(0, Math.round((userRating - DEFAULT_RATING_SPREAD) / 50) * 50),
        Math.min(RATING_SLIDER_MAX, Math.round((userRating + DEFAULT_RATING_SPREAD) / 50) * 50),
    ];
}

/**
 * Turns a puzzle from the PuzzleBase into what the trainer plays: the position, who the solver
 * is, and every line to beat.
 * @returns undefined if the stored solution cannot be played, so one bad puzzle does not stop a
 * whole session.
 */
export function toTacticsPuzzle(puzzle: PuzzlebasePuzzle): TacticsPuzzle | undefined {
    try {
        const { fen, userColor, lines, alternates } = linesFromSolution(puzzle.solutionPgn);
        const game = [puzzle.white, puzzle.black].filter(Boolean).join(' – ');
        const source = [game, puzzle.year].filter(Boolean).join(', ') || puzzle.composer;
        return {
            id: puzzle.id,
            title: `#${puzzle.id}${source ? ` · ${source}` : ''}`,
            fen,
            userColor,
            lines,
            alternates,
            solutionPgn: puzzle.solutionPgn,
            buckets: puzzle.buckets,
            themes: puzzle.themes,
            rating: puzzle.rating,
            info: puzzle,
            description: `${userColor === 'white' ? 'White' : 'Black'} to play.`,
        };
    } catch {
        return undefined;
    }
}

/** Converts puzzles for the trainer, dropping any that cannot be played. */
export function toTacticsPuzzles(puzzles: PuzzlebasePuzzle[]): TacticsPuzzle[] {
    return puzzles.flatMap((puzzle) => toTacticsPuzzle(puzzle) ?? []);
}
