import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { formatTime, RequirementCategory, ScoreboardDisplay } from '@/database/requirement';
import { TimelineEntry, TimelineSpecialRequirementId } from '@/database/timeline';
import { User, WorkGoalHistory, WorkGoalSettings } from '@/database/user';
import CohortIcon, { cohortIcons } from '@/scoreboard/CohortIcon';
import { CategoryColors } from '@/style/ThemeProvider';
import { useLightMode } from '@/style/useLightMode';
import { displayRequirementCategory } from '@jackstenglein/chess-dojo-common/src/database/requirement';
import {
    calculateColor,
    calculateLevel,
    getActivity,
    mixColors,
} from '@jackstenglein/chess-dojo-common/src/heatmap/heatmap';
import { CheckCircle, Close, HourglassBottom } from '@mui/icons-material';
import {
    Box,
    Checkbox,
    Divider,
    FormControlLabel,
    Menu,
    MenuItem,
    Paper,
    PaperProps,
    PopoverPosition,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { DateTime } from 'luxon';
import { cloneElement, useEffect, useMemo, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import {
    ActivityCalendar,
    Activity as BaseActivity,
    BlockElement,
    DayIndex,
} from 'react-activity-calendar';
import { GiCrossedSwords } from 'react-icons/gi';
import { useTimelineContext } from '../activity/useTimeline';
import { DEFAULT_WORK_GOAL } from '../trainingPlan/workGoal';
import { MIN_BLOCK_SIZE } from './HeatmapCard';
import { HeatmapOptions, TimelineEntryField, useHeatmapOptions } from './HeatmapOptions';

interface CategoryCount {
    /** The count of the category spent on custom tasks. */
    custom: number;

    /** The count of the category spent on training plan tasks. */
    trainingPlan: number;
}

interface ExtendedBaseActivity extends BaseActivity {
    /** The total number of Dojo points earned on the given day. */
    dojoPoints?: number;

    /** The total number of minutes spent on the given day. */
    minutesSpent?: number;

    /** The count of the activity by category and field. */
    categoryCounts?: Partial<
        Record<RequirementCategory, { dojoPoints: CategoryCount; minutesSpent: CategoryCount }>
    >;

    /** Whether a classical game was played on this date. */
    gamePlayed?: boolean;

    /** Whether the user marked the date as a rest day. */
    restDay?: boolean;

    /** The highest cohort the user graduated from on this date. */
    graduation?: string;
}

interface Activity extends ExtendedBaseActivity {
    /** The total number of Dojo points earned on the given day. */
    dojoPoints: number;

    /** The total number of minutes spent on the given day. */
    minutesSpent: number;

    /** The count of the activity by category and field. */
    categoryCounts: Partial<
        Record<RequirementCategory, { dojoPoints: CategoryCount; minutesSpent: CategoryCount }>
    >;
}

interface WeekSummary {
    /** The date that the week summary ends on. */
    date: string;

    /** The total number of Dojo points earned in the given week. */
    dojoPoints: number;

    /** The total number of minutes spent in the given week. */
    minutesSpent: number;

    /** The count of the activity by category. */
    categoryCounts: Partial<
        Record<RequirementCategory, { dojoPoints: CategoryCount; minutesSpent: CategoryCount }>
    >;

    /** Whether a classical game was played on this date. */
    gamePlayed?: boolean;

    /** Whether the user marked any date in the week as a rest day. */
    restDay?: boolean;

    /** The highest cohort the user graduated from on this date. */
    graduation?: string;
}

const MAX_LEVEL = 4;

/**
 * Valid categories for the heatmap tooltip to render.
 */
const VALID_TOOLTIP_CATEGORIES = [
    RequirementCategory.Games,
    RequirementCategory.Tactics,
    RequirementCategory.Middlegames,
    RequirementCategory.Endgame,
    RequirementCategory.Opening,
    RequirementCategory.NonDojo,
];

/** The color of the heatmap in monochrome color mode. */
const MONOCHROME_COLOR = '#6f02e3';

/** The array of legend colors in light theme. */
const LIGHT_THEME = Array(MAX_LEVEL + 1)
    .fill(0)
    .map((_, level) => mixColors('#EBEDF0', MONOCHROME_COLOR, level / MAX_LEVEL));

/** The array of legend colors in dark theme. */
const DARK_THEME = Array(MAX_LEVEL + 1)
    .fill(0)
    .map((_, level) => mixColors('#393939', MONOCHROME_COLOR, level / MAX_LEVEL));

/** The margin above the first weekday label. */
const WEEKDAY_LEGEND_TOP_MARGIN = 29;

/** The space between adjacent blocks in the heatmap. */
const BLOCK_SPACING = 4;

/** Labels of the weekdays by their index. */
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];

/**
 * Renders the Heatmap, including the options and legend, for the given timeline entries.
 */
export function Heatmap({
    entries,
    description,
    blockSize = MIN_BLOCK_SIZE,
    editable = false,
    onPopOut,
    minDate,
    maxDate,
    workGoalHistory,
    slotProps,
}: {
    entries: TimelineEntry[];
    description: string;
    blockSize?: number;
    editable?: boolean;
    onPopOut?: () => void;
    minDate?: string;
    maxDate?: string;
    workGoalHistory: WorkGoalHistory[];
    slotProps?: {
        weekdayLabelPaper?: PaperProps;
    };
}) {
    const isLight = useLightMode();
    const { user: viewer } = useAuth();
    const api = useApi();
    const timeline = useTimelineContext();
    const request = useRequest();
    const [, setCalendarRef] = useState<HTMLElement | null>(null);
    const [contextMenu, setContextMenu] = useState<
        | {
              activity: Activity | ExtendedBaseActivity;
              position: PopoverPosition;
          }
        | undefined
    >();
    const { field, colorMode, maxPoints, maxMinutes, weekStartOn, weekEndOn } = useHeatmapOptions();
    const clamp = field === 'dojoPoints' ? maxPoints : maxMinutes;
    const theme = isLight ? LIGHT_THEME : DARK_THEME;

    if (!maxDate) {
        maxDate = new Date().toISOString().split('T')[0];
    }
    if (!minDate) {
        minDate = `${parseInt(maxDate.split('-')[0]) - 1}${maxDate.slice(4)}`;
        const d = new Date(minDate);
        if (d.getUTCDay() !== weekStartOn) {
            d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() - weekStartOn + 7) % 7));
            minDate = d.toISOString().split('T')[0];
        }
    }

    const { activities, weekSummaries, totalDojoPoints, totalMinutesSpent } = useMemo(() => {
        return getActivity(entries, minDate, maxDate, weekEndOn, viewer);
    }, [entries, minDate, maxDate, viewer, weekEndOn]);

    useEffect(() => {
        const scroller = document.getElementById('heatmap-scroll-container');
        if (scroller) {
            scroller.scrollLeft = scroller.scrollWidth;
        }
    });

    const closeContextMenu = () => setContextMenu(undefined);

    const onBlockContextMenu = (
        event: ReactMouseEvent<SVGElement>,
        activity: Activity | ExtendedBaseActivity,
    ) => {
        event.preventDefault();
        if (!editable || !canManageRestDay(activity)) {
            return;
        }

        setContextMenu({
            activity,
            position: {
                top: event.clientY,
                left: event.clientX,
            },
        });
    };

    const currentRestDayEntry =
        contextMenu && viewer
            ? findRestDayEntry(entries, contextMenu.activity.date, viewer)
            : undefined;

    const saveRestDay = async () => {
        if (!viewer || !contextMenu || currentRestDayEntry) {
            return;
        }

        request.onStart();
        const entry = createRestDayEntry(viewer, contextMenu.activity.date);

        try {
            await api.updateUserTimeline({
                requirementId: TimelineSpecialRequirementId.RestDay,
                progress: {
                    requirementId: TimelineSpecialRequirementId.RestDay,
                    counts: {},
                    minutesSpent: {},
                    updatedAt: '',
                },
                updated: [entry],
                deleted: [],
            });
            timeline.onEditEntries([entry]);
            request.onSuccess();
            closeContextMenu();
        } catch (err) {
            request.onFailure(err);
        }
    };

    const clearRestDay = async () => {
        if (!currentRestDayEntry) {
            return;
        }

        request.onStart();
        try {
            await api.updateUserTimeline({
                requirementId: TimelineSpecialRequirementId.RestDay,
                progress: {
                    requirementId: TimelineSpecialRequirementId.RestDay,
                    counts: {},
                    minutesSpent: {},
                    updatedAt: '',
                },
                updated: [],
                deleted: [currentRestDayEntry],
            });
            timeline.onDeleteEntries([currentRestDayEntry]);
            request.onSuccess();
            closeContextMenu();
        } catch (err) {
            request.onFailure(err);
        }
    };

    return (
        <Stack
            maxWidth={1}
            sx={{
                '& .react-activity-calendar__scroll-container': {
                    paddingTop: '1px',
                    paddingBottom: '10px',
                    overflow: 'visible !important',
                },
                '& .react-activity-calendar__footer': {
                    marginLeft: '0 !important',
                },
            }}
        >
            <RequestSnackbar request={request} />
            <HeatmapOptions onPopOut={onPopOut} />

            <Stack id='heatmap-scroll-container' direction='row' sx={{ overflowX: 'auto' }}>
                <Paper
                    elevation={1}
                    sx={{ position: 'sticky', left: 0, pr: 0.75, borderRadius: 0, pb: 4 }}
                    {...slotProps?.weekdayLabelPaper}
                >
                    <Stack>
                        {Array(3)
                            .fill(0)
                            .map((_, i) => (
                                <Stack
                                    key={i}
                                    sx={{
                                        mt: `${blockSize + (i === 0 ? WEEKDAY_LEGEND_TOP_MARGIN : 2 * BLOCK_SPACING)}px`,
                                        height: `${blockSize}px`,
                                    }}
                                    alignItems='center'
                                    justifyContent='center'
                                >
                                    <Typography variant='caption'>
                                        {WEEKDAY_LABELS[(i * 2 + 1 + weekStartOn) % 7]}
                                    </Typography>
                                </Stack>
                            ))}
                        <Stack
                            sx={{
                                mt: `${blockSize + 2 * BLOCK_SPACING + 7}px`,
                                height: `${blockSize}px`,
                            }}
                            alignItems='center'
                            justifyContent='center'
                        >
                            <Typography variant='caption'>Week</Typography>
                        </Stack>
                    </Stack>
                </Paper>

                <Stack>
                    <ActivityCalendar
                        ref={setCalendarRef}
                        colorScheme={isLight ? 'light' : 'dark'}
                        theme={{
                            light: LIGHT_THEME,
                            dark: DARK_THEME,
                        }}
                        data={activities}
                        renderBlock={(block, activity) => (
                            <Block
                                key={activity.date}
                                block={block}
                                activity={activity as Activity}
                                field={field}
                                baseColor={theme[0]}
                                clamp={clamp}
                                weekEndOn={weekEndOn}
                                weekSummaries={weekSummaries}
                                workGoalHistory={workGoalHistory}
                                monochrome={colorMode === 'monochrome'}
                                maxDate={maxDate}
                                editable={editable}
                                onContextMenu={onBlockContextMenu}
                            />
                        )}
                        maxLevel={MAX_LEVEL}
                        weekStart={weekStartOn as DayIndex}
                        hideColorLegend
                        hideTotalCount
                        blockSize={blockSize}
                    />
                    <Divider sx={{ mt: '-6px' }} />
                    <Divider sx={{ mt: '2px' }} />
                </Stack>
            </Stack>
            <Stack
                direction='row'
                justifyContent='space-between'
                alignItems='center'
                flexWrap='wrap'
                gap='4px 16px'
                mt={0.5}
            >
                <Typography sx={{ fontSize: '14px' }}>
                    {field === 'dojoPoints'
                        ? `${Math.round(10 * totalDojoPoints) / 10} Dojo points ${description}`
                        : `${formatTime(totalMinutesSpent)} ${description}`}
                </Typography>

                <Stack direction='row' alignItems='center' gap='3px'>
                    <Typography sx={{ fontSize: '14px', mr: '0.4em' }}>Less</Typography>

                    {Array(MAX_LEVEL + 1)
                        .fill(0)
                        .map((_, i) => (
                            <LegendTooltip
                                key={i}
                                block={
                                    <svg width={blockSize} height={blockSize}>
                                        <rect
                                            width={blockSize}
                                            height={blockSize}
                                            fill={theme[i]}
                                            rx='2'
                                            ry='2'
                                            style={{
                                                stroke: 'rgba(255, 255, 255, 0.04)',
                                            }}
                                        ></rect>
                                    </svg>
                                }
                                level={i}
                                clamp={clamp}
                                field={field}
                            />
                        ))}

                    <Typography sx={{ fontSize: '14px', ml: '0.4em' }}>More</Typography>
                </Stack>
            </Stack>
            <CategoryLegend />
            <Menu
                open={!!contextMenu}
                onClose={closeContextMenu}
                anchorReference='anchorPosition'
                anchorPosition={contextMenu?.position}
                slotProps={{
                    root: {
                        onContextMenu: (event: ReactMouseEvent) => {
                            event.preventDefault();
                            closeContextMenu();
                        },
                    },
                }}
            >
                {currentRestDayEntry ? (
                    <MenuItem onClick={() => void clearRestDay()} disabled={request.isLoading()}>
                        <Stack direction='row' alignItems='center' gap={1}>
                            <RestDayIcon size={18} />
                            <Typography>Clear Rest Day</Typography>
                        </Stack>
                    </MenuItem>
                ) : (
                    <MenuItem onClick={() => void saveRestDay()} disabled={request.isLoading()}>
                        <Stack direction='row' alignItems='center' gap={1}>
                            <RestDayIcon size={18} />
                            <Typography>Rest Day</Typography>
                        </Stack>
                    </MenuItem>
                )}
            </Menu>
        </Stack>
    );
}

