import { Chess } from '@jackstenglein/chess';
import { PuzzlebasePuzzle } from './api';

/**
 * The White and Black headers to write. Puzzles imported from a collection have a label like
 * "Ex 12 Tactics, Pin" as White and both players as "Smith - Jones" in Black. The label is left out
 * and each player goes in their own header; with no players known, both are "?".
 */
export function playerHeaders(puzzle: Pick<PuzzlebasePuzzle, 'white' | 'black'>): {
    white: string;
    black: string;
} {
    const white = puzzle.white ?? '';
    const black = puzzle.black ?? '';
    if (!/^Ex \d+\b/.test(white)) {
        return { white: white || '?', black: black || '?' };
    }
    const players = black.split(' - ');
    return players.length === 2
        ? { white: players[0].trim(), black: players[1].trim() }
        : { white: '?', black: '?' };
}

/**
 * Writes a puzzle as a PGN that can be imported again: its solution with all the comments and
 * variations, and its details, tags and rating as they are now. Headers the puzzlebase does not
 * keep (a source, an Elo) are not included.
 */
export function puzzleToPgn(puzzle: PuzzlebasePuzzle): string {
    const chess = new Chess({ pgn: puzzle.solutionPgn });
    // A header with no value is removed, so one left over from the original PGN cannot go stale.
    const set = (name: string, value: string | number | undefined) => {
        chess.setHeader(name, value === undefined || value === '' ? undefined : String(value));
    };

    // The seven tags every PGN reader expects, with ? for what is not known.
    set('Event', puzzle.event ?? '?');
    set('Site', puzzle.site ?? '?');
    set('Date', puzzle.year ? `${puzzle.year}.??.??` : '????.??.??');
    const players = playerHeaders(puzzle);
    set('White', players.white);
    set('Black', players.black);
    set('Result', puzzle.result ?? '*');
    set('Annotator', puzzle.annotatorDisplayName);
    set('Themes', [...puzzle.buckets, ...puzzle.themes].join(', ') || undefined);
    set('Rating', puzzle.rating);
    set('ReferenceMs', puzzle.referenceMs);
    return chess.renderPgn();
}

/** Writes puzzles as one PGN file, a game each, in id order. */
export function puzzlesToPgn(puzzles: PuzzlebasePuzzle[]): string {
    return (
        [...puzzles]
            .sort((a, b) => a.id.localeCompare(b.id))
            .map(puzzleToPgn)
            .join('\n\n') + '\n'
    );
}
