import {
    PuzzlebasePuzzle,
    UpdatePuzzleRequest,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';

const SIMPLE_FIELDS = [
    'rating',
    'composer',
    'composerUrl',
    'white',
    'black',
    'result',
    'event',
    'site',
    'year',
] as const;

const sameList = (a: string[], b: string[]) =>
    a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Describes what changed between two versions of a puzzle as an update request, so that only the
 * changed fields are sent to the server. Returns undefined if nothing that can be saved changed.
 */
export function diffToUpdate(
    before: PuzzlebasePuzzle,
    after: PuzzlebasePuzzle,
): UpdatePuzzleRequest | undefined {
    const update: UpdatePuzzleRequest = { id: before.id };
    let changed = false;

    for (const field of SIMPLE_FIELDS) {
        if (before[field] !== after[field] && after[field] !== undefined) {
            Object.assign(update, { [field]: after[field] });
            changed = true;
        }
    }

    // The server always validates buckets and themes together, so send both if either changed.
    if (!sameList(before.buckets, after.buckets) || !sameList(before.themes, after.themes)) {
        update.buckets = after.buckets;
        update.themes = after.themes;
        changed = true;
    }

    // The position is part of the solution PGN, so a new FEN travels as a new solution.
    if (before.solutionPgn !== after.solutionPgn || before.fen !== after.fen) {
        update.solutionPgn = after.solutionPgn;
        changed = true;
    }

    return changed ? update : undefined;
}
