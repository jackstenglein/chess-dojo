import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useRequiredAuth } from '@/auth/Auth';
import { RenderPlayers } from '@/components/games/list/GameListItem';
import LoadingPage from '@/loading/LoadingPage';
import CohortIcon from '@/scoreboard/CohortIcon';
import {
    Directory,
    DirectoryItem,
    DirectoryItemTypes,
    SHARED_DIRECTORY_ID,
} from '@jackstenglein/chess-dojo-common/src/database/directory';
import { ChevronRight, Folder } from '@mui/icons-material';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Stack,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { DirectoryBreadcrumbs } from './DirectoryBreadcrumbs';
import { useDirectory } from './DirectoryCache';

export const MoveDialog = ({
    parent,
    items,
    onCancel,
}: {
    parent: Directory;
    items: DirectoryItem[];
    onCancel: () => void;
}) => {
    const t = useTranslations('profile.directories');
    const { user } = useRequiredAuth();
    const moveRequest = useRequest();
    const [newDirectoryOwner, setNewDirectoryOwner] = useState(user.username);
    const [newDirectoryId, setNewDirectoryId] = useState('home');
    const api = useApi();

    const {
        directory: newDirectory,
        request,
        putDirectory,
        updateDirectory,
    } = useDirectory(newDirectoryOwner, newDirectoryId);

    const disabled = parent.id === newDirectoryId;

    const onNavigate = (owner: string, id: string) => {
        if (id === SHARED_DIRECTORY_ID) {
            setNewDirectoryOwner(user.username);
        } else {
            setNewDirectoryOwner(owner);
        }
        setNewDirectoryId(id);
    };

    const onMove = () => {
        if (disabled) {
            return;
        }

        moveRequest.onStart();
        api.moveDirectoryItems({
            source: {
                owner: parent.owner,
                id: parent.id,
            },
            target: {
                owner: newDirectoryOwner,
                id: newDirectoryId,
            },
            items: items.map((item) => item.id),
        })
            .then((resp) => {
                moveRequest.onSuccess();
                onCancel();
                putDirectory(resp.data.source);
                putDirectory(resp.data.target);
                trackEvent(EventType.MoveDirectoryItems, { count: items.length });

                for (const item of items) {
                    if (item.type === DirectoryItemTypes.DIRECTORY) {
                        updateDirectory({
                            owner: user.username,
                            id: item.id,
                            parent: newDirectoryId,
                            name: item.metadata.name,
                        });
                    }
                }
            })
            .catch((err) => {
                moveRequest.onFailure(err);
            });
    };

    return (
        <Dialog open={true} onClose={moveRequest.isLoading() ? undefined : onCancel} fullWidth>
            <DialogTitle>{getDialogTitle(items, t)}</DialogTitle>
            <DialogContent data-testid='move-directory-form'>
                {newDirectory ? (
                    <Stack>
                        <Stack
                            direction='row'
                            spacing={1.5}
                            sx={{
                                alignItems: 'center',
                            }}
                        >
                            <Typography
                                sx={{
                                    color: 'text.secondary',
                                }}
                            >
                                {t('from')}
                            </Typography>
                            <DirectoryBreadcrumbs
                                owner={parent.owner}
                                id={parent.id}
                                onClick={(item) => onNavigate(item.owner, item.id)}
                                variant='body1'
                                currentProfile={user.username}
                            />
                        </Stack>

                        <Stack
                            direction='row'
                            spacing={1.5}
                            sx={{
                                alignItems: 'center',
                                mb: 1,
                            }}
                        >
                            <Typography
                                sx={{
                                    color: 'text.secondary',
                                }}
                            >
                                {t('to')}
                            </Typography>
                            <DirectoryBreadcrumbs
                                owner={newDirectoryOwner}
                                id={newDirectoryId}
                                onClick={(item) => onNavigate(item.owner, item.id)}
                                variant='body1'
                                currentProfile={user.username}
                            />
                        </Stack>

                        <List>
                            {Object.values(newDirectory.items)
                                .sort((lhs, rhs) => lhs.type.localeCompare(rhs.type))
                                .map((newItem) => (
                                    <MoveListItem
                                        key={newItem.id}
                                        owner={
                                            (newDirectory.id === SHARED_DIRECTORY_ID
                                                ? newItem.addedBy
                                                : newDirectory.owner) ?? newDirectory.owner
                                        }
                                        item={newItem}
                                        onNavigate={onNavigate}
                                        disabled={items.some((item) => item.id === newItem.id)}
                                    />
                                ))}
                        </List>
                        {Object.values(newDirectory.items).length === 0 && (
                            <Typography
                                sx={{
                                    textAlign: 'center',
                                    width: 1,
                                }}
                            >
                                {t('folderEmpty')}
                            </Typography>
                        )}
                    </Stack>
                ) : request.isLoading() ? (
                    <LoadingPage />
                ) : null}
            </DialogContent>
            <DialogActions>
                <Button disabled={moveRequest.isLoading()} onClick={onCancel}>
                    {t('cancel')}
                </Button>
                <Button loading={moveRequest.isLoading()} disabled={disabled} onClick={onMove}>
                    {t('move')}
                </Button>
            </DialogActions>

            <RequestSnackbar request={moveRequest} />
        </Dialog>
    );
};

export function MoveListItem({
    owner,
    item,
    onNavigate,
    disabled,
}: {
    owner: string;
    item: DirectoryItem;
    onNavigate: (owner: string, id: string) => void;
    disabled?: boolean;
}) {
    if (item.type === DirectoryItemTypes.DIRECTORY) {
        return (
            <ListItemButton disabled={disabled} onClick={() => onNavigate(owner, item.id)}>
                <ListItemIcon>
                    <Folder />
                </ListItemIcon>
                <ListItemText primary={item.metadata.name} />
                <ChevronRight />
            </ListItemButton>
        );
    }

    return (
        <ListItemButton disabled>
            <ListItemIcon>
                <CohortIcon
                    cohort={item.metadata.cohort}
                    tooltip={item.metadata.cohort}
                    size={25}
                />
            </ListItemIcon>
            <ListItemText primary={RenderPlayers(item.metadata)} />
        </ListItemButton>
    );
}

function getDialogTitle(
    items: DirectoryItem[],
    t: ReturnType<typeof useTranslations<'profile.directories'>>,
) {
    if (items.length === 1) {
        const item = items[0];
        if (item.type === DirectoryItemTypes.DIRECTORY) {
            return t('moveDirectoryTitle', { name: item.metadata.name });
        }
        return t('moveGameTitle');
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
        return t('moveFoldersAndGamesTitle', { dirCount: directoryCount, gameCount });
    }
    if (directoryCount > 0) {
        return t('moveFoldersTitle', { count: directoryCount });
    }
    return t('moveGamesTitle', { count: gameCount });
}