/**
 * Renders the legend for the heatmap categories.
 */
export function CategoryLegend() {
    const { colorMode, setColorMode } = useHeatmapOptions();

    return (
        <Stack mt={0.5} alignItems='start'>
            <FormControlLabel
                control={
                    <Checkbox
                        checked={colorMode === 'monochrome'}
                        onChange={(e) => setColorMode(e.target.checked ? 'monochrome' : 'standard')}
                        sx={{ '& .MuiSvgIcon-root': { fontSize: '1rem' } }}
                    />
                }
                label='Single Color Mode'
                slotProps={{ typography: { variant: 'caption' } }}
            />

            {colorMode !== 'monochrome' && (
                <Stack direction='row' flexWrap='wrap' columnGap={1} rowGap={0.5} mt={0.5}>
                    {VALID_TOOLTIP_CATEGORIES.map((category) => {
                        const color = CategoryColors[category];
                        return (
                            <Stack key={category} direction='row' alignItems='center' gap={0.5}>
                                <Box
                                    sx={{
                                        height: '12px',
                                        width: '12px',
                                        borderRadius: '2px',
                                        backgroundColor: color,
                                    }}
                                />
                                {category === RequirementCategory.NonDojo && (
                                    <svg
                                        style={{
                                            width: '12px',
                                            height: '12px',
                                            position: 'absolute',
                                        }}
                                    >
                                        <StripePattern />
                                        <rect
                                            x={0}
                                            y={0}
                                            width={12}
                                            height={12}
                                            fill='url(#diagonalHatch)'
                                        />
                                    </svg>
                                )}
                                <Typography variant='caption' pt='2px'>
                                    {category === RequirementCategory.NonDojo
                                        ? 'Custom Task'
                                        : displayRequirementCategory(category)}
                                </Typography>
                            </Stack>
                        );
                    })}

                    <Stack direction='row' alignItems='center' columnGap={0.5}>
                        <GiCrossedSwords />
                        <Typography variant='caption' pt='2px'>
                            Classical Game Played
                        </Typography>
                    </Stack>

                    <Stack direction='row' alignItems='center' columnGap={0.5}>
                        <RestDayIcon size={12} />
                        <Typography variant='caption' pt='2px'>
                            Rest Day
                        </Typography>
                    </Stack>
                </Stack>
            )}
        </Stack>
    );
}

