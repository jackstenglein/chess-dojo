import { toPgnDate } from '@/api/gameApi';
import { RequestSnackbar } from '@/api/Request';
import { useFreeTier } from '@/auth/Auth';
import { UnderboardApi } from '@/board/pgn/boardTools/underboard/Underboard';
import { DefaultUnderboardTab } from '@/board/pgn/boardTools/underboard/underboardTabs';
import { useChess } from '@/board/pgn/PgnBoard';
import useGame from '@/context/useGame';
import useSaveGame from '@/hooks/useSaveGame';
import {
    GameImportTypes,
    UpdateGameRequest,
} from '@jackstenglein/chess-dojo-common/src/database/game';
import { InfoOutlined, Visibility, VisibilityOff } from '@mui/icons-material';
import { Alert, Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import React, { useState } from 'react';
import SaveGameDialog, { SaveGameDialogType, SaveGameForm } from './SaveGameDialog';

/** A hook that encapsulates functionality for the UnpublishedGameBanner and VisibilityIcon. */
function useUnpublishedGame() {
    const isFreeTier = useFreeTier();
    const [showDialog, setShowDialog] = useState(false);
    const [showBanner, setShowBanner] = useState(true);
    const { game, onUpdateGame } = useGame();
    const { chess } = useChess();
    const { updateGame, request } = useSaveGame();

    const onSubmit = async (form: SaveGameForm) => {
        if (!chess || !game) {
            return;
        }

        const pgnDate = toPgnDate(form.date) ?? '???.??.??';

        chess.setHeader('White', form.white);
        chess.setHeader('Black', form.black);
        chess.setHeader('Result', form.result);
        chess.setHeader('Date', pgnDate);

        const req: UpdateGameRequest = {
            id: game.id,
            cohort: game.cohort,
            timelineId: game.timelineId,
            unlisted: false,
            pgnText: chess.renderPgn(),
            type: GameImportTypes.manual,
            orientation: form.orientation,
        };

        await updateGame(req).then(() => {
            onUpdateGame?.({ ...game, unlisted: false, orientation: form.orientation });
            setShowDialog(false);
            setShowBanner(false);
        });
    };

    return {
        showBanner: showBanner && !isFreeTier,
        setShowBanner,
        showDialog,
        setShowDialog,
        request,
        onSubmit,
    };
}

interface UnpublishedGameBannerProps {
    dismissable?: boolean;
}

/**
 * Renders a banner notifying the user that the current game is not published. The banner
 * can be optionally dismissed and can open a dialog to publish the game.
 */
export function UnpublishedGameBanner({ dismissable }: UnpublishedGameBannerProps) {
    const { showBanner, setShowBanner, showDialog, setShowDialog, request, onSubmit } =
        useUnpublishedGame();

    return (
        <>
            {showBanner && (
                <Alert
                    icon={
                        <Tooltip title='This game is not published. Other users can find it only if they have the URL.'>
                            <InfoOutlined />
                        </Tooltip>
                    }
                    severity='info'
                    variant='outlined'
                    action={
                        <Box>
                            {dismissable && (
                                <Button onClick={() => setShowBanner(false)}>Dismiss</Button>
                            )}
                            <Button onClick={() => setShowDialog(true)}>Publish</Button>
                        </Box>
                    }
                >
                    <Stack direction='row' alignItems='center'>
                        <Typography variant='body1'>This game is not published</Typography>
                    </Stack>
                </Alert>
            )}
            {showDialog && (
                <SaveGameDialog
                    type={SaveGameDialogType.Publish}
                    open={showDialog}
                    title='Publish Game'
                    loading={request.isLoading()}
                    onSubmit={onSubmit}
                    onClose={() => setShowDialog(false)}
                />
            )}
            <RequestSnackbar request={request} />
        </>
    );
}

/**
 * Renders an icon notifying the user whether the current game is published or not.
 * If unpublished, clicking the icon opens a dialog prompting to publish the game.
 * If published, clicking the icon opens the settings tab.
 */
export function VisibilityIcon({
    underboardRef,
}: {
    underboardRef?: React.RefObject<UnderboardApi | null>;
}) {
    const { showDialog, setShowDialog, request, onSubmit } = useUnpublishedGame();
    const { game } = useGame();

    if (!game) {
        return null;
    }

    return (
        <>
            <Tooltip
                title={
                    game.unlisted
                        ? 'This game is not published. Other users can find it only if they have the URL.'
                        : 'This game is published. Other users can find it on the games tab and on your profile. You can update this in the settings.'
                }
            >
                <IconButton
                    onClick={
                        game.unlisted
                            ? () => setShowDialog(true)
                            : () => underboardRef?.current?.switchTab(DefaultUnderboardTab.Settings)
                    }
                >
                    {game.unlisted ? (
                        <VisibilityOff data-testid='unlisted-icon' color='error' />
                    ) : (
                        <Visibility data-testid='public-icon' sx={{ color: 'text.secondary' }} />
                    )}
                </IconButton>
            </Tooltip>

            {showDialog && (
                <SaveGameDialog
                    type={SaveGameDialogType.Publish}
                    open={showDialog}
                    title='Publish Game'
                    loading={request.isLoading()}
                    onSubmit={onSubmit}
                    onClose={() => setShowDialog(false)}
                />
            )}

            <RequestSnackbar request={request} />
        </>
    );
}
