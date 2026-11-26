import { Box, Button, Stack, Typography } from '@mui/material';
import { Body, HAIRLINE, INK_RAISED, MUTED } from '../../class/sections/shared';
import {
    END_REASON_LABEL,
    missesLabel,
    runsLeftLine,
    RUSH_DEMO_RUN_LIMIT,
    startLabel,
} from '../content';
import { RushDemoRun } from '../rushStorage';
import { TopGround } from './Hero';
import { EASE_OUT, softIn } from './motion';
import {
    bodyFontSx,
    Display,
    formatClock,
    primaryButtonSx,
    RunPips,
    secondaryButtonSx,
    Stat,
    StatRow,
    TOP_ACTION_ID,
} from './parts';
import { RunChart, RunInsights, ShareResult } from './RunReport';

export function RunStats({ run }: { run: RushDemoRun }) {
    return (
        <StatRow>
            <Stat label='Accuracy' value={`${run.accuracy}%`} />
            <Stat label='Highest puzzle solved' value={run.highestSolved || 'None'} />
            <Stat label='Time' value={formatClock(run.timeSeconds)} />
        </StatRow>
    );
}

/** The run as a chart with what it says about the visitor's play, in one panel. */
export function RunPanel({
    run,
    placement,
    onPickMiss,
}: {
    run: RushDemoRun;
    placement: string;
    onPickMiss?: (missIndex: number) => void;
}) {
    return (
        <Box
            sx={{
                p: { xs: 2.5, md: 3.5 },
                bgcolor: INK_RAISED,
                border: `1px solid ${HAIRLINE}`,
                borderRadius: 3,
                boxShadow: '0 40px 90px -30px rgba(0, 0, 0, 0.9)',
                animation: `${softIn} 520ms ${EASE_OUT} 120ms both`,
            }}
        >
            <RunChart run={run} onPickMiss={onPickMiss} />
            <Box sx={{ mt: 2 }}>
                <RunInsights run={run} />
            </Box>
            <Box sx={{ mt: 1.5 }}>
                <ShareResult run={run} placement={placement} />
            </Box>
        </Box>
    );
}

/** Shown after runs one and two, in place of the hero. */
export function RunComplete({
    runs,
    onStart,
    onReview,
    loadFailed,
}: {
    runs: RushDemoRun[];
    onStart: () => void;
    /** Opens the review of the misses, optionally on one of them. */
    onReview: (missIndex?: number) => void;
    loadFailed: boolean;
}) {
    const run = runs[runs.length - 1];
    const runNumber = runs.length;
    const previousBest = runs.slice(0, -1).reduce((best, other) => Math.max(best, other.solved), 0);
    const isBest = runNumber > 1 && run.solved > previousBest;

    return (
        <TopGround>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 30rem)' },
                    columnGap: 8,
                    rowGap: 4,
                    alignItems: 'start',
                    mt: { xs: 3, md: 7 },
                }}
            >
                <Box>
                    <Display>
                        Run {runNumber}: {run.solved} solved
                    </Display>
                    <Body sx={{ mt: 1.5, color: 'common.white' }}>
                        {END_REASON_LABEL[run.endReason]}
                        {isBest
                            ? `. ${run.solved - previousBest} better than your last best.`
                            : '.'}
                    </Body>

                    <Box sx={{ mt: 3 }}>
                        <RunStats run={run} />
                    </Box>

                    <Stack sx={{ mt: 3, gap: 1.25 }}>
                        <RunPips done={runNumber} />
                        <Body sx={{ color: 'common.white' }}>{runsLeftLine(runNumber)}</Body>
                    </Stack>

                    <Stack
                        id={TOP_ACTION_ID}
                        direction={{ xs: 'column', sm: 'row' }}
                        sx={{ mt: 3, gap: 1.5 }}
                    >
                        <Button
                            variant='contained'
                            color='dojoOrange'
                            size='large'
                            onClick={onStart}
                            sx={{ ...primaryButtonSx, minWidth: 240 }}
                        >
                            {startLabel(runNumber + 1)}
                        </Button>
                        {run.misses.length > 0 && (
                            <Button
                                variant='outlined'
                                size='large'
                                onClick={() => onReview()}
                                sx={secondaryButtonSx}
                            >
                                {missesLabel(run.misses.length)}
                            </Button>
                        )}
                    </Stack>
                    {loadFailed && (
                        <Typography role='alert' sx={{ ...bodyFontSx, mt: 1.5, color: '#FF8A7A' }}>
                            The puzzles did not load. Check your connection and tap the button
                            again.
                        </Typography>
                    )}
                    <Typography variant='body2' sx={{ mt: 2, color: MUTED }}>
                        Run {runNumber} of {RUSH_DEMO_RUN_LIMIT} done. Your runs are saved in this
                        browser.
                    </Typography>
                </Box>

                {run.attempts.length > 0 && (
                    <RunPanel run={run} placement='run_complete' onPickMiss={onReview} />
                )}
            </Box>
        </TopGround>
    );
}
