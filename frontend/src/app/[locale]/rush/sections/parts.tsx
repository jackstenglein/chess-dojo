'use client';

import { anton, barlow, barlowCondensed } from '@/components/landing/fonts';
import { fontFamily } from '@/style/font';
import { Close } from '@mui/icons-material';
import { Box, Stack, Theme, Typography } from '@mui/material';
import { ReactNode } from 'react';
import { HAIRLINE, MUTED, ORANGE } from '../../class/sections/shared';
import { RUSH_DEMO_RUN_LIMIT, RUSH_STRIKES } from '../content';

export const SUCCESS = '#7FD66B';
export const DANGER = '#FF6B5E';
export const HERO_ELEMENT_ID = 'rush-top';
/** Marks the page's main action in the top section. The sticky bar appears once it scrolls away. */
export const TOP_ACTION_ID = 'rush-action';

/** Typography without a variant falls back to the theme face, so plain text sets this. */
export const bodyFontSx = { fontFamily: (theme: Theme) => fontFamily(theme, barlow) } as const;

/** The primary button. Tall enough for a thumb, and the same on every screen. */
export const primaryButtonSx = {
    minHeight: 56,
    px: 4,
    fontWeight: 600,
    fontSize: '1.2rem',
    letterSpacing: '0.01em',
} as const;

export const secondaryButtonSx = {
    minHeight: 52,
    px: 3,
    fontWeight: 600,
    color: 'common.white',
    borderColor: 'rgba(255, 255, 255, 0.45)',
    '&:hover': { borderColor: 'rgba(255, 255, 255, 0.45)', bgcolor: 'transparent' },
    '@media (hover: hover) and (pointer: fine)': {
        '&:hover': { borderColor: 'common.white', bgcolor: 'rgba(255, 255, 255, 0.06)' },
    },
} as const;

/** Seconds as a clock: 600 is "10:00", 462 is "7:42". */
export function formatClock(totalSeconds: number): string {
    const seconds = Math.max(0, Math.round(totalSeconds));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** One mark per allowed strike, filled in for the strikes already used. */
export function Strikes({ strikes, size = 30 }: { strikes: number; size?: number }) {
    return (
        <Stack
            direction='row'
            role='img'
            aria-label={`${strikes} of ${RUSH_STRIKES} strikes`}
            sx={{ gap: 0.75 }}
        >
            {Array.from({ length: RUSH_STRIKES }).map((_, index) => {
                const used = index < strikes;
                return (
                    <Box
                        key={index}
                        sx={{
                            display: 'grid',
                            placeItems: 'center',
                            width: size,
                            height: size,
                            borderRadius: 1,
                            border: '2px solid',
                            borderColor: used ? DANGER : 'rgba(255, 255, 255, 0.28)',
                            bgcolor: used ? DANGER : 'transparent',
                            color: used ? '#1A0503' : 'rgba(255, 255, 255, 0.28)',
                            transition: 'background-color 200ms, border-color 200ms',
                        }}
                    >
                        <Close sx={{ fontSize: size * 0.62 }} />
                    </Box>
                );
            })}
        </Stack>
    );
}

/** Three pips, one per run, with the finished ones filled in. */
export function RunPips({ done, small = false }: { done: number; small?: boolean }) {
    return (
        <Stack
            direction='row'
            role='img'
            aria-label={`${done} of ${RUSH_DEMO_RUN_LIMIT} runs done`}
            sx={{ gap: small ? 0.5 : 1 }}
        >
            {Array.from({ length: RUSH_DEMO_RUN_LIMIT }).map((_, index) => (
                <Box
                    key={index}
                    sx={{
                        width: small ? 16 : 44,
                        height: small ? 6 : 8,
                        borderRadius: 4,
                        bgcolor: index < done ? ORANGE : 'rgba(255, 255, 255, 0.18)',
                    }}
                />
            ))}
        </Stack>
    );
}

/** A number with its label underneath, for the result of a run. */
export function Stat({ label, value }: { label: string; value: ReactNode }) {
    return (
        <Box sx={{ minWidth: 0 }}>
            <Typography
                component='div'
                sx={{
                    fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                    fontWeight: 600,
                    fontSize: { xs: '1.9rem', md: '2.2rem' },
                    lineHeight: 1.1,
                }}
            >
                {value}
            </Typography>
            <Typography variant='body2' sx={{ color: MUTED, mt: 0.25, lineHeight: 1.3 }}>
                {label}
            </Typography>
        </Box>
    );
}

export function StatRow({ children }: { children: ReactNode }) {
    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 2,
                py: 2.5,
                borderTop: `1px solid ${HAIRLINE}`,
                borderBottom: `1px solid ${HAIRLINE}`,
            }}
        >
            {children}
        </Box>
    );
}

/** The big headline face, used for the hero and for the result of a run. */
export function Display({
    children,
    component = 'h1',
    sx,
}: {
    children: ReactNode;
    component?: React.ElementType;
    sx?: Record<string, string | number | object | undefined>;
}) {
    return (
        <Typography
            component={component}
            sx={{
                fontFamily: (theme) => fontFamily(theme, anton),
                fontSize: { xs: '2.35rem', sm: '3rem', md: '3.6rem' },
                lineHeight: 1.1,
                letterSpacing: '0.005em',
                textWrap: 'balance',
                ...sx,
            }}
        >
            {children}
        </Typography>
    );
}
