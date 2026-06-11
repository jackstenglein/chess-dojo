import { useApi } from '@/api/Api';
import { isMissingData } from '@/api/gameApi';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { GameInfo, GameKey } from '@/database/game';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';

export function ChangeVisibilityDialog({
    games,
    onCancel,
    onSuccess,
    unlisted,
}: {
    /** The games to update the visibility of. */
    games: GameInfo[];
    /** Callback invoked when the user cancels the visibility change. */
    onCancel: () => void;
    /**
     * Callback invoked with the keys of the updated games and skipped games.
     * Skipped games are present if unlisted is false and some games are missing
     * data required to publish.
     */
    onSuccess: (games: GameKey[], skipped: GameKey[]) => void;
    /** If true, set the games as unlisted. */
    unlisted: boolean;
}) {
    const api = useApi();
    const request = useRequest();

    const onSave = async () => {
        try {
            request.onStart();
            const updated: GameKey[] = [];
            const skipped: GameKey[] = [];

            for (const game of games) {
                if (!unlisted && isMissingData(game)) {
                    skipped.push(game);
                    continue;
                }

                await api.updateGame(game.cohort, game.id, { unlisted });
                updated.push(game);
            }

            request.onSuccess();
            onSuccess(updated, skipped);
        } catch (err) {
            request.onFailure(err);
        }
    };

    return (
        <Dialog open onClose={request.isLoading() ? undefined : onCancel}>
            <DialogTitle>
                {unlisted ? 'Unlist' : 'Publish'}
                {games.length !== 1 ? ` ${games.length}` : ''} Game
                {games.length !== 1 ? 's' : ''}?
            </DialogTitle>
            <DialogContent>
                {unlisted
                    ? 'These games will no longer be searchable in the Dojo database and will be accessible only through folders or the direct URL.'
                    : 'These games will be searchable in the Dojo database by other Dojo members.'}
            </DialogContent>
            <DialogActions>
                <Button disabled={request.isLoading()} onClick={onCancel}>
                    Cancel
                </Button>
                <Button loading={request.isLoading()} onClick={onSave}>
                    {unlisted ? 'Unlist Games' : 'Publish Games'}
                </Button>
            </DialogActions>

            <RequestSnackbar request={request} />
        </Dialog>
    );
}
