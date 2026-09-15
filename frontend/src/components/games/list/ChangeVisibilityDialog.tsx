import { useApi } from '@/api/Api';
import { isMissingData } from '@/api/gameApi';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { GameInfo, GameKey } from '@/database/game';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useTranslations } from 'next-intl';

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
    const t = useTranslations('games.visibilityDialog');

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
                {t(unlisted ? 'unlistTitle' : 'publishTitle', { count: games.length })}
            </DialogTitle>
            <DialogContent>{unlisted ? t('unlistMessage') : t('publishMessage')}</DialogContent>
            <DialogActions>
                <Button disabled={request.isLoading()} onClick={onCancel}>
                    {t('cancel')}
                </Button>
                <Button loading={request.isLoading()} onClick={onSave}>
                    {t(unlisted ? 'unlistGames' : 'publishGames')}
                </Button>
            </DialogActions>

            <RequestSnackbar request={request} />
        </Dialog>
    );
}
