import {
    CustomTask,
    formatTime,
    getCurrentCount,
    getTotalCount,
    isPinnable,
    isRequirement,
    Requirement,
    ScoreboardDisplay,
} from '@/database/requirement';
import { shouldPromptGraduation } from '@/database/user';
import LoadingPage from '@/loading/LoadingPage';
import { ProgressText } from '@/scoreboard/ScoreboardProgress';
import { CategoryColors } from '@/style/ThemeProvider';
import { useTranslatedRequirement } from '@/translation/useTranslatedRequirement';
import {
    Add,
    Check,
    ExpandMore,
    Help,
    NotInterested,
    PushPin,
    PushPinOutlined,
} from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardActionArea,
    CardActions,
    CardContent,
    Collapse,
    Grid,
    IconButton,
    LinearProgress,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { use, useMemo, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { CategoryLabel } from '../CategoryLabel';
import { displayProgress } from '../full/FullTrainingPlanItem';
import { ScheduleClassicalGameDaily } from '../ScheduleClassicalGame';
import { GRADUATION_SKIP_ID } from '../skippedTasks';
import { SCHEDULE_CLASSICAL_GAME_TASK_ID, SuggestedTask } from '../suggestedTasks';
import { TaskDescription } from '../TaskDescription';
import { TaskDialog, TaskDialogView } from '../TaskDialog';
import { taskDisplayName } from '../taskDisplayName';
import { TaskName } from '../TaskName';
import { getTaskUnit } from '../taskUnit';
import { TrainingPlanContext } from '../TrainingPlanTab';
import { useTrainingPlanProgress } from '../useTrainingPlan';
import { WorkGoalSettingsEditor } from '../WorkGoalSettingsEditor';
import { dailyCardActionsSx, dailyCardSx, dailyPrimaryButtonSx, DailyTimePill } from './DailyCard';
import { DailyTaskMenu, DailyTaskMenuAction } from './DailyTaskMenu';
import { GraduationTask } from './GraduationTask';
import { SkippedTasksRow, SkipUndoSnackbar } from './SkippedTasks';
import { SwapTaskButton, SwapUndoSnackbar } from './SwapTaskButton';
import { TaskTimerIconButton } from './TaskTimerIconButton';
import { getTodaySummary } from './todaySummary';

export function DailyTrainingPlan() {
    const t = useTranslations('profile.trainingPlan.daily');
    const tCommon = useTranslations('profile.trainingPlan.common');
    const [expanded, setExpanded] = useLocalStorage('training-plan-daily-expanded', true);

    const [startDate, endDate] = useMemo(() => {
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);

        return [startDate.toISOString(), endDate.toISOString()];
    }, []);

    const { suggestionsByDay, isCurrentUser, timeline, isLoading, user } = use(TrainingPlanContext);

    const [goalTime, suggestedWorkedTime, workedTime, extraTaskIds] = useTrainingPlanProgress({
        startDate,
        endDate,
        tasks: suggestionsByDay[new Date().getDay()],
        timeline,
    });

    const { taskCount, doneCount } = useMemo(
        () =>
            getTodaySummary({
                suggestions: suggestionsByDay[new Date().getDay()] ?? [],
                timeline,
                startDate,
                endDate,
                gameSchedule: user.gameSchedule,
            }),
        [suggestionsByDay, timeline, startDate, endDate, user.gameSchedule],
    );

    const toggleExpanded = () => {
        setExpanded((v) => !v);
    };

    return (
        <Stack
            data-testid='training-plan-today'
            spacing={2}
            sx={{
                width: 1,
            }}
        >
            <Stack
                direction='row'
                sx={{
                    alignItems: 'center',
                }}
            >
                <Tooltip title={expanded ? tCommon('hide') : tCommon('show')}>
                    <IconButton onClick={toggleExpanded}>
                        <ExpandMore
                            sx={{
                                transform: expanded ? 'rotate(180deg)' : undefined,
                                transition: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
                            }}
                        />
                    </IconButton>
                </Tooltip>

                <Typography
                    variant='h5'
                    sx={{
                        fontWeight: 'bold',
                        ml: 0.5,
                        mr: 2,
                    }}
                >
                    {t('today')}
                </Typography>

                <WorkGoalSettingsEditor
                    currentGoal={goalTime}
                    currentValue={workedTime}
                    disabled={!isCurrentUser}
                    initialWeekStart={user.weekStart}
                    workGoal={user.workGoal}
                    workGoalHistory={user.workGoalHistory}
                    variant={taskCount > 0 ? 'icon' : 'chip'}
                />
            </Stack>

            {!isLoading && taskCount > 0 && (
                <DailySummary
                    taskCount={taskCount}
                    doneCount={doneCount}
                    goalMinutes={goalTime}
                    workedMinutes={suggestedWorkedTime}
                />
            )}

            <Collapse in={expanded}>
                {isLoading ? (
                    <LoadingPage />
                ) : (
                    <DailyTrainingPlanInternal
                        startDate={startDate}
                        endDate={endDate}
                        extraTaskIds={extraTaskIds}
                    />
                )}
            </Collapse>
        </Stack>
    );
}

