const FILES = 'abcdefgh';

/** Display order for non-pawn pieces: Q, R, B, N, K. */
const PIECE_ORDER: Record<string, number> = {
    Q: 0,
    R: 1,
    B: 2,
    N: 3,
    K: 4,
};

interface PieceEntry {
    type: string;
    square: string;
}

/**
 * Formats one side's pieces into a human-readable string.
 * Non-pawn pieces are listed first in Q > R > B > N > K order (comma-separated),
 * followed by "pawns {sq1} {sq2} ..." if any pawns are present.
 *
 * @param pieces - All pieces for this side, in board-scan order.
 * @returns A formatted string such as "Qd1, Ra1, Rh1, Ke1, pawns a2 b2".
 */
function formatSide(pieces: PieceEntry[]): string {
    const nonPawns = pieces
        .filter((p) => p.type !== 'P')
        .sort((a, b) => (PIECE_ORDER[a.type] ?? 5) - (PIECE_ORDER[b.type] ?? 5));
    const pawns = pieces.filter((p) => p.type === 'P');

    const parts: string[] = [];
    if (nonPawns.length > 0) {
        parts.push(nonPawns.map((p) => `${p.type}${p.square}`).join(', '));
    }
    if (pawns.length > 0) {
        parts.push(
            `pawns ${pawns
                .map((p) => p.square)
                .sort((a, b) => a.localeCompare(b))
                .join(' ')}`,
        );
    }
    return parts.join(', ');
}

/**
 * Converts a FEN string to a human-readable piece list suitable for a blindfold drill.
 * Only the board field of the FEN is used; side-to-move, castling, and other fields
 * are ignored.
 *
 * Output format: "White: {pieces} / Black: {pieces}"
 * Non-pawn pieces appear in Q > R > B > N > K order, then "pawns {sq1} {sq2} ...".
 * Pawns are sorted by file: a -> h.
 *
 * @example
 * fenToPieceList('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
 * // => "White: Qd1, Ra1, Rh1, Bc1, Bf1, Nb1, Ng1, Ke1, pawns a2 b2 c2 d2 e2 f2 g2 h2\nBlack: Qd8, Ra8, Rh8, Bc8, Bf8, Nb8, Ng8, Ke8, pawns a7 b7 c7 d7 e7 f7 g7 h7"
 *
 * @param fen - A valid FEN string.
 * @returns A human-readable description of all pieces on the board.
 */
export function fenToPieceList(fen: string): string {
    const boardField = fen.split(' ')[0];
    const ranks = boardField.split('/');

    const whitePieces: PieceEntry[] = [];
    const blackPieces: PieceEntry[] = [];

    for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
        const rankNum = 8 - rankIdx; // index 0 = rank 8, index 7 = rank 1
        const rankStr = ranks[rankIdx];
        let fileIdx = 0;

        for (const char of rankStr) {
            if (char >= '1' && char <= '8') {
                fileIdx += parseInt(char, 10);
            } else {
                const square = FILES[fileIdx] + `${rankNum}`;
                const pieceType = char.toUpperCase();
                const isWhite = char === char.toUpperCase();

                if (isWhite) {
                    whitePieces.push({ type: pieceType, square });
                } else {
                    blackPieces.push({ type: pieceType, square });
                }
                fileIdx++;
            }
        }
    }

    return `White: ${formatSide(whitePieces)}\nBlack: ${formatSide(blackPieces)}`;
}
