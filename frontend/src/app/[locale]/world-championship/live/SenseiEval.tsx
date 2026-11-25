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

// ---------------------------------------------------------------------------
// Pins
// ---------------------------------------------------------------------------

/** A sensei's initial in their color, as on the bar. */
export function SenseiPin({ sensei, size = 22 }: { sensei: WcSensei; size?: number }) {
    return (
        <Box
            aria-hidden='true'
            sx={{
                width: size,
                height: size,
                borderRadius: '50%',
                bgcolor: sensei.color,
                color: '#fff',
                border: '2px solid #fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.6)',
                display: 'grid',
                placeItems: 'center',
                fontSize: size * 0.5,
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
export const EVAL_BAR_WIDTH = { xs: 28, sm: 38 };

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
                            left: `calc(50% + ${(p.column - (p.columns - 1) / 2) * 20}px)`,
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
                }}
            >
                {formatEval(average)}
            </Box>
        </Box>
    );
}

// ---------------------------------------------------------------------------
// The strip above the board
// ---------------------------------------------------------------------------

/** Each active sensei above the board, with the eval they have in force. */
export function SenseiStrip({ roster, pins }: { roster: WcSensei[]; pins: WcPin[] }) {
    return (
        <Stack spacing={0.75} data-testid='sensei-strip'>
            {roster
                .filter((s) => s.active)
                .map((s) => {
                    const pin = pins.find((p) => p.sensei.id === s.id);
                    return (
                        <Stack
                            key={s.id}
                            data-testid={`sensei-chip-${s.id}`}
                            direction='row'
                            spacing={0.75}
                            sx={{
                                alignItems: 'center',
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 5,
                                py: 0.25,
                                pl: 0.5,
                                pr: 1.25,
                            }}
                        >
                            <SenseiPin sensei={s} size={24} />
                            <Typography
                                sx={{
                                    fontWeight: 600,
                                    flexGrow: 1,
                                    // The name and the eval are trimmed to the capitals, so
                                    // both sit in the middle of the row. The padding keeps
                                    // noWrap from cutting off descenders, and the margin
                                    // takes that height back out.
                                    textBox: 'trim-both cap alphabetic',
                                    py: '4px',
                                    my: '-4px',
                                }}
                                noWrap
                            >
                                {s.name}
                            </Typography>
                            <Typography
                                sx={{
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