/**
 * Renders the summary of today's plan: how many tasks are done, how much of the
 * day's suggested time has been worked, and a clear finished state.
 */
export function DailySummary({
    taskCount,
    doneCount,
    goalMinutes,
    workedMinutes,
}: {
    taskCount: number;
    doneCount: number;
    goalMinutes: number;
    workedMinutes: number;
}) {
    const t = useTranslations('profile.trainingPlan.daily');
    const tTime = useTranslations('common');
    const allDone = doneCount >= taskCount;
    // The day's suggested time is logged, even if some tasks are left.
    const goalMet = goalMinutes > 0 && workedMinutes >= goalMinutes;
    const complete = allDone || goalMet;
    const percent = goalMinutes > 0 ? Math.min(100, (100 * workedMinutes) / goalMinutes) : 0;

    return (
        <Stack spacing={0.75} sx={{ width: 1, maxWidth: 520, pl: 1 }} data-testid='daily-summary'>
            <Stack direction='row' sx={{ alignItems: 'center', gap: 0.75 }}>
                {allDone && <Check fontSize='small' color='success' />}
                <Typography
                    variant='body2'
                    sx={{ fontWeight: 600, color: allDone ? 'success.main' : 'text.secondary' }}
                >
                    {allDone
                        ? t('allDone', { worked: formatTime(workedMinutes, tTime) })
                        : t('summary', {
                              done: doneCount,
                              total: taskCount,
                              worked: formatTime(workedMinutes, tTime),
                              goal: formatTime(goalMinutes, tTime),
                          })}
                </Typography>
                {!allDone && goalMet && (
                    <Typography
                        variant='body2'
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.25,
                            fontWeight: 600,
                            color: 'success.main',
                            ml: 'auto',
                        }}
                        data-testid='daily-goal-met'
                    >
                        <Check sx={{ fontSize: '1rem' }} />
                        {t('goalMet')}
                    </Typography>
                )}
            </Stack>
            <LinearProgress
                variant='determinate'
                value={complete ? 100 : percent}
                color={complete ? 'success' : 'primary'}
                sx={{ height: 8, borderRadius: 4, backgroundColor: 'action.hover' }}
            />
        </Stack>
    );
}

function DailyTrainingPlanInternal({
    startDate,
    endDate,
    extraTaskIds,
}: {
    startDate: string;
    endDate: string;
    extraTaskIds: Set<string>;
}) {
    const { suggestionsByDay, user, skippedTaskIds, allRequirements, pinnedTasks } =
        use(TrainingPlanContext);
    const suggestedTasks = useMemo(() => suggestionsByDay[new Date().getDay()], [suggestionsByDay]);
    const [selectedTask, setSelectedTask] = useState<Requirement | CustomTask>();
    const [taskDialogView, setTaskDialogView] = useState<TaskDialogView>();

    const extraTasks = useMemo(() => {
        const tasks = [];
        for (const id of extraTaskIds) {
            const task =
                user.customTasks?.find((t) => t.id === id) ??
                allRequirements.find((t) => t.id === id);
            if (task) {
                tasks.push(task);
            }
        }
        return tasks;
    }, [user.customTasks, allRequirements, extraTaskIds]);

    const onOpenTask = (task: Requirement | CustomTask, view: TaskDialogView) => {
        setSelectedTask(task);
        setTaskDialogView(view);
    };

    const onCloseTask = () => {
        setSelectedTask(undefined);
        setTaskDialogView(undefined);
    };

    return (
        <Stack
            sx={{
                width: 1,
            }}
        >
            {taskDialogView && selectedTask && (
                <TaskDialog
                    open
                    onClose={onCloseTask}
                    task={selectedTask}
                    initialView={taskDialogView}
                    progress={user.progress[selectedTask.id]}
                    cohort={user.dojoCohort}
                />
            )}

            <Grid container sx={{ width: 1 }} columnSpacing={2} rowSpacing={2}>
                {shouldPromptGraduation(user) && !skippedTaskIds?.includes(GRADUATION_SKIP_ID) && (
                    <GraduationTask />
                )}

                {suggestedTasks.map((t) =>
                    t.task.id === SCHEDULE_CLASSICAL_GAME_TASK_ID ? (
                        <ScheduleClassicalGameDaily key={t.task.id} />
                    ) : (
                        (t.goalMinutes > 0 || pinnedTasks.some((pin) => pin.id === t.task.id)) && (
                            <DailyTrainingPlanItem
                                key={t.task.id}
                                suggestion={t}
                                onOpenTask={onOpenTask}
                                startDate={startDate}
                                endDate={endDate}
                            />
                        )
                    ),
                )}

                {extraTasks.map((task) => (
                    <DailyTrainingPlanItem
                        key={task.id}
                        suggestion={{ task, goalMinutes: 0 }}
                        onOpenTask={onOpenTask}
                        startDate={startDate}
                        endDate={endDate}
                    />
                ))}
            </Grid>

            <SkippedTasksRow />
            <SkipUndoSnackbar />
            <SwapUndoSnackbar />
        </Stack>
    );
}

