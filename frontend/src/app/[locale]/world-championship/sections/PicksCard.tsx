'use client';

import { EventType, trackEvent } from '@/analytics/events';
import { anton, barlow, barlowCondensed } from '@/components/landing/fonts';
import { getConfig } from '@/config';
import { ChessDojoIcon } from '@/style/ChessDojoIcon';
import { fontFamily } from '@/style/font';
import { Check, Download, Link as LinkIcon } from '@mui/icons-material';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import {
    Condensed,
    EASE_OUT,
    HAIRLINE,
    INK_RAISED,
    MUTED,
    ORANGE,
} from '../../class/sections/shared';
import { PAGE_PATH, PLAYERS } from '../config';
import { CONFIRMATION, PLAYER_ROLES } from '../content';
import { describePicks, Picks } from '../prediction';
import { renderShareCard, saveShareCard } from '../shareCard';
import { BoardMotif, clipSx, Flag } from './Motif';

const baseUrl = getConfig().baseUrl.replace(/\/$/, '');
/** What the card shows. The protocol would only take up room. */
export const DISPLAY_URL = `${baseUrl.replace(/^https?:\/\//, '')}${PAGE_PATH}`;
export const SHARE_URL = `${baseUrl}${PAGE_PATH}?utm_source=share&utm_medium=picks_card`;

export function PicksCard({ picks, displayName }: { picks: Picks; displayName: string }) {
    const lines = describePicks(picks).slice(1);
    const winner = PLAYERS[picks.winner];

    return (
        <Box
            data-testid='picks-card'
            sx={{
                position: 'relative',
                ...clipSx,
                isolation: 'isolate',
                bgcolor: INK_RAISED,
                borderRadius: 3,
                border: `1px solid ${HAIRLINE}`,
                borderTop: `4px solid ${ORANGE}`,
                boxShadow: '0 40px 90px -30px rgba(0, 0, 0, 0.9)',
                p: { xs: 2.5, sm: 3.5 },
            }}
        >
            <BoardMotif sx={{ zIndex: -1, top: 0, right: 0, width: '62%' }} />

            <Stack direction='row' sx={{ alignItems: 'center', gap: 1 }}>
                <ChessDojoIcon sx={{ fontSize: '1.6rem', color: ORANGE }} />
                <Condensed
                    sx={{
                        color: ORANGE,
                        fontSize: { xs: '0.95rem', sm: '1.05rem' },
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                    }}
                >
                    {CONFIRMATION.cardTitle}
                </Condensed>
            </Stack>
            <Typography
                variant='body2'
                sx={{ mt: 0.75, color: MUTED, fontSize: '1.05rem', overflowWrap: 'anywhere' }}
            >
                {displayName || CONFIRMATION.cardFallbackName}
            </Typography>

            <Stack direction='row' sx={{ mt: 2.5, alignItems: 'center', gap: 1.5 }}>
                <Flag player={picks.winner} width={42} />
                <Typography
                    component='p'
                    sx={{
                        fontFamily: (theme) => fontFamily(theme, anton),
                        fontSize: { xs: '2.9rem', sm: '3.5rem' },
                        lineHeight: 1,
                    }}
                >
                    {winner.name}
                </Typography>
            </Stack>
            <Typography variant='body2' sx={{ mt: 0.75, color: MUTED, fontSize: '1rem' }}>
                {PLAYER_ROLES[picks.winner]} · {winner.country}
            </Typography>

            <Box component='dl' sx={{ mt: 2.5, mb: 0 }}>
                {lines.map((line) => (
                    <Stack
                        key={line.label}
                        direction='row'
                        sx={{
                            py: 1.25,
                            gap: 2,
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            borderTop: `1px solid ${HAIRLINE}`,
                        }}
                    >
                        <Typography
                            component='dt'
                            variant='body2'
                            sx={{ color: MUTED, fontSize: '1rem' }}
                        >
                            {line.label}
                        </Typography>
                        <Condensed
                            component='dd'
                            sx={{ m: 0, fontSize: '1.4rem', textAlign: 'right' }}
                        >
                            {line.value}
                        </Condensed>
                    </Stack>
                ))}
            </Box>
            <Typography
                variant='body2'
                sx={{
                    pt: 1.25,
                    color: MUTED,
                    fontSize: '0.95rem',
                    borderTop: `1px solid ${HAIRLINE}`,
                }}
            >
                {CONFIRMATION.tieBreakerLine(picks.game1Moves)}
            </Typography>
            <Condensed sx={{ mt: 2, color: ORANGE, fontSize: '1.1rem', overflowWrap: 'anywhere' }}>
                {DISPLAY_URL}
            </Condensed>
        </Box>
    );
}

const shareButtonSx = {
    minHeight: 48,
    px: 2.5,
    fontWeight: 600,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    transition: `transform 150ms ${EASE_OUT}, border-color 200ms ${EASE_OUT}, background-color 200ms ${EASE_OUT}`,
    '&:active': { transform: 'scale(0.96)' },
} as const;

export function ShareButtons({ picks, displayName }: { picks: Picks; displayName: string }) {
    const [copied, setCopied] = useState(false);
    const [saving, setSaving] = useState(false);
    const copiedTimer = useRef<number>(undefined);

    useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

    const onCopy = async () => {
        try {
            await navigator.clipboard.writeText(SHARE_URL);
        } catch {
            return;
        }
        trackEvent(EventType.WcShare, { method: 'copy_link' });
        setCopied(true);
        window.clearTimeout(copiedTimer.current);
        copiedTimer.current = window.setTimeout(() => setCopied(false), 2500);
    };

    const onSave = async () => {
        setSaving(true);
        try {
            const blob = await renderShareCard(
                { picks, displayName, url: DISPLAY_URL },
                {
                    display: anton.style.fontFamily,
                    condensed: barlowCondensed.style.fontFamily,
                    body: barlow.style.fontFamily,
                },
            );
            await saveShareCard(
                blob,
                'chessdojo-world-championship-picks.png',
                CONFIRMATION.cardTitle,
            );
            trackEvent(EventType.WcShare, { method: 'image' });
        } catch {
            // A browser without canvas support still has the card on screen to screenshot.
        }
        setSaving(false);
    };

    return (
        <Stack direction='row' sx={{ gap: 1.25, flexWrap: 'wrap' }}>
            <Button
                variant='outlined'
                color='inherit'
                onClick={() => void onCopy()}
                startIcon={copied ? <Check /> : <LinkIcon />}
                sx={{ ...shareButtonSx, minWidth: '9.5rem' }}
            >
                <span aria-live='polite'>
                    {copied ? CONFIRMATION.linkCopied : CONFIRMATION.copyLink}
                </span>
            </Button>
            <Button
                variant='outlined'
                color='inherit'
                loading={saving}
                onClick={() => void onSave()}
                startIcon={<Download />}
                sx={shareButtonSx}
            >
                {CONFIRMATION.saveImage}
            </Button>
        </Stack>
    );
}
