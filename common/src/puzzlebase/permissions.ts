import { PuzzlebasePuzzle, UpdatePuzzleRequest } from './api';

/** Who is asking: their username and whether they are a Dojo admin. */
export interface Caller {
    username: string;
    isAdmin: boolean;
}

/**
 * Whether the caller can do anything to a puzzle: delete it, or change its solution and source.
 * Its author can, and so can any admin.
 */
export function canManagePuzzle(puzzle: Pick<PuzzlebasePuzzle, 'annotator'>, caller: Caller) {
    return caller.isAdmin || puzzle.annotator === caller.username;
}

/** What any Puzzle Contributor can change on any puzzle, including other people's. */
const OPEN_FIELDS = new Set<string>(['id', 'rating', 'themes', 'buckets']);

/** Plain names for the fields only a puzzle's author or an admin can change. */
const FIELD_NAMES: Record<string, string> = {
    solutionPgn: 'solution',
    composer: 'composer',
    composerUrl: 'composer link',
    white: 'players',
    black: 'players',
    result: 'result',
    event: 'event',
    site: 'site',
    year: 'year',
};

/**
 * The fields an update changes that only the puzzle's author or an admin may change, as plain
 * names (solution, players, event...). Empty if the update only touches tags and the rating.
 */
export function restrictedChanges(request: UpdatePuzzleRequest): string[] {
    const names = Object.entries(request)
        .filter(([key, value]) => value !== undefined && !OPEN_FIELDS.has(key))
        .map(([key]) => FIELD_NAMES[key] ?? key);
    return [...new Set(names)];
}
