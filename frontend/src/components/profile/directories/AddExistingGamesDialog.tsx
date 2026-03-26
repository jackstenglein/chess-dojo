import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useRequiredAuth } from '@/auth/Auth';
import GameTable from '@/components/games/list/GameTable';
import { GameInfo } from '@/database/game';
import { usePagination } from '@/hooks/usePagination';
import { logger } from '@/logging/logger';
import { Directory } from '@jackstenglein/chess-dojo-common/src/database/directory';
import { LoadingButton } from '@mui/lab';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from '@mui/material';
import { GridPaginationModel, GridRowSelectionModel, useGridApiRef } from '@mui/x-data-grid-pro';
import { useCallback, useState } from 'react';
import { useDirectoryCache } from './DirectoryCache';

export const AddExistingGamesDialog = ({
    directory,
    onCancel,
}: {
    directory: Directory;
    onCancel: () => void;
}) => {
    const api = useApi();
    const { user } = useRequiredAuth();
    const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>({
        type: 'include',
        ids: new Set(),
    });
    const addRequest = useRequest();
    const gridApiRef = useGridApiRef();
    const cache = useDirectoryCache();

    const searchByOwner = useCallback(
        (startKey: string) => api.listGamesByOwner(user.username, startKey),
        [api, user.username],
    );

    const filterGames = useCallback(
        (game: GameInfo) => {
            return !directory.items[`${game.cohort}/${game.id}`];
        },
        [directory],
    );

    const pagination = usePagination(searchByOwner, 0, 10, filterGames);

    const onPaginationModelChange = (model: GridPaginationModel) => {
        if (model.pageSize !== pagination.pageSize) {
            pagination.setPageSize(model.pageSize);
        }
    };

    const onAdd = () => {
        if (selectedRows.ids.size === 0 || addRequest.isLoading()) {
            return;
        }

        const rows = gridApiRef.current?.getSelectedRows() ?? new Map();
        if (rows.size !== selectedRows.ids.size) {
            logger.error?.(
                `Grid API getSelectedRows has size ${rows.size} but state selectedRows has size ${selectedRows.ids.size}`,
            );
            return;
        }

        const games = [];
        for (const row of rows.values()) {
            const game = row as GameInfo;
            games.push({
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

        addRequest.onStart();
        api.addDirectoryItems({ owner: directory.owner, id: directory.id, games })
            .then((resp) => {
                cache.put(resp.data.directory);
                addRequest.onSuccess();
                trackEvent(EventType.AddDirectoryItems, {
                    count: games.length,
                    method: 'add_existing_games_dialog',
                });
                onCancel();
            })
            .catch((err) => {
                addRequest.onFailure(err);
            });
    };

    return (
        <Dialog
            open={true}
            onClose={addRequest.isLoading() ? undefined : onCancel}
            fullWidth
            maxWidth='md'
        >
            <DialogTitle>Add Games to {directory.name}?</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 1 }}>
                    Click games to select. Use Shift+Click or Cmd/Ctrl+Click to select multiple
                    games.
                </DialogContentText>

                <GameTable
                    apiRef={gridApiRef}
                    namespace='my-existing-games'
                    pagination={pagination}
                    onPaginationModelChange={onPaginationModelChange}
                    checkboxSelection
                    checkboxSelectionVisibleOnly
                    onRowSelectionModelChange={setSelectedRows}
                    rowSelectionModel={selectedRows}
                    defaultVisibility={{
                        unlisted: true,
                        owner: false,
                    }}
                />
            </DialogContent>

            <DialogActions>
                <Button disabled={addRequest.isLoading()} onClick={onCancel}>
                    Cancel
                </Button>

                <LoadingButton
                    disabled={selectedRows.ids.size === 0}
                    loading={addRequest.isLoading()}
                    onClick={onAdd}
                >
                    {selectedRows.ids.size
                        ? `Add ${selectedRows.ids.size} Game${selectedRows.ids.size > 1 ? 's' : ''}`
                        : 'Add Games'}
                </LoadingButton>
            </DialogActions>

            <RequestSnackbar request={pagination.request} />
            <RequestSnackbar request={addRequest} />
        </Dialog>
    );
};
