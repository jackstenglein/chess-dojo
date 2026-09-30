import { CustomTask, formatTime, Requirement } from '@/database/requirement';
import LoadingPage from '@/loading/LoadingPage';
import { CategoryColors } from '@/style/ThemeProvider';
import { useTranslatedRequirement } from '@/translation/useTranslatedRequirement';
import { Check, ExpandMore } from '@mui/icons-material';
import {
    alpha,
    Box,
    ButtonBase,
    Collapse,
    FormControlLabel,
    IconButton,
    LinearProgress,
    Stack,
    Switch,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { use, useMemo, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { CategoryLabel } from '../daily/DailyCard';
import { TaskDialog, TaskDialogView } from '../TaskDialog';
import { taskDisplayName } from '../taskDisplayName';
import { splitDisplayName } from '../taskVerb';
import { TaskVerbIcon } from '../TaskVerbIcon';
import { TrainingPlanIcon } from '../TrainingPlanIcon';
import { TrainingPlanContext } from '../TrainingPlanTab';
import { useTrainingPlanProgress } from '../useTrainingPlan';
import { WorkGoalSettingsEditor } from '../WorkGoalSettingsEditor';
import {
    CategoryTotal,
    getCategoryTotals,
    getCellState,
    getChipDisplay,
    getWeekDays,
    getWeekRows,
    WeekCell,
    WeekDay,
    WeekRow,
} from './weekPlan';

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];

/**
 * Renders the weekly training plan as a grid of tasks by days. Each task gets one
 * row, so its name has room to be read and a task planned on several days shows as
 * one row rather than being repeated in every column.
 */
export function WeeklyTrainingPlan() {
    const t = useTranslations('profile.trainingPlan.weekly');
    const tCommon = useTranslations('profile.trainingPlan.common');
    const {
        startDate,
        endDate,
        weekSuggestions,
        suggestionsByDay,
        timeline,
        isCurrentUser,
        isLoading,
        user,
        allRequirements,
        pinnedTasks,
    } = use(TrainingPlanContext);

    const [goalTime, _, workedTime] = useTrainingPlanProgress({
        startDate,
        endDate,
        tasks: weekSuggestions,
        timeline,
    });

    const [expanded, setExpanded] = useLocalStorage<boolean>('training-plan-weekly-expanded', true);
    const [activeOnly, setActiveOnly] = useLocalStorage<boolean>(
        'training-plan-weekly-active-only',
        false,
    );

    const [selectedTask, setSelectedTask] = useState<Requirement | CustomTask>();
    const [taskDialogView, setTaskDialogView] = useState<TaskDialogView>();

    const weekDays = useMemo(
        () => getWeekDays(startDate, user.weekStart),
        [startDate, user.weekStart],
    );

    const rows = useMemo(
        () =>
            getWeekRows({
                weekDays,
                suggestionsByDay,
                timeline,
                pinnedTaskIds: new Set(pinnedTasks.map((p) => p.id)),
                findTask: (id) =>
                    user.customTasks?.find((c) => c.id === id) ??
                    allRequirements.find((r) => r.id === id),
            }),
        [weekDays, suggestionsByDay, timeline, pinnedTasks, user.customTasks, allRequirements],
    );

    const visibleRows = activeOnly
        ? rows.filter((row) => row.cells.some((c) => c.workedMinutes > 0))
        : rows;

    const onOpenTask = (task: Requirement | CustomTask, view: TaskDialogView) => {
        setSelectedTask(task);
        setTaskDialogView(view);
    };

    return (
        <Stack spacing={2} sx={{ width: 1 }}>
            <Stack direction='row' sx={{ alignItems: 'center', width: 1 }}>
                <Tooltip title={expanded ? tCommon('hide') : tCommon('show')}>
                    <IconButton onClick={() => setExpanded((v) => !v)}>
                        <ExpandMore
                            sx={{
                                transform: expanded ? 'rotate(180deg)' : undefined,
                                transition: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
                            }}
                        />
                    </IconButton>
                </Tooltip>

                <Typography variant='h5' sx={{ fontWeight: 'bold', ml: 0.5, mr: 2 }}>
                    {t('thisWeek')}
                </Typography>

                <WorkGoalSettingsEditor
                    currentGoal={goalTime}
                    currentValue={workedTime}
                    disabled={!isCurrentUser}
                    initialWeekStart={user.weekStart}
                    workGoal={user.workGoal}
                    workGoalHistory={user.workGoalHistory}
                    variant='icon'
                />
            </Stack>

            <Collapse in={expanded}>
                <Stack spacing={1.5}>
                    {!isLoading && <CategoryTotals totals={getCategoryTotals(rows)} />}

                    <Tooltip title={t('activeOnlyTooltip')} placement='right'>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={activeOnly}
                                    onChange={(e) => setActiveOnly(e.target.checked)}
                                    size='small'
                                />
                            }
                            label={
                                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                                    {t('activeOnlyLabel')}
                                </Typography>
                            }
                            sx={{ ml: 1, width: 'fit-content' }}
                        />
                    </Tooltip>

                    {isLoading ? (
                        <LoadingPage />
                    ) : (
                        <WeekCalendar
                            weekDays={weekDays}
                            rows={visibleRows}
                            isCurrentUser={isCurrentUser}
                            cohort={user.dojoCohort}
                            onOpenTask={onOpenTask}
                        />
                    )}
                </Stack>
            </Collapse>

            {taskDialogView && selectedTask && (
                <TaskDialog
                    open
                    onClose={() => {
                        setSelectedTask(undefined);
                        setTaskDialogView(undefined);
                    }}
                    task={selectedTask}
                    initialView={taskDialogView}
                    progress={user.progress[selectedTask.id]}
                    cohort={user.dojoCohort}
                />
            )}
        </Stack>
    );
}

