import { useReconcile } from '@/board/Board';
import { getStandardNag } from '@/board/pgn/Nag';
import { useChess } from '@/board/pgn/PgnBoard';
import { RabbitIcon } from '@/style/RabbitIcon';
import { SlothIcon } from '@/style/SlothIcon';
import { useLightMode } from '@/style/useLightMode';
import { Chess, Event, EventType, Move } from '@jackstenglein/chess';
import { clockToSeconds } from '@jackstenglein/chess-dojo-common/src/pgn/clock';
import { Edit } from '@mui/icons-material';
import {
    Box,
    Card,
    CardContent,
    Checkbox,
    FormControlLabel,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { green, grey, lime, orange, pink } from '@mui/material/colors';
import {
    AxisValueFormatterContext,
    BarChart,
    ChartsReferenceLine,
    getValueToPositionMapper,
    LineChart,
    useChartsLayerContainerRef,
    useDrawingArea,
    useXScale,
    useYAxes,
} from '@mui/x-charts';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { TimeControlEditor } from '../tags/TimeControlEditor';
import ClockEditor from './ClockEditor';
import { TimeControlDescription } from './TimeControlDescription';
import {
    calculateTimeRating,
    getPerfectLineSeconds,
    getTimeRatingMaxMove,
    MIN_MOVE,
    MIN_TIME_CONTROL,
} from './rating/clockRating';

const showEvalInClockGraph = {
    key: 'showEvalInClockGraph',
    default: true,
} as const;

const showIdealClockUsage = {
    key: 'showIdealClockUsage',
    default: false,
} as const;

const nagEvals: Record<string, number> = {
    $10: 0, // equal
    $13: 0, // unclear
    $14: 1, // white is slightly better
    $15: -1, // black is slightly better
    $16: 2, // white is better
    $17: -2, // black is better
    $18: 3, // white is winning
    $19: -3, // black is winning
};

function getEvalValue(nags?: string[]): number | undefined {
    for (const nag of nags ?? []) {
        const n = getStandardNag(nag);
        if (nagEvals[n] !== undefined) {
            return nagEvals[n];
        }
    }
    return undefined;
}

const plyToMoveNumber = (ply: number): number => {
    if (ply < 1) {
        return 0;
    }
    return Math.ceil(ply / 2);
};

export interface Datum {
    moveNumber: number;
    seconds: number;
    move: Move | null;
    eval?: number;
}

function formatEval(value: number): string {
    switch (value) {
        case -3:
            return '−+';
        case -2:
            return '∓';
        case -1:
            return '⩱';
        case 0:
            return '= / ∞';
        case 1:
            return '⩲';
        case 2:
            return '±';
        case 3:
            return '+−';
        default:
            return `${value}`;
    }
}

export interface RemainingSeries {
    id: string;
    label: string;
    color: string;
    yAxisId: 'clock' | 'eval';
    values: (number | null)[];
    moves: (Move | null)[];
}

export function getRemainingSeries(
    id: string,
    label: string,
    color: string,
    data: Datum[],
    moveNumbers: number[],
): RemainingSeries {
    const byMoveNumber = new Map(data.map((d) => [d.moveNumber, d]));
    const aligned = moveNumbers.map((moveNumber) => byMoveNumber.get(moveNumber));
    return {
        id,
        label,
        color,
        yAxisId: id === 'eval' ? 'eval' : 'clock',
        values: aligned.map((d) => (id === 'eval' ? d?.eval : d?.seconds) ?? null),
        moves: aligned.map((d) => d?.move ?? null),
    };
}

/**
 * Returns the series point closest to a click at (x, y), in pixels from the top left of the
 * chart. The series values must be indexed by move number. Returns undefined if the click is
 * outside the drawing area or no series has a point at the clicked move.
 */
export function getClosestMove(
    series: RemainingSeries[],
    { x, y }: { x: number; y: number },
    drawingArea: { left: number; top: number; width: number; height: number },
    xToMoveNumber: (x: number) => number,
    valueToY: (yAxisId: RemainingSeries['yAxisId'], value: number) => number | undefined,
): { distance: number; move: Move | null } | undefined {
    const { left, top, width, height } = drawingArea;
    if (x < left || x > left + width || y < top || y > top + height) {
        return undefined;
    }

    const index = Math.round(xToMoveNumber(x));
    let closest: { distance: number; move: Move | null } | undefined;
    for (const s of series) {
        const value = s.values[index];
        const position =
            value === null || value === undefined ? undefined : valueToY(s.yAxisId, value);
        if (position === undefined) {
            continue;
        }
        const distance = Math.abs(position - y);
        if (!closest || distance < closest.distance) {
            closest = { distance, move: s.moves[index] };
        }
    }
    return closest;
}

export function formatTime(value: number): string {
    let result = '';
    if (value < 0) {
        result = '-';
        value = Math.abs(value);
    }

    const hours = Math.floor(value / 3600);
    if (hours > 0) {
        result = `${hours}:`;
    }

    const minutes = Math.floor((value % 3600) / 60);
    result += `${minutes.toLocaleString(undefined, { minimumIntegerDigits: 2 })}:`;

    const seconds = (value % 3600) % 60;
    result += seconds.toLocaleString(undefined, { minimumIntegerDigits: 2 });
    return result;
}

export function getInitialClock(timeControl?: string): number {
    if (!timeControl) {
        return 0;
    }

    const descriptor = timeControl.split(':')[0];
    const time = descriptor.split('/').slice(-1)[0];
    const startTime = parseInt(time?.split('+')[0]);
    if (isNaN(startTime) || startTime <= 0) {
        return 0;
    }

    return startTime;
}

export function getIncrement(timeControl?: string): number {
    if (!timeControl) {
        return 0;
    }

    const descriptor = timeControl.split(':')[0];
    const time = descriptor.split('/').slice(-1)[0];
    if (!time) {
        return 0;
    }

    const tokens = time.split('+');
    if (tokens.length < 2) {
        return 0;
    }
    const increment = parseInt(tokens[1]);
    if (!increment || isNaN(increment) || increment <= 0) {
        return 0;
    }
    return increment;
}

function shouldRerender(chess: Chess, event: Event): boolean {
    if (event.type === EventType.UpdateCommand) {
        return event.commandName === 'clk';
    }
    if (event.type === EventType.UpdateHeader) {
        return event.headerName === 'TimeControl';
    }
    if (event.type === EventType.LegalMove) {
        return true;
    }
    if (event.type === EventType.DeleteMove) {
        return !event.mainlineMove;
    }
    if (event.type === EventType.DeleteBeforeMove) {
        return true;
    }
    if (event.type === EventType.PromoteVariation) {
        return chess.isInMainline(event.variantRoot);
    }
    return false;
}

interface ClockUsageProps {
    showEditor?: boolean;
}

const ClockUsage: React.FC<ClockUsageProps> = ({ showEditor }) => {
    const { chess } = useChess();
    const t = useTranslations('analysisBoard.underboard.clock');
    const light = useLightMode();
    const [forceRender, setForceRender] = useState(0);
    const reconcile = useReconcile();
    const [showTimeControlEditor, setShowTimeControlEditor] = useState(false);
    const [showEval, setShowEval] = useLocalStorage<boolean>(
        showEvalInClockGraph.key,
        showEvalInClockGraph.default,
    );
    const [showIdealClock, setShowIdealClock] = useLocalStorage<boolean>(
        showIdealClockUsage.key,
        showIdealClockUsage.default,
    );

    const timeControls = chess?.header().tags.TimeControl?.items;

    const seriesLabels = useMemo(
        () => ({
            white: t('whiteLabel'),
            black: t('blackLabel'),
            ideal: t('idealClockSeriesLabel'),
            eval: t('evalSeriesLabel'),
            totalTime: t('totalTimeLabel'),
        }),
        [t],
    );

    const colors = light
        ? {
              white: pink[200],
              black: '#212121',
              ideal: green[500],
              eval: orange[300],
              currentMove: grey[600],
          }
        : {
              white: 'white',
              black: 'rgb(15, 131, 171)',
              ideal: green[500],
              eval: pink[200],
              currentMove: lime[100],
          };

    useEffect(() => {
        if (chess && showEditor) {
            const observer = {
                types: [
                    EventType.UpdateCommand,
                    EventType.UpdateHeader,
                    EventType.LegalMove,
                    EventType.DeleteMove,
                    EventType.DeleteBeforeMove,
                    EventType.PromoteVariation,
                ],
                handler: (event: Event) => {
                    if (shouldRerender(chess, event)) {
                        setForceRender((v) => v + 1);
                    }
                },
            };

            chess.addObserver(observer);
            return () => chess.removeObserver(observer);
        }
    }, [chess, setForceRender, showEditor]);

    const data = useMemo(() => {
        if (!chess || forceRender < 0) {
            return {
                whiteClockRating: -1,
                whiteClockArea: 0,
                blackClockRating: -1,
                blackClockArea: 0,
                timeRatingEnabled: false,
                whiteClock: [],
                blackClock: [],
                idealClock: [],
                evalData: [],
                currentMoveNumber: undefined,
                whiteTimePerMove: [],
                blackTimePerMove: [],
                whiteSecTotal: 0,
                blackSecTotal: 0,
            };
        }

        let timeControl = timeControls?.[0] ?? {};
        const initialTimeControl = timeControl.seconds ?? 0;
        const maxRatedMove = getTimeRatingMaxMove(timeControls ?? [{}]);

        let timeControlIdx = 0;
        let pliesSinceTimeControl = 0;

        const whiteClockDisplay: Datum[] = [
            {
                moveNumber: 0,
                seconds: timeControl.seconds || 0,
                move: null,
            },
        ];
        const blackClockDisplay: Datum[] = [
            {
                moveNumber: 0,
                seconds: timeControl.seconds || 0,
                move: null,
            },
        ];

        const evalData: Datum[] = [
            {
                moveNumber: 0,
                move: null,
                eval: 0,
                seconds: 0,
            },
        ];

        const currentLineMoveNumber = plyToMoveNumber(chess.currentMove()?.ply ?? 0);
        const whiteTimePerMove: Datum[] = [];
        const blackTimePerMove: Datum[] = [];

        const perfectLine: Datum[] = [];

        let whiteSecTotal = 0;
        let blackSecTotal = 0;

        const moves = chess.history();
        for (let i = 0; i < moves.length; i += 2) {
            const moveNumber = i / 2 + 1;
            if (
                initialTimeControl >= MIN_TIME_CONTROL &&
                moveNumber >= MIN_MOVE &&
                moveNumber <= maxRatedMove
            ) {
                perfectLine.push({
                    moveNumber,
                    move: moves[i],
                    seconds: getPerfectLineSeconds(timeControls ?? [{}], moveNumber),
                });
            }

            const bonus = Math.max(0, timeControl.increment || timeControl.delay || 0);
            let additionalTime = 0;

            if (timeControl.moves && pliesSinceTimeControl / 2 === timeControl.moves - 1) {
                if (timeControlIdx + 1 < (timeControls?.length ?? 0)) {
                    timeControlIdx++;
                }
                timeControl = timeControls?.[timeControlIdx] || {};
                additionalTime = Math.max(0, timeControl.seconds || 0);
                pliesSinceTimeControl = 0;
            } else {
                pliesSinceTimeControl += 2;
            }

            const firstTime = clockToSeconds(moves[i]?.commentDiag?.clk);
            whiteClockDisplay.push({
                moveNumber: i / 2 + 1,
                seconds:
                    firstTime !== undefined
                        ? firstTime
                        : whiteClockDisplay[whiteClockDisplay.length - 1].seconds,
                move: moves[i],
            });

            const secondTime = clockToSeconds(moves[i + 1]?.commentDiag?.clk);
            blackClockDisplay.push({
                moveNumber: i / 2 + 1,
                seconds:
                    secondTime !== undefined
                        ? secondTime
                        : blackClockDisplay[blackClockDisplay.length - 1].seconds,
                move: moves[i + 1] ? moves[i + 1] : moves[i],
            });

            evalData.push({
                moveNumber: i / 2 + 1,
                move: moves[i + 1] ?? moves[i],
                eval:
                    getEvalValue(moves[i + 1]?.nags) ??
                    getEvalValue(moves[i]?.nags) ??
                    evalData.at(-1)?.eval ??
                    0,
                seconds: 0,
            });

            whiteTimePerMove.push({
                moveNumber: i / 2 + 1,
                seconds:
                    whiteClockDisplay[whiteClockDisplay.length - 2].seconds -
                    whiteClockDisplay[whiteClockDisplay.length - 1].seconds +
                    additionalTime +
                    bonus,
                move: moves[i],
            });
            blackTimePerMove.push({
                moveNumber: i / 2 + 1,
                seconds: !moves[i + 1]
                    ? 0
                    : blackClockDisplay[blackClockDisplay.length - 2].seconds -
                      blackClockDisplay[blackClockDisplay.length - 1].seconds +
                      additionalTime +
                      bonus,
                move: moves[i + 1] ? moves[i + 1] : moves[i],
            });

            whiteSecTotal += whiteTimePerMove[whiteTimePerMove.length - 1].seconds;
            blackSecTotal += blackTimePerMove[blackTimePerMove.length - 1].seconds;
        }

        if (whiteTimePerMove.length === 0) {
            whiteTimePerMove.push({
                moveNumber: 0,
                seconds: 0,
                move: null,
            });
        }
        if (blackTimePerMove.length === 0) {
            blackTimePerMove.push({
                moveNumber: 0,
                seconds: 0,
                move: null,
            });
        }

        const { rating: whiteClockRating, area: whiteClockArea } = calculateTimeRating(
            timeControls ?? [{}],
            whiteClockDisplay,
        ) ?? { rating: -1, area: 0 };
        const { rating: blackClockRating, area: blackClockArea } = calculateTimeRating(
            timeControls ?? [{}],
            blackClockDisplay,
        ) ?? { rating: -1, area: 0 };

        return {
            whiteClockRating,
            whiteClockArea,
            blackClockRating,
            blackClockArea,
            timeRatingEnabled: whiteClockRating >= 0 || blackClockRating >= 0,
            whiteClock: whiteClockDisplay,
            blackClock: blackClockDisplay,
            idealClock: perfectLine,
            evalData,
            currentMoveNumber: chess.isInMainline() ? currentLineMoveNumber : undefined,
            whiteTimePerMove,
            blackTimePerMove,
            whiteSecTotal,
            blackSecTotal,
        };
    }, [chess, timeControls, forceRender]);

    if (!chess) {
        return null;
    }

    const onClickMove = (move: Move | null) => {
        chess.seek(move);
        reconcile();
    };

    const onUpdateTimeControl = (value: string) => {
        chess.setHeader('TimeControl', value);
        setShowTimeControlEditor(false);
    };

    const moveNumbers = data.whiteClock.map((d) => d.moveNumber);
    const remainingSeries = [
        getRemainingSeries('white', seriesLabels.white, colors.white, data.whiteClock, moveNumbers),
        getRemainingSeries('black', seriesLabels.black, colors.black, data.blackClock, moveNumbers),
    ];
    if (showIdealClock) {
        remainingSeries.push(
            getRemainingSeries(
                'ideal',
                seriesLabels.ideal,
                colors.ideal,
                data.idealClock,
                moveNumbers,
            ),
        );
    }
    if (showEval) {
        remainingSeries.push(
            getRemainingSeries('eval', seriesLabels.eval, colors.eval, data.evalData, moveNumbers),
        );
    }

    const moveValueFormatter = (value: number, context: AxisValueFormatterContext) =>
        context.location === 'tooltip' ? t('moveTooltip', { value }) : `${value}`;

    return (
        <CardContent sx={{ height: 1 }}>
            <Stack
                spacing={4}
                sx={{
                    height: 1,
                }}
            >
                <Stack>
                    <Stack
                        direction='row'
                        spacing={0.5}
                        sx={{
                            alignItems: 'center',
                        }}
                    >
                        <Typography variant='subtitle1'>{t('timeControlLabel')}</Typography>

                        {showEditor && (
                            <Tooltip title={t('editTimeControlTooltip')}>
                                <IconButton
                                    size='small'
                                    sx={{ position: 'relative', top: '-2px' }}
                                    onClick={() => setShowTimeControlEditor(true)}
                                >
                                    <Edit fontSize='inherit' />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                    <TimeControlDescription timeControls={timeControls || []} />
                </Stack>

                {data.timeRatingEnabled && (
                    <Stack
                        sx={{
                            alignItems: 'center',
                        }}
                    >
                        <Typography
                            variant='caption'
                            sx={{
                                color: 'text.secondary',
                                mb: 1,
                            }}
                        >
                            {t('timeManagementRatingLabel')}
                        </Typography>
                        <Stack direction='row' spacing={2}>
                            <TimeRatingCard
                                backgroundColor='common.white'
                                title={t('whiteLabel')}
                                titleColor='grey.800'
                                rating={data.whiteClockRating}
                                ratingColor='common.black'
                                area={data.whiteClockArea}
                                movedFasterTooltip={t('movedFasterTooltip')}
                                movedSlowerTooltip={t('movedSlowerTooltip')}
                            />

                            <TimeRatingCard
                                backgroundColor='#121212'
                                title={t('blackLabel')}
                                titleColor='rgba(255, 255, 255, 0.7)'
                                rating={data.blackClockRating}
                                ratingColor='common.white'
                                area={data.blackClockArea}
                                movedFasterTooltip={t('movedFasterTooltip')}
                                movedSlowerTooltip={t('movedSlowerTooltip')}
                            />
                        </Stack>
                    </Stack>
                )}

                <Stack
                    spacing={0.5}
                    sx={{
                        alignItems: 'center',
                    }}
                >
                    <Typography
                        variant='caption'
                        sx={{
                            color: 'text.secondary',
                        }}
                    >
                        {t('remainingClockLabel')}
                    </Typography>
                    <Box sx={{ width: 1 }}>
                        <LineChart
                            height={300}
                            hideLegend
                            grid={{ horizontal: true, vertical: true }}
                            xAxis={[
                                {
                                    data: moveNumbers,
                                    tickMinStep: 1,
                                    valueFormatter: moveValueFormatter,
                                    tickLabelStyle: { fontSize: 10 },
                                },
                            ]}
                            yAxis={[
                                {
                                    id: 'clock',
                                    min: 0,
                                    valueFormatter: formatTime,
                                    tickNumber: 6,
                                    width: 'auto',
                                    tickLabelStyle: { fontSize: 10 },
                                },
                                ...(showEval
                                    ? [
                                          {
                                              id: 'eval',
                                              position: 'right' as const,
                                              min: -3,
                                              max: 3,
                                              tickInterval: [-3, -2, -1, 0, 1, 2, 3],
                                              valueFormatter: formatEval,
                                              width: 40,
                                              tickLabelStyle: { fontSize: 10 },
                                          },
                                      ]
                                    : []),
                            ]}
                            series={remainingSeries.map((series) => ({
                                id: series.id,
                                label: series.label,
                                color: series.color,
                                yAxisId: series.yAxisId,
                                data: series.values,
                                showMark: false,
                                valueFormatter: (value: number | null) => {
                                    if (value === null) {
                                        return null;
                                    }
                                    return series.yAxisId === 'eval'
                                        ? formatEval(value)
                                        : formatTime(value);
                                },
                            }))}
                        >
                            {data.currentMoveNumber !== undefined && (
                                <ChartsReferenceLine
                                    x={data.currentMoveNumber}
                                    lineStyle={{
                                        stroke: colors.currentMove,
                                        strokeDasharray: '3 10',
                                    }}
                                />
                            )}
                            <ClosestMoveClickHandler
                                series={remainingSeries}
                                onClick={onClickMove}
                            />
                        </LineChart>
                    </Box>

                    <Stack direction='row' sx={{ alignSelf: 'start', flexWrap: 'wrap' }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={showEval}
                                    onChange={(e) => setShowEval(e.target.checked)}
                                    sx={{ '& .MuiSvgIcon-root': { fontSize: 16 } }}
                                />
                            }
                            label={t('overlayEvaluationCheckbox')}
                            slotProps={{
                                typography: {
                                    sx: {
                                        color: 'text.secondary',
                                        fontSize: '14px',
                                    },
                                },
                            }}
                        />

                        {data.timeRatingEnabled && (
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={showIdealClock}
                                        onChange={(e) => setShowIdealClock(e.target.checked)}
                                        sx={{ '& .MuiSvgIcon-root': { fontSize: 16 } }}
                                    />
                                }
                                label={t('showIdealTimeUsageCheckbox')}
                                slotProps={{
                                    typography: {
                                        sx: {
                                            color: 'text.secondary',
                                            fontSize: '14px',
                                        },
                                    },
                                }}
                            />
                        )}
                    </Stack>
                </Stack>

                <Stack
                    spacing={0.5}
                    sx={{
                        alignItems: 'center',
                    }}
                >
                    <Typography
                        variant='caption'
                        sx={{
                            color: 'text.secondary',
                        }}
                    >
                        {t('timeUsedPerMoveLabel')}
                    </Typography>
                    <Box sx={{ width: 1 }}>
                        <BarChart
                            layout='horizontal'
                            height={Math.max(70, 20 * Math.ceil(chess.plyCount() / 2) + 40)}
                            hideLegend
                            margin={{ top: 5, bottom: 5 }}
                            grid={{ horizontal: true, vertical: true }}
                            yAxis={[
                                {
                                    scaleType: 'band',
                                    data: data.whiteTimePerMove.map((d) => d.moveNumber),
                                    valueFormatter: moveValueFormatter,
                                    tickLabelStyle: { fontSize: 10 },
                                },
                            ]}
                            xAxis={[
                                {
                                    min: 0,
                                    valueFormatter: formatTime,
                                    tickLabelStyle: { fontSize: 10 },
                                },
                            ]}
                            series={[
                                {
                                    id: 'white',
                                    label: seriesLabels.white,
                                    color: colors.white,
                                    data: data.whiteTimePerMove.map((d) => d.seconds),
                                    valueFormatter: (value) => formatTime(value ?? 0),
                                },
                                {
                                    id: 'black',
                                    label: seriesLabels.black,
                                    color: colors.black,
                                    data: data.blackTimePerMove.map((d) => d.seconds),
                                    valueFormatter: (value) => formatTime(value ?? 0),
                                },
                            ]}
                            onItemClick={(_, item) => {
                                const moves =
                                    item.seriesId === 'white'
                                        ? data.whiteTimePerMove
                                        : data.blackTimePerMove;
                                onClickMove(moves[item.dataIndex]?.move ?? null);
                            }}
                        />
                    </Box>
                </Stack>

                <Stack
                    spacing={0.5}
                    sx={{
                        alignItems: 'center',
                    }}
                >
                    <Typography
                        variant='caption'
                        sx={{
                            color: 'text.secondary',
                        }}
                    >
                        {t('totalTimeUsedLabel')}
                    </Typography>
                    <Box sx={{ width: 1 }}>
                        <BarChart
                            layout='horizontal'
                            height={120}
                            hideLegend
                            margin={{ top: 5, bottom: 5 }}
                            grid={{ horizontal: true, vertical: true }}
                            yAxis={[
                                {
                                    scaleType: 'band',
                                    data: [seriesLabels.white, seriesLabels.black],
                                    tickLabelStyle: { fontSize: 10 },
                                },
                            ]}
                            xAxis={[
                                {
                                    min: 0,
                                    valueFormatter: formatTime,
                                    tickLabelStyle: { fontSize: 10 },
                                },
                            ]}
                            series={[
                                {
                                    label: seriesLabels.totalTime,
                                    data: [data.whiteSecTotal, data.blackSecTotal],
                                    colorGetter: ({ dataIndex }) =>
                                        dataIndex === 0 ? colors.white : colors.black,
                                    valueFormatter: (value) => formatTime(value ?? 0),
                                },
                            ]}
                        />
                    </Box>
                </Stack>

                {showEditor && <ClockEditor setShowTimeControlEditor={setShowTimeControlEditor} />}

                {showTimeControlEditor && (
                    <TimeControlEditor
                        open={showTimeControlEditor}
                        initialItems={chess.header().tags.TimeControl?.items}
                        onCancel={() => setShowTimeControlEditor(false)}
                        onSuccess={onUpdateTimeControl}
                    />
                )}
            </Stack>
        </CardContent>
    );
};

/** Seeks to the move of the series point closest to a click on the chart. */
function ClosestMoveClickHandler({
    series,
    onClick,
}: {
    series: RemainingSeries[];
    onClick: (move: Move | null) => void;
}) {
    const containerRef = useChartsLayerContainerRef();
    const drawingArea = useDrawingArea();
    const xScale = useXScale<'linear'>();
    const { yAxis } = useYAxes();

    useEffect(() => {
        const element = containerRef.current;
        if (!element) {
            return;
        }

        const onClickChart = (event: MouseEvent) => {
            const rect = element.getBoundingClientRect();
            const closest = getClosestMove(
                series,
                { x: event.clientX - rect.left, y: event.clientY - rect.top },
                drawingArea,
                (x) => xScale.invert(x),
                (yAxisId, value) => {
                    const axis = yAxis[yAxisId];
                    return axis ? getValueToPositionMapper(axis.scale)(value) : undefined;
                },
            );
            if (closest) {
                onClick(closest.move);
            }
        };

        element.addEventListener('click', onClickChart);
        return () => element.removeEventListener('click', onClickChart);
    }, [containerRef, drawingArea, xScale, yAxis, series, onClick]);

    return null;
}

function TimeRatingCard({
    backgroundColor,
    title,
    titleColor,
    rating,
    ratingColor,
    area,
    movedFasterTooltip,
    movedSlowerTooltip,
}: {
    backgroundColor: string;
    title: string;
    titleColor: string;
    rating: number;
    ratingColor: string;
    area: number;
    movedFasterTooltip: string;
    movedSlowerTooltip: string;
}) {
    return (
        <Card sx={{ p: 1, minWidth: 120, backgroundColor }} elevation={10}>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateAreas: '". title ." " . rating icon"',
                    gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'center',
                }}
            >
                <Typography
                    component='div'
                    variant='caption'
                    sx={{
                        textAlign: 'center',
                        gridArea: 'title',
                        color: titleColor,
                    }}
                >
                    {title}
                </Typography>

                <Typography
                    variant='body1'
                    sx={{
                        fontWeight: 'bold',
                        gridArea: 'rating',
                        color: ratingColor,
                        align: 'center',
                    }}
                >
                    {rating >= 0 ? rating : '?'}
                </Typography>

                {area > 0 && (
                    <Tooltip title={movedFasterTooltip}>
                        <RabbitIcon sx={{ gridArea: 'icon', color: ratingColor }} />
                    </Tooltip>
                )}
                {area < 0 && (
                    <Tooltip title={movedSlowerTooltip}>
                        <SlothIcon sx={{ gridArea: 'icon', color: ratingColor }} />
                    </Tooltip>
                )}
            </Box>
        </Card>
    );
}

export default ClockUsage;
