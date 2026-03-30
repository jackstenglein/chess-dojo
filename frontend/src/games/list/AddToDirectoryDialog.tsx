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
import { LoadingButton } from '@mui/lab';
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
            request.onSuccess(`All games already present in ${directory?.name}`);
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
                    `Game${games.length !== 1 ? 's' : ''} added to ${resp.data.directory.name}`,
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
                    Add {games?.length} Game{games?.length !== 1 && 's'} to{' '}
                    {directory?.name ?? 'Folder'}?
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

                            <Divider>Current Contents</Divider>

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
                                    This folder is empty
                                </Typography>
                            )}
                        </Stack>
                    ) : directoryRequest.isLoading() ? (
                        <LoadingPage />
                    ) : null}
                </DialogContent>
                <DialogActions>
                    <Button disabled={request.isLoading()} onClick={onClose}>
                        Cancel
                    </Button>
                    <Tooltip
                        title={
                            alreadyExists ? 'These games are already added to this directory' : ''
                        }
                    >
                        <div>
                            <LoadingButton
                                disabled={alreadyExists}
                                loading={request.isLoading()}
                                onClick={onAdd}
                            >
                                Add
                            </LoadingButton>
                        </div>
                    </Tooltip>
                </DialogActions>
            </Dialog>

            <RequestSnackbar request={request} showSuccess />
        </>
    );
};
