import { useReconcile } from '@/board/Board';
import { Chess, Move } from '@jackstenglein/chess';
import { Button, Dialog, DialogActions, DialogTitle } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { useChess } from '../../PgnBoard';
import { WarnBeforeDelete } from './settings/EditorSettings';

export interface DeleteAction {
    /** The selected move to perform the delete on. */
    move: Move;

    /** The type of delete. */
    type: 'before' | 'after';

    /** The number of moves to delete. */
    moves: number;

    /** The number of comments to delete. */
    comments: number;
}

/**
 * Recursively counts the number of moves and comments that would
 * be deleted if the given move is deleted.
 * @param chess The chess instance to delete the move from.
 * @param move The move to delete.
 * @param type The type of delete.
 * @returns The number of moves and comments that will be deleted.
 */
export function getDeleteStats(
    chess: Chess,
    move: Move | null,
    type: 'before' | 'after',
): Pick<DeleteAction, 'moves' | 'comments'> {
    if (type === 'before') {
        return getDeleteBeforeStats(chess.firstMove(), move);
    }
    return getDeleteFromStats(move);
}

/**
 * Recursively counts the number of moves and comments that would
 * be deleted if the given move is deleted.
 * @param move The move to delete from.
 * @returns The number of moves and comments that will be deleted.
 */
function getDeleteFromStats(move: Move | null) {
    let moves = 0;
    let comments = 0;

    while (move) {
        moves++;
        if (move.commentMove) {
            comments++;
        }
        if (move.commentAfter) {
            comments++;
        }

        for (const variation of move.variations) {
            const { moves: vMoves, comments: vComments } = getDeleteFromStats(variation[0]);
            moves += vMoves;
            comments += vComments;
        }

        move = move.next;
    }

    return { moves, comments };
}

/**
 * Recursively counts the number of moves and comments that would be
 * deleted, starting at the given move and ending at the given stop move.
 * @param move The move to start deleting from.
 * @param stop The move to stop deleting at (exclusive).
 * @returns The number of moves and comments that will be deleted.
 */
function getDeleteBeforeStats(
    move: Move | null,
    stop: Move | null,
): Pick<DeleteAction, 'moves' | 'comments'> {
    let moves = 0;
    let comments = 0;

    while (move && stop && move !== stop) {
        moves++;

        if (move.commentMove) {
            comments++;
        }
        if (move.commentAfter) {
            comments++;
        }

        for (const variation of move.variations) {
            const { moves: vMoves, comments: vComments } = getDeleteBeforeStats(variation[0], stop);
            moves += vMoves;
            comments += vComments;
        }

        move = move.next;
    }

    return { moves, comments };
}

export interface DeletePromptProps {
    /** The delete to be performed. */
    deleteAction: DeleteAction;

    /** Callback to close the prompt. */
    onClose: () => void;
}

/**
 * Renders a prompt to delete some series of moves.
 * @param deleteAction The delete action to perform.
 * @param onClose Callback to close the prompt.
 */
export function DeletePrompt({ deleteAction, onClose }: DeletePromptProps) {
    const { chess } = useChess();
    const reconcile = useReconcile();
    const t = useTranslations('analysisBoard.underboard');

    const onDelete = () => {
        if (deleteAction.type === 'before') {
            chess?.deleteBefore(deleteAction.move);
        } else {
            chess?.delete(deleteAction.move);
        }
        reconcile();
        onClose();
    };

    return (
        <Dialog open onClose={onClose}>
            <DialogTitle>
                {t('deleteMovesTitle', { count: deleteAction.moves })}
                {deleteAction.comments
                    ? ` ${t('deleteCommentsAppend', { count: deleteAction.comments })}`
                    : ''}
                ?
            </DialogTitle>
            <DialogActions>
                <Button onClick={onClose}>{t('cancel')}</Button>
                <Button onClick={onDelete}>{t('delete')}</Button>
            </DialogActions>
        </Dialog>
    );
}

export function useDeletePrompt(chess: Chess | undefined, onCloseParent?: () => void) {
    const [warnBeforeDelete] = useLocalStorage<number>(
        WarnBeforeDelete.key,
        WarnBeforeDelete.default,
    );
    const [deleteAction, setDeleteAction] = useState<DeleteAction>();
    const reconcile = useReconcile();

    const onDelete = (move: Move | null, type: 'before' | 'after') => {
        if (!move || !chess) {
            return;
        }

        const deleteStats = getDeleteStats(chess, move, type);
        if (deleteStats.moves < warnBeforeDelete) {
            if (type === 'before') {
                chess.deleteBefore(move);
            } else {
                chess.delete(move);
            }
            reconcile();
            onCloseParent?.();
        } else {
            setDeleteAction({ ...deleteStats, move, type });
        }
    };

    const onClose = () => {
        setDeleteAction(undefined);
        onCloseParent?.();
    };

    return { onDelete, deleteAction, onClose };
}
