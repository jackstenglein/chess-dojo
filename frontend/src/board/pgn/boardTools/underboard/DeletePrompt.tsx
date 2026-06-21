import { useApi } from '@/api/Api';
import { GameApiContextType } from '@/api/gameApi';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { useReconcile } from '@/board/Board';
import useGame from '@/context/useGame';
import { Game } from '@/database/game';
import { User } from '@/database/user';
import { Chess, Move } from '@jackstenglein/chess';
import { Button, Dialog, DialogActions, DialogTitle } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { useChess } from '../../PgnBoard';
import {
    getSuggestedVariationRoot,
    isSuggestedVariation,
    saveSuggestedVariation,
} from './comments/suggestVariation';
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

function handleBackendSync(
    user: User,
    game: Game,
    api: GameApiContextType,
    chess: Chess,
    rootToSync: Move,
    rootSurvived: boolean,
    onUpdateGame?: (game: Game) => void,
    onFailure?: (err: unknown) => void,
) {
    if (rootSurvived) {
        saveSuggestedVariation(user, game, api, chess, rootToSync)
            .then((res) => {
                if (res?.game) onUpdateGame?.(res.game);
            })
            .catch((err: unknown) => onFailure?.(err));
    } else {
        const dojoComment = rootToSync.commentDiag?.dojoComment;
        if (dojoComment) {
            const lastComma = dojoComment.lastIndexOf(',');
            if (lastComma === -1) return;

            const commentId = dojoComment.substring(lastComma + 1);
            if (commentId && commentId !== 'unsaved') {
                api.deleteComment({
                    cohort: game.cohort,
                    gameId: game.id,
                    id: commentId,
                    fen: chess.normalizedFen(rootToSync.previous),
                    parentIds: '',
                })
                    .then((res) => {
                        if (res?.data) onUpdateGame?.(res.data);
                    })
                    .catch((err: unknown) => onFailure?.(err));
            }
        }
    }
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
    const { user } = useAuth();
    const { game, onUpdateGame } = useGame();
    const api = useApi();
    const syncRequest = useRequest();

    const onDelete = () => {
        if (!chess) {
            return;
        }

        let rootToSync: Move | null = null;
        let shouldSyncBackend = false;
        let rootSurvived = false;

        if (user && game && isSuggestedVariation(deleteAction.move)) {
            rootToSync = getSuggestedVariationRoot(user, deleteAction.move);
            shouldSyncBackend = true;
            if (deleteAction.type === 'before') {
                rootSurvived = false;
            } else {
                rootSurvived = rootToSync !== deleteAction.move;
            }
        }

        if (deleteAction.type === 'before') {
            chess.deleteBefore(deleteAction.move);
        } else {
            chess.delete(deleteAction.move);
        }
        reconcile();

        if (shouldSyncBackend && rootToSync && game && user) {
            handleBackendSync(
                user,
                game,
                api,
                chess,
                rootToSync,
                rootSurvived,
                onUpdateGame,
                syncRequest.onFailure,
            );
        }

        onClose();
    };

    return (
        <>
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
            <RequestSnackbar request={syncRequest} />
        </>
    );
}

export function useDeletePrompt(chess: Chess | undefined, onCloseParent?: () => void) {
    const { user } = useAuth();
    const { game, onUpdateGame } = useGame();
    const api = useApi();
    const syncRequest = useRequest();

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
        let rootToSync: Move | null = null;
        let shouldSyncBackend = false;
        let rootSurvived = false;

        if (user && game && isSuggestedVariation(move)) {
            rootToSync = getSuggestedVariationRoot(user, move);
            shouldSyncBackend = true;
            if (type === 'before') {
                rootSurvived = false;
            } else {
                rootSurvived = rootToSync !== move;
            }
        }

        if (deleteStats.moves < warnBeforeDelete) {
            if (type === 'before') {
                chess.deleteBefore(move);
            } else {
                chess.delete(move);
            }
            reconcile();

            if (shouldSyncBackend && rootToSync && game && user) {
                handleBackendSync(
                    user,
                    game,
                    api,
                    chess,
                    rootToSync,
                    rootSurvived,
                    onUpdateGame,
                    syncRequest.onFailure,
                );
            }

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
