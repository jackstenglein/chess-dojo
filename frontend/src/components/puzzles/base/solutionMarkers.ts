import { Chess, Move } from '@jackstenglein/chess';
import { readMarker, VariationMarker } from '@jackstenglein/chess-dojo-common/src/puzzlebase/lines';

/** A marker at the start of a comment, with the separator that may follow it. */
const LEADING_MARKER = /^\s*(?:SKIP|ALT2|ALT)(?![\w])[\s:.\-–—]*/i;

/**
 * Returns the comment with its leading marker replaced by the given one, or just removed if none
 * is given. The rest of the comment is kept.
 */
export function withMarker(comment: string | undefined, marker?: VariationMarker): string {
    const rest = (comment ?? '').replace(LEADING_MARKER, '').trim();
    if (!marker) {
        return rest;
    }
    return rest ? `${marker} ${rest}` : marker;
}

/** The marker written in the comments of the given move, if any. */
export function markerOf(move: Move): VariationMarker | undefined {
    return readMarker(move.commentAfter) ?? readMarker(move.commentMove);
}

/** Returns true if the move is the first move of a variation, and so can carry a marker. */
export function isVariationHead(chess: Chess, move: Move): boolean {
    const parent = move.previous ? move.previous.next : (chess.history()[0] ?? null);
    return !!parent?.variations.some((variation) => variation[0] === move);
}

/**
 * Whose move the given move is: the solver plays the first move of the puzzle and every other one
 * after it, counting along the line the move is in.
 */
export function mover(move: Move): 'solver' | 'opponent' {
    let index = 0;
    for (let m = move.previous; m; m = m.previous) {
        index++;
    }
    return index % 2 === 0 ? 'solver' : 'opponent';
}
