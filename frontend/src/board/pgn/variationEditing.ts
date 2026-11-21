import { Chess, EventType, Move } from '@jackstenglein/chess';

/** Nest a continuation without promoting its enclosing variation. */
export function forceVariation(chess: Chess, move: Move) {
    if (chess.isInMainline(move)) {
        chess.forceVariation(move, { skipSeek: true });
        return;
    }
    const replacement = chess.pgn.history.addMove(move.san, { previous: move.previous });
    replacement.commentAfter = move.commentAfter;
    replacement.commentDiag = move.commentDiag;
    move.commentAfter = undefined;
    move.commentDiag = undefined;
    if (!move.previous) {
        // At the start of a variation, the parser adds the duplicate as a sibling.
        const parent = chess.getVariantParent(replacement);
        if (!parent) return;
        parent.variations = parent.variations.filter((line) => line !== replacement.variation);
        const line = move.variation;
        const continuation = line.splice(0, line.length, replacement);
        replacement.variation = line;
        replacement.variations = [continuation, ...move.variations];
        move.variations = [];
        for (const item of continuation) item.variation = continuation;
        // Match the structural event emitted by promoteVariation for non-root moves.
        for (const observer of [...chess.observers]) {
            if (observer.types.includes(EventType.PromoteVariation)) {
                observer.handler({
                    type: EventType.PromoteVariation,
                    move: replacement,
                    variantRoot: replacement,
                    variantParent: move,
                });
            }
        }
        return;
    }
    // Move ahead of sibling variations, then into the immediate parent line only.
    while (chess.getVariantParent(replacement) === move) {
        chess.promoteVariation(replacement);
    }
}
