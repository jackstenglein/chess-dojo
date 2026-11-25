'use client';

import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
    Box,
    IconButton,
    Link,
    Paper,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';

export const TWITCH_CHANNEL = 'chessdojo';

/** ChessDojo's YouTube channel. Its embed plays the channel's current live stream. */
export const YOUTUBE_CHANNEL_ID = 'UC4liTXRJ-XknH6OtKz-tOuw';

type Platform = 'twitch' | 'youtube';

/**
 * The ChessDojo stream on Twitch or YouTube. The viewer picks one and the
 * browser remembers it. Twitch only plays inside pages whose host it is told
 * about, so the player is added once the host is known in the browser.
 */
export function StreamEmbed({ minimizable }: { minimizable?: boolean } = {}) {
    const [host, setHost] = useState<string>();
    // A minimized stream keeps only its header. The player is taken out of the
    // page, so the stream also stops playing.
    const [savedMinimized, setMinimized] = useLocalStorage('wcLive.streamMinimized', false, {
        initializeWithValue: false,
    });
    const minimized = !!minimizable && savedMinimized;
    useEffect(() => setHost(window.location.hostname), []);
    // The server cannot see the saved choice, so the first render is always
    // Twitch and the saved choice is read after that. Reading it straight away
    // would make the first render differ from the server's.
    const [platform, setPlatform] = useLocalStorage<Platform>('wcLive.streamPlatform', 'twitch', {
        initializeWithValue: false,
    });

    const src =
        platform === 'youtube'
            ? `https://www.youtube.com/embed/live_stream?channel=${YOUTUBE_CHANNEL_ID}&mute=1`
            : host &&
              `https://player.twitch.tv/?channel=${TWITCH_CHANNEL}&parent=${encodeURIComponent(host)}&muted=true`;
    const openHref =
        platform === 'youtube'
            ? `https://www.youtube.com/channel/${YOUTUBE_CHANNEL_ID}/live`
            : `https://www.twitch.tv/${TWITCH_CHANNEL}`;

    return (
        <Paper variant='outlined' sx={{ p: 1.5 }} data-testid='stream-embed'>
            <Stack
                direction='row'
                spacing={1.5}
                sx={{ alignItems: 'center', mb: minimized ? 0 : 1 }}
            >
                <Typography variant='subtitle1' sx={{ fontWeight: 800 }}>
                    Watch ChessDojo live
                </Typography>
                <ToggleButtonGroup
                    size='small'
                    exclusive
                    value={platform}
                    onChange={(_, v: Platform | null) => v && setPlatform(v)}
                    aria-label='Stream platform'
                >
                    <ToggleButton value='twitch' sx={{ textTransform: 'none', py: 0.25 }}>
                        Twitch
                    </ToggleButton>
                    <ToggleButton value='youtube' sx={{ textTransform: 'none', py: 0.25 }}>
                        YouTube
                    </ToggleButton>
                </ToggleButtonGroup>
                <Box sx={{ flexGrow: 1 }} />
                <Link href={openHref} target='_blank' rel='noopener noreferrer' variant='body2'>
                    Open on {platform === 'youtube' ? 'YouTube' : 'Twitch'}
                </Link>
                {minimizable && (
                    <Tooltip title={minimized ? 'Show the stream' : 'Minimize the stream'}>
                        <IconButton
                            size='small'
                            aria-label={minimized ? 'Show the stream' : 'Minimize the stream'}
                            aria-expanded={!minimized}
                            onClick={() => setMinimized(!minimized)}
                        >
                            {minimized ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                        </IconButton>
                    </Tooltip>
                )}
            </Stack>
            <Box
                hidden={minimized}
                sx={{
                    position: 'relative',
                    width: 1,

                    aspectRatio: '16 / 9',
                    bgcolor: 'black',
                    borderRadius: 1,
                    overflow: 'hidden',
                }}
            >
                {src && !minimized && (
                    <iframe
                        key={platform}
                        title={`ChessDojo on ${platform === 'youtube' ? 'YouTube' : 'Twitch'}`}
                        src={src}
                        allow='autoplay; encrypted-media; picture-in-picture; fullscreen'
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
