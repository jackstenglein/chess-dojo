'use client';

import Avatar from '@/profile/Avatar';
import {
    evalToWhiteShare,
    formatEval,
    WC_EVAL_MAX,
    WC_EVAL_MIN,
    WC_SENSEIS,
    WcEval,
} from '@jackstenglein/chess-dojo-common/src/wcLive/api';
import { Box, Button, Paper, Slider, Stack, Tooltip, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

interface EvalBarProps {
    /** The average of the senseis that are switched on, or undefined if none has an eval. */
    average?: number;
    orientation: 'white' | 'black';
}

/** A vertical bar beside the board, White at the bottom when White is at the bottom. */
export function EvalBar({ average, orientation }: EvalBarProps) {
    const whiteShare = average === undefined ? 0.5 : evalToWhiteShare(average);
    const whiteAtBottom = orientation === 'white';
    const label = average === undefined ? '–' : formatEval(average);
    const whiteAhead = (average ?? 0) >= 0;

    return (
        <Tooltip title='Average eval of the senseis switched on above the board' placement='left'>
            <Box
                data-testid='sensei-eval-bar'
                sx={{
                    position: 'relative',
                    width: { xs: 18, sm: 26 },
                    flexShrink: 0,
                    alignSelf: 'stretch',
                    bgcolor: '#403d39',
                    borderRadius: 0.5,
                    overflow: 'hidden',
                }}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        [whiteAtBottom ? 'bottom' : 'top']: 0,
                        height: `${whiteShare * 100}%`,
                        bgcolor: '#f5f5f5',
                        transition: 'height 0.6s ease',
                    }}
                />
                {/* Marks at 0 and one row either side, so a one-row move is easy to read. */}
                {[3 / 8, 4 / 8, 5 / 8].map((y) => (
                    <Box
                        key={y}
                        sx={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: `${y * 100}%`,
                            // In sx a bare 1 means 100%, so these are pixels.
                            height: y === 0.5 ? '2px' : '1px',
                            bgcolor: 'rgba(128, 128, 128, 0.6)',
                        }}
                    />
                ))}
                <Typography
                    sx={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        textAlign: 'center',
                        fontSize: { xs: '0.55rem', sm: '0.7rem' },
                        fontWeight: 700,
                        // The number sits at the end of the side that is ahead.
                        [whiteAhead === whiteAtBottom ? 'bottom' : 'top']: 4,
                        color: whiteAhead ? '#403d39' : '#f5f5f5',
                    }}
                >
                    {label}
                </Typography>
            </Box>
        </Tooltip>
    );
}

interface SenseiStripProps {
    evals: WcEval[];
    enabled: Record<string, boolean | undefined>;
    onToggle: (username: string) => void;
}

/** The senseis above the board, each with their eval. Clicking one takes them out of the average. */
export function SenseiStrip({ evals, enabled, onToggle }: SenseiStripProps) {
    return (
        <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            {WC_SENSEIS.map((s) => {
                const e = evals.find((x) => x.username === s.username);
                const on = enabled[s.username] !== false;
                return (
                    <Tooltip
                        key={s.username}
                        title={
                            on
                                ? `Leave ${s.displayName} out of the bar`
                                : `Add ${s.displayName} to the bar`
                        }
                    >
                        <Button
                            data-testid={`sensei-chip-${s.username}`}
                            onClick={() => onToggle(s.username)}
                            variant={on ? 'outlined' : 'text'}
                            color='inherit'
                            aria-pressed={on}
                            sx={{
                                textTransform: 'none',
                                borderRadius: 5,
                                py: 0.25,
                                pl: 0.5,
                                pr: 1.25,
                                opacity: on ? 1 : 0.4,
                                minWidth: 0,
                            }}
                        >
                            <Avatar username={s.username} displayName={s.displayName} size={28} />
                            <Typography sx={{ ml: 1, fontWeight: 600 }}>{s.displayName}</Typography>
                            <Typography
                                sx={{
                                    ml: 1,
                                    fontWeight: 700,
                                    fontVariantNumeric: 'tabular-nums',
                                    textDecoration: on ? undefined : 'line-through',
                                }}
                            >
                                {e ? formatEval(e.value) : '–'}
                            </Typography>
                        </Button>
                    </Tooltip>
                );
            })}
        </Stack>
    );
}

const MARKS = [-10, -5, -3, -2, -1, 0, 1, 2, 3, 5, 10].map((value) => ({
    value,
    label:
        value === 0 || Math.abs(value) === 3 || Math.abs(value) === 10
            ? formatEval(value)
            : undefined,
}));

interface SenseiControlProps {
    /** The sensei's own eval in force at the shown position. */
    current?: WcEval;
    /** The move the shown position comes after, for the label. */
    positionLabel: string;
    onSubmit: (value: number) => Promise<void>;
}

/** Only senseis see this: set the eval for the position on the board. */
export function SenseiControl({ current, positionLabel, onSubmit }: SenseiControlProps) {
    const [value, setValue] = useState(current?.value ?? 0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Follow the saved eval when the position changes.
    useEffect(() => {
        setValue(current?.value ?? 0);
    }, [current?.value, positionLabel]);

    const submit = async (v: number) => {
        setSaving(true);
        setError('');
        try {
            await onSubmit(Math.round(v * 10) / 10);
        } catch {
            setError('Not saved. Try again.');
        } finally {
            setSaving(false);
        }
    };

    const nudge = (delta: number) => {
        const next = Math.max(
            WC_EVAL_MIN,
            Math.min(WC_EVAL_MAX, Math.round((value + delta) * 10) / 10),
        );
        setValue(next);
        void submit(next);
    };

    return (
        <Paper variant='outlined' sx={{ p: 2 }} data-testid='sensei-control'>
            <Stack direction='row' sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
                    Your eval
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                    {saving ? 'Saving…' : error || `After ${positionLabel}`}
                </Typography>
            </Stack>
            <Stack direction='row' spacing={2} sx={{ alignItems: 'center', mt: 1 }}>
                <Typography
                    sx={{
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        minWidth: 64,
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    {formatEval(value)}
                </Typography>
                <Slider
                    aria-label='Sensei eval'
                    min={WC_EVAL_MIN}
                    max={WC_EVAL_MAX}
                    step={0.1}
                    marks={MARKS}
                    value={value}
                    onChange={(_, v) => setValue(v)}
                    onChangeCommitted={(_, v) => void submit(v)}
                    sx={{ mx: 1 }}
                />
            </Stack>
            <Stack direction='row' spacing={1} sx={{ mt: 1, justifyContent: 'center' }}>
                {[-1, -0.5, 0.5, 1].map((d) => (
                    <Button key={d} size='small' variant='outlined' onClick={() => nudge(d)}>
                        {d > 0 ? `+${d}` : d}
                    </Button>
                ))}
                <Button
                    size='small'
                    variant='outlined'
                    onClick={() => {
                        setValue(0);
                        void submit(0);
                    }}
                >
                    0
                </Button>
            </Stack>
        </Paper>
    );
}
