'use client';

import { PlayArrowRounded } from '@mui/icons-material';
import { Box, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import Image, { StaticImageData } from 'next/image';
import { ReactNode } from 'react';
import { EASE_OUT, ORANGE } from './shared';

const ring = keyframes`
    0% { transform: scale(1); opacity: 0.55; }
    70%, 100% { transform: scale(1.7); opacity: 0; }
`;

/** A poster that opens the email gate, then swaps to the real YouTube player in place. */
export function VideoPlayer({
    youtubeId,
    title,
    poster,
    posterNode,
    playing,
    onPlay,
    overlay,
    priority,
    playAt = { x: '50%', y: '50%' },
}: {
    youtubeId: string;
    title: string;
    poster?: StaticImageData | string;
    /** A poster drawn in code, used in place of an image. */
    posterNode?: ReactNode;
    playing: boolean;
    onPlay: () => void;
    overlay?: ReactNode;
    priority?: boolean;
    /** Where the play button sits, so it never covers the important part of the poster. */
    playAt?: { x: string; y: string };
}) {
    return (
        <Box
            sx={{
                position: 'relative',
                aspectRatio: '16 / 9',
                borderRadius: { xs: 2, md: 3 },
                overflow: 'hidden',
                bgcolor: '#000',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                boxShadow: '0 40px 90px -20px rgba(0, 0, 0, 0.85)',
            }}
        >
            {playing ? (
                <iframe
                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
                    title={title}
                    allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen'
                    allowFullScreen
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        border: 0,
                    }}
                />
            ) : (
                <Box
                    component='button'
                    type='button'
                    aria-label={`Watch ${title}`}
                    onClick={onPlay}
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        width: 1,
                        p: 0,
                        border: 0,
                        font: 'inherit',
                        color: 'inherit',
                        textAlign: 'left',
                        cursor: 'pointer',
                        bgcolor: 'transparent',
                        '& .poster': { transition: `transform 900ms ${EASE_OUT}` },
                        '& .play': { transition: `transform 350ms ${EASE_OUT}` },
                        '@media (hover: hover)': {
                            '&:hover .poster': { transform: 'scale(1.025)' },
                            '&:hover .play': { transform: 'translate(-50%, -50%) scale(1.1)' },
                        },
                    }}
                >
                    {posterNode ? (
                        <Box className='poster' sx={{ position: 'absolute', inset: 0 }}>
                            {posterNode}
                        </Box>
                    ) : (
                        poster && (
                            <Image
                                className='poster'
                                src={poster}
                                alt=''
                                fill
                                priority={priority}
                                unoptimized={typeof poster === 'string'}
                                sizes='(max-width: 1100px) 100vw, 1100px'
                                style={{ objectFit: 'cover' }}
                            />
                        )
                    )}
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            background:
                                'linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.72) 100%)',
                        }}
                    />
                    <Box
                        className='play'
                        sx={{
                            position: 'absolute',
                            left: playAt.x,
                            top: playAt.y,
                            transform: 'translate(-50%, -50%)',
                            width: { xs: '4.5rem', md: '7rem' },
                            height: { xs: '4.5rem', md: '7rem' },
                            borderRadius: '50%',
                            bgcolor: ORANGE,
                            color: '#0b0b12',
                            display: 'grid',
                            placeItems: 'center',
                            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.55)',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                inset: 0,
                                borderRadius: '50%',
                                border: `3px solid ${ORANGE}`,
                                animation: `${ring} 2.6s ${EASE_OUT} infinite`,
                            },
                        }}
                    >
                        <PlayArrowRounded sx={{ fontSize: { xs: '3rem', md: '4.75rem' } }} />
                    </Box>
                    {overlay && (
                        <Typography
                            variant='body2'
                            component='span'
                            sx={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
                        >
                            {overlay}
                        </Typography>
                    )}
                </Box>
            )}
        </Box>
    );
}
