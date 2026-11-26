import { Close } from '@mui/icons-material';
import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import { useMemo, useRef, useState } from 'react';
import { Body, Condensed, MUTED, ORANGE } from '../../class/sections/shared';
import { MISSES_CLOSING_LINE } from '../content';
import { RushDemoMiss } from '../rushStorage';
import { bodyFontSx, primaryButtonSx, secondaryButtonSx, SUCCESS } from './parts';
import { BoardColumn, FullScreen } from './RunScreen';
import { puzzleToPgn, RushBoard, RushBoardApi, solutionText } from './RushBoard';

type Progress = 'solving' | 'solved' | 'shown';

/**
 * Steps through the puzzles missed in a run, with no clock and no strikes. The
 * visitor can try each one again or ask for the solution.
 */
export function MissesReview({
    misses,
    initialIndex = 0,
    nextLabel,
    onNext,
    onClose,
}: {
    misses: RushDemoMiss[];
    /** The miss to open on, when the visitor picked one from the chart. */
    initialIndex?: number;
    /** The label of the button on the last screen, such as "Start run 2". */
    nextLabel: string;
    onNext: () => void;
    onClose: () => void;
}) {
    const [index, setIndex] = useState(initialIndex);
    const [progress, setProgress] = useState<Progress>('solving');
    const boardRef = useRef<RushBoardApi>(null);

    const miss = misses[index];
    const puzzle = useMemo(
        () => (miss ? { id: miss.puzzleId, fen: miss.fen, moves: miss.moves } : undefined),
        [miss],
    );
    const orientation = useMemo(
        () => (puzzle ? puzzleToPgn(puzzle).orientation : 'white'),
        [puzzle],
    );

    if (!miss || !puzzle) {
        return (
            <FullScreen label='Your misses'>
                <Stack
                    sx={{
                        flexGrow: 1,
                        justifyContent: 'center',
                        px: 3,
                        gap: 3,
                        maxWidth: '34rem',
                    }}
                >
                    <Condensed
                        component='h2'
                        sx={{ fontSize: { xs: '2.2rem', md: '2.8rem' }, fontWeight: 500 }}
                    >
                        {MISSES_CLOSING_LINE}
                    </Condensed>
                    <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1.5 }}>
                        <Button
                            variant='contained'
                            color='dojoOrange'
                            size='large'
                            onClick={onNext}
                            sx={primaryButtonSx}
                        >
                            {nextLabel}
                        </Button>
                        <Button
                            variant='outlined'
                            size='large'
                            onClick={onClose}
                            sx={secondaryButtonSx}
                        >
                            Back to my result
                        </Button>
                    </Stack>
                </Stack>
            </FullScreen>
        );
    }

    const goNext = () => {
        setProgress('solving');
        setIndex((current) => current + 1);
    };

    const showSolution = () => {
        boardRef.current?.showSolution();
        setProgress('shown');
    };

    const isLast = index === misses.length - 1;

    return (
        <FullScreen label='Your misses'>
            <BoardColumn>
                <Stack
                    direction='row'
                    sx={{
                        px: 2,
                        minHeight: 48,
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <Condensed
                        sx={{
                            fontSize: '1.05rem',
                            color: MUTED,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                        }}
                    >
                        Miss {index + 1} of {misses.length}
                    </Condensed>
                    <IconButton
                        aria-label='Back to my result'
                        onClick={onClose}
                        sx={{ width: 44, height: 44, mr: -1, color: MUTED }}
                    >
                        <Close />
                    </IconButton>
                </Stack>

                <Stack
                    direction='row'
                    sx={{
                        px: 2,
                        pb: 1.25,
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        gap: 2,
                    }}
                >
                    <Condensed sx={{ fontSize: '1.5rem' }}>
                        {orientation === 'white' ? 'White to move' : 'Black to move'}
                    </Condensed>
                    <Typography variant='body2' sx={{ color: MUTED }}>
                        Puzzle rating {miss.rating}
                    </Typography>
                </Stack>

                <RushBoard
                    key={`${miss.puzzleId}-${index}`}
                    ref={boardRef}
                    puzzle={puzzle}
                    onComplete={() => setProgress('solved')}
                />

                <Box sx={{ px: 2, py: 2 }}>
                    <Box aria-live='polite' sx={{ minHeight: '3.4rem' }}>
                        {progress === 'solving' ? (
                            <Body sx={{ fontSize: '1.05rem' }}>
                                No clock and no strikes this time. Take as long as you need.
                            </Body>
                        ) : (
                            <>
                                <Condensed
                                    sx={{
                                        fontSize: '1.2rem',
                                        color: progress === 'solved' ? SUCCESS : ORANGE,
                                    }}
                                >
                                    {progress === 'solved' ? 'Solved' : 'The solution'}
                                </Condensed>
                                <Typography sx={{ ...bodyFontSx, mt: 0.25, fontSize: '1.05rem' }}>
                                    {solutionText(puzzle)}
                                </Typography>
                            </>
                        )}
                    </Box>

                    <Stack direction='row' sx={{ mt: 1.5, gap: 1.5 }}>
                        {progress === 'solving' && (
                            <Button
                                variant='outlined'
                                onClick={showSolution}
                                sx={{ ...secondaryButtonSx, flex: 1, px: 1.5 }}
                            >
                                Show the solution
                            </Button>
                        )}
                        <Button
                            variant='contained'
                            color='dojoOrange'
                            onClick={goNext}
                            sx={{ ...primaryButtonSx, minHeight: 52, flex: 1, px: 1.5 }}
                        >
                            {isLast ? 'Done' : 'Next miss'}
                        </Button>
                    </Stack>
                </Box>
            </BoardColumn>
        </FullScreen>
    );
}
