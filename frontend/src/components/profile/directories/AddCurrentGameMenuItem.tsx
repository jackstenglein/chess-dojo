import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import useGame from '@/context/useGame';
import { Directory } from '@jackstenglein/chess-dojo-common/src/database/directory';
import { DriveFileMove } from '@mui/icons-material';
import {
    CircularProgress,
    Divider,
    ListItemIcon,
    ListItemText,
    MenuItem,
    Tooltip,
} from '@mui/material';
import { useDirectoryCache } from './DirectoryCache';

export const AddCurrentGameMenuItem = ({
    directory,
    onSuccess,
}: {
    directory: Directory;
    onSuccess: () => void;
}) => {
    const api = useApi();
    const request = useRequest();
    const { game } = useGame();
    const cache = useDirectoryCache();

    if (!game) {
        return null;
    }

    const disabled = Boolean(directory.items[`${game.cohort}/${game.id}`]);

    const onAdd = () => {
        if (disabled) {
            return;
        }

        request.onStart();
        api.addDirectoryItems({
            owner: directory.owner,
            id: directory.id,
            games: [
                {
                    owner: game.owner,
                    ownerDisplayName: game.ownerDisplayName,
                    createdAt:
                        game.createdAt ||
                        game.date.replaceAll('.', '-') ||
                        new Date().toISOString(),
                    id: game.id,
                    cohort: game.cohort,
                    white: game.headers.White,
                    black: game.headers.Black,
                    whiteElo: game.headers.WhiteElo,
                    blackElo: game.headers.BlackElo,
                    result: game.headers.Result,
                    unlisted: game.unlisted ?? false,
                    date: game.date,
                },
            ],
        })
            .then((resp) => {
                cache.put(resp.data.directory);
                request.onSuccess();
                trackEvent(EventType.AddDirectoryItems, {
                    count: 1,
                    method: 'add_current_game',
                });
                onSuccess();
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return (
        <>
            <Tooltip
                title={disabled ? 'This game is already in this folder' : ''}
                disableInteractive
            >
                <span>
                    <MenuItem disabled={disabled || request.isLoading()} onClick={onAdd}>
                        <ListItemIcon>
                            {request.isLoading() ? (
                                <CircularProgress size={24} />
                            ) : (
                                <DriveFileMove />
                            )}
                        </ListItemIcon>
                        <ListItemText primary='Add Current Game' />
                    </MenuItem>
                </span>
            </Tooltip>

            <Divider sx={{ my: 1 }} />

            <RequestSnackbar request={request} />
        </>
    );
};
