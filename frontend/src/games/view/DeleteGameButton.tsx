import { GameKey } from '@/database/game';
import { useRouter } from '@/hooks/useRouter';
import DeleteIcon from '@mui/icons-material/Delete';
import { LoadingButton } from '@mui/lab';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    IconButtonProps,
    TextField,
    Tooltip,
} from '@mui/material';
import { useState } from 'react';
import { EventType, trackEvent } from '../../analytics/events';
import { useApi } from '../../api/Api';
import { RequestSnackbar, useRequest } from '../../api/Request';

export const MAX_GAMES_PER_DELETE_BATCH = 100;

interface DeleteGameButtonProps {
    games: GameKey[];
    variant?: 'icon' | 'contained' | 'outlined';
    slotProps?: {
        icon?: IconButtonProps;
    };
    onSuccess?: (games: GameKey[]) => void;
}

const DeleteGameButton: React.FC<DeleteGameButtonProps> = ({
    games,
    variant = 'icon',
    slotProps,
    onSuccess,
}) => {
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    return (
        <>
            {variant === 'icon' ? (
                <Tooltip title={`Delete Game${games.length !== 1 ? 's' : ''}`}>
                    <IconButton
                        data-cy='delete-game-button'
                        onClick={() => setShowDeleteModal(true)}
                        {...slotProps?.icon}
                    >
                        <DeleteIcon />
                    </IconButton>
                </Tooltip>
            ) : (
                <Button
                    data-cy='delete-game-button'
                    variant={variant}
                    onClick={() => setShowDeleteModal(true)}
                    color='error'
                >
                    Delete Game{games.length !== 1 ? 's' : ''}
                </Button>
            )}

            <DeleteGamesDialog
                open={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onSuccess={onSuccess}
                games={games}
            />
        </>
    );
};

export default DeleteGameButton;

export function DeleteGamesDialog({
    open,
    onClose,
    onSuccess,
    games,
}: {
    open: boolean;
    onClose: () => void;
    onSuccess?: (games: GameKey[]) => void;
    games: GameKey[];
}) {
    const api = useApi();
    const request = useRequest();
    const router = useRouter();
    const [confirmText, setConfirmText] = useState('');

    const handleClose = () => {
        onClose();
        request.reset();
        setConfirmText('');
    };

    const onDelete = async () => {
        try {
            request.onStart();
            const deleted: GameKey[] = [];

            for (let i = 0; i < games.length; i += MAX_GAMES_PER_DELETE_BATCH) {
                const batch = games.slice(i, i + MAX_GAMES_PER_DELETE_BATCH);
                const resp = await api.deleteGames(batch);
                deleted.push(...resp.data);
            }

            for (const game of deleted) {
                trackEvent(EventType.DeleteGame, {
                    dojo_cohort: game.cohort,
                });
            }

            request.onSuccess();
            if (onSuccess) {
                onSuccess(deleted);
                handleClose();
            } else {
                router.push('/profile?view=games');
            }
        } catch (err) {
            request.onFailure(err);
        }
    };

    return (
        <Dialog open={open} onClose={request.isLoading() ? undefined : handleClose}>
            <DialogTitle>
                Permanently Delete{games.length !== 1 ? ` ${games.length}` : ''} Game
                {games.length !== 1 ? 's' : ''}?
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <DialogContentText>
                    Are you sure you want to delete{' '}
                    {games.length === 1 ? 'this game' : 'these games'}? This action cannot be
                    undone.
                </DialogContentText>
                <DialogContentText variant='body2' color='text.secondary'>
                    Games added to multiple folders share a single copy. Deleting this game will
                    remove it from all folders it appears in.
                </DialogContentText>
                <TextField
                    label='Type "delete" to confirm'
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    fullWidth
                    size='small'
                    autoComplete='off'
                />
            </DialogContent>
            <DialogActions>
                <Button disabled={request.isLoading()} onClick={handleClose}>
                    Cancel
                </Button>
                <LoadingButton
                    data-cy='delete-game-confirm-button'
                    color='error'
                    loading={request.isLoading()}
                    disabled={confirmText !== 'delete'}
                    onClick={onDelete}
                >
                    Delete
                </LoadingButton>
            </DialogActions>
            <RequestSnackbar request={request} />
        </Dialog>
    );
}
