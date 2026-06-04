import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { useChess } from '@/board/pgn/PgnBoard';
import useGame from '@/context/useGame';
import { EventType } from '@jackstenglein/chess';
import Chat from '@mui/icons-material/Chat';
import { Alert, Button, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { getUnsavedSuggestedVariationRoots, saveAllSuggestedVariations } from './suggestVariation';

export function SaveAllVariationsButton() {
    const { user } = useAuth();
    const api = useApi();
    const { chess } = useChess();
    const { game, onUpdateGame } = useGame();
    const request = useRequest();
    const [renderVersion, setRenderVersion] = useState(0);

    useEffect(() => {
        if (!chess) {
            return;
        }

        const observer = {
            types: [
                EventType.NewVariation,
                EventType.UpdateCommand,
                EventType.DeleteMove,
                EventType.DeleteBeforeMove,
                EventType.PromoteVariation,
            ],
            handler: () => setRenderVersion((v) => v + 1),
        };

        chess.addObserver(observer);
        return () => chess.removeObserver(observer);
    }, [chess]);

    const unsavedRoots = useMemo(
        () => getUnsavedSuggestedVariationRoots(user, chess),
        [user, chess, renderVersion],
    );

    if (!user || !game || !onUpdateGame || !chess || unsavedRoots.length === 0) {
        return null;
    }

    const variationLabel =
        unsavedRoots.length === 1
            ? '1 unsaved variation'
            : `${unsavedRoots.length} unsaved variations`;

    const onClick = async () => {
        request.onStart();
        try {
            const response = await saveAllSuggestedVariations(user, game, api, chess);
            if (response.game) {
                onUpdateGame(response.game);
            }
            request.onSuccess();
        } catch (err) {
            request.onFailure(err);
        }
    };

    return (
        <>
            <Alert
                severity='warning'
                variant='outlined'
                action={
                    <Button
                        loading={request.isLoading()}
                        disabled={request.isLoading()}
                        onClick={onClick}
                        size='small'
                        startIcon={<Chat />}
                    >
                        Save All
                    </Button>
                }
            >
                <Typography variant='body2'>{variationLabel}</Typography>
            </Alert>
            <RequestSnackbar request={request} />
        </>
    );
}