/**
 * Returns a default week summary.
 * @param date The date the week summary ends on.
 */
function defaultWeekSummary(date: string): WeekSummary {
    return { date, dojoPoints: 0, minutesSpent: 0, categoryCounts: {} };
}

/**
 * Renders a block in the heatmap.
 * @param block The block to render, as passed from React Activity Calendar.
 * @param activity The activity associated with the block.
 * @param field The field (dojo points/minutes) being displayed.
 * @param baseColor The level 0 color.
 * @param clamp The maximum count used for determining color level.
 * @param weekEndOn The index of the day the viewer's week ends on.
 * @param weekSummaries A map from date to the week summary for the week ending on that date.
 * @param workGoalHistory A list of the user's work goal history.
 * @param monochrome Whether to render the block in single-color mode or not.
 * @returns A block representing the given activity.
 */
function Block({
    block,
    activity,
    field,
    baseColor,
    clamp,
    weekEndOn,
    weekSummaries,
    workGoalHistory,
    monochrome,
    maxDate,
    editable,
    onContextMenu,
}: {
    block: BlockElement;
    activity: Activity | ExtendedBaseActivity;
    field: TimelineEntryField;
    baseColor: string;
    clamp: number;
    weekEndOn: number;
    weekSummaries: Record<string, WeekSummary>;
    workGoalHistory: WorkGoalHistory[];
    monochrome?: boolean;
    maxDate: string;
    editable?: boolean;
    onContextMenu?: (
        event: ReactMouseEvent<SVGElement>,
        activity: Activity | ExtendedBaseActivity,
    ) => void;
}) {
    let maxCategory: RequirementCategory | undefined = undefined;
    let totalCount = 0;
    let maxCount: number | undefined = undefined;
    let color: string | undefined = undefined;
    let isCustom = false;

    if (monochrome) {
        const level = calculateLevel(activity[field], clamp);
        color = calculateColor([baseColor, MONOCHROME_COLOR], level);
    } else {
        for (const category of Object.values(RequirementCategory)) {
            const count = activity.categoryCounts?.[category as RequirementCategory];
            if (!count) {
                continue;
            }

            const currentCount = count[field].custom + count[field].trainingPlan;
            totalCount += currentCount;
            if (maxCount === undefined || currentCount > maxCount) {
                maxCategory = category as RequirementCategory;
                maxCount = currentCount;
            }
        }

        if (maxCount && maxCategory) {
            const level = calculateLevel(totalCount, clamp);
            color = calculateColor([baseColor, CategoryColors[maxCategory]], level);
            isCustom =
                (activity.categoryCounts?.[maxCategory]?.[field].custom ?? 0) >
                (activity.categoryCounts?.[maxCategory]?.[field].trainingPlan ?? 0);
        }
    }

    const newStyle = color ? { ...block.props.style, fill: color } : block.props.style;
    const icon = Boolean(activity.graduation || activity.gamePlayed || activity.restDay);
    const canOpenContextMenu = editable && canManageRestDay(activity);
    const hasTooltipContent = hasTrackedActivity(activity) || activity.restDay;
    const blockProps = {
        'data-testid': `heatmap-block-${activity.date}`,
        'data-activity-date': activity.date,
        'data-can-manage-rest-day': `${canOpenContextMenu}`,
    };
    const blockStyle = {
        ...newStyle,
        ...(icon ? { fill: 'transparent', stroke: 'transparent' } : {}),
    };

    const isEndOfWeek = new Date(activity.date).getUTCDay() === weekEndOn;
    const isEnd = activity.date === maxDate;
    let weekSummaryY = (block.props.y as number) + (block.props.height as number) + 12;
    let weekSummary = weekSummaries[activity.date] ?? defaultWeekSummary(activity.date);

    if (isEnd && !isEndOfWeek) {
        weekSummary =
            weekSummaries[Object.keys(weekSummaries).sort((lhs, rhs) => (rhs > lhs ? 1 : -1))[0]];
        for (let i = new Date(activity.date).getUTCDay(); i !== weekEndOn; i = (i + 1) % 7) {
            weekSummaryY += (block.props.height as number) + BLOCK_SPACING;
        }
    }

    const showStripedCustomOverlay =
        isCustom &&
        !activity.graduation &&
        !activity.gamePlayed &&
        !activity.restDay &&
        hasTrackedActivity(activity);

    const renderedBlock =
        showStripedCustomOverlay ? (
            <rect
                {...blockProps}
                x={block.props.x}
                y={block.props.y}
                width={block.props.width}
                height={block.props.height}
                fill='url(#diagonalHatch)'
                onContextMenu={
                    canOpenContextMenu ? (event) => onContextMenu?.(event, activity) : undefined
                }
            />
        ) : (
            cloneElement(block, {
                ...blockProps,
                style: blockStyle,
                onContextMenu:
                    canOpenContextMenu
                        ? (event: ReactMouseEvent<SVGElement>) => onContextMenu?.(event, activity)
                        : undefined,
            })
        );

    return (
        <>
            {activity.graduation ? (
                <image
                    href={cohortIcons[activity.graduation]}
                    x={block.props.x}
                    y={block.props.y}
                    width={block.props.width}
                    height={block.props.height}
                    style={{ pointerEvents: 'none' }}
                    crossOrigin='anonymous'
                />
            ) : (
                activity.gamePlayed ? (
                    <GiCrossedSwords
                        x={block.props.x}
                        y={block.props.y}
                        width={block.props.width}
                        height={block.props.height}
                        fontSize={`${block.props.width}px`}
                        style={{ pointerEvents: 'none' }}
                    />
                ) : (
                    activity.restDay && (
                        <RestDayIcon
                            x={block.props.x as number}
                            y={block.props.y as number}
                            width={block.props.width as number}
                            height={block.props.height as number}
                            pointerEvents='none'
                        />
                    )
                )
            )}

            {showStripedCustomOverlay && (
                <>
                    {cloneElement(block, {
                        ...blockProps,
                        style: {
                            ...newStyle,
                            ...(icon ? { fill: 'transparent', stroke: 'transparent' } : {}),
                        },
                    })}
                    <StripePattern />
                </>
            )}

            {hasTooltipContent ? (
                <Tooltip
                    key={activity.date}
                    disableInteractive
                    title={<BlockTooltip activity={activity} field={field} />}
                >
                    {renderedBlock}
                </Tooltip>
            ) : (
                renderedBlock
            )}

            {(isEndOfWeek || isEnd) && (
                <WeekSummaryBlock
                    workGoalHistory={workGoalHistory}
                    weekSummary={weekSummary}
                    x={block.props.x as number}
                    y={weekSummaryY}
                    size={block.props.width as number}
                    field={field}
                    inProgress={!isEndOfWeek}
                />
            )}
        </>
    );
}

