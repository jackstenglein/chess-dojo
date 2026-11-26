import { anton } from '@/components/landing/fonts';
import { fontFamily } from '@/style/font';
import {
    applyRushResult,
    currentRushRating,
    initialRushLadder,
    PuzzleRushLadder,
} from '@jackstenglein/chess-dojo-common/src/puzzles/rush/rating';
import { Block, Check, Close, TimerOff } from '@mui/icons-material';
import { Box, Stack, Typography } from '@mui/material';
import { ReactNode, useEffect, useState } from 'react';
import { Condensed, HAIRLINE, INK_RAISED, MUTED, ORANGE } from '../../class/sections/shared';
import { RUSH_MINUTES, SCENES, SIMULATOR } from '../content';
import {
    EASE_OUT,
    growIn,
    popAway,
    useAnimatedNumber,
    useOnScreen,
    useReducedMotion,
} from './motion';
import { bodyFontSx, DANGER, SUCCESS } from './parts';
import { StrikeMarks } from './RunHud';

/** Advances one step at a time while the scene is playing, and starts over at the end. */
function useTicker(length: number, stepMs: number, playing: boolean): number {
    const [tick, setTick] = useState(0);
    useEffect(() => {
        if (!playing) {
            return;
        }
        const timer = setInterval(() => setTick((current) => (current + 1) % length), stepMs);
        return () => clearInterval(timer);
    }, [length, stepMs, playing]);
    return tick;
}

/**
 * The frame of a scene. A scene plays while it is the active one and on screen. A
 * visitor who asked for less motion gets its last frame, standing still.
 */
function useScene(length: number, stepMs: number, active: boolean, restFrame: number) {
    const [ref, onScreen] = useOnScreen<HTMLDivElement>();
    const reducedMotion = useReducedMotion();
    const tick = useTicker(length, stepMs, active && onScreen && !reducedMotion);
    return { ref, tick: reducedMotion ? restFrame : tick };
}

// ---------------------------------------------------------------- the clock

const CLOCKS = [
    { minutes: 3, label: SCENES.clock.short },
    { minutes: 5, label: SCENES.clock.medium },
    { minutes: RUSH_MINUTES, label: SCENES.clock.dojo },
];
const CLOCK_RUN_MS = 4800;
const CLOCK_STEP_MS = 400;
/** One tick to reset, the run, then a rest on the finished picture. */
const CLOCK_RUN_TICKS = CLOCK_RUN_MS / CLOCK_STEP_MS;
const CLOCK_TICKS = 1 + CLOCK_RUN_TICKS + 5;

/**
 * Three clocks started together and run at the same pace. The short ones are out
 * of time while the Dojo's is still going.
 */
export function ClockScene({ active }: { active: boolean }) {
    const { ref, tick } = useScene(CLOCK_TICKS, CLOCK_STEP_MS, active, CLOCK_TICKS - 1);
    const running = tick >= 1;
    const minutesIn =
        (Math.min(CLOCK_RUN_TICKS, Math.max(0, tick - 1)) / CLOCK_RUN_TICKS) * RUSH_MINUTES;
    const shortOnesDone = minutesIn >= 5;

    return (
        <Box ref={ref} role='img' aria-label={SCENES.clock.summary}>
            <Stack sx={{ gap: 2.25 }}>
                {CLOCKS.map((clock) => {
                    const dojo = clock.minutes === RUSH_MINUTES;
                    const over = minutesIn >= clock.minutes;
                    return (
                        <Box key={clock.minutes}>
                            <Stack
                                direction='row'
                                sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}
                            >
                                <Typography
                                    sx={{
                                        ...bodyFontSx,
                                        fontWeight: 600,
                                        color: dojo ? 'common.white' : MUTED,
                                    }}
                                >
                                    {clock.label}
                                </Typography>
                                <Condensed
                                    sx={{
                                        fontSize: '1.15rem',
                                        color: dojo ? ORANGE : over ? DANGER : MUTED,
                                        transition: 'color 200ms ease',
                                    }}
                                >
                                    {!dojo && over ? SCENES.clock.over : `${clock.minutes}:00`}
                                </Condensed>
                            </Stack>
                            <Box
                                sx={{
                                    mt: 0.75,
                                    height: dojo ? 12 : 8,
                                    width: `${(clock.minutes / RUSH_MINUTES) * 100}%`,
                                    borderRadius: 6,
                                    overflow: 'hidden',
                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                }}
                            >
                                <Box
                                    sx={{
                                        height: 1,
                                        borderRadius: 'inherit',
                                        bgcolor: dojo ? ORANGE : 'rgba(255, 255, 255, 0.5)',
                                        opacity: !dojo && over ? 0.45 : 1,
                                        transformOrigin: 'left',
                                        transform: `scaleX(${running ? 1 : 0})`,
                                        // Linear, and timed by the clock's length, so all three move at one pace.
                                        transition: running
                                            ? `transform ${(clock.minutes / RUSH_MINUTES) * CLOCK_RUN_MS}ms linear, opacity 300ms ease`
                                            : 'none',
                                    }}
                                />
                            </Box>
                        </Box>
                    );
                })}
            </Stack>
            <Caption tone={shortOnesDone ? 'strong' : 'quiet'}>
                {shortOnesDone ? SCENES.clock.after : SCENES.clock.before}
            </Caption>
        </Box>
    );
}

