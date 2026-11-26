'use client';

import {
    evalToWhiteShare,
    formatEval,
    layoutPins,
    senseiInitial,
    WcPin,
    WcSensei,
} from '@jackstenglein/chess-dojo-common/src/wcLive/api';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { PHONE_LANDSCAPE } from './liveLayout';

// ---------------------------------------------------------------------------
// Pins
// ---------------------------------------------------------------------------

/** A pin's size, the same everywhere or smaller on a phone. */
type PinSize = number | { xs: number; md: number };

/** A sensei's initial in their color, as on the bar. */
export function SenseiPin({ sensei, size = 22 }: { sensei: WcSensei; size?: PinSize }) {
    const scaled = (factor: number) =>
        typeof size === 'number' ? size * factor : { xs: size.xs * factor, md: size.md * factor };
    return (
        <Box
            aria-hidden='true'
            sx={{
                width: scaled(1),
                height: scaled(1),
                borderRadius: '50%',
                bgcolor: sensei.color,
                color: '#fff',
                border: '2px solid #fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.6)',
                display: 'grid',
                placeItems: 'center',
                fontSize: scaled(0.5),
                fontWeight: 900,
                lineHeight: 1,
                // Trim the line box to the capital, so the letter sits in the middle.
                textBox: 'trim-both cap alphabetic',
                flexShrink: 0,
                textShadow: '0 1px 1px rgba(0,0,0,0.4)',
            }}
        >
            {senseiInitial(sensei.name)}
        </Box>
    );
}

// ---------------------------------------------------------------------------
// The bar
// ---------------------------------------------------------------------------

const BELT = '#111';
const BELT_EDGE = '#d4a017';

/** A black belt tied at the 0 point of the bar: the position is equal here. */
function BeltIcon() {
    return (
        <svg viewBox='0 0 32 20' width='100%' aria-hidden='true' style={{ display: 'block' }}>
            <rect
                x='0'
                y='5'
                width='32'
                height='6'
                fill={BELT}
                stroke={BELT_EDGE}
                strokeWidth='1'
            />
            <polygon
                points='13,11 8,20 12,20 16,12'
                fill={BELT}
                stroke={BELT_EDGE}
                strokeWidth='1'
            />
            <polygon
                points='19,11 24,20 20,20 16,12'
                fill={BELT}
                stroke={BELT_EDGE}
                strokeWidth='1'
            />
            <rect
                x='11.5'
                y='3'
                width='9'
                height='10'
                rx='1.5'
                fill={BELT}
                stroke={BELT_EDGE}
                strokeWidth='1'
            />
        </svg>
    );
}

/** Ticks on both sides of equal, on the same curve as the fill. */
/** The eval bar's width. The player bars leave the same space, so they line up with the board. */
export const EVAL_BAR_WIDTH = { xs: 20, sm: 38 };

/** The space between the eval bar and the board, in the theme's spacing units. */
export const EVAL_BAR_GAP = { xs: 0.75, sm: 1 };

/** ±10 is not marked: it sits right at the ends of the bar. */
const TICKS = [1, 2, 3, 5].flatMap((v) => [v, -v]);

/** Distance from the top of the bar, from 0 to 1, for an eval. */
function evalFromTop(value: number, orientation: 'white' | 'black'): number {
    const white = evalToWhiteShare(value);
    return orientation === 'white' ? 1 - white : white;
}

interface EvalBarProps {
    /** The average of the active senseis with an eval, 0 if none. */
    average: number;
    pins: WcPin[];
    orientation: 'white' | 'black';
}

/**
 * A vertical bar beside the board. White fills up from the bottom for plus
 * scores (when White is at the bottom). A belt marks equal, a red line the
 * average, each sensei's initial sits at their own score, and the average is
 * written at the bottom.
 */
