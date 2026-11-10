'use client';

import { PieceSounds } from '@/board/pgn/boardTools/underboard/settings/ViewerSettings';
import { Box, Portal, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';

/** How long each countdown numeral is shown. */
const STEP_MS = 1000;

/** Numeral the countdown begins on. */
const START_COUNT = 3;

/** Rising beeps for 3, 2, and 1. The last tone is longer so the run launch reads as the final beat. */
const COUNTDOWN_TONES: Record<number, { frequency: number; duration: number }> = {
    3: { frequency: 659.25, duration: 0.12 },
    2: { frequency: 783.99, duration: 0.12 },
    1: { frequency: 987.77, duration: 0.22 },
};

let countdownAudio: AudioContext | undefined;
let lastCountdownTone = { count: 0, at: 0 };

/** Plays the beep for a countdown numeral. Ignores a repeated call in the same moment. */
function playCountdownTone(count: number) {
    const tone = COUNTDOWN_TONES[count];
    const AudioCtx = window.AudioContext;
    if (!tone || !AudioCtx) {
        return;
    }

    const nowMs = performance.now();
    if (lastCountdownTone.count === count && nowMs - lastCountdownTone.at < 400) {
        return;
    }
    lastCountdownTone = { count, at: nowMs };

    if (!countdownAudio || countdownAudio.state === 'closed') {
        countdownAudio = new AudioCtx();
    }
    const ctx = countdownAudio;
    void ctx
        .resume()
        .then(() => {
            const start = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(tone.frequency, start);
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(0.22, start + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + tone.duration + 0.02);
            osc.onended = () => {
                osc.disconnect();
                gain.disconnect();
            };
        })
        .catch(() => undefined);
}

const PIECES = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bP', 'bQ', 'bN', 'bB', 'bR'];

interface Flyer {
    id: string;
    piece?: string;
    angle: number;
    delay: number;
    duration: number;
    /** Piece box size in px, or light-streak thickness in px. */
    size: number;
    near: string;
    far: string;
    offset: string;
    spin: number;
    /** Trail length in vmin. */
    trail: number;
}

/**
 * Full-screen 3-2-1 shown when a puzzle rush starts. Chess pieces streak outward
 * from a central vanishing point, the way stars stretch in a hyperspace jump.
 * The run clock does not start until `onComplete`.
 */
export function PuzzleRushCountdown({ onComplete }: { onComplete: () => void }) {
    const [count, setCount] = useState(START_COUNT);
    const [pieceSounds] = useLocalStorage<boolean>(PieceSounds.key, PieceSounds.default);
    const onCompleteRef = useRef(onComplete);

    useEffect(() => {
        const nums = [];
        for (let i = START_COUNT - 1; i > 0; i--) {
            nums.push(i);
        }
        const steps = nums.map((value, index) =>
            window.setTimeout(() => setCount(value), (index + 1) * STEP_MS),
        );
        const done = window.setTimeout(() => onCompleteRef.current(), START_COUNT * STEP_MS);
        return () => {
            steps.forEach((step) => window.clearTimeout(step));
            window.clearTimeout(done);
        };
    }, []);

    useEffect(() => {
        if (!pieceSounds) {
            return;
        }
        playCountdownTone(count);
    }, [count, pieceSounds]);

    return (
        <Portal>
            <Box
                sx={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 2000,
                    overflow: 'hidden',
                    bgcolor: '#02030a',
                    backgroundImage:
                        'radial-gradient(circle at center, rgba(255,255,255,0.95) 0%, rgba(186,220,255,0.5) 3%, rgba(64,112,220,0.28) 16%, rgba(6,10,28,0.12) 42%, #02030a 70%)',
                    animation: 'puzzle-rush-overlay-in 280ms ease-out',
                    '@keyframes puzzle-rush-overlay-in': {
                        from: { opacity: 0 },
                        to: { opacity: 1 },
                    },
                    '@keyframes puzzle-rush-launch': {
                        '0%': {
                            transform: 'rotate(var(--angle)) translate3d(var(--near), 0vmin, 0)',
                            opacity: 0,
                        },
                        '12%': { opacity: 1 },
                        '100%': {
                            transform:
                                'rotate(var(--angle)) translate3d(var(--far), var(--offset), 0)',
                            opacity: 0,
                        },
                    },
                    '@keyframes puzzle-rush-piece': {
                        '0%': { transform: 'rotate(var(--spin)) scale(0.2)' },
                        '100%': { transform: 'rotate(var(--spin)) scale(1.35)' },
                    },
                    '@keyframes puzzle-rush-trail': {
                        '0%': { transform: 'scaleX(0.12)' },
                        '100%': { transform: 'scaleX(1)' },
                    },
                    '@keyframes puzzle-rush-tunnel': {
                        '0%': { transform: 'scale(0.12)', opacity: 0.55 },
                        '100%': { transform: 'scale(7)', opacity: 0 },
                    },
                    '@keyframes puzzle-rush-count': {
                        '0%': { transform: 'scale(0.45)', opacity: 0 },
                        '16%': { transform: 'scale(1)', opacity: 1 },
                        '68%': { transform: 'scale(1.04)', opacity: 1 },
                        '100%': { transform: 'scale(1.55)', opacity: 0 },
                    },
                    '@keyframes puzzle-rush-count-ring': {
                        '0%': { transform: 'scale(0.55)', opacity: 0.85 },
                        '100%': { transform: 'scale(1.85)', opacity: 0 },
                    },
                    '@media (prefers-reduced-motion: reduce)': {
                        animation: 'none',
                    },
                }}
            >
                <Box
                    aria-hidden
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        '@media (prefers-reduced-motion: reduce)': { display: 'none' },
                    }}
                >
                    <Box
                        sx={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            width: 0,
                            height: 0,
                            boxShadow: STARFIELD,
                        }}
                    />
                    {[0, 1, 2].map((ring) => (
                        <Box
                            key={ring}
                            sx={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                width: '22vmin',
                                height: '22vmin',
                                marginLeft: '-11vmin',
                                marginTop: '-11vmin',
                                borderRadius: '50%',
                                border: '1px solid rgba(170, 205, 255, 0.4)',
                                boxShadow: '0 0 18px rgba(140, 185, 255, 0.25)',
                                animation: 'puzzle-rush-tunnel 2.2s linear infinite',
                                animationDelay: `${ring * -0.73}s`,
                            }}
                        />
                    ))}
                    {STREAKS.map((flyer) => (
                        <FlyerStreak key={flyer.id} flyer={flyer} />
                    ))}
                    {PIECE_FLYERS.map((flyer) => (
                        <FlyerPiece key={flyer.id} flyer={flyer} />
                    ))}
                </Box>

                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'grid',
                        placeItems: 'center',
                        pointerEvents: 'none',
                        background:
                            'radial-gradient(circle at center, transparent 28%, rgba(0,0,0,0.5) 100%)',
                    }}
                >
                    <Box
                        sx={{
                            position: 'relative',
                            display: 'grid',
                            placeItems: 'center',
                            width: 'min(52vmin, 340px)',
                            height: 'min(52vmin, 340px)',
                            borderRadius: '50%',
                            background:
                                'radial-gradient(circle, rgba(2,4,14,0.55) 0%, rgba(2,4,14,0.28) 46%, transparent 72%)',
                        }}
                    >
                        <Box
                            key={`ring-${count}`}
                            sx={{
                                position: 'absolute',
                                inset: '12%',
                                borderRadius: '50%',
                                border: '2px solid rgba(226, 240, 255, 0.9)',
                                boxShadow: '0 0 22px rgba(150, 196, 255, 0.65)',
                                animation: 'puzzle-rush-count-ring 1s ease-out forwards',
                                '@media (prefers-reduced-motion: reduce)': { display: 'none' },
                            }}
                        />
                        <Typography
                            key={count}
                            aria-hidden
                            sx={{
                                fontSize: 'clamp(7rem, 24vw, 12.5rem)',
                                fontWeight: 800,
                                lineHeight: 0.85,
                                color: '#f5f9ff',
                                textShadow:
                                    '0 0 16px rgba(255,255,255,0.9), 0 0 42px rgba(120, 176, 255, 0.95)',
                                animation: 'puzzle-rush-count 1s ease-out forwards',
                                '@media (prefers-reduced-motion: reduce)': {
                                    animation: 'none',
                                },
                            }}
                        >
                            {count}
                        </Typography>
                    </Box>
                </Box>

                <Box component='span' aria-live='assertive' sx={srOnly}>
                    {count}
                </Box>
            </Box>
        </Portal>
    );
}