/**
 * Renders a block indicating whether the user met their weekly goal or not.
 * @param workGoalHistory The user's work goal history.
 * @param weekSummary The week summary to render the block for.
 * @param field The timeline field being displayed.
 * @param x The x position of the block.
 * @param y The y position of the block.
 * @param size The size of the block.
 * @param inProgress Whether the week is still in progress.
 * @returns
 */
function WeekSummaryBlock({
    workGoalHistory,
    weekSummary,
    field,
    x,
    y,
    size,
    inProgress,
}: {
    workGoalHistory: WorkGoalHistory[];
    weekSummary: WeekSummary;
    field: TimelineEntryField;
    x: number;
    y: number;
    size: number;
    inProgress: boolean;
}) {
    const workGoal =
        workGoalHistory.findLast((history) => history.date.split('T')[0] <= weekSummary.date)
            ?.workGoal ?? DEFAULT_WORK_GOAL;
    const goalMinutes = workGoal.minutesPerDay.reduce((sum, value) => sum + value, 0);

    let Icon = inProgress ? HourglassBottom : Close;
    let color: 'error.main' | 'success.main' | 'text.secondary' = inProgress
        ? 'text.secondary'
        : 'error.main';
    if (weekSummary.minutesSpent >= goalMinutes) {
        Icon = CheckCircle;
        color = 'success.main';
    }

    return (
        <>
            <Icon x={x} y={y} width={size} height={size} sx={{ fontSize: `${size}px`, color }} />
            <Tooltip
                title={
                    <WeekSummaryTooltip
                        weekSummary={weekSummary}
                        field={field}
                        goal={workGoal}
                        inProgress={inProgress}
                    />
                }
            >
                <rect x={x} y={y} width={size} height={size} fill='transparent' />
            </Tooltip>
        </>
    );
}