function DailyTrainingPlanItem({
    suggestion,
    startDate,
    endDate,
    onOpenTask,
}: {
    suggestion: SuggestedTask;
    startDate: string;
    endDate: string;
    onOpenTask: (task: Requirement | CustomTask, view: TaskDialogView) => void;
}) {
    const tCommon = useTranslations('profile.trainingPlan.common');
    const tQuickLog = useTranslations('profile.trainingPlan.quickLog');
    const task = useTranslatedRequirement(suggestion.task) ?? suggestion.task;
    const { isCurrentUser, pinnedTasks, togglePin, timeline, user, toggleSkip } =
        use(TrainingPlanContext);
    const isPinned = pinnedTasks.some((t) => t.id === task.id);

    const totalCount = getTotalCount(user.dojoCohort, task, true);
    const tasks = useMemo(() => [suggestion], [suggestion]);
    const [goalMinutes, timeWorkedMinutes] = useTrainingPlanProgress({
        startDate,
        endDate,
        tasks,
        timeline,
    });

    const currentCount = getCurrentCount({
        cohort: user.dojoCohort,
        requirement: task,
        progress: user.progress[task.id],
        timeline,
    });

    const isComplete = timeWorkedMinutes >= goalMinutes;

    // Counts are offset by startCount, so display and bar both work from the
    // adjusted values; otherwise a task starting at 306 shows "306 / 2100" over
    // an empty bar.
    const progressCurrent = Math.max(currentCount - (task.startCount || 0), 0);
    const progressTotal = Math.max(totalCount - (task.startCount || 0), 0);
    const progressPercent =
        progressTotal > 0 ? Math.min(100, (100 * progressCurrent) / progressTotal) : 0;

    // The quick log records whatever is left of today's suggested time for this task.
    // Prefill the log with what's left of today's suggestion, or the full
    // suggestion once it's been met (someone logging more is still training).
    const hasProgress =
        progressCurrent > 0 || (user.progress[task.id]?.minutesSpent?.[user.dojoCohort] ?? 0) > 0;

    const title = taskDisplayName({ task, cohort: user.dojoCohort });

    const menuActions: DailyTaskMenuAction[] = [
        {
            key: 'details',
            label: tCommon('viewTaskDetails'),
            icon: <Help fontSize='small' />,
            onClick: () => onOpenTask(task, TaskDialogView.Details),
        },
    ];
    if (isCurrentUser) {
        if (isPinnable(task)) {
            menuActions.push({
                key: 'pin',
                label: isPinned ? tCommon('unpinFromDaily') : tCommon('pinToDaily'),
                icon: isPinned ? (
                    <PushPin fontSize='small' color='dojoOrange' />
                ) : (
                    <PushPinOutlined fontSize='small' color='dojoOrange' />
                ),
                onClick: () => togglePin(task),
            });
        }
        menuActions.push({
            key: 'skip',
            label: tCommon('skipForWeek'),
            icon: <NotInterested fontSize='small' />,
            onClick: () => toggleSkip(task.id),
        });
    }

    return (
        <Grid key={task.id} size={{ xs: 12, md: 4 }}>
            <Card variant='outlined' sx={dailyCardSx(isComplete)}>
                <DailyTaskMenu actions={menuActions} />
                {isCurrentUser && goalMinutes > 0 && <SwapTaskButton task={suggestion.task} />}
                {isPinned && (
                    // Pinned tasks show their pin, so it's clear without opening the menu.
                    <Tooltip title={isCurrentUser ? tCommon('unpinFromDaily') : tCommon('pinned')}>
                        <Box
                            component='span'
                            sx={{
                                position: 'absolute',
                                top: 6,
                                right: isCurrentUser && goalMinutes > 0 ? 70 : 38,
                                zIndex: 1,
                            }}
                        >
                            <IconButton
                                size='small'
                                aria-label={
                                    isCurrentUser ? tCommon('unpinFromDaily') : tCommon('pinned')
                                }
                                disabled={!isCurrentUser}
                                onClick={() => togglePin(task)}
                                sx={{ '&.Mui-disabled': { color: 'dojoOrange.main' } }}
                                data-testid='daily-task-pin'
                            >
                                <PushPin fontSize='small' color='dojoOrange' />
                            </IconButton>
                        </Box>
                    </Tooltip>
                )}

                <CardActionArea
                    sx={{
                        flexGrow: 1,
                        borderRadius: 'inherit',
                        opacity: isComplete ? 0.75 : undefined,
                    }}
                    // A task already started opens straight to logging; others show details first.
                    onClick={() =>
                        isCurrentUser && hasProgress
                            ? onOpenTask(task, TaskDialogView.Progress)
                            : onOpenTask(task, TaskDialogView.Details)
                    }
                >
                    <CardContent sx={{ height: 1, p: 2.5, pb: 1.5 }}>
                        <Stack sx={{ height: 1 }}>
                            <Stack spacing={1} sx={{ alignItems: 'start', pr: 3 }}>
                                <Box sx={{ pr: 4 }}>
                                    <CategoryLabel category={task.category} />
                                </Box>

                                <Typography
                                    sx={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.3 }}
                                >
                                    <TaskName name={title} iconColor='text.secondary' />
                                </Typography>
                            </Stack>

                            {task.description && (
                                <Box
                                    sx={{
                                        color: 'text.secondary',
                                        fontSize: '0.875rem',
                                        '& *': { fontSize: 'inherit', lineHeight: 'inherit' },
                                        mt: 1,
                                        lineHeight: 1.55,
                                        lineClamp: 2,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    <TaskDescription>
                                        {task.description.replaceAll('{{count}}', `${totalCount}`)}
                                    </TaskDescription>
                                </Box>
                            )}

                            {displayProgress(task) && (
                                <Stack
                                    spacing={0.75}
                                    sx={{ flexGrow: 1, justifyContent: 'end', mt: 2 }}
                                >
                                    <ProgressText
                                        value={progressCurrent}
                                        max={progressTotal}
                                        min={0}
                                        suffix={getTaskUnit(task).toLowerCase()}
                                        isTime={
                                            task.scoreboardDisplay === ScoreboardDisplay.Minutes
                                        }
                                    />
                                    <LinearProgress
                                        variant='determinate'
                                        value={progressPercent}
                                        sx={{
                                            height: 6,
                                            borderRadius: 3,
                                            backgroundColor: 'action.hover',
                                            '& .MuiLinearProgress-bar': {
                                                borderRadius: 3,
                                                backgroundColor: CategoryColors[task.category],
                                            },
                                        }}
                                    />
                                </Stack>
                            )}
                        </Stack>
                    </CardContent>
                </CardActionArea>

                <CardActions disableSpacing sx={dailyCardActionsSx}>
                    {isCurrentUser && (
                        <Tooltip title={tQuickLog('logTooltip')}>
                            <Button
                                size='small'
                                variant='contained'
                                disableElevation
                                startIcon={<Add />}
                                onClick={() => onOpenTask(task, TaskDialogView.Progress)}
                                sx={dailyPrimaryButtonSx}
                                data-testid='quick-log-button'
                            >
                                {tQuickLog('logTraining')}
                            </Button>
                        </Tooltip>
                    )}

                    {isCurrentUser && <TaskTimerIconButton taskId={task.id} />}

                    <Tooltip title={isCurrentUser ? tCommon('updateProgress') : ''}>
                        <Box component='span' sx={{ ml: 'auto' }}>
                            <DailyTimePill
                                worked={timeWorkedMinutes}
                                goal={goalMinutes}
                                onClick={
                                    isCurrentUser
                                        ? () => onOpenTask(task, TaskDialogView.Progress)
                                        : undefined
                                }
                                data-testid='update-task-button'
                            />
                        </Box>
                    </Tooltip>
                </CardActions>
            </Card>
        </Grid>
    );
}
/**
 * Returns the title for a task.
 * @param task The task to get the title for.
 * @param cohort The cohort to get the title for.
 * @param goalMinutes The number of minutes to work on the task.
 * @returns The title for the task.
 */
export function taskTitle({
    task,
    cohort,
    goalMinutes,
    tCommon,
}: {
    task: Requirement | CustomTask;
    cohort: string;
    goalMinutes: number;
    tCommon: (key: string, values?: Record<string, string | number>) => string;
}) {
    const totalCount = getTotalCount(cohort, task, true);

    let title = goalMinutes > 0 ? task.dailyName : task.name;
    title = (title || task.name)
        .replaceAll('{{count}}', `${totalCount}`)
        .replaceAll('{{time}}', formatTime(goalMinutes, tCommon));

    if (!isRequirement(task) && goalMinutes > 0) {
        title += ` - ${formatTime(goalMinutes, tCommon)}`;
    }

    return title;
}
