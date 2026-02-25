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
import { useEffect, useMemo, useState } from 'react';
import { AxisOptions, Chart, Datum as ChartDatum, Series } from 'react-charts';
import { useLocalStorage } from 'usehooks-ts';
import { TimeControlEditor } from '../tags/TimeControlEditor';
import ClockEditor from './ClockEditor';
import { TimeControlDescription } from './TimeControlDescription';
import {
    calculateTimeRating,
    getPerfectLineSeconds,
    MAX_MOVE,
    MIN_MOVE,
    MIN_TIME_CONTROL,
} from './rating/clockRating';

const IDEAL_CLOCK_SERIES_LABEL = 'Ideal';
const EVAL_SERIES_LABEL = 'Eval';
const CURRENT_MOVE_SERIES_LABEL = 'Current Move';

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
    secondaryAxisId?: string;
    label?: string;
    moveNumber: number;
    seconds: number;
    move: Move | null;
    eval?: number;
}

const primaryAxis: AxisOptions<Datum> = {
    getValue: (datum) => datum.moveNumber,
    scaleType: 'linear',
    formatters: {
        scale: (value) => (value % 1 === 0 ? `${value}` : ''),
        tooltip: (value) => (value % 1 === 0 ? `Move ${value}` : ''),
    },
};

const secondaryAxes: AxisOptions<Datum>[] = [
    {
        getValue: (datum: Datum) => datum.seconds as unknown as Date,
        min: 0 as unknown as Date,
        formatters: {
            scale: formatTime,
        },
        tickCount: 6,
        // This is necessary to make the tick marks line up with the eval, but requires the gross
        // type assertions.
        scaleType: 'time',
    } as unknown as AxisOptions<Datum>,
    {
        id: 'eval',
        getValue: (datum) => datum.eval,
        scaleType: 'linear',
        elementType: 'line',
        min: -3,
        max: 3,
        formatters: {
            scale: (value: number) => {
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
            },
        },
        tickCount: 6,
    },
];

const barAxis: AxisOptions<Datum> = {
    getValue: (datum) => datum.moveNumber,
    scaleType: 'band',
    position: 'left',
    formatters: {
        tooltip: (value) => `Move ${(value as number)?.toString()}`,
    },
};

const secondaryBarAxis: AxisOptions<Datum>[] = [
    {
        getValue: (datum: Datum) => datum.seconds,
        min: 0,
        formatters: {
            scale: formatTime,
        },
        position: 'bottom',
    },
];

const totalTimePrimaryAxis: AxisOptions<Datum> = {
    getValue: (datum) => datum.label,
    position: 'left',
};

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

function getSeriesStyle(series: Series<Datum>, light: boolean) {
    if (series.label === CURRENT_MOVE_SERIES_LABEL) {
        if (light) {
            return { fill: grey[600], stroke: grey[600], strokeDasharray: '3 10' };
        }
        return { fill: lime[100], stroke: lime[100], strokeDasharray: '3 10' };
    }
    if (series.label === IDEAL_CLOCK_SERIES_LABEL) {
        return { fill: green[500], stroke: green[500] };
    }
    if (series.label === 'White') {
        if (light) {
            return { fill: pink[200], stroke: pink[200] };
        }
        return { fill: 'white', stroke: 'white' };
    }

    if (series.label === EVAL_SERIES_LABEL) {
        if (light) {
            return { fill: orange[300], stroke: orange[300] };
        }
        return { fill: pink[200], stroke: pink[200] };
    }

    if (light) {
        return { fill: '#212121', stroke: '#212121' };
    }
    return { fill: 'rgb(15, 131, 171)', stroke: 'rgb(15, 131, 171)' };
}

function getDatumStyle(datum: ChartDatum<Datum>, light: boolean) {
    if (datum.originalDatum.label === 'White') {
        if (light) {
            return { fill: pink[200] };
        }
        return { fill: 'white' };
    }

    if (light) {
        return { fill: '#212121' };
    }
    return { fill: 'rgb(15, 131, 171)' };
}

interface ClockUsageProps {
    showEditor?: boolean;
}