const motion = 'var(--duration) linear var(--delay) infinite';

function FlyerPiece({ flyer }: { flyer: Flyer }) {
    const thickness = Math.max(3, flyer.size * 0.055);
    return (
        <Box sx={flyerSx(flyer)}>
            <Box
                sx={{
                    position: 'absolute',
                    right: '62%',
                    top: '50%',
                    width: `${flyer.trail}vmin`,
                    height: thickness,
                    marginTop: `${-thickness / 2}px`,
                    transformOrigin: 'right center',
                    borderRadius: 99,
                    background:
                        'linear-gradient(90deg, transparent, rgba(170, 214, 255, 0.15) 40%, rgba(255,255,255,0.95))',
                    boxShadow: '0 0 8px rgba(186, 220, 255, 0.85)',
                    animation: `puzzle-rush-trail ${motion}`,
                }}
            />
            <Box
                component='img'
                alt=''
                draggable={false}
                src={`/static/board/pieces/cburnett/${flyer.piece}.svg`}
                sx={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 0 2px #fff) drop-shadow(0 0 8px rgba(186, 220, 255, 0.95))',
                    animation: `puzzle-rush-piece ${motion}`,
                }}
            />
        </Box>
    );
}

function FlyerStreak({ flyer }: { flyer: Flyer }) {
    return (
        <Box
            sx={{
                ...flyerSx(flyer),
                width: `${flyer.trail}vmin`,
                height: flyer.size,
                marginLeft: `${-flyer.trail / 2}vmin`,
                marginTop: `${-flyer.size / 2}px`,
                borderRadius: 99,
                background:
                    'linear-gradient(90deg, transparent, rgba(186, 220, 255, 0.12) 28%, rgba(255,255,255,0.95))',
                boxShadow: '0 0 6px rgba(170, 210, 255, 0.8)',
            }}
        />
    );
}

