import { Chess, Move } from '@jackstenglein/chess';
import { PuzzleResult, PuzzleResultSchema } from './api';
import { readPgnTagInfo } from './pgnTags';

/** The data extracted from a puzzle PGN. */
export interface ParsedPuzzlePgn {
    /** The starting position of the puzzle. */
    fen: string;
    /** The full PGN of the puzzle, including the FEN header and any variations. */
    solutionPgn: string;
    white?: string;
    black?: string;
    result?: PuzzleResult;
    event?: string;
    site?: string;
    year?: number;
    /** Theme and bucket names the PGN asks for. They are not checked against the real themes yet. */
    tagNames: string[];
    /** The rating the PGN asks for, if it gave a valid one. */
    rating?: number;
    /** Things in the PGN that were ignored, in words a person can act on. */
    problems: string[];
}

/** Returns the header value if it is set to something meaningful (not empty or a '?' placeholder). */
function tag(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed && !/^[?.\-*]+$/.test(trimmed) ? trimmed : undefined;
}

/** Counts every move in the given line, including moves in all nested variations. */
function countParsedMoves(line: Move[]): number {
    let count = 0;
    for (const move of line) {
        count += 1;
        for (const variation of move.variations) {
            count += countParsedMoves(variation);
        }
    }
    return count;
}

/**
 * Counts the moves written in a PGN's movetext, ignoring headers, comments, move numbers, NAGs and
 * results. The PGN parser silently drops moves that are not legal, so this is compared against the
 * moves that were actually parsed to detect that.
 */
function countWrittenMoves(pgn: string): number {
    const movetext = pgn
        .split(/\r?\n/)
        .filter((line) => !/^\s*\[\w+\s+".*"\]\s*$/.test(line))
        .join('\n');

    return movetext
        .replace(/\{[^}]*\}/g, ' ')
        .replace(/;[^\n]*/g, ' ')
        .replace(/\$\d+/g, ' ')
        .replace(/[()]/g, ' ')
        .replace(/\b\d+\.{1,3}/g, ' ')
        .split(/\s+/)
        .filter((token) => token !== '' && !isValidResult(token)).length;
}

function isValidResult(token: string): boolean {
    return token === '1-0' || token === '0-1' || token === '1/2-1/2' || token === '*';
}

/**
 * Parses a puzzle PGN. The PGN must have a [FEN] header (a puzzle starts from a set position) and
 * at least one move. Full games starting from the initial position are rejected.
 * @throws Error with a user-facing message if the PGN is not a valid puzzle.
 */
export function parsePuzzlePgn(pgn: string): ParsedPuzzlePgn {
    let chess: Chess;
    try {
        chess = new Chess({ pgn });
    } catch (err) {
        throw new Error(`Invalid PGN: ${err instanceof Error ? err.message : String(err)}`, {
            cause: err,
        });
    }

    const tags = chess.header().tags;
    const fen = tag(tags.FEN);
    if (!fen) {
        throw new Error(
            'This looks like a full game. Puzzle PGNs must have a [FEN] header with the puzzle start position.',
        );
    }
    const written = countWrittenMoves(pgn);
    if (chess.history().length === 0) {
        throw new Error(
            written === 0
                ? 'The PGN has no moves. Add the solution moves after the FEN.'
                : 'None of those moves are legal from the starting position.',
        );
    }
    const parsed = countParsedMoves(chess.history());
    if (parsed !== written) {
        throw new Error(
            `Some moves are not legal from the starting position: only ${parsed} of ${written} moves are valid. Check the moves after the last legal one, including variations.`,
        );
    }

    const result = PuzzleResultSchema.safeParse(tag(tags.Result));
    const date: unknown = tags.Date;
    const year =
        typeof date === 'object' && date !== null && 'year' in date ? Number(date.year) : undefined;

    const headers = tags as Record<string, unknown>;
    const tagInfo = readPgnTagInfo(
        { themes: headers.Themes, rating: headers.Rating },
        chess.pgn.gameComment?.comment,
    );

    return {
        fen,
        solutionPgn: chess.renderPgn(),
        tagNames: tagInfo.names,
        rating: tagInfo.rating,
        problems: tagInfo.problems,
        white: tag(tags.White),
        black: tag(tags.Black),
        result: result.success && result.data !== '*' ? result.data : undefined,
        event: tag(tags.Event),
        site: tag(tags.Site),
        year: year && !Number.isNaN(year) ? year : undefined,
    };
}