/**
 * Renders a tooltip for a heatmap block with the given activity and field.
 * @param activity The activity for the given block.
 * @param field The field (dojo points/minutes) being displayed.
 * @returns A tooltip displaying the activity's breakdown by category.
 */
function BlockTooltip({
    activity,
    field,
}: {
    activity: Activity | ExtendedBaseActivity;
    field: TimelineEntryField;
}) {
    const categories = Object.entries(activity.categoryCounts ?? {})
        .filter((entry) => VALID_TOOLTIP_CATEGORIES.includes(entry[0] as RequirementCategory))
        .sort(
            (lhs, rhs) =>
                rhs[1][field].custom +
                rhs[1][field].trainingPlan -
                (lhs[1][field].custom + lhs[1][field].trainingPlan),
        );

    return (
        <Stack alignItems='center'>
            <Typography variant='caption'>
                {field === 'dojoPoints'
                    ? `${Math.round(10 * (activity.dojoPoints || 0)) / 10} Dojo point${activity.dojoPoints !== 1 ? 's' : ''} on ${activity.date}`
                    : `${formatTime(activity.minutesSpent || 0)} on ${activity.date}`}
            </Typography>
            <Divider sx={{ width: 1 }} />
            {activity.graduation && (
                <Stack
                    direction='row'
                    justifyContent='space-between'
                    alignItems='center'
                    columnGap='1rem'
                    width={1}
                >
                    <Stack direction='row' alignItems='center' columnGap={0.5}>
                        <CohortIcon tooltip='' cohort={activity.graduation} size={12} />
                        <Typography variant='caption' pt='2px'>
                            Graduated from {activity.graduation}
                        </Typography>
                    </Stack>
                </Stack>
            )}

            {activity.gamePlayed && (
                <Stack
                    direction='row'
                    justifyContent='space-between'
                    alignItems='center'
                    columnGap='1rem'
                    width={1}
                >
                    <Stack direction='row' alignItems='center' columnGap={0.5}>
                        <GiCrossedSwords />
                        <Typography variant='caption' pt='2px'>
                            Classical Game Played
                        </Typography>
                    </Stack>
                </Stack>
            )}
            {activity.restDay && (
                <Stack
                    direction='row'
                    justifyContent='space-between'
                    alignItems='center'
                    columnGap='1rem'
                    width={1}
                >
                    <Stack direction='row' alignItems='center' columnGap={0.5}>
                        <RestDayIcon size={12} />
                        <Typography variant='caption' pt='2px'>
                            Rest Day
                        </Typography>
                    </Stack>
                </Stack>
            )}
            {categories.map(([category, count]) => {
                const rows = [
                    { category, count: count[field].trainingPlan },
                    {
                        category: `${category} (Custom)`,
                        count: count[field].custom,
                        striped: true,
                    },
                ]
                    .filter((x) => x.count)
                    .sort((x, y) => y.count - x.count);

                return rows.map((row) => (
                    <TooltipRow
                        key={row.category}
                        category={row.category}
                        field={field}
                        count={row.count}
                        backgroundColor={CategoryColors[category as RequirementCategory]}
                        striped={row.striped}
                    />
                ));
            })}
        </Stack>
    );
}

