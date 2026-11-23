import { Chess, Move } from '@jackstenglein/chess';
import { parsePuzzlePgn } from './parse';

/** A puzzle broken into what the trainer plays. */
export interface TrainingLines {
    /** The starting position. */
    fen: string;
    /** The side the solver plays: the side to move in the starting position. */
    userColor: 'white' | 'black';
    /**
     * Each line is a list of SAN moves from the starting position. The solver plays the even
     * moves (0, 2, 4...) and the opponent's replies are played for them. Lines that end in a
     * different defense come first, and the main line is always last.
     */
    lines: string[][];
    /**
     * Other moves the solver may play on the main line, marked ALT or ALT2 in the solution.
     * They are not lines the solver has to beat, so they are kept apart from `lines`.
     */
    alternates: AlternateMove[];
}

/** How an alternate move is treated. */
export type AlternateKind =
    /** Also a solution. It earns full credit, and the solver may try again or move on. */
    | 'alt'
    /** Good, but the main line is better. The solver is nudged to look again, at no cost. */
    | 'alt2';

/** A move other than the main-line one that the solver may play. */
export interface AlternateMove {
    kind: AlternateKind;
    /** Where the solver plays it, counting plies from the start. Always an even number. */
    ply: number;
    /** The alternate line from the start position: the main line up to `ply`, then its own moves. */
    line: string[];
}

/** The instruction a contributor can write at the start of a variation's comment. */
export type VariationMarker = 'SKIP' | 'ALT' | 'ALT2';

const MARKER = /^\s*(SKIP|ALT2|ALT)(?![\w])/i;

/** Reads the marker a comment starts with, if any. Matching ignores case. */
export function readMarker(comment: string | undefined): VariationMarker | undefined {
    const found = comment ? MARKER.exec(comment) : null;
    return found ? (found[1].toUpperCase() as VariationMarker) : undefined;
}

/**
 * Evaluation NAGs: equal, unclear, and the advantages for either side ($10 to $19). A move
 * carrying one ends its line: the puzzle is over, and anything after is analysis.
 */
const EVAL_NAGS = new Set(Array.from({ length: 10 }, (_, i) => String(10 + i)));

const isEval = (move: Move) =>
    (move.nags ?? []).some((nag) => EVAL_NAGS.has(nag.replace(/^\$/, '')));

/** The moves up to and including the first one that carries an evaluation. */
function untilEval(moves: Move[]): Move[] {
    const end = moves.findIndex(isEval);
    return end === -1 ? moves : moves.slice(0, end + 1);
}

/**
 * Turns a puzzle's solution PGN into the lines the trainer plays.
 *
 * The main line is the solution. A variation on one of the opponent's moves is another defense the
 * solver must also beat, so it becomes a line of its own, unless its comment starts with SKIP.
 * A variation on one of the solver's own moves is analysis and is ignored, unless its comment
 * starts with ALT (another solution) or ALT2 (good, but not the best).
 *
 * A move with an evaluation ($10 to $19, such as $18 for "White is winning") ends its line. The
 * puzzle stops there, and any moves after it are analysis that the solver is not tested on.
 *
 * @throws Error if the PGN is not a valid puzzle.
 */
export function linesFromSolution(solutionPgn: string): TrainingLines {
    const { fen } = parsePuzzlePgn(solutionPgn);
    const chess = new Chess({ pgn: solutionPgn });
    const mainline = untilEval(chess.history());
    const mainSans = mainline.map((move) => move.san);

    const defenses: string[][] = [];
    const alternates: AlternateMove[] = [];

    /**
     * Goes through a line, and through the variations of its moves, and the variations of those.
     * A defense can have defenses and alternates of its own, so an ALT written inside one counts.
     * @param before The moves that lead to the start of `moves`.
     */
    const walk = (moves: Move[], before: string[]) => {
        moves.forEach((move, k) => {
            const ply = before.length + k;
            const prefix = [...before, ...moves.slice(0, k).map((m) => m.san)];
            for (const variation of move.variations) {
                if (variation.length === 0) continue;
                const first = variation[0];
                const marker = readMarker(first.commentAfter) ?? readMarker(first.commentMove);
                const kept = untilEval(variation);
                const line = [...prefix, ...kept.map((m) => m.san)];

                if (ply % 2 === 1) {
                    // The opponent's moves: another defense to beat, unless it is marked SKIP.
                    if (marker !== 'SKIP') {
                        defenses.push(line);
                        walk(kept, prefix);
                    }
                } else if (marker === 'ALT' || marker === 'ALT2') {
                    // The solver's own moves: only marked ones matter. The rest are analysis.
                    alternates.push({ kind: marker === 'ALT' ? 'alt' : 'alt2', ply, line });
                }
            }
        });
    };
    walk(mainline, []);

    return {
        fen,
        userColor: fen.split(' ')[1] === 'b' ? 'black' : 'white',
        lines: [...defenses, mainSans],
        alternates,
    };
}

/**
 * How many moves the solver has to find in a puzzle: their moves across every line, counting a
 * move shared by two lines once, because the trainer does not ask for it twice.
 */
export function countSolverMoves(lines: string[][]): number {
    const turns = new Set<string>();
    for (const line of lines) {
        for (let ply = 0; ply < line.length; ply += 2) {
            turns.add(line.slice(0, ply + 1).join(' '));
        }
    }
    return turns.size;
}