/** Positions a flyer on a radial path out of the vanishing point. */
function flyerSx(flyer: Flyer) {
    const isPiece = flyer.piece !== undefined;
    return {
        position: 'absolute' as const,
        left: '50%',
        top: '50%',
        width: isPiece ? flyer.size : 0,
        height: isPiece ? flyer.size : 0,
        marginLeft: isPiece ? `${-flyer.size / 2}px` : 0,
        marginTop: isPiece ? `${-flyer.size / 2}px` : 0,
        '--angle': `${flyer.angle}deg`,
        '--delay': `${flyer.delay}s`,
        '--duration': `${flyer.duration}s`,
        '--near': flyer.near,
        '--far': flyer.far,
        '--offset': flyer.offset,
        '--spin': `${flyer.spin}deg`,
        animation: `puzzle-rush-launch ${motion}`,
    };
}

const srOnly = {
    position: 'absolute' as const,
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
};

function mulberry32(seed: number) {
    let state = seed;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function createFlyers(count: number, seed: number, withPiece: boolean): Flyer[] {
    const rand = mulberry32(seed);
    return Array.from({ length: count }, (_, index) => {
        const duration = withPiece ? 0.75 + rand() * 0.8 : 0.4 + rand() * 0.45;
        return {
            id: `${withPiece ? 'piece' : 'streak'}-${index}`,
            piece: withPiece ? PIECES[Math.floor(rand() * PIECES.length)] : undefined,
            angle: (index * 137.508 + rand() * 18) % 360,
            delay: -rand() * duration,
            duration,
            size: withPiece ? 68 + rand() * 56 : 1.4 + rand() * 1.8,
            near: `${5 + rand() * 8}vmin`,
            far: `${78 + rand() * 48}vmin`,
            offset: `${(rand() - 0.5) * (withPiece ? 16 : 6)}vmin`,
            spin: rand() * 360,
            trail: withPiece ? 12 + rand() * 14 : 10 + rand() * 22,
        };
    });
}

const PIECE_FLYERS = createFlyers(36, 0x5a11, true);
const STREAKS = createFlyers(34, 0x57a2, false);

function createStarfield(count: number): string {
    const rand = mulberry32(0xc0de);
    const stars: string[] = [];
    for (let i = 0; i < count; i++) {
        const x = (rand() * 100).toFixed(2);
        const y = (rand() * 100).toFixed(2);
        const alpha = (0.35 + rand() * 0.65).toFixed(2);
        const blur = rand() > 0.85 ? 1 : 0;
        stars.push(`${x}vw ${y}vh ${blur}px rgba(255,255,255,${alpha})`);
    }
    return stars.join(', ');
}

const STARFIELD = createStarfield(70);
