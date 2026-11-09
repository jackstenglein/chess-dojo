import { Chess, CommentType } from '@jackstenglein/chess';

/** PGN attaches text between mainline moves to the preceding position. */
export function getEditorComment(chess: Chess, type: CommentType): string {
    const move = chess.currentMove();
    if (!move) return chess.pgn.gameComment.comment ?? '';
    if (type === CommentType.Before && chess.isInMainline(move)) {
        return (
            move.commentMove ??
            (move.previous
                ? (move.previous.commentAfter ?? '')
                : (chess.pgn.gameComment.comment ?? ''))
        );
    }
    return (type === CommentType.Before ? move.commentMove : move.commentAfter) ?? '';
}

export function setEditorComment(chess: Chess, text: string, type: CommentType): void {
    const move = chess.currentMove();
    if (move && type === CommentType.Before && chess.isInMainline(move)) {
        // Normalize any before-comment created by the older editor to the PGN-stable position.
        if (move.commentMove) chess.setComment('', CommentType.Before, move);
        chess.setComment(text, CommentType.After, move.previous ?? null);
    } else {
        chess.setComment(text, type);
    }
}
