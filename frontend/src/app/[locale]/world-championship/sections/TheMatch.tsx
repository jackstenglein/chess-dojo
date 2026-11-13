'use client';

import { anton } from '@/components/landing/fonts';
import { fontFamily } from '@/style/font';
import { Box, Stack, Typography } from '@mui/material';
import {
    Body,
    Condensed,
    EASE_OUT,
    HAIRLINE,
    Heading,
    INK_RAISED,
    MUTED,
    ORANGE,
    revealSx,
    Section,
} from '../../class/sections/shared';
import { PlayerId, PLAYERS } from '../config';
import { THE_MATCH } from '../content';
import { Draft } from '../prediction';
import { MatchStrip, matchSummary } from './MatchStrip';
import { Flag } from './Motif';

function PlayerHead({
    player,
    picked,
    align,
}: {
    player: PlayerId;
    picked: boolean;
    align: 'left' | 'right';
}) {
    return (
        <Stack sx={{ alignItems: align === 'left' ? 'flex-start' : 'flex-end', minWidth: 0 }}>
            <Flag player={player} width={44} />
            <Typography
                component='h3'
                sx={{
                    mt: 1.25,
                    fontFamily: (theme) => fontFamily(theme, anton),
                    fontSize: { xs: '1.9rem', sm: '2.75rem', md: '3.5rem' },
                    lineHeight: 1,
                    color: picked ? ORANGE : 'common.white',
                    transition: `color 260ms ${EASE_OUT}`,
                }}
            >
                {PLAYERS[player].name}
            </Typography>
            <Typography
                variant='body2'
                sx={{
                    mt: 0.5,
                    minHeight: '1.45em',
                    color: ORANGE,
                    fontWeight: 600,
                    opacity: picked ? 1 : 0,
                    transition: `opacity 260ms ${EASE_OUT}`,
                }}
            >
                {THE_MATCH.yourPick}
            </Typography>
        </Stack>
    );
}

/** The two players side by side, then the schedule with the visitor's picks drawn on it. */
export function TheMatch({ draft }: { draft: Draft }) {
    const summary = matchSummary(draft);

    return (
        <Section maxWidth='md'>
            <Heading sx={{ mb: { xs: 3.5, md: 5 } }}>{THE_MATCH.heading}</Heading>

            <Box sx={revealSx}>
                <Stack direction='row' sx={{ justifyContent: 'space-between', gap: 2 }}>
                    <PlayerHead player='gukesh' picked={draft.winner === 'gukesh'} align='left' />
                    <PlayerHead
                        player='sindarov'
                        picked={draft.winner === 'sindarov'}
                        align='right'
                    />
                </Stack>

                <Box component='dl' sx={{ mt: { xs: 1.5, md: 2.5 }, mb: 0 }}>
                    {THE_MATCH.tape.map((row) => (
                        <Box
                            key={row.label}
                            sx={{
                                py: { xs: 1.5, md: 1.75 },
                                borderTop: `1px solid ${HAIRLINE}`,
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 11rem 1fr' },
                                gridTemplateAreas: {
                                    xs: '"label label" "left right"',
                                    md: '"left label right"',
                                },
                                columnGap: 2,
                                rowGap: 0.5,
                                alignItems: 'baseline',
                            }}
                        >
                            <Typography
                                component='dt'
                                variant='body2'
                                sx={{
                                    gridArea: 'label',
                                    textAlign: 'center',
                                    color: MUTED,
                                    fontSize: '0.85rem',
                                    letterSpacing: '0.04em',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {row.label}
                            </Typography>
                            <Condensed
                                component='dd'
                                sx={{
                                    gridArea: 'left',
                                    m: 0,
                                    fontSize: { xs: '1.15rem', md: '1.35rem' },
                                    fontWeight: 500,
                                    textWrap: 'balance',
                                }}
                            >
                                {row.gukesh}
                            </Condensed>
                            <Condensed
                                component='dd'
                                sx={{
                                    gridArea: 'right',
                                    m: 0,
                                    textAlign: 'right',
                                    fontSize: { xs: '1.15rem', md: '1.35rem' },
                                    fontWeight: 500,
                                    textWrap: 'balance',
                                }}
                            >
                                {row.sindarov}
                            </Condensed>
                        </Box>
                    ))}
                </Box>
            </Box>

            <Box
                sx={{
                    ...revealSx,
                    mt: { xs: 5, md: 7 },
                    p: { xs: 2.25, sm: 3.5 },
                    borderRadius: 3,
                    bgcolor: INK_RAISED,
                    boxShadow: `inset 0 0 0 1px ${HAIRLINE}, 0 30px 70px -40px rgba(0, 0, 0, 0.9)`,
                }}
            >
                <Condensed component='h3' sx={{ fontSize: { xs: '1.6rem', md: '1.9rem' } }}>
                    {THE_MATCH.scheduleHeading}
                </Condensed>
                <Body sx={{ mt: 1, mb: 2.5, fontSize: '1.05rem', maxWidth: '40rem' }}>
                    {THE_MATCH.format}
                </Body>
                <MatchStrip draft={draft} dates />
                {summary.length > 0 && (
                    <Typography
                        variant='body2'
                        aria-hidden
                        sx={{ mt: 2, color: 'common.white', fontSize: '1rem' }}
                    >
                        <Box component='span' sx={{ color: ORANGE, fontWeight: 600 }}>
                            {THE_MATCH.yourCall}
                        </Box>{' '}
                        {summary.join(' ')}
                    </Typography>
                )}
            </Box>
        </Section>
    );
}