/**
 * Renders the week as a compact calendar: one column per day, one short line per
 * task. On phones the days stack, so each day's tasks can wrap across the width.
 */
function WeekCalendar({
    weekDays,
    rows,
    isCurrentUser,
    cohort,
    onOpenTask,
}: {
    weekDays: WeekDay[];
    rows: WeekRow[];
    isCurrentUser: boolean;
    cohort: string;
    onOpenTask: (task: Requirement | CustomTask, view: TaskDialogView) => void;
}) {
    const t = useTranslations('profile.trainingPlan.weekly');

    if (rows.length === 0) {
        return (
            <Typography variant='body2' sx={{ p: 2, color: 'text.secondary' }}>
                {t('empty')}
            </Typography>
        );
    }

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(7, minmax(0, 1fr))' },
                gap: { xs: 0, md: 0.75 },
                width: 1,
            }}
            data-testid='weekly-calendar'
        >
            {weekDays.map((day, i) => (
                <WeekCalendarDay
                    key={day.dayIndex}
                    day={day}
                    items={rows
                        .map((row) => ({ row, cell: row.cells[i] }))
                        .filter(({ cell }) => getCellState(cell, day) !== 'none')}
                    isCurrentUser={isCurrentUser}
                    cohort={cohort}
                    onOpenTask={onOpenTask}
                />
            ))}
        </Box>
    );
}

/**
 * Shows the week's expected hours for each category, one line each, with a bar
 * filling as time is logged.
 */
