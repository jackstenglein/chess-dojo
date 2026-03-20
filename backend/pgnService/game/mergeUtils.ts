import { DiagramComment, Move } from '@jackstenglein/chess';
import {
    PgnMergeType,
    PgnMergeTypes,
} from '@jackstenglein/chess-dojo-common/src/pgn/merge';

/**
 * Merges the comments from the given source move into the target move.
 * @param source The move whose comments will be merged in.
 * @param target The move that receives the merged comments.
 * @param mergeType Controls whether comments are merged, overwritten, or discarded.
 */
export function mergeComments(source: Move, target: Move, mergeType: PgnMergeType) {
    if (mergeType === PgnMergeTypes.DISCARD) {
        return;
    }

    if (source.commentAfter) {
        if (mergeType === PgnMergeTypes.OVERWRITE || !target.commentAfter) {
            target.commentAfter = source.commentAfter;
        } else {
            target.commentAfter += `\n\n${source.commentAfter}`;
        }
    }

    if (source.commentMove) {
        if (mergeType === PgnMergeTypes.OVERWRITE || !target.commentMove) {
            target.commentMove = source.commentMove;
        } else {
            target.commentMove += `\n\n${source.commentMove}`;
        }
    }
}

/**
 * Merges the NAGs from the given source move into the target move.
 * @param source The move whose NAGs will be merged in.
 * @param target The move that receives the merged NAGs.
 * @param mergeType Controls whether NAGs are merged, overwritten, or discarded.
 */
export function mergeNags(source: Move, target: Move, mergeType: PgnMergeType) {
    if (mergeType === PgnMergeTypes.DISCARD) {
        return;
    }

    if (source.nags) {
        if (mergeType === PgnMergeTypes.OVERWRITE || !target.nags) {
            target.nags = [...source.nags];
        } else {
            target.nags.push(...source.nags);
            target.nags = target.nags.filter(
                (nag, index) => target.nags?.indexOf(nag) === index,
            );
        }
    }
}

/**
 * Merges the color arrows and color fields from the given source move into the target move.
 * @param source The move whose drawables will be merged in.
 * @param target The move that receives the merged drawables.
 * @param mergeType Controls whether drawables are merged, overwritten, or discarded.
 */
export function mergeDrawables(source: Move, target: Move, mergeType: PgnMergeType) {
    if (mergeType === PgnMergeTypes.DISCARD) {
        return;
    }

    if (source.commentDiag?.colorArrows) {
        if (mergeType === PgnMergeTypes.OVERWRITE || !target.commentDiag?.colorArrows) {
            target.commentDiag = {
                ...target.commentDiag,
                colorArrows: [...source.commentDiag.colorArrows],
            } as DiagramComment;
        } else {
            target.commentDiag.colorArrows.push(...source.commentDiag.colorArrows);
            target.commentDiag.colorArrows = target.commentDiag.colorArrows.filter(
                (arrow, index) => target.commentDiag?.colorArrows?.indexOf(arrow) === index,
            );
        }
    }

    if (source.commentDiag?.colorFields) {
        if (mergeType === PgnMergeTypes.OVERWRITE || !target.commentDiag?.colorFields) {
            target.commentDiag = {
                ...target.commentDiag,
                colorFields: [...source.commentDiag.colorFields],
            } as DiagramComment;
        } else {
            target.commentDiag.colorFields.push(...source.commentDiag.colorFields);
            target.commentDiag.colorFields = target.commentDiag.colorFields.filter(
                (field, index) => target.commentDiag?.colorFields?.indexOf(field) === index,
            );
        }
    }
}

/**
 * Returns a display string for the given player/ELO.
 * @param name The name of the player.
 * @param elo The ELO of the player.
 */
export function getPlayer(name: string | undefined, elo: string | undefined): string {
    let result = name || 'NN';
    if (elo) {
        return `${result} (${elo})`;
    }
    return result;
}
