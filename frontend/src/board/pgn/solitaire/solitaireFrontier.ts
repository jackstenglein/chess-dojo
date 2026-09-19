import { Chess, Move } from '@jackstenglein/chess';
import { ShortcutAction } from '../boardTools/underboard/settings/ShortcutAction';
import { UseSolitaireChessResponse } from './useSolitaireChess';

export type SolitaireFrontierState = Pick<
    UseSolitaireChessResponse,
    'enabled' | 'complete' | 'currentMove'
>;

/**
 * The ply that decides whether a move is revealed: its own ply on the mainline,
 * otherwise the ply of the outermost variation it sits in, which is the ply of
 * the mainline move that variation replaces.
 */
function effectivePly(chess: Chess, move: Move): number {
    let current = move;
    while (!chess.isInMainline(current)) {
        const root = current.variation[0];
        const parent = root.previous;
        if (!parent || chess.isInMainline(parent)) {
            return root.ply;
        }
        current = parent;
    }
    return current.ply;
}

/**
 * Returns true if the given target move lies beyond the solitaire frontier,
 * meaning it has not been revealed yet. The starting position is never beyond.
 */
export function isBeyondSolitaireFrontier(
    chess: Chess,
    frontier: Move | null,
    target: Move | null | undefined,
): boolean {
    if (!target) {
        return false;
    }
    return frontier === null || effectivePly(chess, target) > frontier.ply;
}

/**
 * Whether the action would seek past the solitaire frontier, or insert a move,
 * while solitaire is in progress. Compares plies rather than move identity, so
 * stepping back and forward inside the revealed region stays allowed.
 */
export function solitaireBlocksAction(
    action: ShortcutAction,
    chess: Chess,
    solitaire: SolitaireFrontierState | undefined,
): boolean {
    if (!solitaire?.enabled || solitaire.complete) {
        return false;
    }
    const frontier = solitaire.currentMove;
    switch (action) {
        case ShortcutAction.NextMove:
        case ShortcutAction.FirstVariation:
            // FirstVariation falls back to the next mainline move when there are none.
            return isBeyondSolitaireFrontier(chess, frontier, chess.nextMove());
        case ShortcutAction.LastMove:
            return isBeyondSolitaireFrontier(chess, frontier, chess.lastMove());
        case ShortcutAction.LastMoveVariation: {
            const move = chess.currentMove();
            const target = move ? move.variation[move.variation.length - 1] : null;
            return isBeyondSolitaireFrontier(chess, frontier, target);
        }
        case ShortcutAction.InsertEngineMove:
            // The engine's move is the answer.
            return true;
        default:
            return false;
    }
}
