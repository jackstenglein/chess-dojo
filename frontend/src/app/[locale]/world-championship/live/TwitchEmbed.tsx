'use client';

import { Box, Link, Paper, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

export const TWITCH_CHANNEL = 'chessdojo';

/**
 * The ChessDojo stream, live under the board. Twitch only plays inside pages
 * whose host it is told about, so the player is added once the host is known
 * in the browser.
 */
export function TwitchEmbed() {
    const [host, setHost] = useState<string>();
    useEffect(() => setHost(window.location.hostname), []);

    return (
        <Paper variant='outlined' sx={{ p: 2, mt: 3 }} data-testid='twitch-embed'>
            <Stack
                direction='row'
                sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 1.5 }}
            >
                <Typography variant='h6' sx={{ fontWeight: 800 }}>
                    Watch ChessDojo live
                </Typography>
                <Link
                    href={`https://www.twitch.tv/${TWITCH_CHANNEL}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    variant='body2'
                >
                    Open on Twitch
                </Link>
            </Stack>
            <Box
                sx={{
                    position: 'relative',
                    width: 1,
                    maxWidth: 1100,
                    mx: 'auto',
                    aspectRatio: '16 / 9',
                    bgcolor: 'black',
                    borderRadius: 1,
                    overflow: 'hidden',
                }}
            >
                {host && (
                    <iframe
                        title='ChessDojo on Twitch'
                        src={`https://player.twitch.tv/?channel=${TWITCH_CHANNEL}&parent=${encodeURIComponent(host)}&muted=true`}
                        allowFullScreen
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            border: 0,
                        }}
                    />
                )}
            </Box>
        </Paper>
    );
}
