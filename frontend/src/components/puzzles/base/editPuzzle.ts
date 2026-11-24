import { parsePuzzlePgn } from '@jackstenglein/chess-dojo-common/src/puzzlebase/parse';

const HEADER_LINE = /^\[(\w+)\s+"(.*)"\]$/;

/** A puzzle's solution PGN split into its headers and its movetext. */
export interface SplitPuzzlePgn {
    /** Every header except SetUp and FEN, which are derived from the puzzle's FEN. */
    headers: [string, string][];
    /** The moves, variations and comments after the headers. */
    movetext: string;
}

/** Splits a PGN into its headers (minus SetUp and FEN) and its movetext. */
export function splitPuzzlePgn(pgn: string): SplitPuzzlePgn {
    const headers: [string, string][] = [];
    const movetext: string[] = [];
    let inHeaders = true;

    for (const line of pgn.split(/\r?\n/)) {
        const match = inHeaders ? HEADER_LINE.exec(line.trim()) : null;
        if (match) {
            if (match[1] !== 'SetUp' && match[1] !== 'FEN') {
                headers.push([match[1], match[2]]);
            }
        } else if (inHeaders && line.trim() === '') {
            continue;
        } else {
            inHeaders = false;
            movetext.push(line);
        }
    }

    return { headers, movetext: movetext.join('\n').trim() };
}

/** Builds a full puzzle PGN: the kept headers, then SetUp and FEN, then the movetext. */
export function buildPuzzlePgn(fen: string, headers: [string, string][], movetext: string): string {
    const lines = [...headers, ['SetUp', '1'], ['FEN', fen]].map(([k, v]) => `[${k} "${v}"]`);
    return `${lines.join('\n')}\n\n${movetext.trim()}`;
}

export type PuzzleEditResult =
    { ok: true; fen: string; solutionPgn: string } | { ok: false; error: string };

/**
 * Validates an edited FEN and solution. The FEN must be a legal position and every move in the
 * solution must be legal from it.
 * @param fen The edited FEN.
 * @param movetext The edited solution moves.
 * @param currentPgn The puzzle's current PGN, whose other headers are kept.
 */
export function validatePuzzleEdit(
    fen: string,
    movetext: string,
    currentPgn: string,
): PuzzleEditResult {
    const trimmedFen = fen.trim().replace(/\s+/g, ' ');
    if (!trimmedFen) {
        return { ok: false, error: 'Enter a FEN.' };
    }
    if (!movetext.trim()) {
        return { ok: false, error: 'Enter the solution moves.' };
    }

    const { headers } = splitPuzzlePgn(currentPgn);
    const solutionPgn = buildPuzzlePgn(trimmedFen, headers, movetext);

    try {
        const parsed = parsePuzzlePgn(solutionPgn);
        return { ok: true, fen: parsed.fen, solutionPgn };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Invalid puzzle.' };
    }
}

export type PuzzlePgnCheck =
    | {
          ok: true;
          fen: string;
          players?: string;
          /** The theme and bucket names the PGN asks for, not yet checked against the real ones. */
          tagNames: string[];
          /** The rating the PGN asks for, if it gave a valid one. */
          rating?: number;
          /** Things in the PGN that will be ignored. */
          problems: string[];
      }
    | { ok: false; error: string };

/**
 * Checks a pasted puzzle PGN before it is sent: it needs a [FEN] header (so full games are
 * rejected) and every move must be legal.
 */
export function checkPuzzlePgn(pgn: string): PuzzlePgnCheck {
    if (!pgn.trim()) {
        return { ok: false, error: 'Paste a puzzle PGN with a [FEN] header.' };
    }
    try {
        const parsed = parsePuzzlePgn(pgn);
        const players = [parsed.white, parsed.black].filter(Boolean).join(' – ');
        return {
            ok: true,
            fen: parsed.fen,
            players: players || undefined,
            tagNames: parsed.tagNames,
            rating: parsed.rating,
            problems: parsed.problems,
        };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Invalid puzzle.' };
    }
}