const ClockUsage: React.FC<ClockUsageProps> = ({ showEditor }) => {
    const { chess } = useChess();
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
                total: [],
                remainingPerMove: [],
                usedPerMove: [],
            };
        }

        let timeControl = timeControls?.[0] ?? {};
        const initialTimeControl = timeControl.seconds ?? 0;

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
        const currentLine = timeControl
            ? [
                  { moveNumber: currentLineMoveNumber, seconds: 0, move: chess.currentMove() },
                  {
                      moveNumber: currentLineMoveNumber,
                      seconds: timeControl.seconds ?? 0,
                      move: chess.currentMove(),
                  },
              ]
            : [];
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
                moveNumber <= MAX_MOVE
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
            total: [
                {
                    label: 'Total Time',
                    data: [
                        {
                            label: 'Black',
                            seconds: blackSecTotal,
                            move: null,
                            moveNumber: 0,
                        },
                        {
                            label: 'White',
                            seconds: whiteSecTotal,
                            move: null,
                            moveNumber: 0,
                        },
                    ],
                },
            ],
            remainingPerMove: [
                { label: 'White', data: whiteClockDisplay },
                { label: 'Black', data: blackClockDisplay },
                { label: IDEAL_CLOCK_SERIES_LABEL, data: perfectLine },
                { label: EVAL_SERIES_LABEL, data: evalData, secondaryAxisId: 'eval' },
                { label: CURRENT_MOVE_SERIES_LABEL, data: chess.isInMainline() ? currentLine : [] },
            ],
            usedPerMove: [
                { label: 'White', data: whiteTimePerMove.reverse() },
                { label: 'Black', data: blackTimePerMove.reverse() },
            ],
        };
    }, [chess, timeControls, forceRender]);

    if (!chess) {
        return null;
    }

    const onClickDatum = (datum: ChartDatum<Datum> | null) => {
        if (datum) {
            chess.seek(datum.originalDatum.move ?? null);
            reconcile();
        }
    };

    const onUpdateTimeControl = (value: string) => {
        chess.setHeader('TimeControl', value);
        setShowTimeControlEditor(false);
    };

    let remainingPerMoveData = data.remainingPerMove;
    if (!showIdealClock) {
        remainingPerMoveData = remainingPerMoveData.filter(
            (series) => series.label !== IDEAL_CLOCK_SERIES_LABEL,
        );
    }
    if (!showEval) {
        remainingPerMoveData = remainingPerMoveData.filter(
            (series) => series.label !== EVAL_SERIES_LABEL,
        );
    }

    return (
        <CardContent sx={{ height: 1 }}>
            <Stack height={1} spacing={4}>
                <Stack>
                    <Stack direction='row' alignItems='center' spacing={0.5}>
                        <Typography variant='subtitle1'>Time Control</Typography>

                        {showEditor && (
                            <Tooltip title='Edit time control'>
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
                    <Stack alignItems='center'>
                        <Typography variant='caption' color='text.secondary' sx={{ mb: 1 }}>
                            Time Management Rating
                        </Typography>
                        <Stack direction='row' spacing={2}>
                            <TimeRatingCard
                                backgroundColor='common.white'
                                title='White'
                                titleColor='grey.800'
                                rating={data.whiteClockRating}
                                ratingColor='common.black'
                                area={data.whiteClockArea}
                            />

                            <TimeRatingCard
                                backgroundColor='#121212'
                                title='Black'
                                titleColor='rgba(255, 255, 255, 0.7)'
                                rating={data.blackClockRating}
                                ratingColor='common.white'
                                area={data.blackClockArea}
                            />
                        </Stack>
                    </Stack>
                )}

                <Stack spacing={0.5} alignItems='center'>
                    <Typography variant='caption' color='text.secondary'>
                        Remaining Clock Time by Move
                    </Typography>
                    <Box width={1} height={300}>
                        <Chart
                            options={{
                                data: remainingPerMoveData,
                                primaryAxis,
                                secondaryAxes: showEval
                                    ? secondaryAxes
                                    : secondaryAxes.slice(0, -1),
                                dark: !light,
                                onClickDatum,
                                getSeriesStyle: (series) => getSeriesStyle(series, light),
                                tooltip: {
                                    showDatumInTooltip: (datum) =>
                                        (showEval || datum.secondaryAxisId !== 'eval') &&
                                        datum.seriesLabel !== CURRENT_MOVE_SERIES_LABEL,
                                },
                            }}
                        />
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
                            label='Overlay evaluation'
                            slotProps={{
                                typography: {
                                    color: 'text.secondary',
                                    fontSize: '14px',
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
                                label='Show ideal time usage'
                                slotProps={{
                                    typography: {
                                        color: 'text.secondary',
                                        fontSize: '14px',
                                    },
                                }}
                            />
                        )}
                    </Stack>
                </Stack>

                <Stack spacing={0.5} alignItems='center'>
                    <Typography variant='caption' color='text.secondary'>
                        Time Used Per Move
                    </Typography>
                    <Box
                        width={1}
                        height={20 * Math.ceil(chess.plyCount() / 2) + 10}
                        minHeight={70}
                    >
                        <Chart
                            options={{
                                data: data.usedPerMove,
                                primaryAxis: barAxis,
                                secondaryAxes: secondaryBarAxis,
                                dark: !light,
                                onClickDatum,
                                getSeriesStyle: (series) => getSeriesStyle(series, light),
                            }}
                        />
                    </Box>
                </Stack>

                <Stack spacing={0.5} alignItems='center'>
                    <Typography variant='caption' color='text.secondary'>
                        Total Time Used
                    </Typography>
                    <Box width={1} height={120}>
                        <Chart
                            options={{
                                data: data.total,
                                primaryAxis: totalTimePrimaryAxis,
                                secondaryAxes: secondaryBarAxis,
                                dark: !light,
                                getDatumStyle: (datum) => getDatumStyle(datum, light),
                            }}
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

function TimeRatingCard({
    backgroundColor,
    title,
    titleColor,
    rating,
    ratingColor,
    area,
}: {
    backgroundColor: string;
    title: string;
    titleColor: string;
    rating: number;
    ratingColor: string;
    area: number;
}) {
    return (
        <Card sx={{ p: 1, minWidth: 120, backgroundColor }} elevation={10}>
            <Box
                display='grid'
                gridTemplateAreas='". title ." " . rating icon"'
                gridTemplateColumns='1fr auto 1fr'
                alignItems='center'
            >
                <Typography
                    component='div'
                    variant='caption'
                    color={titleColor}
                    textAlign='center'
                    gridArea='title'
                >
                    {title}
                </Typography>

                <Typography
                    color={ratingColor}
                    variant='body1'
                    align='center'
                    fontWeight='bold'
                    gridArea='rating'
                >
                    {rating >= 0 ? rating : '?'}
                </Typography>

                {area > 0 && (
                    <Tooltip title='Player moved faster than ideal on average'>
                        <RabbitIcon sx={{ gridArea: 'icon', color: ratingColor }} />
                    </Tooltip>
                )}
                {area < 0 && (
                    <Tooltip title='Player moved slower than ideal on average'>
                        <SlothIcon sx={{ gridArea: 'icon', color: ratingColor }} />
                    </Tooltip>
                )}
            </Box>
        </Card>
    );
}

export default ClockUsage;
