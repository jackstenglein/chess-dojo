'use client';

import { Close } from '@mui/icons-material';
import { Box, CircularProgress, IconButton, Paper, Typography } from '@mui/material';
import { LiveClassVideoPlayer } from './LiveClassVideoPlayer';

/**
 * Renders a fixed bottom-right popup player for a live class recording.
 */
export function LiveClassVideoPopup({
    url,
    title,
    loading,
    onClose,
}: {
    url?: string;
    title?: string;
    loading?: boolean;
    onClose: () => void;
}) {
    if (!url && !loading) {
        return null;
    }

    return (
        <Paper
            elevation={8}
            sx={{
                position: 'fixed',
                right: { xs: 8, sm: 24 },
                bottom: { xs: 8, sm: 24 },
                zIndex: (theme) => theme.zIndex.modal,
                width: {
                    xs: 'calc(100vw - 16px)',
                    sm: 'min(600px, calc(100vw - 48px))',
                },
                overflow: 'hidden',
                bgcolor: 'background.paper',
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    px: 1.5,
                    py: 0.75,
                    borderBottom: 1,
                    borderColor: 'divider',
                }}
            >
                <Typography variant='subtitle2' noWrap sx={{ flex: 1, minWidth: 0 }} title={title}>
                    {title}
                </Typography>
                <IconButton size='small' onClick={onClose} aria-label='Close video player'>
                    <Close fontSize='small' />
                </IconButton>
            </Box>

            <Box
                sx={{
                    width: '100%',
                    aspectRatio: '16 / 9',
                    bgcolor: 'common.black',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {url ? (
                    <LiveClassVideoPlayer url={url} />
                ) : (
                    <CircularProgress size={32} sx={{ color: 'common.white' }} />
                )}
            </Box>
        </Paper>
    );
}
