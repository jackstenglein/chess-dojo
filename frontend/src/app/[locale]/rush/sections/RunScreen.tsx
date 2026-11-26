import { LocalFireDepartment } from '@mui/icons-material';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Condensed, fontVars, INK, MUTED, ORANGE } from '../../class/sections/shared';
import { RUSH_DEMO_RUN_LIMIT, RUSH_STRIKES } from '../content';
import { UseRushDemoResponse } from '../useRushDemo';
import { EASE_OUT, pressSx, softIn } from './motion';
import { bodyFontSx, DANGER, SUCCESS } from './parts';
import { RunHud, TimeBar } from './RunHud';
import { puzzleToPgn, RushBoard } from './RushBoard';

/** Height of everything on the run screen that is not the board. */
const CHROME_HEIGHT = '15.75rem';

/** Covers the whole window, so nothing else on the page competes with the run. */
export function FullScreen({ children, label }: { children: React.ReactNode; label: string }) {
    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previous;
        };
    }, []);

    return (
        <Box
            role='region'
            aria-label={label}
            className='dark'
            sx={{
                ...fontVars,
                ...pressSx,
                position: 'fixed',
                inset: 0,
                zIndex: 1400,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'safe center',
                bgcolor: INK,
                color: 'common.white',
                fontVariantNumeric: 'tabular-nums',
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                '& ::selection': { backgroundColor: ORANGE, color: INK },
                '& :focus-visible': { outline: `2px solid ${ORANGE}`, outlineOffset: '3px' },
                '@media (prefers-reduced-motion: reduce)': {
                    '& *': { animation: 'none !important', transition: 'none !important' },
                },
            }}
        >
            {children}
        </Box>
    );
}

/** A column as wide as the board, which is as big as the window allows. */
export function BoardColumn({ children }: { children: React.ReactNode }) {
    return (
        <Stack
            sx={{
                width: `min(100vw, calc(100dvh - ${CHROME_HEIGHT}), 44rem)`,
                minWidth: 'min(100vw, 20rem)',
            }}
        >
            {children}
        </Stack>
    );
}

