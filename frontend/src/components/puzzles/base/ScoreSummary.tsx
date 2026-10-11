'use client';

import {
    AttemptScoring,
    AVERAGE_RANGE,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/scoring';
import { ArrowDropDown, ArrowDropUp, Groups } from '@mui/icons-material';
import { Divider, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import { ReactNode } from 'react';

interface ScoreSummaryProps {
    /** How the attempt was scored. Undefined while the server is still working it out. */
    scoring?: AttemptScoring;
    /** Whether saving the attempt failed, so there is nothing to show. */
    failed?: boolean;
}

/** The sign and size of a rating change, like +6.4 or −3.1. */
export function formatDelta(delta: number): string {
    const rounded = Math.round(delta * 10) / 10;
    if (rounded === 0) return '±0';
    return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded).toFixed(1)}`;
}

/** The speed factor as a plain number, to two places without trailing zeros: 0.7, 0.92, 1. */
export function formatSpeed(speed: number): string {
    return String(Number(speed.toFixed(2)));
}

/** One cell of a strip: a small label over a number, centered. */
function Cell({
    label,
    value,
    color,
    muted,
}: {
    label: string;
    value: ReactNode;
    color?: string;
    /** Quieter and smaller, for the averages. */
    muted?: boolean;
}) {
    return (
        <Stack sx={{ flex: 1, minWidth: 0, alignItems: 'center', py: muted ? 0.5 : 0.75 }}>
            <Typography
                variant='overline'
                sx={{
                    color: 'text.secondary',
                    lineHeight: 1.4,
                    fontSize: '0.65rem',
                    letterSpacing: '0.08em',
                }}
            >
                {label}
            </Typography>
            <Typography
                sx={{
                    fontSize: muted ? '1.05rem' : '1.4rem',
                    fontWeight: muted ? 700 : 800,
                    lineHeight: 1.15,
                    fontVariantNumeric: 'tabular-nums',
                    color: color ?? (muted ? 'text.secondary' : undefined),
                }}
            >
                {value}
            </Typography>
        </Stack>
    );
}

/**
 * What the average is of, for its tooltip: players rated within 200 points of the member's rating,
 * with the range spelled out, like "players rated 1413 to 1813".
 */
export function averageTooltip(memberRating?: number): string {
    if (memberRating === undefined) {
        return `Average scores for players rated within ${AVERAGE_RANGE} points of you`;
    }
    const low = Math.round(memberRating - AVERAGE_RANGE);
    const high = Math.round(memberRating + AVERAGE_RANGE);
    return `Average scores for players rated ${low} to ${high}`;
}

/** One small figure in the cohort average: a muted label and a number. */
function AverageItem({ label, value }: { label: string; value: ReactNode }) {
    return (
        <Stack direction='row' sx={{ gap: 0.5, alignItems: 'baseline' }}>
            <Typography variant='caption' color='text.secondary'>
                {label}
            </Typography>
            <Typography
                variant='body2'
                sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
            >
                {value}
            </Typography>
        </Stack>
    );
}

/** A row of cells with thin lines between them, on a soft background. */
function Strip({ children, quiet }: { children: ReactNode; quiet?: boolean }) {
    return (
        <Stack
            direction='row'
            divider={<Divider orientation='vertical' flexItem sx={{ my: quiet ? 1 : 1.5 }} />}
            sx={{
                borderRadius: 2,
                bgcolor: quiet ? undefined : 'action.hover',
                border: quiet ? 1 : undefined,
                borderColor: 'divider',
            }}
        >
            {children}
        </Stack>
    );
}

/**
 * What a puzzle did to the member's tactics rating, laid out as tiles: the new rating and the
 * change in a colored plate, then accuracy, speed and score. Shown on the result of every puzzle.
 */
export function ScoreSummary({ scoring, failed }: ScoreSummaryProps) {
    if (failed) {
        return (
            <Typography variant='body2' color='text.secondary'>
                This puzzle could not be scored.
            </Typography>
        );
    }
    if (!scoring) {
        return (
            <Stack aria-label='Scoring' sx={{ gap: 1 }}>
                <Skeleton variant='rounded' height={64} />
                <Stack direction='row' sx={{ gap: 1 }}>
                    <Skeleton variant='rounded' height={64} sx={{ flex: 1 }} />
                    <Skeleton variant='rounded' height={64} sx={{ flex: 1 }} />
                    <Skeleton variant='rounded' height={64} sx={{ flex: 1 }} />
                </Stack>
            </Stack>
        );
    }

    const average = scoring.average;
    // Speed is only counted for a puzzle that has a reference time.
    const par = scoring.referenceMs;
    const up = (scoring.delta ?? 0) > 0;
    const down = (scoring.delta ?? 0) < 0;
    const color = up ? 'success' : down ? 'error' : 'text';

    return (
        <Stack sx={{ gap: 1 }}>
            {scoring.ratingAfter !== undefined && (
                <Stack
                    sx={{
                        // The whole width, with the rating and its change centered in it, so it
                        // lines up with the strips under it and has no empty end.
                        alignItems: 'center',
                        px: 2,
                        py: 0.75,
                        borderRadius: 2,
                        bgcolor: 'action.hover',
                    }}
                >
                    <Typography
                        variant='overline'
                        sx={{ color: 'text.secondary', lineHeight: 1.4, display: 'block' }}
                    >
                        Tactics rating
                    </Typography>
                    {/* The rating and its change side by side, close together. */}
                    <Stack direction='row' sx={{ alignItems: 'center', gap: 2 }}>
                        <Typography
                            sx={{
                                fontSize: '1.75rem',
                                fontWeight: 800,
                                lineHeight: 1.1,
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            {Math.round(scoring.ratingAfter)}
                        </Typography>
                        {scoring.counted && scoring.delta !== undefined && (
                            <Stack
                                direction='row'
                                sx={{
                                    alignItems: 'center',
                                    color: color === 'text' ? 'text.secondary' : `${color}.main`,
                                }}
                            >
                                {up && <ArrowDropUp fontSize='large' />}
                                {down && <ArrowDropDown fontSize='large' />}
                                <Typography
                                    sx={{
                                        fontSize: '1.4rem',
                                        fontWeight: 800,
                                        fontVariantNumeric: 'tabular-nums',
                                    }}
                                >
                                    {formatDelta(scoring.delta)}
                                </Typography>
                            </Stack>
                        )}
                    </Stack>
                </Stack>
            )}
            {!scoring.counted && (
                <Typography variant='body2' color='text.secondary'>
                    You have solved this puzzle before, so it does not affect your rating.
                </Typography>
            )}
            {/* The member's own numbers. */}
            <Strip>
                <Cell label='Accuracy' value={`${Math.round(scoring.accuracy * 100)}%`} />
                <Cell
                    label='Speed'
                    value={par === undefined ? '—' : formatSpeed(scoring.speed)}
                    // Green at full speed, amber once it costs a lot.
                    color={
                        par === undefined
                            ? undefined
                            : scoring.speed >= 0.995
                              ? 'success.main'
                              : scoring.speed < 0.85
                                ? 'warning.main'
                                : undefined
                    }
                />
                <Cell label='Score' value={Math.round(scoring.score * 100)} />
            </Strip>
            {/* What the member's cohort gets on this puzzle, small and apart from the above. */}
            {average && (
                <Tooltip title={averageTooltip(scoring.ratingBefore)}>
                    <Stack
                        direction='row'
                        aria-label='Average of players near your rating'
                        sx={{
                            flexWrap: 'wrap',
                            // The icon, the label and the figures are centered, in the row and on
                            // each other, and the row sits a little way below the strip above.
                            alignItems: 'center',
                            justifyContent: 'center',
                            columnGap: 2,
                            rowGap: 0.25,
                            px: 1.5,
                            py: 0.5,
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 2,
                        }}
                    >
                        <Stack
                            direction='row'
                            sx={{ alignItems: 'center', gap: 0.5, color: 'text.secondary' }}
                        >
                            <Groups fontSize='small' />
                            <Typography
                                variant='overline'
                                sx={{
                                    lineHeight: 1,
                                    fontSize: '0.75rem',
                                    letterSpacing: '0.08em',
                                }}
                            >
                                Avg
                            </Typography>
                        </Stack>
                        <AverageItem
                            label='Accuracy'
                            value={`${Math.round(average.accuracy * 100)}%`}
                        />
                        <AverageItem label='Speed' value={formatSpeed(average.speed)} />
                        <AverageItem label='Score' value={Math.round(average.score * 100)} />
                    </Stack>
                </Tooltip>
            )}
        </Stack>
    );
}
