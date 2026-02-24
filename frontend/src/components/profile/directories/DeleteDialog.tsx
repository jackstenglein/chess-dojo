import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { MAX_GAMES_PER_DELETE_BATCH } from '@/games/view/DeleteGameButton';
import {
    Directory,
    DirectoryItem,
    DirectoryItemTypes,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { LoadingButton } from '@mui/lab';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useState } from 'react';
import { useDirectoryCache } from './DirectoryCache';

export enum DeleteDialogType {
    Remove = 'REMOVE',
    Delete = 'DELETE',
}

export const DeleteDialog = ({
    type,
    directory,
    items,
    onCancel,
}: {
    /**
     * The type of the dialog when handling games. If set to Remove,
     * games are only removed from the directory. If set to Delete,
     * games are fully deleted from the database. Subdirectories are
     * always fully deleted.
     */
    type: DeleteDialogType;
    /** The directory containing the items to delete. */
    directory: Directory;
    /** The items to delete (or remove). */
    items: DirectoryItem[];
    /** A callback invoked when the user cancels the delete. */
    onCancel: () => void;
}) => {
    const [value, setValue] = useState('');
    const request = useRequest();
    const api = useApi();
    const cache = useDirectoryCache();

    const requiresConfirmation =
        items.some((item) => item.type === DirectoryItemTypes.DIRECTORY) ||
        type === DeleteDialogType.Delete;
    const disableDelete = requiresConfirmation && value.trim() !== 'delete';

    const onDelete = () => {
        if (disableDelete || request.isLoading()) {
            return;
        }

        request.onStart();

        const gameItemIds = items
            .filter((item) => item.type !== DirectoryItemTypes.DIRECTORY)
            .map((item) => item.id);
        const directoryItemIds = items
            .filter((item) => item.type === DirectoryItemTypes.DIRECTORY)
            .map((item) => item.id);

        const promises: Promise<unknown>[] = [];

        if (gameItemIds.length > 0) {
            promises.push(
                api
                    .removeDirectoryItem({
                        owner: directory.owner,
                        directoryId: directory.id,
                        itemIds: gameItemIds,
                    })
                    .then((resp) => {
                        cache.put(resp.data.directory);
                        trackEvent(EventType.RemoveDirectoryItems, {
                            count: gameItemIds.length,
                        });
                    }),
            );
            if (type === DeleteDialogType.Delete) {
                for (let i = 0; i < gameItemIds.length; i += MAX_GAMES_PER_DELETE_BATCH) {
                    const batch = gameItemIds
                        .slice(i, i + MAX_GAMES_PER_DELETE_BATCH)
                        .map((id) => ({
                            cohort: id.split('/')[0],
                            id: id.split('/')[1],
                        }));
                    promises.push(api.deleteGames(batch));
                }
            }
        }
        if (directoryItemIds.length > 0) {
            promises.push(
                api.deleteDirectories(directory.owner, directoryItemIds).then((resp) => {
                    trackEvent(EventType.DeleteDirectory, {
                        count: directoryItemIds.length,
                    });
                    for (const id of directoryItemIds) {
                        cache.remove(id);
                    }

                    if (resp.data.parent) {
                        cache.put(resp.data.parent);
                    }
                }),
            );
        }

        Promise.all(promises)
            .then(onCancel)
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return (
        <Dialog open={true} onClose={request.isLoading() ? undefined : onCancel} fullWidth>
            <DialogTitle>{getDialogTitle(type, items)}</DialogTitle>
            <DialogContent data-cy='delete-directory-form'>
                <Stack spacing={1}>
                    <DeleteDialogContentText type={type} directory={directory} items={items} />

                    {requiresConfirmation && (
                        <>
                            <DialogContentText>To confirm, type `delete` below:</DialogContentText>
                            <TextField
                                data-cy='delete-directory-confirm'
                                placeholder='delete'
                                value={value}
                                onChange={(e) => setValue(e.target.value.toLowerCase())}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        onDelete();
                                    }
                                }}
                                fullWidth
                                autoFocus
                            />
                        </>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button disabled={request.isLoading()} onClick={onCancel}>
                    Cancel
                </Button>
                <LoadingButton
                    data-cy='delete-directory-button'
                    color='error'
                    disabled={disableDelete}
                    loading={request.isLoading()}
                    onClick={onDelete}
                >
                    {type === DeleteDialogType.Delete || requiresConfirmation ? 'Delete' : 'Remove'}
                </LoadingButton>
            </DialogActions>

            <RequestSnackbar request={request} />
        </Dialog>
    );
};