export function RunScreen({
    rush,
    runNumber,
    best,
}: {
    rush: UseRushDemoResponse;
    runNumber: number;
    /** The visitor's best score from earlier runs. Gives runs two and three a target. */
    best?: number;
}) {
    const [confirmingEnd, setConfirmingEnd] = useState(false);
    const { currentPuzzle, phase, secondsRemaining, strikes, stats, streak, flash, rating } = rush;
    const { attempts } = rush;

    const orientation = useMemo(
        () => (currentPuzzle ? puzzleToPgn(currentPuzzle).orientation : 'white'),
        [currentPuzzle],
    );

    if (phase === 'loading' || !currentPuzzle) {
        return (
            <FullScreen label={`Run ${runNumber}`}>
                <Stack sx={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                    <CircularProgress sx={{ color: ORANGE }} />
                    <Typography sx={{ ...bodyFontSx, color: MUTED }}>
                        Setting up the board
                    </Typography>
                </Stack>
            </FullScreen>
        );
    }

    const status =
        flash === 'win'
            ? 'Correct'
            : flash === 'loss'
              ? `Strike ${strikes} of ${RUSH_STRIKES}`
              : orientation === 'white'
                ? 'White to move'
                : 'Black to move';
    const lastAttempt = attempts[attempts.length - 1];
    const change = lastAttempt
        ? { amount: rating - lastAttempt.searchRating, key: attempts.length }
        : undefined;
    const solved = stats.correctCount;
    const target =
        best === undefined || best === 0
            ? undefined
            : solved > best
              ? 'New best'
              : `${best - solved + 1} to beat your best`;

    return (
        <FullScreen label={`Run ${runNumber}`}>
            <BoardColumn>
                <TimeBar seconds={secondsRemaining} />
                <Stack
                    direction='row'
                    sx={{
                        px: 2,
                        minHeight: 48,
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                    }}
                >
                    {confirmingEnd ? (
                        <>
                            <Typography variant='body2' sx={{ lineHeight: 1.25 }}>
                                End this run? It counts as one of your {RUSH_DEMO_RUN_LIMIT}.
                            </Typography>
                            <Stack direction='row' sx={{ gap: 0.5, flexShrink: 0 }}>
                                <Button
                                    onClick={() => setConfirmingEnd(false)}
                                    sx={{ minHeight: 44, color: 'common.white' }}
                                >
                                    Keep playing
                                </Button>
                                <Button onClick={rush.abort} sx={{ minHeight: 44, color: DANGER }}>
                                    End run
                                </Button>
                            </Stack>
                        </>
                    ) : (
                        <>
                            <Stack direction='row' sx={{ alignItems: 'baseline', gap: 1.25 }}>
                                <Condensed
                                    sx={{
                                        fontSize: '1.05rem',
                                        color: MUTED,
                                        letterSpacing: '0.04em',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Run {runNumber} of {RUSH_DEMO_RUN_LIMIT}
                                </Condensed>
                                {target && (
                                    <Typography
                                        key={target === 'New best' ? 'best' : 'chase'}
                                        variant='body2'
                                        sx={{
                                            color: target === 'New best' ? SUCCESS : ORANGE,
                                            animation: `${softIn} 320ms ${EASE_OUT}`,
                                        }}
                                    >
                                        {target}
                                    </Typography>
                                )}
                            </Stack>
                            <Button
                                onClick={() => setConfirmingEnd(true)}
                                sx={{ minHeight: 44, mr: -1, color: MUTED }}
                            >
                                End run
                            </Button>
                        </>
                    )}
                </Stack>

                <RunHud
                    seconds={secondsRemaining}
                    strikes={strikes}
                    status={status}
                    tone={flash === 'win' ? 'win' : flash === 'loss' ? 'loss' : 'neutral'}
                    solved={solved}
                    rating={rating}
                    change={change}
                />

                <Box
                    sx={{
                        outline: '3px solid',
                        outlineColor:
                            flash === 'win' ? SUCCESS : flash === 'loss' ? DANGER : 'transparent',
                        transition: 'outline-color 150ms ease',
                    }}
                >
                    <RushBoard
                        key={currentPuzzle.id}
                        puzzle={currentPuzzle}
                        onWrongMove={rush.onWrongMove}
                        onComplete={rush.onComplete}
                    />
                </Box>

                <Stack
                    direction='row'
                    sx={{
                        px: 2,
                        py: 1.5,
                        minHeight: 52,
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                    }}
                >
                    {attempts.length === 0 ? (
                        <Typography variant='body2' sx={{ color: MUTED }}>
                            Ten minutes is plenty. Accuracy beats speed here.
                        </Typography>
                    ) : (
                        <ResultStrip results={attempts.map((attempt) => attempt.result)} />
                    )}
                    {streak > 1 && (
                        <Stack
                            key={streak}
                            direction='row'
                            sx={{
                                alignItems: 'center',
                                gap: 0.5,
                                color: ORANGE,
                                flexShrink: 0,
                                animation: `${softIn} 260ms ${EASE_OUT}`,
                            }}
                        >
                            <LocalFireDepartment sx={{ fontSize: '1.25rem' }} />
                            <Condensed sx={{ fontSize: '1.1rem' }}>{streak} in a row</Condensed>
                        </Stack>
                    )}
                </Stack>
            </BoardColumn>
        </FullScreen>
    );
}

/** The most recent results as green and red squares, newest on the right. */
function ResultStrip({ results }: { results: ('win' | 'loss')[] }) {
    const shown = results.slice(-14);
    const first = results.length - shown.length;
    return (
        <Stack
            direction='row'
            role='img'
            aria-label={`${results.filter((result) => result === 'win').length} solved, ${results.filter((result) => result === 'loss').length} missed`}
            sx={{ gap: 0.5, flexWrap: 'wrap', minHeight: 14 }}
        >
            {shown.map((result, index) => (
                <Box
                    key={first + index}
                    sx={{
                        width: 14,
                        height: 14,
                        borderRadius: 0.5,
                        bgcolor: result === 'win' ? SUCCESS : DANGER,
                        animation: `${softIn} 240ms ${EASE_OUT}`,
                    }}
                />
            ))}
        </Stack>
    );
}
