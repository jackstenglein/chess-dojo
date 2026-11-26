import { EventType, trackEvent } from '@/analytics/events';
import { Check, IosShare } from '@mui/icons-material';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { Body, Condensed, HAIRLINE, MUTED, ORANGE } from '../../class/sections/shared';
import { RUSH_PAGE_PATH } from '../content';
import { bandLine, paceInsight, shareText } from '../runInsights';
import { RushDemoRun } from '../rushStorage';
import { EASE_OUT } from './motion';
import { DANGER, SUCCESS } from './parts';

const CHART_HEIGHT = 112;

function describe(run: RushDemoRun, index: number): string {
    const attempt = run.attempts[index];
    const outcome = attempt.result === 'win' ? 'solved' : 'missed';
    return `Puzzle ${index + 1} of ${run.attempts.length}, rated ${attempt.rating}, ${outcome} in ${attempt.seconds}s`;
}

/**
 * The run, puzzle by puzzle: one column per attempt, as tall as the puzzle was hard,
 * green when solved and red when missed. Tapping a column tells its story.
 */
export function RunChart({
    run,
    compact = false,
    onPickMiss,
}: {
    run: RushDemoRun;
    /** A small chart with no detail line, for comparing runs side by side. */
    compact?: boolean;
    /** Opens the review at the given miss (its index among the run's misses). */
    onPickMiss?: (missIndex: number) => void;
}) {
    const { attempts } = run;
    const hardest = attempts.reduce(
        (best, attempt, index) =>
            attempt.result === 'win' && attempt.rating > (attempts[best]?.rating ?? 0)
                ? index
                : best,
        attempts.findIndex((attempt) => attempt.result === 'win'),
    );
    const [selected, setSelected] = useState(Math.max(0, hardest));

    if (attempts.length === 0) {
        return null;
    }

    const top = Math.max(...attempts.map((attempt) => attempt.rating));
    const floor = Math.min(...attempts.map((attempt) => attempt.rating)) * 0.6;
    const height = compact ? 56 : CHART_HEIGHT;
    const picked = attempts[selected];
    const missIndex =
        picked.result === 'loss'
            ? attempts.slice(0, selected).filter((attempt) => attempt.result === 'loss').length
            : -1;

    return (
        <Box>
            <Stack
                direction='row'
                role='group'
                aria-label='The run, puzzle by puzzle'
                sx={{
                    alignItems: 'flex-end',
                    gap: attempts.length > 24 ? '2px' : '4px',
                    height,
                    borderBottom: `1px solid ${HAIRLINE}`,
                }}
            >
                {attempts.map((attempt, index) => {
                    const share = (attempt.rating - floor) / Math.max(1, top - floor);
                    const color = attempt.result === 'win' ? SUCCESS : DANGER;
                    const active = !compact && index === selected;
                    return (
                        <Box
                            key={`${attempt.puzzleId}-${index}`}
                            component={compact ? 'div' : 'button'}
                            type={compact ? undefined : 'button'}
                            aria-label={compact ? undefined : describe(run, index)}
                            aria-pressed={compact ? undefined : active}
                            onClick={compact ? undefined : () => setSelected(index)}
                            sx={{
                                flex: '1 1 0',
                                maxWidth: compact ? 28 : 44,
                                minWidth: 0,
                                height: 1,
                                p: 0,
                                border: 0,
                                bgcolor: 'transparent',
                                display: 'flex',
                                alignItems: 'flex-end',
                                cursor: compact ? 'default' : 'pointer',
                            }}
                        >
                            <Box
                                sx={{
                                    width: 1,
                                    height: `${Math.round(18 + share * 82)}%`,
                                    borderRadius: '3px 3px 0 0',
                                    bgcolor: color,
                                    opacity: compact || active ? 1 : 0.55,
                                    transformOrigin: 'bottom',
                                    transition: `opacity 160ms ease, transform 200ms ${EASE_OUT}`,
                                    transform: active ? 'scaleY(1.04)' : 'none',
                                }}
                            />
                        </Box>
                    );
                })}
            </Stack>

            {!compact && (
                <Stack
                    direction='row'
                    sx={{
                        mt: 1.25,
                        minHeight: 44,
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                    }}
                >
                    <Typography variant='body2' aria-live='polite' sx={{ color: 'common.white' }}>
                        <Box
                            component='span'
                            sx={{ color: picked.result === 'win' ? SUCCESS : DANGER }}
                        >
                            {picked.result === 'win' ? 'Solved' : 'Missed'}
                        </Box>{' '}
                        puzzle {selected + 1}, rated {picked.rating}, in {picked.seconds}s
                    </Typography>
                    {missIndex >= 0 && onPickMiss && run.misses[missIndex] && (
                        <Button
                            size='small'
                            onClick={() => onPickMiss(missIndex)}
                            sx={{ minHeight: 44, mr: -1, color: ORANGE, flexShrink: 0 }}
                        >
                            Try it again
                        </Button>
                    )}
                </Stack>
            )}
        </Box>
    );
}

/** What the visitor's own numbers say about the run, and where it sits on the Dojo's ladder. */
export function RunInsights({ run }: { run: RushDemoRun }) {
    const pace = paceInsight(run);
    const band = bandLine(run);
    if (!pace && !band) {
        return null;
    }
    return (
        <Stack sx={{ gap: 1.5 }}>
            {pace && (
                <Condensed
                    component='p'
                    sx={{ m: 0, fontWeight: 500, fontSize: { xs: '1.5rem', md: '1.7rem' } }}
                >
                    {pace}
                </Condensed>
            )}
            {band && <Body sx={{ fontSize: '1.03rem' }}>{band}</Body>}
        </Stack>
    );
}

/** Copies the result as text, or opens the phone's share sheet when there is one. */
export function ShareResult({ run, placement }: { run: RushDemoRun; placement: string }) {
    const [copied, setCopied] = useState(false);

    const onShare = async () => {
        const text = shareText(run, `${window.location.origin}${RUSH_PAGE_PATH}`);
        trackEvent(EventType.RushDemoShare, { placement, solved: run.solved });
        try {
            if (typeof navigator.share === 'function' && navigator.maxTouchPoints > 0) {
                await navigator.share({ text });
                return;
            }
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2400);
        } catch {
            // The visitor closed the share sheet, or the clipboard is blocked. Nothing to do.
        }
    };

    return (
        <Button
            onClick={() => void onShare()}
            startIcon={copied ? <Check /> : <IosShare />}
            sx={{ minHeight: 48, px: 1.5, ml: -1.5, color: copied ? SUCCESS : MUTED }}
        >
            {copied ? 'Copied to your clipboard' : 'Share my result'}
        </Button>
    );
}