// --------------------------------------------------------------- the ladder

const STEPS_SHOWN = 11;
const LADDER_STEP_MS = 850;

/**
 * The run the ladder scene plays: a streak, a miss, a recovery, and out on the third
 * strike. Each frame is the real ladder after one more puzzle.
 */
export const LADDER_STORY: ('win' | 'loss')[] = [
    'win',
    'win',
    'win',
    'win',
    'loss',
    'win',
    'win',
    'loss',
    'win',
    'win',
    'win',
    'loss',
];

export const LADDER_FRAMES: PuzzleRushLadder[] = LADDER_STORY.reduce<PuzzleRushLadder[]>(
    (frames, result) => [...frames, applyRushResult(frames[frames.length - 1], result)],
    [initialRushLadder()],
);

/** The puzzles the story misses, with the rating each was played at. */
export const STORY_MISSES = LADDER_STORY.flatMap((result, index) =>
    result === 'loss'
        ? [{ puzzle: index + 1, rating: currentRushRating(LADDER_FRAMES[index]) }]
        : [],
);

const LADDER_REST_TICKS = 3;
const LADDER_TICKS = LADDER_FRAMES.length + LADDER_REST_TICKS;

/** A run without the board: a solve climbs, a miss costs a strike and drops back. */
export function LadderScene({ active }: { active: boolean }) {
    const { ref, tick } = useScene(LADDER_TICKS, LADDER_STEP_MS, active, LADDER_FRAMES.length - 1);
    const frame = Math.min(tick, LADDER_FRAMES.length - 1);
    const ladder = LADDER_FRAMES[frame];
    const rating = currentRushRating(ladder);
    const before = frame > 0 ? currentRushRating(LADDER_FRAMES[frame - 1]) : rating;
    const change = rating - before;
    const result = frame > 0 ? LADDER_STORY[frame - 1] : undefined;
    const over = frame === LADDER_FRAMES.length - 1;
    const shown = useAnimatedNumber(rating);

    const steps = ladder.stack.slice(-STEPS_SHOWN);
    const firstStep = ladder.stack.length - steps.length;
    const top = Math.max(650, ...LADDER_FRAMES.flatMap((each) => each.stack));

    return (
        <Box ref={ref} role='img' aria-label={SCENES.ladder.summary}>
            <Stack direction='row' sx={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <Stack direction='row' sx={{ alignItems: 'baseline', gap: 1.25 }}>
                    <Typography
                        component='div'
                        sx={{
                            fontFamily: (theme) => fontFamily(theme, anton),
                            fontSize: '3.6rem',
                            lineHeight: 1,
                            minWidth: '3.2ch',
                        }}
                    >
                        {shown}
                    </Typography>
                    {change !== 0 && (
                        <Condensed
                            key={frame}
                            sx={{
                                fontSize: '1.3rem',
                                color: change > 0 ? SUCCESS : DANGER,
                                animation: `${popAway} ${LADDER_STEP_MS + 200}ms ${EASE_OUT} both`,
                            }}
                        >
                            {change > 0 ? `+${change}` : change}
                        </Condensed>
                    )}
                </Stack>
                <StrikeMarks strikes={ladder.strikes} size={28} />
            </Stack>

            <Stack
                direction='row'
                sx={{
                    mt: 2.5,
                    height: 132,
                    alignItems: 'flex-end',
                    gap: '5px',
                    borderBottom: `1px solid ${HAIRLINE}`,
                }}
            >
                {steps.map((step, index) => {
                    const isCurrent = index === steps.length - 1;
                    return (
                        <Box
                            key={firstStep + index}
                            sx={{
                                flex: '1 1 0',
                                maxWidth: 34,
                                height: `${Math.round(14 + ((step - 250) / (top - 250)) * 86)}%`,
                                borderRadius: '3px 3px 0 0',
                                bgcolor: isCurrent
                                    ? result === 'loss'
                                        ? DANGER
                                        : ORANGE
                                    : 'rgba(247, 148, 31, 0.32)',
                                transformOrigin: 'bottom',
                                animation: `${growIn} 320ms ${EASE_OUT}`,
                                transition: 'background-color 300ms ease',
                            }}
                        />
                    );
                })}
                {Array.from({ length: STEPS_SHOWN - steps.length }).map((_, index) => (
                    <Box
                        key={`slot-${index}`}
                        sx={{
                            flex: '1 1 0',
                            maxWidth: 34,
                            height: '6%',
                            borderRadius: '3px 3px 0 0',
                            bgcolor: 'rgba(255, 255, 255, 0.07)',
                        }}
                    />
                ))}
            </Stack>

            <Caption tone={over || result === 'loss' ? 'strong' : 'quiet'}>
                {over
                    ? SIMULATOR.over
                    : result === 'loss'
                      ? `${SCENES.ladder.miss} ${rating}.`
                      : result === 'win'
                        ? SCENES.ladder.solve
                        : SCENES.ladder.start}
            </Caption>
        </Box>
    );
}

// --------------------------------------------------------------- the review

const REVIEW_STEP_MS = 950;
const REVIEW_TICKS = 1 + STORY_MISSES.length + 3;

/** After the run: each missed puzzle comes back and is solved, with no clock and no strikes. */
export function ReviewScene({ active }: { active: boolean }) {
    const { ref, tick } = useScene(REVIEW_TICKS, REVIEW_STEP_MS, active, REVIEW_TICKS - 1);
    const retried = Math.min(STORY_MISSES.length, tick);

    return (
        <Box ref={ref} role='img' aria-label={SCENES.review.summary}>
            <Stack direction='row' sx={{ gap: 1, flexWrap: 'wrap' }}>
                <Chip icon={<TimerOff sx={{ fontSize: '1rem' }} />}>{SCENES.review.noTimer}</Chip>
                <Chip icon={<Block sx={{ fontSize: '1rem' }} />}>{SCENES.review.noStrikes}</Chip>
            </Stack>

            <Stack component='ul' sx={{ m: 0, mt: 2, p: 0, gap: 1 }}>
                {STORY_MISSES.map((miss, index) => {
                    const done = index < retried;
                    return (
                        <Stack
                            key={miss.puzzle}
                            component='li'
                            direction='row'
                            sx={{
                                listStyle: 'none',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 2,
                                minHeight: 52,
                                px: 1.75,
                                borderRadius: 2,
                                border: `1px solid ${done ? 'rgba(127, 214, 107, 0.45)' : 'rgba(255, 107, 94, 0.4)'}`,
                                bgcolor: done
                                    ? 'rgba(127, 214, 107, 0.06)'
                                    : 'rgba(255, 107, 94, 0.05)',
                                transition: 'border-color 300ms ease, background-color 300ms ease',
                            }}
                        >
                            <Typography sx={{ ...bodyFontSx, fontWeight: 600 }}>
                                {SCENES.review.puzzle} {miss.puzzle}
                                <Box component='span' sx={{ ml: 1, fontWeight: 400, color: MUTED }}>
                                    {SCENES.review.rated} {miss.rating}
                                </Box>
                            </Typography>
                            <Stack
                                direction='row'
                                sx={{
                                    alignItems: 'center',
                                    gap: 0.5,
                                    color: done ? SUCCESS : DANGER,
                                    transition: 'color 300ms ease',
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'grid',
                                        placeItems: 'center',
                                        '& > *': { gridArea: '1 / 1' },
                                    }}
                                >
                                    <Close sx={swapIconSx(!done)} />
                                    <Check sx={swapIconSx(done)} />
                                </Box>
                                <Condensed sx={{ fontSize: '1.1rem' }}>
                                    {done ? SCENES.review.solved : SCENES.review.missed}
                                </Condensed>
                            </Stack>
                        </Stack>
                    );
                })}
            </Stack>

            <Caption tone={retried === STORY_MISSES.length ? 'strong' : 'quiet'}>
                {SCENES.review.caption}
            </Caption>
        </Box>
    );
}

/** Two icons in one box trade places with a short blur, so the swap reads as one change. */
function swapIconSx(shown: boolean) {
    return {
        fontSize: '1.15rem',
        opacity: shown ? 1 : 0,
        transform: shown ? 'scale(1)' : 'scale(0.6)',
        filter: shown ? 'blur(0)' : 'blur(2px)',
        transition: `opacity 200ms ease, transform 240ms ${EASE_OUT}, filter 200ms ease`,
    };
}

function Chip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
    return (
        <Stack
            direction='row'
            sx={{
                alignItems: 'center',
                gap: 0.75,
                height: 32,
                px: 1.25,
                borderRadius: 999,
                border: `1px solid ${HAIRLINE}`,
                color: 'common.white',
            }}
        >
            {icon}
            <Typography variant='body2' sx={{ fontWeight: 600 }}>
                {children}
            </Typography>
        </Stack>
    );
}

