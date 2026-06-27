import Board from '@/board/Board';
import { Box, Fade, Stack, Tooltip, Typography } from '@mui/material';
import { LineChart, useAxesTooltip } from '@mui/x-charts';
import { useSvgRef, useXScale, useYScale } from '@mui/x-charts/hooks';
import { useTranslations } from 'next-intl';
import { PuzzleSession } from '../checkmate/CheckmatePuzzlePage';

const GRAPH_SUCCESS_COLOR = 'green';
const GRAPH_FAIL_COLOR = 'red';

export function PuzzleSessionChart({ session }: { session: PuzzleSession }) {
    const thresholds = [0.01];
    const colors = ['gray'];

    let minRating = session.start;
    let maxRating = session.start;

    for (let i = 0; i < session.history.length; i++) {
        const currentRating = session.history[i].rating;
        const previousRating = session.history[i - 1]?.rating ?? session.start;

        if (currentRating > maxRating) {
            maxRating = currentRating;
        }
        if (currentRating < minRating) {
            minRating = currentRating;
        }

        let color: string;
        if (currentRating > previousRating) {
            color = GRAPH_SUCCESS_COLOR;
        } else if (currentRating < previousRating) {
            color = GRAPH_FAIL_COLOR;
        } else {
            color = 'gray';
        }

        if (colors.length === 1) {
            colors.push(color);
        } else if (colors.at(-1) !== color) {
            colors.push(color);
            thresholds.push(i + 0.01);
        }
    }

    return (
        <LineChart
            series={[
                {
                    curve: 'linear',
                    data: [session.start, ...session.history.map((h) => h.rating)],
                },
            ]}
            height={200}
            grid={{ horizontal: true }}
            xAxis={[
                {
                    scaleType: 'linear',
                    position: 'none',
                    data: Array.from({ length: Math.max(session.history.length + 1, 10) }).map(
                        (_, i) => i,
                    ),
                    colorMap: {
                        type: 'piecewise',
                        thresholds,
                        colors,
                    },
                },
            ]}
            yAxis={[
                {
                    valueFormatter: (value: number) => `${value}`,
                    width: 50,
                    min: Math.min(session.start - 60, minRating - 20),
                    max: Math.max(session.start + 60, maxRating + 20),
                },
            ]}
            slots={{
                tooltip: () => <TooltipPlacement session={session}></TooltipPlacement>,
            }}
            slotProps={{
                tooltip: {
                    anchor: 'node',
                    trigger: 'axis',
                },
            }}
            sx={{ ml: '-20px', mt: 1, maxHeight: '200px' }}
        />
    );
}

function TooltipPlacement({ session }: { session: PuzzleSession }) {
    const t = useTranslations('puzzles.sessionChart');
    const tooltipData = useAxesTooltip({ directions: ['x'] });
    const xScale = useXScale();
    const yScale = useYScale();
    const svgRef = useSvgRef();

    if (!svgRef.current) {
        return null;
    }

    const xValue = (tooltipData?.[0].axisValue as number) ?? undefined;
    const yValue = (tooltipData?.[0].seriesItems[0]?.value as number) ?? undefined;
    if (xValue === undefined || yValue === undefined) {
        return null;
    }
    if (xValue - 1 >= session.history.length) {
        return null;
    }

    const svgXPosition = xScale(xValue) ?? 0;
    const svgYPosition = yScale(yValue) ?? 0;

    const tooltipPosition = {
        x: svgRef.current.getBoundingClientRect().left + svgXPosition,
        y: svgRef.current.getBoundingClientRect().top + svgYPosition,
    };

    const item = session.history[xValue - 1];

    return (
        <Tooltip
            open
            leaveDelay={Infinity}
            arrow
            disableInteractive
            placement='right'
            slots={{ transition: Fade }}
            slotProps={{
                popper: {
                    anchorEl: {
                        getBoundingClientRect: () => ({
                            x: tooltipPosition.x,
                            y: tooltipPosition.y,
                            top: tooltipPosition.y,
                            left: tooltipPosition.x,
                            right: tooltipPosition.x,
                            bottom: tooltipPosition.y,
                            width: 0,
                            height: 0,
                            toJSON: () => '',
                        }),
                    },
                },
            }}
            title={
                item ? (
                    <Box sx={{ p: 1, minWidth: 200 }}>
                        <Box sx={{ width: 200, height: 200 }}>
                            <Board
                                config={{
                                    fen: item?.puzzle.fen,
                                    viewOnly: true,
                                    coordinates: false,
                                    orientation:
                                        item?.puzzle.fen.split(' ')[1] === 'w' ? 'black' : 'white',
                                }}
                            />
                        </Box>

                        <Stack
                            direction='row'
                            justifyContent='space-between'
                            mt={0.5}
                            alignItems='center'
                        >
                            <Typography variant='caption'>{t('puzzleRating')}</Typography>
                            <Typography variant='caption' fontWeight='bold'>
                                {item?.puzzle.rating}
                            </Typography>
                        </Stack>

                        <Stack direction='row' justifyContent='space-between' alignItems='center'>
                            <Typography variant='caption'>{t('yourRating')}</Typography>
                            <Typography
                                variant='caption'
                                fontWeight='bold'
                                color={
                                    item?.ratingChange > 0
                                        ? 'success'
                                        : item?.ratingChange < 0
                                          ? 'error'
                                          : undefined
                                }
                            >
                                {item?.rating} ({item?.ratingChange >= 0 && '+'}
                                {item?.ratingChange})
                            </Typography>
                        </Stack>
                    </Box>
                ) : (
                    <Box sx={{ p: 1, minWidth: 200 }}>
                        <Stack direction='row' justifyContent='space-between'>
                            <Typography variant='caption'>{t('startRating')}</Typography>
                            <Typography variant='caption'>{session.start}</Typography>
                        </Stack>
                    </Box>
                )
            }
        >
            <div />
        </Tooltip>
    );
}
