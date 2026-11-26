import Board, { BoardApi } from '@/board/Board';
import {
    correctMoveGlyphHtml,
    incorrectMoveGlyphHtml,
} from '@/components/material/memorizegames/moveGlyphs';
import {
    applyRushResult,
    currentRushRating,
    initialRushLadder,
} from '@jackstenglein/chess-dojo-common/src/puzzles/rush/rating';
import { Key } from '@lichess-org/chessground/types';
import { Box, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { HAIRLINE, INK_RAISED, MUTED } from '../../class/sections/shared';
import {
    DEMO_CAPTION,
    DEMO_RUN,
    HERO_POSITION,
    RUSH_MINUTES,
    RUSH_STRIKES,
    startLabel,
} from '../content';
import { EASE_OUT, useOnScreen, useReducedMotion } from './motion';
import { HudTone, RunHud, TimeBar } from './RunHud';
import { BoardFrame } from './RushBoard';

const START_SECONDS = RUSH_MINUTES * 60;
const FIRST_MOVE_MS = 800;
const MOVE_MS = 950;
const RESULT_MS = 1300;
const REST_MS = 1800;

interface DemoHud {
    seconds: number;
    solved: number;
    strikes: number;
    rating: number;
    status: string;
    tone: HudTone;
    change?: { amount: number; key: number };
}

const RESTING: DemoHud = {
    seconds: START_SECONDS,
    solved: 0,
    strikes: 0,
    rating: currentRushRating(initialRushLadder()),
    status: HERO_POSITION.toMove,
    tone: 'neutral',
};

function toMove(orientation: 'white' | 'black'): string {
    return orientation === 'white' ? 'White to move' : 'Black to move';
}

/**
 * The hero's picture of a run, and it moves: the board plays three real puzzles from
 * the pack by itself while the clock, the score and the rating react. It shows a
 * climb, a strike and the drop that follows, which is the whole game in a few seconds.
 * The whole card is a button that starts the visitor's own run.
 *
 * It rests when it is off screen or the tab is hidden, and stays still for visitors
 * who asked for less motion.
 */
export function DemoRun({ onStart }: { onStart: () => void }) {
    const [board, setBoard] = useState<BoardApi>();
    const [hud, setHud] = useState<DemoHud>(RESTING);
    const [ref, onScreen] = useOnScreen<HTMLButtonElement>();
    const reducedMotion = useReducedMotion();
    const playing = Boolean(board) && onScreen && !reducedMotion;

    const config = useMemo(
        () => ({
            fen: HERO_POSITION.fen,
            orientation: HERO_POSITION.orientation,
            viewOnly: true,
            coordinates: false,
        }),
        [],
    );

    useEffect(() => {
        if (!board || !playing) {
            return;
        }
        let cancelled = false;
        const timers: ReturnType<typeof setTimeout>[] = [];
        const wait = (ms: number) =>
            new Promise<void>((resolve) => {
                timers.push(setTimeout(resolve, ms));
            });
        const clock = setInterval(
            () => setHud((current) => ({ ...current, seconds: Math.max(0, current.seconds - 1) })),
            1000,
        );

        const loop = async () => {
            let changes = 0;
            while (!cancelled) {
                let ladder = initialRushLadder();
                let solved = 0;
                setHud({ ...RESTING, status: toMove(DEMO_RUN[0].orientation) });

                for (const puzzle of DEMO_RUN) {
                    board.set({
                        animation: { enabled: false },
                        fen: puzzle.fen,
                        orientation: puzzle.orientation,
                        lastMove: undefined,
                    });
                    board.setAutoShapes([]);
                    board.set({ animation: { enabled: true, duration: 280 } });
                    setHud((current) => ({
                        ...current,
                        status: toMove(puzzle.orientation),
                        tone: 'neutral',
                    }));

                    let last = puzzle.moves[0];
                    for (const [index, move] of puzzle.moves.entries()) {
                        await wait(index === 0 ? FIRST_MOVE_MS : MOVE_MS);
                        if (cancelled) {
                            return;
                        }
                        board.move(move.slice(0, 2) as Key, move.slice(2, 4) as Key);
                        last = move;
                    }

                    const before = currentRushRating(ladder);
                    ladder = applyRushResult(ladder, puzzle.result);
                    const won = puzzle.result === 'win';
                    solved += won ? 1 : 0;
                    changes += 1;
                    board.setAutoShapes([
                        {
                            orig: last.slice(2, 4) as Key,
                            customSvg: {
                                html: won ? correctMoveGlyphHtml : incorrectMoveGlyphHtml,
                            },
                        },
                    ]);
                    const strikes = ladder.strikes;
                    const rating = currentRushRating(ladder);
                    setHud((current) => ({
                        ...current,
                        solved,
                        strikes,
                        rating,
                        status: won ? 'Correct' : `Strike ${strikes} of ${RUSH_STRIKES}`,
                        tone: won ? 'win' : 'loss',
                        change: { amount: rating - before, key: changes },
                    }));
                    await wait(RESULT_MS);
                    if (cancelled) {
                        return;
                    }
                }
                await wait(REST_MS);
            }
        };
        void loop();

        return () => {
            cancelled = true;
            clearInterval(clock);
            timers.forEach(clearTimeout);
        };
    }, [board, playing]);

    return (
        <Box
            ref={ref}
            component='button'
            type='button'
            data-press
            onClick={onStart}
            aria-label={`${startLabel(1)}. The board shows a demo of a run.`}
            sx={{
                display: 'block',
                width: 1,
                maxWidth: { xs: '24rem', md: 'none' },
                mx: 'auto',
                p: 0,
                font: 'inherit',
                textAlign: 'left',
                color: 'common.white',
                cursor: 'pointer',
                bgcolor: INK_RAISED,
                border: `1px solid ${HAIRLINE}`,
                borderRadius: 3,
                overflow: 'hidden',
                boxShadow: '0 40px 90px -30px rgba(0, 0, 0, 0.9)',
                '@media (hover: hover) and (pointer: fine)': {
                    '&:hover': { borderColor: 'rgba(247, 148, 31, 0.6)' },
                },
                transition: `border-color 200ms ease, transform 160ms ${EASE_OUT}`,
                '&:active': { transform: 'scale(0.985)' },
            }}
        >
            <TimeBar seconds={hud.seconds} />
            <Box aria-hidden sx={{ pt: 1.5 }}>
                <RunHud
                    compact
                    seconds={hud.seconds}
                    strikes={hud.strikes}
                    status={hud.status}
                    tone={hud.tone}
                    solved={hud.solved}
                    rating={hud.rating}
                    change={hud.change}
                />
                <BoardFrame>
                    <Board config={config} onInitializeBoard={setBoard} />
                </BoardFrame>
            </Box>
            <Typography variant='body2' sx={{ px: 2, py: 1.25, color: MUTED, textAlign: 'center' }}>
                {DEMO_CAPTION}
            </Typography>
        </Box>
    );
}