function CategoryTotals({ totals }: { totals: CategoryTotal[] }) {
    const tTime = useTranslations('common');
    if (totals.length === 0) {
        return null;
    }

    return (
        <Stack
            spacing={{ xs: 1.25, sm: 1 }}
            sx={{ px: 1, pb: 1 }}
            data-testid='weekly-category-totals'
        >
            {totals.map((total) => {
                const color = CategoryColors[total.category];
                // Unplanned work in a category counts as meeting its (zero) goal.
                const done = total.workedMinutes >= total.goalMinutes;
                const percent =
                    total.goalMinutes > 0
                        ? Math.min(100, (100 * total.workedMinutes) / total.goalMinutes)
                        : 100;
                const worked = formatTime(total.workedMinutes, tTime);
                return (
                    <Box
                        key={total.category}
                        sx={{
                            display: 'grid',
                            // Phones: name and time on one line, the bar under them.
                            // Wider: name, bar and time on one line, bars aligned.
                            gridTemplateColumns: {
                                xs: 'minmax(0, 1fr) auto',
                                sm: '200px minmax(0, 1fr) 110px',
                            },
                            gridTemplateAreas: {
                                xs: '"name time" "bar bar"',
                                sm: '"name bar time"',
                            },
                            alignItems: 'center',
                            columnGap: 2,
                            rowGap: 0.75,
                        }}
                        data-testid='weekly-category-total'
                    >
                        <Box sx={{ gridArea: 'name', minWidth: 0 }}>
                            <CategoryLabel category={total.category} />
                        </Box>
                        <LinearProgress
                            variant='determinate'
                            value={percent}
                            sx={{
                                gridArea: 'bar',
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: 'action.hover',
                                '& .MuiLinearProgress-bar': {
                                    borderRadius: 4,
                                    backgroundColor: color,
                                },
                            }}
                        />
                        <Typography
                            variant='body2'
                            sx={{
                                gridArea: 'time',
                                fontWeight: 600,
                                fontVariantNumeric: 'tabular-nums',
                                whiteSpace: 'nowrap',
                                textAlign: 'right',
                                color: done ? color : 'text.secondary',
                            }}
                        >
                            {`${worked} / ${formatTime(total.goalMinutes, tTime)}`}
                        </Typography>
                    </Box>
                );
            })}
        </Stack>
    );
}

function WeekCalendarDay({
    day,
    items,
    isCurrentUser,
    cohort,
    onOpenTask,
}: {
    day: WeekDay;
    items: { row: WeekRow; cell: WeekCell }[];
    isCurrentUser: boolean;
    cohort: string;
    onOpenTask: (task: Requirement | CustomTask, view: TaskDialogView) => void;
}) {
    const t = useTranslations('profile.trainingPlan.weekly');

    return (
        <Box
            sx={(theme) => ({
                display: 'flex',
                flexDirection: { xs: 'row', md: 'column' },
                alignItems: { xs: 'flex-start', md: 'stretch' },
                gap: { xs: 1.5, md: 0.5 },
                p: 0.75,
                py: { xs: 1, md: 0.75 },
                borderRadius: { xs: 0, md: 1 },
                borderBottom: { xs: `1px solid ${theme.palette.divider}`, md: 'none' },
                backgroundColor: day.isToday ? alpha(theme.palette.primary.main, 0.1) : undefined,
                opacity: day.isPast ? 0.55 : undefined,
            })}
            data-testid={day.isToday ? 'weekly-day-today' : 'weekly-day'}
        >
            <Typography
                variant='caption'
                sx={{
                    fontWeight: 'bold',
                    minWidth: { xs: 44, md: 0 },
                    pt: { xs: 0.5, md: 0 },
                    px: { md: 0.25 },
                    color: day.isToday ? 'primary.main' : 'text.secondary',
                }}
            >
                {t(days[day.dayIndex])}
            </Typography>

            <Box
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'row', md: 'column' },
                    flexWrap: { xs: 'wrap', md: 'nowrap' },
                    gap: 0.5,
                    minWidth: 0,
                    flexGrow: 1,
                }}
            >
                {items.length === 0 ? (
                    <Typography
                        variant='caption'
                        sx={{ color: 'text.disabled', pt: { xs: 0.5, md: 0 }, px: { md: 0.25 } }}
                    >
                        {t('restDay')}
                    </Typography>
                ) : (
                    items.map(({ row, cell }) => (
                        <WeekCalendarChip
                            key={row.task.id}
                            row={row}
                            cell={cell}
                            day={day}
                            isCurrentUser={isCurrentUser}
                            cohort={cohort}
                            onOpenTask={onOpenTask}
                        />
                    ))
                )}
            </Box>
        </Box>
    );
}

