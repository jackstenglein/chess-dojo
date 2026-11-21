'use client';

import { Box } from '@mui/material';
import { useId } from 'react';
import { PlayerId, PLAYERS } from '../config';

type StyleObject = Record<string, string | number | object | undefined>;

/**
 * Drawn here because the page uses no FIDE or event marks.
 * Simplified at small sizes: India without the spokes of the wheel, Uzbekistan
 * with the crescent and three of its twelve stars.
 */
export function Flag({ player, width = 30 }: { player: PlayerId; width?: number }) {
    const clipId = useId();
    return (
        <Box
            component='svg'
            role='img'
            aria-label={`Flag of ${PLAYERS[player].country}`}
            viewBox='0 0 30 20'
            sx={{
                width,
                height: (width * 2) / 3,
                flexShrink: 0,
                display: 'block',
                borderRadius: '3px',
                outline: '1px solid rgba(255, 255, 255, 0.18)',
                outlineOffset: '-1px',
            }}
        >
            <clipPath id={clipId}>
                <rect width='30' height='20' rx='2' />
            </clipPath>
            {player === 'gukesh' ? (
                <g clipPath={`url(#${clipId})`}>
                    <rect width='30' height='20' fill='#FFFFFF' />
                    <rect width='30' height='6.67' fill='#FF9933' />
                    <rect y='13.33' width='30' height='6.67' fill='#138808' />
                    <circle
                        cx='15'
                        cy='10'
                        r='2.3'
                        fill='none'
                        stroke='#000080'
                        strokeWidth='0.7'
                    />
                    <circle cx='15' cy='10' r='0.5' fill='#000080' />
                </g>
            ) : (
                <g clipPath={`url(#${clipId})`}>
                    <rect width='30' height='20' fill='#CE1126' />
                    <rect width='30' height='6.2' fill='#0099B5' />
                    <rect y='6.9' width='30' height='6.2' fill='#FFFFFF' />
                    <rect y='13.8' width='30' height='6.2' fill='#1EB53A' />
                    <circle cx='5.2' cy='3.1' r='1.9' fill='#FFFFFF' />
                    <circle cx='6' cy='3.1' r='1.7' fill='#0099B5' />
                    <circle cx='8.6' cy='4.4' r='0.38' fill='#FFFFFF' />
                    <circle cx='10' cy='4.4' r='0.38' fill='#FFFFFF' />
                    <circle cx='11.4' cy='4.4' r='0.38' fill='#FFFFFF' />
                </g>
            )}
        </Box>
    );
}

/**
 * For boxes that hold a BoardMotif. `overflow: hidden` still lets the browser
 * scroll the box sideways when something inside takes focus, which shifts the
 * whole section on a phone. `clip` does not.
 */
export const clipSx = {
    overflow: 'hidden',
    '@supports (overflow: clip)': { overflow: 'clip' },
} as const;

/** A chessboard that fades into the page, used as the only decoration. */
export function BoardMotif({ sx }: { sx?: StyleObject }) {
    return (
        <Box
            aria-hidden
            sx={{
                position: 'absolute',
                pointerEvents: 'none',
                aspectRatio: '1',
                backgroundImage:
                    'conic-gradient(rgba(255, 255, 255, 0.075) 25%, transparent 0 50%, rgba(255, 255, 255, 0.075) 0 75%, transparent 0)',
                backgroundSize: '25% 25%',
                maskImage: 'radial-gradient(circle at 70% 30%, #000 0%, transparent 68%)',
                ...sx,
            }}
        />
    );
}
