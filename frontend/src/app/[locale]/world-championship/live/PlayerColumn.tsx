'use client';

import { Box, Paper, Stack, Typography } from '@mui/material';
import { ClockText } from './ClockText';
import { CrossPlayer, Crosstable, playerOf } from './crosstable';
import { formatClock, LivePlayer } from './lichessFeed';
import { PlayerPhoto } from './PlayerPhoto';

/** The width of the player column beside the board in analysis view 2. */
export const PLAYER_COLUMN_WIDTH = 170;

const PHOTO_SIZE = 128;

interface Side {
    player?: LivePlayer;
    seconds: number;
    running: boolean;
}

interface PlayerColumnProps {
    top: Side;
    bottom: Side;
    crosstable?: Crosstable;
}

/**
 * The players and clocks beside the board, laid out the way chess.com shows a
 * broadcast: the top player's card at the top, both clocks in the middle, and
 * the bottom player's card at the bottom. It is as tall as the board.
 */
export function PlayerColumn({ top, bottom, crosstable }: PlayerColumnProps) {
    return (
        <Stack
            data-testid='player-column'
            sx={{
                // The board writes its drawn height here; the column matches it.
                height: 'var(---cg-height)',
                minHeight: 0,
                justifyContent: 'space-between',
            }}
        >
            <PlayerCard player={top.player} crosstable={crosstable} />
            <Stack spacing={1.5}>
                <ColumnClock seconds={top.seconds} running={top.running} />
                <ColumnClock seconds={bottom.seconds} running={bottom.running} />
            </Stack>
            <PlayerCard player={bottom.player} crosstable={crosstable} />
        </Stack>
    );
}

function PlayerCard({ player, crosstable }: { player?: LivePlayer; crosstable?: Crosstable }) {
    const cross = playerOf(player?.name);
    const points = cross && crosstable ? crosstable.totals[cross] : undefined;
    // The Lichess feed has no federations, so the two players' flags are fixed here.
    const flag = cross ? FLAGS[cross] : undefined;

    return (
        <Stack spacing={0.5} sx={{ alignItems: 'center', minWidth: 0 }} data-testid='player-card'>
            <Box sx={{ position: 'relative' }}>
                {cross ? (
                    <PlayerPhoto name={player?.name} size={PHOTO_SIZE} />
                ) : (
                    // The test game's players have no photo, so they get their initial.
                    <Box
                        sx={{
                            width: PHOTO_SIZE,
                            height: PHOTO_SIZE,
                            borderRadius: 0.5,
                            bgcolor: 'action.hover',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: '3rem',
                            fontWeight: 800,
                            color: 'text.secondary',
                        }}
                    >
                        {player?.name.trim()[0]?.toUpperCase() ?? '?'}
                    </Box>
                )}
                {player?.title && (
                    <Box
                        sx={{
                            position: 'absolute',
                            left: '50%',
                            bottom: -8,
                            transform: 'translateX(-50%)',
                            px: 0.75,
                            borderRadius: 0.5,
                            bgcolor: 'error.dark',
                            color: 'common.white',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            lineHeight: 1.6,
                        }}
                    >
                        {player.title}
                    </Box>
                )}
            </Box>
            <Typography
                sx={{ fontWeight: 700, maxWidth: 1, pt: player?.title ? 1 : 0 }}
                noWrap
                title={player?.name}
            >
                {player?.name ?? '…'}
            </Typography>
            {(player?.rating || flag || player?.fed) && (
                <Stack direction='row' spacing={0.75} sx={{ alignItems: 'center' }}>
                    {flag ? (
                        <Flag country={flag} />
                    ) : (
                        player?.fed && (
                            <Typography variant='body2' color='text.secondary'>
                                {player.fed}
                            </Typography>
                        )
                    )}
                    {player?.rating && (
                        <Typography variant='body2' color='text.secondary' noWrap>
                            {player.rating}
                        </Typography>
                    )}
                </Stack>
            )}
            {points !== undefined && (
                <Typography
                    data-testid='match-score'
                    title='Match score'
                    sx={{
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        lineHeight: 1.1,
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    {points}
                </Typography>
            )}
        </Stack>
    );
}

type Country = 'india' | 'uzbekistan';

const FLAGS: Record<CrossPlayer, Country> = { gukesh: 'india', sindarov: 'uzbekistan' };

/**
 * The flags are drawn here, not taken from emoji: Windows shows a flag emoji
 * as two letters.
 */
function Flag({ country }: { country: Country }) {
    const label = country === 'india' ? 'India' : 'Uzbekistan';
    return (
        <Box
            component='svg'
            role='img'
            aria-label={label}
            data-testid={`flag-${country}`}
            viewBox={country === 'india' ? '0 0 30 20' : '0 0 40 20'}
            sx={{
                height: 14,
                width: country === 'india' ? 21 : 28,
                flexShrink: 0,
                borderRadius: '2px',
            }}
        >
            <title>{label}</title>
            {country === 'india' ? (
                <>
                    <rect width='30' height='20' fill='#ffffff' />
                    <rect width='30' height='6.67' fill='#ff9933' />
                    <rect y='13.33' width='30' height='6.67' fill='#138808' />
                    <circle
                        cx='15'
                        cy='10'
                        r='2.6'
                        fill='none'
                        stroke='#000080'
                        strokeWidth='0.6'
                    />
                    <circle cx='15' cy='10' r='0.6' fill='#000080' />
                </>
            ) : (
                <>
                    <rect width='40' height='20' fill='#ffffff' />
                    <rect width='40' height='6.4' fill='#0099b5' />
                    <rect y='13.6' width='40' height='6.4' fill='#1eb53a' />
                    <rect y='6.4' width='40' height='0.4' fill='#ce1126' />
                    <rect y='13.2' width='40' height='0.4' fill='#ce1126' />
                    <circle cx='5.6' cy='3.2' r='2.4' fill='#ffffff' />
                    <circle cx='6.4' cy='3.2' r='2.4' fill='#0099b5' />
                    {[
                        [12, 1.6],
                        [13.6, 1.6],
                        [15.2, 1.6],
                        [10.4, 3.2],
                        [12, 3.2],
                        [13.6, 3.2],
                        [15.2, 3.2],
                        [8.8, 4.8],
                        [10.4, 4.8],
                        [12, 4.8],
                        [13.6, 4.8],
                        [15.2, 4.8],
                    ].map(([x, y]) => (
                        <circle key={`${x}-${y}`} cx={x} cy={y} r='0.45' fill='#ffffff' />
                    ))}
                </>
            )}
        </Box>
    );
}

function ColumnClock({ seconds, running }: { seconds: number; running: boolean }) {
    return (
        <Paper
            elevation={0}
            data-testid='player-clock'
            sx={{
                py: 1,
                textAlign: 'center',
                fontWeight: 600,
                fontSize: '2rem',
                fontVariantNumeric: 'tabular-nums',
                bgcolor: running ? 'text.primary' : 'action.hover',
                color: running ? 'background.paper' : 'text.primary',
            }}
        >
            <ClockText text={formatClock(seconds)} />
        </Paper>
    );
}
