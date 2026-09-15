import { Game, PositionComment } from '@/database/game';
import { Chess, Move } from '@jackstenglein/chess';

/**
 * Merges suggested variations from position comments into the game's PGN.
 * Mutates the game object in place.
 */
export function mergeSuggestedVariations(game: Game) {
    const suggestions: Record<string, PositionComment[]> = {};
    for (const [fen, positionComments] of Object.entries(game.positionComments || {})) {
        for (const comment of Object.values(positionComments)) {
            if (comment.suggestedVariation) {
                suggestions[fen] = (suggestions[fen] ?? []).concat(comment);
            }
        }
    }

    if (Object.keys(suggestions).length === 0) {
        return;
    }

    const chess = new Chess({ pgn: game.pgn });
    const stack: Move[] = [];
    let move = null;

    do {
        const comments = suggestions[chess.normalizedFen(move)];
        if (comments) {
            mergeFromMove(chess, move, comments);
        }

        const nextMove = chess.nextMove(move);
        if (nextMove) {
            stack.push(nextMove);
        }
        for (const variation of move?.variations ?? []) {
            stack.push(variation[0]);
        }

        move = stack.pop() ?? null;
    } while (move);

    game.pgn = chess.renderPgn();
}

function mergeFromMove(chess: Chess, move: Move | null, comments: PositionComment[]) {
    comments.sort((lhs, rhs) => lhs.createdAt.localeCompare(rhs.createdAt));

    for (const comment of comments) {
        const commentChess = new Chess({ pgn: comment.suggestedVariation });
        recursiveMergeLine(commentChess.history(), chess, move, comment);
    }
}

function recursiveMergeLine(
    line: Move[],
    target: Chess,
    currentTargetMove: Move | null,
    comment: PositionComment,
) {
    for (const move of line) {
        const newTargetMove = target.move(move.san, {
            previousMove: currentTargetMove,
            skipSeek: true,
        });
        if (!newTargetMove) {
            return;
        }

        target.setCommand(
            'dojoComment',
            `${comment.owner.username},${comment.owner.displayName},${comment.id}`,
            newTargetMove,
        );
        for (const variation of move.variations) {
            recursiveMergeLine(variation, target, currentTargetMove, comment);
        }

        currentTargetMove = newTargetMove;
    }
}