/** The one line under a scene that says what just happened. It keeps its height as the text changes. */
function Caption({ tone, children }: { tone: 'quiet' | 'strong'; children: ReactNode }) {
    return (
        <Typography
            aria-hidden
            sx={{
                ...bodyFontSx,
                mt: 2.5,
                minHeight: '3.1em',
                fontSize: '1.05rem',
                lineHeight: 1.5,
                color: tone === 'strong' ? 'common.white' : MUTED,
                transition: 'color 300ms ease',
            }}
        >
            {children}
        </Typography>
    );
}

// ---------------------------------------------------------------- the panel

const SCENE_LIST = [
    { title: SCENES.clock.title, Scene: ClockScene },
    { title: SCENES.ladder.title, Scene: LadderScene },
    { title: SCENES.review.title, Scene: ReviewScene },
];

/** The frame every scene sits in. */
function PanelFrame({
    title,
    step,
    children,
}: {
    title: string;
    step?: number;
    children: ReactNode;
}) {
    return (
        <Box
            sx={{
                p: { xs: 2.5, md: 3.5 },
                bgcolor: INK_RAISED,
                border: `1px solid ${HAIRLINE}`,
                borderRadius: 3,
                boxShadow: '0 40px 90px -30px rgba(0, 0, 0, 0.9)',
            }}
        >
            <Stack
                direction='row'
                sx={{ mb: 2.5, alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
            >
                <Condensed component='h3' sx={{ fontSize: '1.5rem' }}>
                    {title}
                </Condensed>
                {step !== undefined && (
                    <Stack direction='row' aria-hidden sx={{ gap: 0.5 }}>
                        {SCENE_LIST.map((scene, index) => (
                            <Box
                                key={scene.title}
                                sx={{
                                    width: 16,
                                    height: 4,
                                    borderRadius: 2,
                                    bgcolor: index === step ? ORANGE : 'rgba(255, 255, 255, 0.22)',
                                    transition: 'background-color 200ms ease',
                                }}
                            />
                        ))}
                    </Stack>
                )}
            </Stack>
            {children}
        </Box>
    );
}

/** One scene in its own panel. Phones show one under each point. */
export function ScenePanel({ index }: { index: number }) {
    const { title, Scene } = SCENE_LIST[index];
    return (
        <PanelFrame title={title}>
            <Scene active />
        </PanelFrame>
    );
}

/**
 * The panel that stays beside the three points on a wide screen and shows the scene
 * for the point being read. The scenes are stacked in one cell, so the panel keeps
 * the height of the tallest and only the active one plays.
 */
export function SceneStage({ active }: { active: number }) {
    return (
        <PanelFrame title={SCENE_LIST[active].title} step={active}>
            <Box sx={{ display: 'grid' }}>
                {SCENE_LIST.map(({ title, Scene }, index) => {
                    const shown = index === active;
                    return (
                        <Box
                            key={title}
                            aria-hidden={!shown}
                            sx={{
                                gridArea: '1 / 1',
                                opacity: shown ? 1 : 0,
                                transform: shown ? 'none' : 'translateY(6px)',
                                filter: shown ? 'blur(0)' : 'blur(3px)',
                                visibility: shown ? 'visible' : 'hidden',
                                // Leaving is quicker than arriving, and waits before it hides.
                                transition: shown
                                    ? `opacity 280ms ease, transform 320ms ${EASE_OUT}, filter 280ms ease`
                                    : 'opacity 160ms ease, transform 160ms ease, filter 160ms ease, visibility 0s linear 160ms',
                            }}
                        >
                            <Scene active={shown} />
                        </Box>
                    );
                })}
            </Box>
        </PanelFrame>
    );
}