export function EvalBar({ average, pins, orientation }: EvalBarProps) {
    const whiteAtBottom = orientation === 'white';
    const fromTop = (value: number) => evalFromTop(value, orientation);
    const boundary = fromTop(average);
    const placed = layoutPins(
        pins.map((p) => ({ ...p, id: p.sensei.id, share: fromTop(p.value) })),
    );

    return (
        <Box
            // The key remounts the bar when the board flips. Without it the fill,
            // line and pins slide to the other end, the way they do when an eval
            // changes.
            key={orientation}
            data-testid='sensei-eval-bar'
            sx={{
                position: 'relative',
                width: EVAL_BAR_WIDTH,
                flexShrink: 0,
                alignSelf: 'stretch',
            }}
        >
            {/* Fill, ticks, belt and line, clipped to the bar */}
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
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
                        bottom: 0,
                        top: `${boundary * 100}%`,
                        bgcolor: '#f5f5f5',
                        transition: 'top 0.6s ease, bottom 0.6s ease',
                        // White at the top: the white fill runs down to the boundary.
                        ...(whiteAtBottom ? {} : { top: 0, bottom: `${(1 - boundary) * 100}%` }),
                    }}
                />
                {TICKS.map((v) => (
                    <Box
                        key={v}
                        sx={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: `${fromTop(v) * 100}%`,
                            // In sx a bare 1 means 100%, so this is pixels.
                            height: '1px',
                            bgcolor: 'rgba(128, 128, 128, 0.45)',
                        }}
                    />
                ))}
                <Box
                    data-testid='eval-bar-belt'
                    sx={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: '50%',
                        transform: 'translateY(-40%)',
                    }}
                >
                    <BeltIcon />
                </Box>
                <Box
                    data-testid='eval-bar-line'
                    sx={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: `${boundary * 100}%`,
                        height: '2px',
                        mt: '-1px',
                        bgcolor: '#e53935',
                        transition: 'top 0.6s ease',
                    }}
                />
            </Box>

            {/* Sensei pins may spill past the bar when they fan out */}
            {placed.map((p) => (
                <Tooltip
                    key={p.id}
                    title={`${p.sensei.name} ${formatEval(p.value)}`}
                    placement='right'
                >
                    <Box
                        data-testid={`eval-pin-${p.sensei.id}`}
                        sx={{
                            position: 'absolute',
                            top: `${p.share * 100}%`,
                            // A phone's bar is narrower and close to the edge of the screen.
                            // Pins with the same eval overlap there, and sit a little to
                            // the right, toward the board.
                            left: {
                                xs: `calc(50% + ${4 + (p.column - (p.columns - 1) / 2) * 12}px)`,
                                sm: `calc(50% + ${(p.column - (p.columns - 1) / 2) * 20}px)`,
                            },
                            transform: 'translate(-50%, -50%)',
                            transition: 'top 0.6s ease',
                            zIndex: 2,
                            cursor: 'default',
                        }}
                    >
                        <SenseiPin sensei={p.sensei} size={20} />
                    </Box>
                </Tooltip>
            ))}

            <Box
                data-testid='eval-bar-score'
                sx={{
                    position: 'absolute',
                    left: 3,
                    right: 3,
                    bottom: 4,
                    py: '3px',
                    borderRadius: '4px',
                    bgcolor: 'rgba(20, 20, 20, 0.85)',
                    color: '#fff',
                    textAlign: 'center',
                    fontSize: { xs: '0.68rem', sm: '0.85rem' },
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                    // Trimming the line box to the digits centers them. The larger
                    // padding makes up the height the trim removes.
                    '@supports (text-box: trim-both cap alphabetic)': {
                        textBox: 'trim-both cap alphabetic',
                        py: { xs: '4px', sm: '5px' },
                    },
                    fontVariantNumeric: 'tabular-nums',
                    zIndex: 3,
                    pointerEvents: 'none',
                    // A phone's bar is too narrow for the number, which EvalAverage
                    // shows under the bar. On its side the phone has nothing under
                    // the bar, so the number stays here.
                    display: { xs: 'none', sm: 'block' },
                    [PHONE_LANDSCAPE]: { display: 'block', left: 0, right: 0 },
                }}
            >
                {formatEval(average)}
            </Box>
        </Box>
    );
}

/**
 * The average on a phone held upright, where the bar is too narrow to hold it.
 * It goes under the bar, beside the bottom player.
 */
export function EvalAverage({ average }: { average: number }) {
    return (
        <Box
            data-testid='eval-average'
            sx={{
                display: { xs: 'block', sm: 'none' },
                [PHONE_LANDSCAPE]: { display: 'none' },
                textAlign: 'center',
                fontSize: '0.7rem',
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.03em',
                lineHeight: 1,
                whiteSpace: 'nowrap',
            }}
        >
            {formatEval(average)}
        </Box>
    );
}

// ---------------------------------------------------------------------------
// The strip above the board
// ---------------------------------------------------------------------------

/** Kept for screen readers, but not shown, under the md breakpoint. */
const HIDDEN_ON_A_PHONE = {
    position: { xs: 'absolute', md: 'static' },
    width: { xs: '1px', md: 'auto' },
    height: { xs: '1px', md: 'auto' },
    overflow: 'hidden',
    clipPath: { xs: 'inset(50%)', md: 'none' },
} as const;

/** Each active sensei above the board, with the eval they have in force. */
export function SenseiStrip({ roster, pins }: { roster: WcSensei[]; pins: WcPin[] }) {
    const active = roster.filter((s) => s.active);
    // Three senseis fit a phone's row with their names. More do not, so then the
    // row shows only their initials and evals.
    const crowded = active.length > 3;
    return (
        // On a phone the senseis share a row, and go to a second row if they do not fit.
        <Stack
            direction={{ xs: 'row', md: 'column' }}
            spacing={{ xs: 0.5, md: 0.75 }}
            useFlexGap
            data-testid='sensei-strip'
            sx={{ flexWrap: 'wrap' }}
        >
            {active.map((s) => {
                const pin = pins.find((p) => p.sensei.id === s.id);
                return (
                    <Stack
                        key={s.id}
                        data-testid={`sensei-chip-${s.id}`}
                        direction='row'
                        spacing={{ xs: 0.5, md: 0.75 }}
                        sx={{
                            alignItems: 'center',
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 5,
                            py: 0.25,
                            pl: { xs: 0.375, md: 0.5 },
                            pr: { xs: 0.875, md: 1.25 },
                            flex: { xs: '1 1 auto', md: 'none' },
                            fontSize: { xs: '0.8125rem', md: '1rem' },
                            ...(crowded && { justifyContent: { xs: 'center', md: 'flex-start' } }),
                        }}
                    >
                        <SenseiPin sensei={s} size={{ xs: 20, md: 24 }} />
                        <Typography
                            sx={{
                                fontSize: 'inherit',
                                fontWeight: 600,
                                flexGrow: 1,
                                // The name and the eval are trimmed to the capitals, so
                                // both sit in the middle of the row. The padding keeps
                                // noWrap from cutting off descenders, and the margin
                                // takes that height back out.
                                textBox: 'trim-both cap alphabetic',
                                py: '4px',
                                my: '-4px',
                                ...(crowded && HIDDEN_ON_A_PHONE),
                            }}
                            noWrap
                        >
                            {s.name}
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: 'inherit',
                                fontWeight: 800,
                                fontVariantNumeric: 'tabular-nums',
                                textBox: 'trim-both cap alphabetic',
                            }}
                        >
                            {pin ? formatEval(pin.value) : '–'}
                        </Typography>
                    </Stack>
                );
            })}
        </Stack>
    );
}
