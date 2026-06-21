import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useRequiredAuth } from '@/auth/Auth';
import { DirectoryBreadcrumbs } from '@/components/profile/directories/DirectoryBreadcrumbs';
import { useDirectory, useDirectoryCache } from '@/components/profile/directories/DirectoryCache';
import { MoveListItem } from '@/components/profile/directories/MoveDialog';
import { GameInfo } from '@/database/game';
import LoadingPage from '@/loading/LoadingPage';
import { HOME_DIRECTORY_ID } from '@jackstenglein/chess-dojo-common/src/database/directory';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    List,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export const AddToDirectoryDialog = ({
    games,
    open,
    onClose,
}: {
    games?: GameInfo[];
    open: boolean;
    onClose: () => void;
}) => {
    const t = useTranslations('games.list.addToDirectoryDialog');
    const { user } = useRequiredAuth();
    const [directoryId, setDirectoryId] = useState(HOME_DIRECTORY_ID);
    const { directory, request: directoryRequest } = useDirectory(user.username, directoryId);
    const cache = useDirectoryCache();
    const request = useRequest<string>();
    const api = useApi();

    const onNavigate = (_owner: string, id: string) => {
        setDirectoryId(id);
    };

    const alreadyExists = games?.every((g) => Boolean(directory?.items[`${g.cohort}/${g.id}`]));

    const onAdd = () => {
        if (!games?.length) {
            return;
        }

        const gamesToAdd = [];
        for (const game of games) {
            if (directory?.items[`${game.cohort}/${game.id}`]) {
                continue;
            }

            gamesToAdd.push({
                owner: game.owner,
                ownerDisplayName: game.ownerDisplayName,
                createdAt:
                    game.createdAt || game.date.replaceAll('.', '-') || new Date().toISOString(),
                id: game.id,
                cohort: game.cohort,
                white: game.headers.White,
                black: game.headers.Black,
                whiteElo: game.headers.WhiteElo,
                blackElo: game.headers.BlackElo,
                result: game.headers.Result,
                unlisted: game.unlisted ?? false,
                date: game.date,
            });
        }

        if (gamesToAdd.length === 0) {
            request.onSuccess(t('allAlreadyPresent', { directoryName: directory?.name ?? '' }));
            onClose();
            return;
        }

        request.onStart();
        api.addDirectoryItems({
            owner: user.username,
            id: directoryId,
            games: gamesToAdd,
        })
            .then((resp) => {
                cache.put(resp.data.directory);
                request.onSuccess(
                    t('gamesAddedTo', {
                        count: games.length,
                        directoryName: resp.data.directory.name,
                    }),
                );
                trackEvent(EventType.AddDirectoryItems, {
                    count: gamesToAdd.length,
                    method: 'add_to_directory_dialog',
                });
                onClose();
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return (
        <>
            <Dialog
                open={open && !!games?.length}
                onClose={request.isLoading() ? undefined : onClose}
                fullWidth
            >
                <DialogTitle>
                    {t('dialogTitle', {
                        count: games?.length ?? 0,
                        directoryName: directory?.name ?? t('fallbackFolder'),
                    })}
                </DialogTitle>
                <DialogContent>
                    {directory ? (
                        <Stack spacing={1}>
                            <DirectoryBreadcrumbs
                                owner={user.username}
                                id={directoryId}
                                onClick={(item) => onNavigate(item.owner, item.id)}
                                variant='h6'
                            />

                            <Divider>{t('currentContents')}</Divider>

                            <List>
                                {Object.values(directory.items)
                                    .sort((lhs, rhs) => lhs.type.localeCompare(rhs.type))
                                    .map((newItem) => (
                                        <MoveListItem
                                            key={newItem.id}
                                            owner={user.username}
                                            item={newItem}
                                            onNavigate={onNavigate}
                                        />
                                    ))}
                            </List>
                            {Object.values(directory.items).length === 0 && (
                                <Typography textAlign='center' width={1}>
                                    {t('folderEmpty')}
                                </Typography>
                            )}
                        </Stack>
                    ) : directoryRequest.isLoading() ? (
                        <LoadingPage />
                    ) : null}
                </DialogContent>
                <DialogActions>
                    <Button disabled={request.isLoading()} onClick={onClose}>
                        {t('cancel')}
                    </Button>
                    <Tooltip title={alreadyExists ? t('alreadyAddedTooltip') : ''}>
                        <div>
                            <Button
                                disabled={alreadyExists}
                                loading={request.isLoading()}
                                onClick={onAdd}
                            >
                                {t('addButton')}
                            </Button>
                        </div>
                    </Tooltip>
                </DialogActions>
            </Dialog>

            <RequestSnackbar request={request} showSuccess />
        </>
    );
};
