'use client';

import { TwitchIcon, YoutubeIcon } from '@/style/SocialMediaIcons';
import { Box, Button, Stack, Typography } from '@mui/material';
import { Body, Condensed, EASE_OUT, HAIRLINE } from '../../class/sections/shared';
import { WATCH } from '../content';

const ICONS = {
    twitch: <TwitchIcon />,
    youtube: <YoutubeIcon />,
};

type StyleObject = Record<string, string | number | object | undefined>;

const BRAND_COLORS = {
    twitch: '#A970FF',
    youtube: '#FF4E45',
};

/**
 * One line for the hero: where to follow the games, with a link to each
 * stream. Kept small so it does not compete with the pick flow.
 */
export function WatchInline({ centered = false, sx }: { centered?: boolean; sx?: StyleObject }) {
    return (
        <Stack
            direction='row'
            sx={{
                alignItems: 'center',
                flexWrap: 'wrap',
                columnGap: 1,
                rowGap: 0.75,
                justifyContent: centered ? 'center' : 'flex-start',
                ...sx,
            }}
        >
            <Typography
                variant='body2'
                sx={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.85)' }}
            >
                {WATCH.hero}
            </Typography>
            {WATCH.links.map((link) => (
                <Box
                    key={link.id}
                    component='a'
                    href={link.href}
                    target='_blank'
                    rel='noopener noreferrer'
                    aria-label={link.label}
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.75,
                        minHeight: { xs: 44, md: 36 },
                        px: 1.5,
                        borderRadius: 999,
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: 'common.white',
                        textDecoration: 'none',
                        bgcolor: 'rgba(255, 255, 255, 0.07)',
                        boxShadow: `inset 0 0 0 1px ${HAIRLINE}`,
                        transition: `background-color 200ms ${EASE_OUT}, transform 150ms ${EASE_OUT}`,
                        '& svg': { fontSize: '1.1rem', color: BRAND_COLORS[link.id] },
                        '@media (hover: hover) and (pointer: fine)': {
                            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.14)' },
                        },
                        '&:active': { transform: 'scale(0.97)' },
                    }}
                >
                    {ICONS[link.id]}
                    {link.name}
                </Box>
            ))}
        </Stack>
    );
}

/** Points visitors to the ChessDojo streams for the games themselves. */
export function Watch({ divided = false }: { divided?: boolean }) {
    return (
        <Box
            sx={
                divided
                    ? {
                          mt: { xs: 3, sm: 3.5 },
                          pt: { xs: 2.5, sm: 3 },
                          borderTop: `1px solid ${HAIRLINE}`,
                      }
                    : undefined
            }
        >
            <Condensed component='h3' sx={{ fontSize: { xs: '1.45rem', md: '1.6rem' } }}>
                {WATCH.heading}
            </Condensed>
            <Body sx={{ mt: 0.75, fontSize: '1.05rem', maxWidth: '36rem' }}>{WATCH.body}</Body>
            <Stack direction='row' sx={{ mt: 2, gap: 1.25, flexWrap: 'wrap' }}>
                {WATCH.links.map((link) => (
                    <Button
                        key={link.id}
                        href={link.href}
                        target='_blank'
                        rel='noopener noreferrer'
                        variant='outlined'
                        startIcon={ICONS[link.id]}
                        sx={{
                            minHeight: 48,
                            px: 2.25,
                            fontWeight: 600,
                            color: 'common.white',
                            borderColor: 'rgba(255, 255, 255, 0.28)',
                            '@media (hover: hover) and (pointer: fine)': {
                                '&:hover': {
                                    borderColor: 'rgba(255, 255, 255, 0.6)',
                                    bgcolor: 'rgba(255, 255, 255, 0.06)',
                                },
                            },
                        }}
                    >
                        {link.label}
                    </Button>
                ))}
            </Stack>
        </Box>
    );
}