function getDialogTitle(type: DeleteDialogType, items: DirectoryItem[]) {
    if (items.length === 1) {
        if (items[0].type === DirectoryItemTypes.DIRECTORY) {
            return `Delete ${items[0].metadata.name}?`;
        }
        if (type === DeleteDialogType.Remove) {
            return `Remove Game?`;
        }
        return 'Delete Game?';
    }

    let directoryCount = 0;
    let gameCount = 0;

    for (const item of items) {
        if (item.type === DirectoryItemTypes.DIRECTORY) {
            directoryCount++;
        } else {
            gameCount++;
        }
    }

    let title = '';

    if (directoryCount > 0) {
        title += `Delete ${directoryCount} Folder${directoryCount > 1 ? 's' : ''}`;
        if (gameCount > 0) {
            title += ' and ';
        }
    }
    if (gameCount > 0) {
        if (type === DeleteDialogType.Remove) {
            title += 'Remove ';
        } else if (title === '') {
            title += 'Delete ';
        }
        title += `${gameCount} Game${gameCount > 1 ? 's' : ''}`;
    }

    title += '?';
    return title;
}

const DeleteDialogContentText = ({
    type,
    directory,
    items,
}: {
    type: DeleteDialogType;
    directory: Directory;
    items: DirectoryItem[];
}) => {
    if (items.length === 1) {
        if (items[0].type === DirectoryItemTypes.DIRECTORY) {
            return (
                <DialogContentText>
                    This will{' '}
                    <Typography component='strong' color='error' fontWeight='bold'>
                        permanently delete
                    </Typography>{' '}
                    {items[0].metadata.name} and any folders it contains. Any of your games within
                    these folders will not be deleted and will still be available in the All Uploads
                    folder.
                </DialogContentText>
            );
        }
        if (type === DeleteDialogType.Remove) {
            return (
                <DialogContentText>
                    This will remove the game{' '}
                    <strong>
                        {items[0].metadata.white} - {items[0].metadata.black}
                    </strong>{' '}
                    from the <strong>{directory.name}</strong> folder. The game will still be
                    accessible from the All Uploads folder and from any other folders it is in.
                </DialogContentText>
            );
        }
        return (
            <DialogContentText>
                This will{' '}
                <Typography component='strong' color='error' fontWeight='bold'>
                    permanently delete
                </Typography>{' '}
                the game{' '}
                <strong>
                    {items[0].metadata.white} - {items[0].metadata.black}
                </strong>
                . Games added to multiple folders share a single copy. Deleting This games will
                remove it from all folders. It will be <strong>permanently removed</strong> from the
                Dojo website.
            </DialogContentText>
        );
    }

    let directoryCount = 0;
    let gameCount = 0;

    for (const item of items) {
        if (item.type === DirectoryItemTypes.DIRECTORY) {
            directoryCount++;
        } else {
            gameCount++;
        }
    }

    if (directoryCount > 0 && gameCount === 0) {
        return (
            <DialogContentText>
                This will{' '}
                <Typography component='strong' color='error' fontWeight='bold'>
                    permanently delete
                </Typography>{' '}
                {directoryCount} folders and any subfolders. Any of your games within these folders
                will not be permanently deleted and will still be available in the All Uploads
                folder and from any other folders they may be in.
            </DialogContentText>
        );
    }

    if (directoryCount === 0 && gameCount > 0) {
        if (type === DeleteDialogType.Remove) {
            return (
                <DialogContentText>
                    This will remove {gameCount} games from the <strong>{directory.name}</strong>{' '}
                    folder. The games will still be accessible from the All Uploads folder and from
                    any other folders they may be in.
                </DialogContentText>
            );
        }
        return (
            <DialogContentText>
                This will{' '}
                <Typography component='strong' color='error' fontWeight='bold'>
                    permanently delete
                </Typography>{' '}
                {gameCount} games. Games added to multiple folders share a single copy. Deleting
                these games will remove them from all folders. They will be{' '}
                <strong>permanently removed</strong> from the Dojo website.
            </DialogContentText>
        );
    }

    if (type === DeleteDialogType.Remove) {
        return (
            <DialogContentText>
                This will delete {directoryCount} folder{directoryCount > 1 && 's'} and remove{' '}
                {gameCount} game{gameCount > 1 && 's'} from the {directory.name} folder. The game
                {gameCount > 1 && 's'} will still be available in the All Uploads folder and from
                any other folders they may be in. However, the folder
                {directoryCount > 1 && 's'} will be{' '}
                <Typography component='strong' color='error' fontWeight='bold'>
                    permanently deleted
                </Typography>
                , along with any subfolders.
            </DialogContentText>
        );
    }

    return (
        <DialogContentText>
            This will{' '}
            <Typography component='strong' color='error' fontWeight='bold'>
                permanently delete
            </Typography>{' '}
            {directoryCount} folder
            {directoryCount > 1 && 's'} and {gameCount} game{gameCount > 1 && 's'}. Games added to
            multiple folders share a single copy. Deleting{' '}
            {gameCount > 1 ? 'these games will remove them' : 'this game will remove it'} from all
            folders. {gameCount > 1 ? 'They' : 'It'} will be <strong>permanently removed</strong>{' '}
            from the Dojo website. Any subfolders will also be <strong>permanently deleted</strong>.
        </DialogContentText>
    );
};