/**
 * Renders a tooltip for the week summary icon.
 * @param weekSummary The week summary to render the tooltip for.
 * @param field The field (dojo points/minutes) being displayed.
 * @param goal The work goal for the week.
 * @param inProgress Whether the week is still in progress.
 * @returns A tooltip displaying the week summary in detail.
 */
function WeekSummaryTooltip({
    weekSummary,
    field,
    goal,
    inProgress,
}: {
    weekSummary: WeekSummary;
    field: TimelineEntryField;
    goal: WorkGoalSettings;
    inProgress: boolean;
}) {
    const startDate = new Date(weekSummary.date);
    startDate.setDate(startDate.getDate() - 6);
    const startDateStr = `${startDate.getUTCFullYear()}-${`${startDate.getUTCMonth() + 1}`.padStart(2, '0')}-${`${startDate.getUTCDate()}`.padStart(2, '0')}`;

    const categories = Object.entries(weekSummary.categoryCounts ?? {})
        .filter((entry) => VALID_TOOLTIP_CATEGORIES.includes(entry[0] as RequirementCategory))
        .sort(
            (lhs, rhs) =>
                rhs[1][field].custom +
                rhs[1][field].trainingPlan -
                (lhs[1][field].custom + lhs[1][field].trainingPlan),
        );

    const goalMinutes = goal.minutesPerDay.reduce((sum, value) => sum + value, 0);
    const metGoal = weekSummary.minutesSpent >= goalMinutes;
    let Icon = inProgress ? HourglassBottom : Close;
    if (metGoal) {
        Icon = CheckCircle;
    }

    return (
        <Stack alignItems='center'>
            <Typography variant='caption'>
                {startDateStr} — {weekSummary.date}
            </Typography>
            <Divider sx={{ width: 1 }} />

            <Stack
                direction='row'
                justifyContent='space-between'
                alignItems='center'
                width={1}
                columnGap={1}
            >
                <Stack direction='row' alignItems='center' columnGap={0.5}>
                    <Icon
                        width={12}
                        height={12}
                        sx={{
                            fontSize: '14px',
                            color: metGoal
                                ? 'success.main'
                                : inProgress
                                  ? 'text.secondary'
                                  : 'error.main',
                        }}
                    />
                    <Typography variant='caption' pt='2px'>
                        {metGoal ? 'Met' : !inProgress ? 'Missed' : ''} Weekly Goal
                    </Typography>
                </Stack>

                <Typography variant='caption' pt='2px'>
                    {formatTime(weekSummary.minutesSpent)} / {formatTime(goalMinutes)}
                </Typography>
            </Stack>

            {weekSummary.graduation && (
                <Stack
                    direction='row'
                    justifyContent='space-between'
                    alignItems='center'
                    columnGap='1rem'
                    width={1}
                >
                    <Stack direction='row' alignItems='center' columnGap={0.5}>
                        <CohortIcon tooltip='' cohort={weekSummary.graduation} size={12} />
                        <Typography variant='caption' pt='2px'>
                            Graduated from {weekSummary.graduation}
                        </Typography>
                    </Stack>
                </Stack>
            )}

            {weekSummary.gamePlayed && (
                <Stack
                    direction='row'
                    justifyContent='space-between'
                    alignItems='center'
                    columnGap='1rem'
                    width={1}
                >
                    <Stack direction='row' alignItems='center' columnGap={0.5}>
                        <GiCrossedSwords />
                        <Typography variant='caption' pt='2px'>
                            Classical Game Played
                        </Typography>
                    </Stack>
                </Stack>
            )}
            {weekSummary.restDay && (
                <Stack
                    direction='row'
                    justifyContent='space-between'
                    alignItems='center'
                    columnGap='1rem'
                    width={1}
                >
                    <Stack direction='row' alignItems='center' columnGap={0.5}>
                        <RestDayIcon size={12} />
                        <Typography variant='caption' pt='2px'>
                            Rest Day
                        </Typography>
                    </Stack>
                </Stack>
            )}

            {categories.map(([category, count]) => {
                const rows = [
                    { category, count: count[field].trainingPlan },
                    {
                        category: `${category} (Custom)`,
                        count: count[field].custom,
                        striped: true,
                    },
                ]
                    .filter((x) => x.count)
                    .sort((x, y) => y.count - x.count);

                return rows.map((row) => (
                    <TooltipRow
                        key={row.category}
                        category={row.category}
                        field={field}
                        count={row.count}
                        backgroundColor={CategoryColors[category as RequirementCategory]}
                        striped={row.striped}
                    />
                ));
            })}
        </Stack>
    );
}

