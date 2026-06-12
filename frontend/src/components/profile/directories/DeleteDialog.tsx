import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { MAX_GAMES_PER_DELETE_BATCH } from '@/games/view/DeleteGameButton';
import {
    Directory,
    DirectoryItem,
    DirectoryItemTypes,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
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
import { useTranslations } from 'next-intl';
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
    const t = useTranslations('profile.directories');

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
            <DialogTitle>{getDialogTitle(t, type, items)}</DialogTitle>
            <DialogContent data-testid='delete-directory-form'>
                <Stack spacing={1}>
                    <DeleteDialogContentText type={type} directory={directory} items={items} />

                    {requiresConfirmation && (
                        <>
                            <DialogContentText>{t('confirmDelete')}</DialogContentText>
                            <TextField
                                data-testid='delete-directory-confirm'
                                placeholder={t('deletePlaceholder')}
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
                    {t('cancel')}
                </Button>
                <Button
                    data-testid='delete-directory-button'
                    color='error'
                    disabled={disableDelete}
                    loading={request.isLoading()}
                    onClick={onDelete}
                >
                    {type === DeleteDialogType.Delete || requiresConfirmation
                        ? t('delete')
                        : t('remove')}
                </Button>
            </DialogActions>

            <RequestSnackbar request={request} />
        </Dialog>
    );
};

function getDialogTitle(
    t: ReturnType<typeof useTranslations<'profile.directories'>>,
    type: DeleteDialogType,
    items: DirectoryItem[],
) {
    if (items.length === 1) {
        if (items[0].type === DirectoryItemTypes.DIRECTORY) {
            return t('deleteDirectoryTitle', { name: items[0].metadata.name });
        }
        if (type === DeleteDialogType.Remove) {
            return t('removeGameTitle');
        }
        return t('deleteGameTitle');
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

    if (directoryCount > 0 && gameCount > 0) {
        return t('deleteFoldersAndGamesTitle', {
            dirCount: directoryCount,
            gameCount,
            type: type === DeleteDialogType.Remove ? 'remove' : 'delete',
        });
    }
    if (directoryCount > 0) {
        return t('deleteFoldersTitle', { count: directoryCount });
    }
    return t('deleteOnlyGamesTitle', {
        type: type === DeleteDialogType.Remove ? 'remove' : 'delete',
        gameCount,
    });
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
    const t = useTranslations('profile.directories');

    const richComponents = {
        error: (chunks: React.ReactNode) => (
            <Typography component='strong' color='error' fontWeight='bold'>
                {chunks}
            </Typography>
        ),
        strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
    };

    if (items.length === 1) {
        if (items[0].type === DirectoryItemTypes.DIRECTORY) {
            return (
                <DialogContentText>
                    {t.rich('contentDeleteDirectory', {
                        ...richComponents,
                        name: items[0].metadata.name,
                    })}
                </DialogContentText>
            );
        }
        if (type === DeleteDialogType.Remove) {
            return (
                <DialogContentText>
                    {t.rich('contentRemoveSingleGame', {
                        ...richComponents,
                        white: items[0].metadata.white,
                        black: items[0].metadata.black,
                        folder: directory.name,
                    })}
                </DialogContentText>
            );
        }
        return (
            <DialogContentText>
                {t.rich('contentDeleteSingleGame', {
                    ...richComponents,
                    white: items[0].metadata.white,
                    black: items[0].metadata.black,
                })}
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
                {t.rich('contentDeleteDirectoriesOnly', {
                    ...richComponents,
                    count: directoryCount,
                })}
            </DialogContentText>
        );
    }

    if (directoryCount === 0 && gameCount > 0) {
        if (type === DeleteDialogType.Remove) {
            return (
                <DialogContentText>
                    {t.rich('contentRemoveGamesOnly', {
                        ...richComponents,
                        count: gameCount,
                        folder: directory.name,
                    })}
                </DialogContentText>
            );
        }
        return (
            <DialogContentText>
                {t.rich('contentDeleteGamesOnly', { ...richComponents, count: gameCount })}
            </DialogContentText>
        );
    }

    if (type === DeleteDialogType.Remove) {
        return (
            <DialogContentText>
                {t.rich('contentRemoveMixed', {
                    ...richComponents,
                    dirCount: directoryCount,
                    gameCount,
                    folder: directory.name,
                })}
            </DialogContentText>
        );
    }

    return (
        <DialogContentText>
            {t.rich('contentDeleteMixed', {
                ...richComponents,
                dirCount: directoryCount,
                gameCount,
            })}
        </DialogContentText>
    );
};
