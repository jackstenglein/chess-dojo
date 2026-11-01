import { Chess } from '@jackstenglein/chess';

/**
 * Loads the given PGN into the chess instance and seeks back to the move the user
 * was on before the load, as far as that move path still exists in the new PGN.
 * @param chess The chess instance to restore.
 * @param pgn The PGN to load.
 */
export function restorePgn(chess: Chess, pgn: string) {
    let currentMove = chess.currentMove();
    chess.loadPgn(pgn);
    // Published so observers never keep the last move loadPgn announced if no move
    // below can be replayed (e.g. undoing "Delete before here").
    chess.seek(null);

    const moves = [];
    while (currentMove) {
        moves.push(currentMove);
        currentMove = currentMove.previous;
    }

    for (let i = moves.length - 1; i >= 0; i--) {
        if (!chess.move(moves[i].san, { existingOnly: true })) {
            break;
        }
    }
}