function TooltipRow({
    category,
    backgroundColor,
    field,
    count,
    striped,
}: {
    category: string;
    backgroundColor: string;
    field: TimelineEntryField;
    count: number;
    striped?: boolean;
}) {
    return (
        <Stack
            direction='row'
            justifyContent='space-between'
            alignItems='center'
            columnGap='1rem'
            width={1}
        >
            <Stack direction='row' alignItems='center' columnGap={0.5}>
                <svg width='12' height='12'>
                    <g>
                        <rect
                            width='12'
                            height='12'
                            rx='2'
                            ry='2'
                            style={{ fill: backgroundColor }}
                        />
                        {striped && (
                            <>
                                <StripePattern />
                                <rect width='12' height='12' fill='url(#diagonalHatch)' />
                            </>
                        )}
                    </g>
                </svg>

                <Typography variant='caption' pt='2px'>
                    {displayRequirementCategory(category as RequirementCategory)}
                </Typography>
            </Stack>

            <Typography variant='caption' pt='2px'>
                {field === 'dojoPoints'
                    ? `${Math.round(10 * count) / 10} Dojo point${count !== 1 ? 's' : ''}`
                    : formatTime(count)}
            </Typography>
        </Stack>
    );
}

/**
 * Renders a tooltip for the legend.
 * @param block The block element of the legend.
 * @param level The level of the element.
 * @param clamp The max count for the activity heatmap.
 * @param field The field (dojo points/minutes) displayed by the heatmap.
 * @returns A tooltip wrapping the block.
 */
