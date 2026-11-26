import { anton } from '@/components/landing/fonts';
import { fontFamily } from '@/style/font';
import { AccessTime, Close } from '@mui/icons-material';
import { Box, Stack, Typography } from '@mui/material';
import { Condensed, MUTED, ORANGE } from '../../class/sections/shared';
import { RUSH_MINUTES, RUSH_STRIKES } from '../content';
import { EASE_OUT, popAway, stampIn, useAnimatedNumber } from './motion';
import { DANGER, formatClock, SUCCESS } from './parts';

const LOW_TIME_SECONDS = 30;
const TOTAL_SECONDS = RUSH_MINUTES * 60;

export type HudTone = 'neutral' | 'win' | 'loss';

const TONE_COLOR: Record<HudTone, string> = {
    neutral: 'common.white',
    win: SUCCESS,
    loss: DANGER,
};

/** The clock as a line that empties over the ten minutes. Readable without reading. */
export function TimeBar({ seconds }: { seconds: number }) {
    const low = seconds <= LOW_TIME_SECONDS;
    return (
        <Box aria-hidden sx={{ height: 3, bgcolor: 'rgba(255, 255, 255, 0.1)' }}>
            <Box
                sx={{
                    height: 1,
                    bgcolor: low ? DANGER : ORANGE,
                    transformOrigin: 'left',
                    transform: `scaleX(${Math.max(0, seconds) / TOTAL_SECONDS})`,
                    transition: 'transform 1s linear, background-color 400ms ease',
                }}
            />
        </Box>
    );
}

/** One mark per allowed strike. The newest one lands like a stamp. */
export function StrikeMarks({ strikes, size = 30 }: { strikes: number; size?: number }) {
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
                        key={`${index}-${used}`}
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
                            animation: used ? `${stampIn} 260ms ${EASE_OUT}` : undefined,
                        }}
                    >
                        <Close sx={{ fontSize: size * 0.62 }} />
                    </Box>
                );
            })}
        </Stack>
    );
}

/**
 * The head-up display of a run: clock and strikes, then whose move it is, the score
 * and the rating. The hero's demo and the real run share it, so the picture a
 * visitor sees before starting is the screen they get.
 */
export function RunHud({
    seconds,
    strikes,
    status,
    tone = 'neutral',
    solved,
    rating,
    change,
    compact = false,
}: {
    seconds: number;
    strikes: number;
    status: string;
    tone?: HudTone;
    solved: number;
    rating: number;
    /** The last change in rating and a key that is new for every change. */
    change?: { amount: number; key: number };
    compact?: boolean;
}) {
    const shownRating = useAnimatedNumber(rating);
    const low = seconds <= LOW_TIME_SECONDS;

    return (
        <Box sx={{ px: 2 }}>
            <Stack direction='row' sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack
                    direction='row'
                    role='timer'
                    aria-label={`${formatClock(seconds)} left`}
                    sx={{
                        alignItems: 'center',
                        gap: 1,
                        color: low ? DANGER : 'inherit',
                        transition: 'color 400ms ease',
                    }}
                >
                    <AccessTime sx={{ fontSize: compact ? '1.5rem' : '1.8rem' }} />
                    <Typography
                        component='div'
                        sx={{
                            fontFamily: (theme) => fontFamily(theme, anton),
                            fontSize: compact ? '2.1rem' : '2.6rem',
                            lineHeight: 1.1,
                        }}
                    >
                        {formatClock(seconds)}
                    </Typography>
                </Stack>
                <StrikeMarks strikes={strikes} size={compact ? 28 : 34} />
            </Stack>

            <Stack
                direction='row'
                sx={{
                    pt: 0.75,
                    pb: 1.25,
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 2,
                }}
            >
                <Stack direction='row' sx={{ minWidth: 0, gap: 1, alignItems: 'baseline' }}>
                    <Condensed
                        aria-live='polite'
                        sx={{
                            fontSize: compact ? '1.2rem' : '1.35rem',
                            color: TONE_COLOR[tone],
                            transition: 'color 150ms ease',
                        }}
                    >
                        {status}
                    </Condensed>
                    {change && change.amount !== 0 && (
                        <Condensed
                            key={change.key}
                            aria-hidden
                            sx={{
                                fontSize: compact ? '1.05rem' : '1.15rem',
                                color: change.amount > 0 ? SUCCESS : DANGER,
                                pointerEvents: 'none',
                                transformOrigin: 'left center',
                                animation: `${popAway} 1200ms ${EASE_OUT} both`,
                            }}
                        >
                            {change.amount > 0 ? `+${change.amount}` : change.amount}
                        </Condensed>
                    )}
                </Stack>
                <Stack direction='row' sx={{ gap: compact ? 2 : 2.5, alignItems: 'baseline' }}>
                    <HudNumber label='Solved' value={solved} />
                    <HudNumber label='Rating' value={shownRating} />
                </Stack>
            </Stack>
        </Box>
    );
}

function HudNumber({ label, value }: { label: string; value: number }) {
    return (
        <Stack direction='row' sx={{ gap: 0.75, alignItems: 'baseline' }}>
            <Typography variant='body2' sx={{ color: MUTED }}>
                {label}
            </Typography>
            <Condensed sx={{ fontSize: '1.35rem' }}>{value}</Condensed>
        </Stack>
    );
}
