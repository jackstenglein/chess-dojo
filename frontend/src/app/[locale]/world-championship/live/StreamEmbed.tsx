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
    useMediaQuery,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { PHONE_LANDSCAPE } from './liveLayout';

export const TWITCH_CHANNEL = 'chessdojo';

/** ChessDojo's YouTube channel. Its embed plays the channel's current live stream. */
export const YOUTUBE_CHANNEL_ID = 'UC4liTXRJ-XknH6OtKz-tOuw';

type Platform = 'twitch' | 'youtube';

/** The card is too narrow for its header on one line. That is mostly a phone. */
const NARROW = '@container (max-width: 520px)';

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
    // A phone on its side hides the header, and with it the button that shows
    // the stream again, so the stream is never minimized there.
    const phoneLandscape = useMediaQuery(PHONE_LANDSCAPE);
    const minimized = !!minimizable && savedMinimized && !phoneLandscape;
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
        <Paper
            variant='outlined'
            sx={{
                p: 1.5,
                containerType: 'inline-size',
                // Beside the board on a phone on its side there is room for the
                // player and nothing else.
                ...(minimizable && {
                    [PHONE_LANDSCAPE]: { p: 0, border: 0, bgcolor: 'transparent' },
                }),
            }}
            data-testid='stream-embed'
        >
            <Stack
                direction='row'
                spacing={1.5}
                useFlexGap
                sx={{
                    alignItems: 'center',
                    mb: minimized ? 0 : 1,
                    ...(minimizable && { [PHONE_LANDSCAPE]: { display: 'none' } }),
                    // A narrow card has two lines: the title and the minimize button,
                    // then the switch and the link.
                    flexWrap: 'wrap',
                    rowGap: 0,
                    [NARROW]: { '& > .second-line': { order: 1, mt: 0.5 } },
                }}
            >
                <Typography
                    variant='subtitle1'
                    sx={{ fontWeight: 800, whiteSpace: 'nowrap', [NARROW]: { flexGrow: 1 } }}
                >
                    Watch ChessDojo live
                </Typography>
                <ToggleButtonGroup
                    className='second-line'
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
                <Box className='second-line' sx={{ flexGrow: 1 }} />
                <Link
                    className='second-line'
                    href={openHref}
                    target='_blank'
                    rel='noopener noreferrer'
                    variant='body2'
                >
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
                {/* Ends the first line of a narrow card. */}
                <Box sx={{ display: 'none', [NARROW]: { display: 'block', flexBasis: '100%' } }} />
            </Stack>
            <Box
                hidden={minimized}
                sx={{
                    position: 'relative',
                    width: 1,

                    aspectRatio: '16 / 9',
                    // The page can cap the player's height. A lower player shows
                    // the picture with bars at its sides.
                    maxHeight: 'var(--wc-stream-max-height, none)',
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