function LegendTooltip({
    block,
    level,
    clamp,
    field,
}: {
    block: BlockElement;
    level: number;
    clamp: number;
    field: TimelineEntryField;
}) {
    let value = '';
    const minValue = Math.max(0, (clamp / (MAX_LEVEL - 1)) * (level - 1));
    if (field === 'minutesSpent') {
        value = formatTime(minValue);
    } else {
        value = `${Math.round(minValue * 100) / 100}`;
    }

    if (level === 0) {
        if (field === 'dojoPoints') {
            value += ' Dojo points';
        }
    } else if (level < MAX_LEVEL) {
        const maxValue = (clamp / (MAX_LEVEL - 1)) * level;
        if (field === 'minutesSpent') {
            value += ` – ${formatTime(maxValue)}`;
        } else {
            value += ` – ${Math.round(maxValue * 100) / 100} Dojo points`;
        }
    } else {
        value += '+';
        if (field === 'dojoPoints') {
            value += ' Dojo points';
        }
    }

    return (
        <Tooltip key={level} disableInteractive title={value}>
            {block}
        </Tooltip>
    );
}

/** Renders a stripe pattern for use in SVGs. */
function StripePattern() {
    return (
        <pattern id='diagonalHatch' patternUnits='userSpaceOnUse' width='4' height='4'>
            <path
                d='M-1,1 l2,-2
M0,4 l4,-4
M3,5 l2,-2'
                style={{ stroke: 'black', strokeWidth: 1 }}
            />
        </pattern>
    );
}

function RestDayIcon({
    size = 16,
    x,
    y,
    width,
    height,
    pointerEvents,
}: {
    size?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    pointerEvents?: 'none';
}) {
    const finalWidth = width ?? size;
    const finalHeight = height ?? size;

    return (
        <svg
            viewBox='0 0 24 24'
            width={finalWidth}
            height={finalHeight}
            x={x}
            y={y}
            style={{ pointerEvents }}
        >
            <path
                d='M21 12.8A8 8 0 1 1 11.2 3 6 6 0 0 0 21 12.8z'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
            <path
                d='M16 5h4l-4 4h4'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
            />
        </svg>
    );
}

function canManageRestDay(activity: Activity | ExtendedBaseActivity) {
    return !hasTrackedActivity(activity);
}

function hasTrackedActivity(activity: Activity | ExtendedBaseActivity) {
    if (activity.gamePlayed || activity.graduation) {
        return true;
    }
    if ((activity.dojoPoints ?? 0) > 0 || (activity.minutesSpent ?? 0) > 0) {
        return true;
    }

    return Object.values(activity.categoryCounts ?? {}).some((count) => {
        if (!count) {
            return false;
        }

        return (
            count.dojoPoints.custom > 0 ||
            count.dojoPoints.trainingPlan > 0 ||
            count.minutesSpent.custom > 0 ||
            count.minutesSpent.trainingPlan > 0
        );
    });
}

function createRestDayEntry(user: User, date: string): TimelineEntry {
    const now = DateTime.utc();
    const timezone = user.timezoneOverride || 'local';
    const restDate =
        DateTime.fromISO(date, { zone: timezone })
            .set({ hour: 12, minute: 0, second: 0, millisecond: 0 })
            .toUTC()
            .toISO() ?? now.toISO() ?? '';

    return {
        owner: user.username,
        id: `${date}_${crypto.randomUUID()}`,
        ownerDisplayName: user.displayName,
        cohort: user.dojoCohort,
        requirementId: TimelineSpecialRequirementId.RestDay,
        requirementName: 'Rest Day',
        requirementCategory: RequirementCategory.NonDojo,
        scoreboardDisplay: ScoreboardDisplay.Hidden,
        progressBarSuffix: '',
        totalCount: 0,
        previousCount: 0,
        newCount: 0,
        dojoPoints: 0,
        totalDojoPoints: 0,
        minutesSpent: 0,
        totalMinutesSpent: 0,
        date: restDate,
        createdAt: now.toISO() ?? '',
        notes: '',
        comments: [],
        reactions: {},
    };
}

function findRestDayEntry(entries: TimelineEntry[], date: string, viewer: User) {
    return entries.find(
        (entry) =>
            entry.requirementId === TimelineSpecialRequirementId.RestDay &&
            getViewerDate(entry.date || entry.createdAt, viewer) === date,
    );
}

function getViewerDate(date: string, viewer: User) {
    const parsed = DateTime.fromISO(date, { setZone: true });
    return (
        (viewer.timezoneOverride ? parsed.setZone(viewer.timezoneOverride) : parsed).toISODate() ??
        date.slice(0, 10)
    );
}
