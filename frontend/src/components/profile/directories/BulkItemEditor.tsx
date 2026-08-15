import { useApi } from '@/api/Api';
import { useAuth, useFreeTier } from '@/auth/Auth';
import { ChangeVisibilityDialog } from '@/components/games/list/ChangeVisibilityDialog';
import { DownloadGamesDialog } from '@/components/games/list/DownloadGamesDialog';
import { GameInfo, GameKey } from '@/database/game';
import {
    compareRoles,
    Directory,
    DirectoryAccessRole,
    DirectoryItem,
    DirectoryItemTypes,
    isDefaultDirectory,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import {
    Close,
    Delete,
    Download,
    DriveFileMoveOutlined,
    DriveFileRenameOutline,
    FolderOff,
    OpenInNew,
    Visibility,
    VisibilityOff,
} from '@mui/icons-material';
import { Alert, IconButton, Paper, Snackbar, Stack, Tooltip, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useMemo, useState, type JSX } from 'react';
import { DeleteDialog, DeleteDialogType } from './DeleteDialog';
import { useDirectoryCache } from './DirectoryCache';
import { MoveDialog } from './MoveDialog';
import { onUpdateDirectory, UpdateDirectoryDialog } from './UpdateDirectoryDialog';

interface UseDirectoryEditorResponse {
    /** The parent directory containing the selected items. */
    directory: Directory;
    /** The items selected to be edited. */
    items: DirectoryItem[];
    /**
     * The list of selected, published games to be edited. Only games the
     * current user owns are included. */
    published: GameInfo[];
    /**
     * The list of selected, unpublished games to be edited. Only games the
     * current user owns are included.
     */
    unpublished: GameInfo[];
    /** Whether the rename dialog is open. */
    renameOpen: boolean;
    /** Whether the move dialog is open. */
    moveOpen: boolean;
    /** Whether the download dialog is open. */
    downloadOpen: boolean;
    /**
     * Whether the remove dialog is open. Contrary to the delete dialog, the remove dialog
     * does not fully delete selected games. The games are only removed from the directory.
     */
    removeOpen: boolean;
    /**
     * Whether the delete dialog is open. Contrary to the remove dialog, the delete dialog
     * fully deletes selected games.
     */
    deleteOpen: boolean;
    /** What state the visibility dialog is in. */
    visibilityDialog: string;
    /** Which games have skipped visibility. */
    visibilitySkipped: GameKey[];
    /** Callback to set which games have skipped visibility. */
    setVisibilitySkipped: (v: GameKey[]) => void;
    /** Opens the rename dialog. */
    onRename: () => void;
    /** Opens the move dialog. */
    onMove: () => void;
    /** Opens the download dialog. */
    onDownload: () => void;
    /** Opens the remove dialog. */
    onRemove: () => void;
    /** Opens the delete dialog. */
    onDelete: () => void;
    /** Closes any open dialogs. */
    handleClose: () => void;
    /** Callback to invoke when games have their visibility changed. */
    handleVisibilityChange: (updated: GameKey[], skipped: GameKey[]) => void;
    /** The actions the user can take. */
    actions: {
        /** The title of the action. */
        title: string;
        /** The handler for when the user clicks the action. */
        onClick: () => void;
        /** The element to render for the icon of the action. */
        icon: JSX.Element;
    }[];
}

export function useDirectoryEditor({
    directory,
    itemIds,
    accessRole,
    onClose,
}: {
    directory: Directory;
    itemIds: string[];
    accessRole: DirectoryAccessRole | undefined;
    onClose: () => void;
}): UseDirectoryEditorResponse {
    const { user } = useAuth();
    const isFreeTier = useFreeTier();
    const cache = useDirectoryCache();
    const t = useTranslations('profile.directories');

    const items = useMemo(() => {
        return itemIds.map((id) => directory.items[id]).filter((item) => item);
    }, [directory, itemIds]);

    const published = items
        .map((item) =>
            item.type !== DirectoryItemTypes.DIRECTORY
                ? {
                      ...item.metadata,
                      headers: {
                          Result: item.metadata.result,
                          White: item.metadata.white,
                          Black: item.metadata.black,
                          Date: item.metadata.createdAt.split('T')[0],
                      },
                  }
                : undefined,
        )
        .filter(
            (item) => item && item.owner === user?.username && !item.unlisted,
        ) as unknown as GameInfo[];

    const unpublished = items
        .map((item) =>
            item.type !== DirectoryItemTypes.DIRECTORY
                ? {
                      ...item.metadata,
                      headers: {
                          Result: item.metadata.result,
                          White: item.metadata.white,
                          Black: item.metadata.black,
                          Date: item.metadata.createdAt.split('T')[0],
                      },
                  }
                : undefined,
        )
        .filter(
            (item) => item && item.owner === user?.username && item.unlisted,
        ) as unknown as GameInfo[];

    const [renameOpen, setRenameOpen] = useState(false);
    const [moveOpen, setMoveOpen] = useState(false);
    const [downloadOpen, setDownloadOpen] = useState(false);
    const [removeOpen, setRemoveOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [visibilityDialog, setVisibilityDialog] = useState('');
    const [visibilitySkipped, setVisibilitySkipped] = useState<GameKey[]>([]);

    const onRename = () => {
        setRenameOpen(true);
    };

    const onMove = () => {
        setMoveOpen(true);
    };

    const onDownload = () => {
        setDownloadOpen(true);
    };

    const onRemove = () => {
        setRemoveOpen(true);
    };

    const onDelete = () => {
        setDeleteOpen(true);
    };

    const handleVisibilityChange = (updated: GameKey[], skipped: GameKey[]) => {
        const newItems = { ...directory.items };
        for (const item of updated) {
            const id = `${item.cohort}/${item.id}`;
            if (newItems[id] && newItems[id].type !== DirectoryItemTypes.DIRECTORY) {
                newItems[id] = {
                    ...newItems[id],
                    metadata: {
                        ...newItems[id].metadata,
                        unlisted: visibilityDialog === 'unlisted',
                    },
                };
            }
        }

        cache.put({ ...directory, items: newItems });
        setVisibilityDialog('');
        setVisibilitySkipped(skipped);
        onClose();
    };

    const handleClose = () => {
        onClose();
        setRenameOpen(false);
        setMoveOpen(false);
        setDownloadOpen(false);
        setRemoveOpen(false);
        setDeleteOpen(false);
        setVisibilityDialog('');
    };

    const defaultDirectorySelected = itemIds.some((id) => isDefaultDirectory(id));
    const showEdit =
        !defaultDirectorySelected &&
        itemIds.length === 1 &&
        directory.items[itemIds[0]]?.type === DirectoryItemTypes.DIRECTORY;
    const isAdmin = compareRoles(DirectoryAccessRole.Admin, accessRole);

    const actions: UseDirectoryEditorResponse['actions'] = [];

    if (
        itemIds.length === 1 &&
        directory.items[itemIds[0]]?.type !== DirectoryItemTypes.DIRECTORY
    ) {
        actions.push({
            title: t('openInNew'),
            onClick: () => window.open(`/games/${itemIds[0]}`, '_blank'),
            icon: <OpenInNew />,
        });
    }

    actions.push({ title: t('downloadPGN'), onClick: onDownload, icon: <Download /> });

    if (showEdit && isAdmin) {
        actions.push({
            title: t('editNameVisibility'),
            onClick: onRename,
            icon: <DriveFileRenameOutline />,
        });
    }

    if (unpublished.length > 0 && !isFreeTier) {
        actions.push({
            title: t('publishGames', { count: unpublished.length }),
            onClick: () => setVisibilityDialog('published'),
            icon: <Visibility />,
        });
    }

    if (published.length > 0) {
        actions.push({
            title: t('unlistGames', { count: published.length }),
            onClick: () => setVisibilityDialog('unlisted'),
            icon: <VisibilityOff />,
        });
    }

    if (!defaultDirectorySelected) {
        actions.push({ title: t('move'), onClick: onMove, icon: <DriveFileMoveOutlined /> });
    }

    if (showEdit) {
        actions.push({ title: t('delete'), onClick: onDelete, icon: <Delete /> });
    } else if (!defaultDirectorySelected) {
        actions.push(
            { title: t('removeFromFolder'), onClick: onRemove, icon: <FolderOff /> },
            { title: t('delete'), onClick: onDelete, icon: <Delete /> },
        );
    }

    return {
        directory,
        items,
        published,
        unpublished,
        renameOpen,
        moveOpen,
        downloadOpen,
        removeOpen,
        deleteOpen,
        visibilityDialog,
        visibilitySkipped,
        setVisibilitySkipped,
        onRename,
        onMove,
        onDownload,
        onRemove,
        onDelete,
        handleClose,
        handleVisibilityChange,
        actions,
    };
}

export const BulkItemEditor = ({
    directory,
    itemIds,
    accessRole,
    onClear,
}: {
    directory: Directory;
    itemIds: string[];
    accessRole: DirectoryAccessRole | undefined;
    onClear: () => void;
}) => {
    const t = useTranslations('profile.directories');
    const editor = useDirectoryEditor({ directory, itemIds, accessRole, onClose: onClear });
    if (editor.items.length === 0) {
        return null;
    }

    return (
        <Paper elevation={4} sx={{ borderRadius: '1.5rem', flexGrow: 1, py: 0.5, px: 1 }}>
            <Stack
                direction='row'
                sx={{
                    alignItems: 'center',
                }}
            >
                <Tooltip title={t('clearSelection')}>
                    <IconButton size='small' onClick={onClear}>
                        <Close />
                    </IconButton>
                </Tooltip>

                <Typography sx={{ ml: 1, mr: 2.5 }}>
                    {t('selectedCount', { count: itemIds.length })}
                </Typography>

                {editor.actions.map((action) => (
                    <Tooltip key={action.title} title={action.title}>
                        <IconButton size='small' sx={{ mr: 1 }} onClick={action.onClick}>
                            {action.icon}
                        </IconButton>
                    </Tooltip>
                ))}
            </Stack>

            <ItemEditorDialogs editor={editor} />
        </Paper>
    );
};

export const ItemEditorDialogs = ({ editor }: { editor: UseDirectoryEditorResponse }) => {
    const api = useApi();
    const cache = useDirectoryCache();
    const t = useTranslations('profile.directories');

    if (
        editor.renameOpen &&
        editor.items.length === 1 &&
        editor.items[0].type === DirectoryItemTypes.DIRECTORY
    ) {
        const selectedItem = editor.items[0];

        return (
            <UpdateDirectoryDialog
                initialName={selectedItem.metadata.name}
                initialVisibility={selectedItem.metadata.visibility}
                title={t('editFolder')}
                saveLabel={t('save')}
                disableSave={(name, visibility) =>
                    name.trim().length === 0 ||
                    name.trim().length > 100 ||
                    (name === selectedItem.metadata.name &&
                        visibility === selectedItem.metadata.visibility)
                }
                onSave={onUpdateDirectory(
                    api,
                    cache,
                    editor.directory,
                    selectedItem,
                    editor.handleClose,
                )}
                onCancel={editor.handleClose}
            />
        );
    }

    if (editor.moveOpen) {
        return (
            <MoveDialog
                parent={editor.directory}
                items={editor.items}
                onCancel={editor.handleClose}
            />
        );
    }

    if (editor.downloadOpen) {
        return (
            <DownloadGamesDialog
                directories={editor.items
                    .filter((item) => item.type === DirectoryItemTypes.DIRECTORY)
                    .map((d) => ({ owner: editor.directory.owner, id: d.id }))}
                games={editor.items
                    .filter((item) => item.type !== DirectoryItemTypes.DIRECTORY)
                    .map((g) => ({ cohort: g.metadata.cohort, id: g.metadata.id }))}
                onClose={editor.handleClose}
            />
        );
    }

    if (editor.removeOpen || editor.deleteOpen) {
        return (
            <DeleteDialog
                directory={editor.directory}
                items={editor.items}
                onCancel={editor.handleClose}
                type={editor.removeOpen ? DeleteDialogType.Remove : DeleteDialogType.Delete}
            />
        );
    }

    if (editor.visibilityDialog) {
        return (
            <ChangeVisibilityDialog
                games={
                    editor.visibilityDialog === 'unlisted' ? editor.published : editor.unpublished
                }
                onCancel={editor.handleClose}
                onSuccess={editor.handleVisibilityChange}
                unlisted={editor.visibilityDialog === 'unlisted'}
            />
        );
    }

    return (
        <Snackbar
            open={editor.visibilitySkipped.length > 0}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
            <Alert
                severity='error'
                variant='filled'
                onClose={() => editor.setVisibilitySkipped([])}
            >
                {t('visibilitySkippedError', { count: editor.visibilitySkipped.length })}
            </Alert>
        </Snackbar>
    );
};
