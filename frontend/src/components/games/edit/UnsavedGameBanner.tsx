import { RequestSnackbar } from '@/api/Request';
import { useUnsavedGame } from '@/hooks/useUnsavedGame';
import { CloudOff } from '@mui/icons-material';
import { Alert, Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import SaveGameDialog, { SaveGameDialogType } from './SaveGameDialog';

interface UnsavedGameBannerProps {
    dismissable?: boolean;
}

/**
 * Renders a banner notifying the user that the current analysis is unsaved. The banner
 * can be optionally dismissed and can open a dialog to save the game.
 */
export function UnsavedGameBanner({ dismissable }: UnsavedGameBannerProps) {
    const t = useTranslations('games.unsavedBanner');
    const {
        showDialog,
        setShowDialog,
        showBanner,
        setShowBanner,
        request,
        onSubmit,
        stagedGame,
        setStagedGame,
    } = useUnsavedGame();

    return (
        <>
            {showBanner && (
                <Alert
                    severity='warning'
                    variant='outlined'
                    action={
                        <Box>
                            {dismissable && (
                                <Button onClick={() => setShowBanner(false)}>{t('dismiss')}</Button>
                            )}
                            <Button onClick={() => setShowDialog(true)}>{t('save')}</Button>
                        </Box>
                    }
                >
                    <Stack
                        direction='row'
                        sx={{
                            alignItems: 'center',
                        }}
                    >
                        <Typography>{t('analysisNotSaved')}</Typography>
                    </Stack>
                </Alert>
            )}
            {showDialog && (
                <SaveGameDialog
                    type={SaveGameDialogType.Save}
                    open={showDialog}
                    title={t('saveAnalysis')}
                    loading={request.isLoading()}
                    onSubmit={onSubmit}
                    onClose={() => setShowDialog(false)}
                    createGameRequest={stagedGame}
                    setCreateGameRequest={setStagedGame}
                />
            )}
            <RequestSnackbar request={request} />
        </>
    );
}

/**
 * Renders an icon notifying the user that the current analysis is unsaved. When clicked,
 * a dialog opens to save the game.
 */
export function UnsavedGameIcon() {
    const t = useTranslations('games.unsavedBanner');
    const { showDialog, setShowDialog, request, onSubmit, stagedGame, setStagedGame } =
        useUnsavedGame();

    return (
        <>
            <Tooltip title={t('analysisNotSaved')}>
                <IconButton onClick={() => setShowDialog(true)}>
                    <CloudOff color='error' />
                </IconButton>
            </Tooltip>

            {showDialog && (
                <SaveGameDialog
                    type={SaveGameDialogType.Save}
                    open={showDialog}
                    title={t('saveAnalysis')}
                    loading={request.isLoading()}
                    onSubmit={onSubmit}
                    onClose={() => setShowDialog(false)}
                    createGameRequest={stagedGame}
                    setCreateGameRequest={setStagedGame}
                />
            )}
            <RequestSnackbar request={request} />
        </>
    );
}
