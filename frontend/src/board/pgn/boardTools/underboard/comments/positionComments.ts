import { Game, PositionComment } from '@/database/game';
import { Chess, Move } from '@jackstenglein/chess';

export enum SortBy {
    Newest = 'NEWEST',
    Oldest = 'OLDEST',
}

export function getCommentsForFen(
    game: Game,
    fen: string,
    move: Move | null,
    sort: SortBy,
): PositionComment[] {
    const fenComments = game.positionComments?.[fen] || {};
    const selectedComments: PositionComment[] = [];

    for (const comment of Object.values(fenComments)) {
        if (comment.ply === (move?.ply || 0) && comment.san === move?.san) {
            selectedComments.push(comment);
        }
    }

    selectedComments.sort((lhs, rhs) => {
        if (sort === SortBy.Newest) {
            return rhs.createdAt.localeCompare(lhs.createdAt);
        }
        return lhs.createdAt.localeCompare(rhs.createdAt);
    });

    return selectedComments;
}

export function getInlineCommentsForMove(
    game: Game | undefined,
    chess: Chess | undefined,
    move: Move | null | undefined,
): PositionComment[] {
    if (!game || !chess || !move) {
        return [];
    }

    return getCommentsForFen(game, chess.normalizedFen(move), move, SortBy.Oldest).filter(
        isInlineComment,
    );
}

export function getInlineCommentsForStartingPosition(
    game: Game | undefined,
    chess: Chess | undefined,
): PositionComment[] {
    if (!game || !chess) {
        return [];
    }

    return getCommentsForFen(game, chess.setUpFen(), null, SortBy.Oldest).filter(isInlineComment);
}

function isInlineComment(comment: PositionComment): boolean {
    return !comment.parentIds?.trim() && comment.content.trim().length > 0;
}
