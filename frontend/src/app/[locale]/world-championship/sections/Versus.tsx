'use client';

import { anton } from '@/components/landing/fonts';
import { fontFamily } from '@/style/font';
import { Box, Typography } from '@mui/material';
import { Condensed, EASE_OUT, HAIRLINE, INK_RAISED, ORANGE } from '../../class/sections/shared';
import { PlayerId, PLAYERS } from '../config';
import { PLAYER_ROLES } from '../content';
import { Flag } from './Motif';

const INK_TEXT = '#0b0b12';

/**
 * The first question, drawn as the match itself: the two players face each
 * other and the visitor taps a side. The chosen side floods with orange from
 * the bottom edge, which is the one authored moment on the page.
 */
export function Versus({
    label,
    selected,
    onSelect,
}: {
    label: string;
    selected?: PlayerId;
    onSelect: (player: PlayerId) => void;
}) {
    return (
        <Box
            role='radiogroup'
            aria-label={label}
            sx={{
                position: 'relative',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '2px',
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: `0 0 0 1px ${HAIRLINE}`,
            }}
        >
            {(Object.keys(PLAYERS) as PlayerId[]).map((player, index) => {
                const active = selected === player;
                const passedOver = selected !== undefined && !active;
                return (
                    <Box
                        key={player}
                        component='button'
                        type='button'
                        role='radio'
                        aria-checked={active}
                        aria-label={PLAYERS[player].name}
                        onClick={() => onSelect(player)}
                        sx={{
                            position: 'relative',
                            isolation: 'isolate',
                            overflow: 'hidden',
                            minHeight: { xs: 156, sm: 190 },
                            p: { xs: 1.75, sm: 2.25 },
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            alignItems: index === 0 ? 'flex-start' : 'flex-end',
                            textAlign: index === 0 ? 'left' : 'right',
                            font: 'inherit',
                            color: active ? INK_TEXT : 'common.white',
                            bgcolor: 'rgba(255, 255, 255, 0.06)',
                            border: 0,
                            cursor: 'pointer',
                            opacity: passedOver ? 0.45 : 1,
                            transition: `color 220ms ${EASE_OUT}, opacity 260ms ${EASE_OUT}, transform 150ms ${EASE_OUT}, background-color 200ms ${EASE_OUT}`,
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                inset: 0,
                                zIndex: -1,
                                bgcolor: ORANGE,
                                clipPath: active
                                    ? 'circle(150% at 50% 100%)'
                                    : 'circle(0% at 50% 100%)',
                                transition: `clip-path ${active ? 460 : 200}ms ${EASE_OUT}`,
                            },
                            '@media (hover: hover) and (pointer: fine)': {
                                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.11)' },
                            },
                            '&:active': { transform: 'scale(0.97)' },
                            '&:focus-visible': { outlineOffset: '-3px' },
                        }}
                    >
                        <Flag player={player} width={40} />
                        <Box>
                            <Typography
                                component='span'
                                sx={{
                                    display: 'block',
                                    fontFamily: (theme) => fontFamily(theme, anton),
                                    fontSize: { xs: 'clamp(1.6rem, 8.2vw, 2.3rem)', sm: '2.5rem' },
                                    lineHeight: 1,
                                }}
                            >
                                {PLAYERS[player].name}
                            </Typography>
                            <Typography
                                component='span'
                                variant='body2'
                                sx={{
                                    display: 'block',
                                    mt: 0.5,
                                    fontSize: '0.95rem',
                                    color: active ? INK_TEXT : 'rgba(255, 255, 255, 0.72)',
                                    transition: `color 220ms ${EASE_OUT}`,
                                }}
                            >
                                {PLAYER_ROLES[player]}
                            </Typography>
                        </Box>
                    </Box>
                );
            })}
            <Condensed
                aria-hidden
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: 38,
                    height: 38,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: '50%',
                    fontSize: '0.95rem',
                    letterSpacing: '0.04em',
                    color: 'common.white',
                    bgcolor: INK_RAISED,
                    boxShadow: `0 0 0 1px ${HAIRLINE}, 0 6px 16px rgba(0, 0, 0, 0.5)`,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                }}
            >
                vs
            </Condensed>
        </Box>
    );
}
