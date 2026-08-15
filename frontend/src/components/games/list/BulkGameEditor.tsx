import { useFreeTier } from '@/auth/Auth';
import { DirectoryCacheProvider } from '@/components/profile/directories/DirectoryCache';
import { GameInfo, GameKey } from '@/database/game';
import {
    Close,
    CreateNewFolder,
    Delete,
    Download,
    OpenInNew,
    Visibility,
    VisibilityOff,
} from '@mui/icons-material';
import { Alert, IconButton, Paper, Snackbar, Stack, Tooltip, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { Dispatch, SetStateAction, useState, type JSX } from 'react';
import { AddToDirectoryDialog } from '../../../games/list/AddToDirectoryDialog';
import { DeleteGamesDialog } from '../../../games/view/DeleteGameButton';
import { ChangeVisibilityDialog } from './ChangeVisibilityDialog';
import { DownloadGamesDialog } from './DownloadGamesDialog';

interface UseBulkGameEditorResponse {
    /** The list of selected games to be edited. */
    games: GameInfo[];
    /** The list of selected, published games to be edited. */
    published: GameInfo[];
    /** The list of selected, unpublished games to be edited. */
    unpublished: GameInfo[];
    /** Whether the directory picker is open. */
    directoryPickerOpen: boolean;
    /** What state the visibility dialog is in. */
    visibilityDialog: string;
    /** Which games have skipped visibility. */
    visibilitySkipped: GameKey[];
    /** Callback to set which games have skipped visibility. */
    setVisibilitySkipped: (v: GameKey[]) => void;
    /** Whether the download PGN dialog is open. */
    downloadDialog: boolean;
    /** Whether the delete dialog is open. */
    deleteDialogOpen: boolean;
    /** The actions the user can take. */
    actions: {
        /** The title of the action. */
        title: string;
        /** The handler for when the user clicks the action. */
        onClick: () => void;
        /** The element to render for the icon of the action. */
        icon: JSX.Element;
    }[];
    /** Callback to invoke when games have their visibility changed. */
    handleVisibilityChange: (updated: GameKey[], skipped: GameKey[]) => void;
    /** Callback to close any open dialogs. */
    handleClose: () => void;
    /** Callback invoked when games are deleted to update the cache. */
    handleDelete: (keys: GameKey[]) => void;
}

export function useBulkGameEditor({
    allowEdits,
    games = [],
    setGames,
    onClear,
}: {
    /** Whether to show options related to editing games. */
    allowEdits?: boolean;
    games?: GameInfo[];
    setGames?: Dispatch<SetStateAction<GameInfo[]>>;
    /** Callback invoked to clear the selected games. */
    onClear: () => void;
}): UseBulkGameEditorResponse {
    const isFreeTier = useFreeTier();
    const t = useTranslations('games.bulkEditor');
    const [directoryPickerOpen, setDirectoryPickerOpen] = useState(false);
    const [visibilityDialog, setVisibilityDialog] = useState('');
    const [visibilitySkipped, setVisibilitySkipped] = useState<GameKey[]>([]);
    const [downloadDialog, setDownloadDialog] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const handleVisibilityChange = (updated: GameKey[], skipped: GameKey[]) => {
        setGames?.((games) => {
            return games.map((g) => {
                if (updated.some((g2) => g.cohort === g2.cohort && g.id === g2.id)) {
                    return { ...g, unlisted: visibilityDialog === 'unlisted' };
                }
                return g;
            });
        });
        setVisibilityDialog('');
        setVisibilitySkipped(skipped);
    };

    const handleClose = () => {
        setDirectoryPickerOpen(false);
        setVisibilityDialog('');
        setDownloadDialog(false);
        setDeleteDialogOpen(false);
    };

    const handleDelete = (keys: GameKey[]) => {
        const deletedKeys = new Set(keys.map((k) => `${k.cohort}/${k.id}`));
        setGames?.((gs) => gs.filter((g) => !deletedKeys.has(`${g.cohort}/${g.id}`)));
        onClear();
        handleClose();
    };

    const unpublished = games.filter((g) => g.unlisted);
    const published = games.filter((g) => !g.unlisted);

    const actions: UseBulkGameEditorResponse['actions'] = [];

    if (games.length === 1) {
        actions.push({
            title: t('openInNew'),
            onClick: () =>
                window.open(
                    `/games/${encodeURIComponent(games[0].cohort)}/${encodeURIComponent(games[0].id)}`,
                    '_blank',
                ),
            icon: <OpenInNew />,
        });
    }

    actions.push({
        title: t('addToFolder'),
        onClick: () => setDirectoryPickerOpen(true),
        icon: <CreateNewFolder />,
    });

    if (unpublished.length > 0 && !isFreeTier && allowEdits) {
        actions.push({
            title: t('publishGame', { count: unpublished.length }),
            onClick: () => setVisibilityDialog('published'),
            icon: <Visibility />,
        });
    }

    if (published.length > 0 && allowEdits) {
        actions.push({
            title: t('unlistGame', { count: published.length }),
            onClick: () => setVisibilityDialog('unlisted'),
            icon: <VisibilityOff />,
        });
    }

    actions.push({
        title: t('downloadPgn'),
        onClick: () => setDownloadDialog(true),
        icon: <Download />,
    });

    if (allowEdits) {
        actions.push({
            title: t('deleteGame', { count: games.length }),
            onClick: () => setDeleteDialogOpen(true),
            icon: <Delete />,
        });
    }

    return {
        games,
        published,
        unpublished,
        directoryPickerOpen,
        visibilityDialog,
        visibilitySkipped,
        setVisibilitySkipped,
        downloadDialog,
        deleteDialogOpen,
        actions,
        handleVisibilityChange,
        handleClose,
        handleDelete,
    };
}

export function BulkGameEditor({
    games,
    onClear,
    setGames,
}: {
    games: GameInfo[];
    onClear: () => void;
    /** Callback invoked to update the cached list of games after they have been edited. */
    setGames: Dispatch<SetStateAction<GameInfo[]>>;
}) {
    const t = useTranslations('games.bulkEditor');
    const editor = useBulkGameEditor({ games, setGames, onClear, allowEdits: true });

    if (games.length === 0) {
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
                    {t('selected', { count: games.length })}
                </Typography>

                {editor.actions.map((action) => (
                    <Tooltip key={action.title} title={action.title}>
                        <IconButton size='small' onClick={action.onClick}>
                            {action.icon}
                        </IconButton>
                    </Tooltip>
                ))}
            </Stack>

            <BulkGameEditorDialogs editor={editor} />
        </Paper>
    );
}

export function BulkGameEditorDialogs({ editor }: { editor: UseBulkGameEditorResponse }) {
    const t = useTranslations('games.bulkEditor');

    return (
        <>
            <DirectoryCacheProvider>
                <AddToDirectoryDialog
                    open={editor.directoryPickerOpen}
                    games={editor.games}
                    onClose={editor.handleClose}
                />
            </DirectoryCacheProvider>

            {editor.downloadDialog && (
                <DownloadGamesDialog games={editor.games} onClose={editor.handleClose} />
            )}

            {editor.visibilityDialog && (
                <ChangeVisibilityDialog
                    games={
                        editor.visibilityDialog === 'unlisted'
                            ? editor.published
                            : editor.unpublished
                    }
                    onCancel={editor.handleClose}
                    onSuccess={editor.handleVisibilityChange}
                    unlisted={editor.visibilityDialog === 'unlisted'}
                />
            )}

            <DeleteGamesDialog
                open={editor.deleteDialogOpen}
                onClose={editor.handleClose}
                games={editor.games}
                onSuccess={editor.handleDelete}
            />

            <Snackbar
                open={editor.visibilitySkipped.length > 0}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    severity='error'
                    variant='filled'
                    onClose={() => editor.setVisibilitySkipped([])}
                >
                    {t('visibilitySkipped', { count: editor.visibilitySkipped.length })}
                </Alert>
            </Snackbar>
        </>
    );
}