function WeekCalendarChip({
    row,
    cell,
    day,
    isCurrentUser,
    cohort,
    onOpenTask,
}: {
    row: WeekRow;
    cell: WeekCell;
    day: WeekDay;
    isCurrentUser: boolean;
    cohort: string;
    onOpenTask: (task: Requirement | CustomTask, view: TaskDialogView) => void;
}) {
    const t = useTranslations('profile.trainingPlan.weekly');
    const tTime = useTranslations('common');
    const task = useTranslatedRequirement(row.task) ?? row.task;
    const fullName = taskDisplayName({ task, cohort });
    // The task's verb ("Solve", "Read", "Spar") is shown as an icon, so the label
    // drops it: "Solve Polgar M2s" reads as a puzzle icon and "Polgar M2s".
    const { verb, rest } = splitDisplayName(fullName);
    const shortName =
        ('shortName' in task && task.shortName && splitDisplayName(task.shortName).rest) || rest;
    const color = CategoryColors[task.category];
    const { state, looksDone, timeKind, percent } = getChipDisplay(cell, day);

    const worked = formatTime(cell.workedMinutes, tTime);
    const goal = formatTime(cell.goalMinutes, tTime);
    const time =
        timeKind === 'extra'
            ? `+${worked}`
            : timeKind === 'partial'
              ? t('partialTime', { worked, goal })
              : timeKind === 'goal'
                ? goal
                : '';

    let status = t('cellPlanned', { goal });
    if (state === 'done') status = t('cellDone', { worked, goal });
    else if (state === 'missed') status = t('cellMissed', { worked, goal });
    else if (state === 'extra') status = t('cellExtra', { worked });
    else if (cell.workedMinutes > 0) status = t('cellPartial', { worked, goal });

    return (
        <Tooltip title={`${fullName} · ${status}`}>
            <ButtonBase
                onClick={() =>
                    onOpenTask(
                        task,
                        isCurrentUser ? TaskDialogView.Progress : TaskDialogView.Details,
                    )
                }
                data-testid={`weekly-chip-${state}`}
                sx={(theme) => ({
                    position: 'relative',
                    overflow: 'hidden',
                    justifyContent: 'flex-start',
                    gap: 0.5,
                    minWidth: 0,
                    maxWidth: { xs: 'calc(50% - 2px)', md: '100%' },
                    px: 0.75,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    lineHeight: 1.3,
                    textAlign: 'start',
                    borderLeft: `3px solid ${color}`,
                    backgroundColor: alpha(color, 0.12),
                    color: theme.palette.text.primary,
                    ...(looksDone && {
                        backgroundColor: alpha(color, 0.38),
                    }),
                    ...(state === 'missed' && {
                        backgroundColor: 'transparent',
                        color: theme.palette.text.secondary,
                    }),
                    '&:hover': { filter: 'brightness(1.15)' },
                })}
            >
                {percent > 0 && (
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            width: `${percent}%`,
                            backgroundColor: alpha(color, 0.38),
                        }}
                    />
                )}
                {looksDone && <Check sx={{ fontSize: '0.85rem', color, zIndex: 1 }} />}
                <Box sx={{ zIndex: 1, display: 'flex', color, '& [role=img]': { color } }}>
                    {verb ? (
                        <TaskVerbIcon verb={verb} size='0.95rem' />
                    ) : (
                        <TrainingPlanIcon category={task.category} sx={{ fontSize: '0.95rem' }} />
                    )}
                </Box>
                <Box
                    component='span'
                    sx={{
                        zIndex: 1,
                        flexGrow: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: 500,
                    }}
                >
                    {shortName}
                </Box>
                <Box
                    component='span'
                    sx={{
                        zIndex: 1,
                        flexShrink: 0,
                        fontVariantNumeric: 'tabular-nums',
                        color: 'text.secondary',
                    }}
                >
                    {time}
                </Box>
            </ButtonBase>
        </Tooltip>
    );
}
