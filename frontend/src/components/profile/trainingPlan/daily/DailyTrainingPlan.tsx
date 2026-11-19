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
import { Add, Help, NotInterested, PushPin, PushPinOutlined } from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardActionArea,
    CardActions,
    CardContent,
    Collapse,
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
import { OverbookedDayAlert } from '../OverbookedDayAlert';
import { useTrainingPlanSections } from '../PlanMenu';
import { ScheduleClassicalGameDaily } from '../ScheduleClassicalGame';
import { SectionHeader } from '../SectionHeader';
import { GRADUATION_SKIP_ID } from '../skippedTasks';
import { SCHEDULE_CLASSICAL_GAME_TASK_ID, SuggestedTask } from '../suggestedTasks';
import { TaskDescription } from '../TaskDescription';
import { TaskDialog, TaskDialogView } from '../TaskDialog';
import { taskDisplayName } from '../taskDisplayName';
import { TaskName } from '../TaskName';
import { getTaskUnit } from '../taskUnit';
import { TrainingPlanContext } from '../TrainingPlanTab';
import { useTrainingPlanProgress } from '../useTrainingPlan';
import { getDailyGoalMinutes } from '../workGoal';
import {
    dailyCardActionsSx,
    dailyCardSx,
    dailyPrimaryButtonSx,
    DailyTimePill,
    isDailyTaskDone,
} from './DailyCard';
import { DailyTaskMenu, DailyTaskMenuAction } from './DailyTaskMenu';
import { GraduationTask } from './GraduationTask';
import { SkippedTasksRow, SkipUndoSnackbar } from './SkippedTasks';
import { SwapTaskButton, SwapUndoSnackbar } from './SwapTaskButton';
import { TaskTimerIconButton } from './TaskTimerIconButton';
import { getTodayCards, isTaskFinished } from './todayCards';

export function DailyTrainingPlan() {
    const t = useTranslations('profile.trainingPlan.daily');
    const [expanded, setExpanded] = useLocalStorage('training-plan-daily-expanded', true);

    const [startDate, endDate] = useMemo(() => {
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);

        return [startDate.toISOString(), endDate.toISOString()];
    }, []);

    const { suggestionsByDay, timeline, isLoading, user } = use(TrainingPlanContext);

    const [, , workedTime, extraTaskIds] = useTrainingPlanProgress({
        startDate,
        endDate,
        tasks: suggestionsByDay[new Date().getDay()],
        timeline,
    });
    // Today's goal is the user's goal for the day, like This Week uses the whole
    // week's goal, so it doesn't move as tasks are done or the suggestions change.
    const goalTime = getDailyGoalMinutes(user.workGoal, new Date().getDay());

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
            <SectionHeader
                title={t('today')}
                expanded={expanded}
                onToggle={toggleExpanded}
                goal={goalTime}
                worked={workedTime}
                showProgress={!isLoading}
                testId='today'
            />

            {!isLoading && <OverbookedDayAlert dayIndex={new Date().getDay()} />}

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

function DailyTrainingPlanInternal({
    startDate,
    endDate,
    extraTaskIds,
}: {
    startDate: string;
    endDate: string;
    extraTaskIds: Set<string>;
}) {
    const { suggestionsByDay, user, skippedTaskIds, allRequirements, pinnedTasks, timeline } =
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

    const { showCompletedToday } = useTrainingPlanSections();

    // Today's cards, with the tasks still to do before the ones already done.
    const allCards = useMemo(
        () =>
            getTodayCards({
                suggestions: suggestedTasks ?? [],
                extraTasks,
                pinnedTaskIds: new Set(pinnedTasks.map((t) => t.id)),
                skippedTaskIds,
                timeline,
                startDate,
                endDate,
                gameSchedule: user.gameSchedule,
                user,
            }),
        [
            suggestedTasks,
            extraTasks,
            pinnedTasks,
            skippedTaskIds,
            timeline,
            startDate,
            endDate,
            user,
        ],
    );
    // The Plan menu can hide the tasks already done today.
    const cards = showCompletedToday ? allCards : allCards.filter((card) => !card.done);

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

            {/*
             * A CSS grid rather than MUI's flex Grid so that on wider screens every
             * row is as tall as the tallest, keeping all of Today's cards the same size.
             */}
            <Box
                sx={{
                    display: 'grid',
                    width: 1,
                    gap: 2,
                    gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(3, minmax(0, 1fr))' },
                    gridAutoRows: { md: '1fr' },
                }}
            >
                {shouldPromptGraduation(user) && !skippedTaskIds?.includes(GRADUATION_SKIP_ID) && (
                    <GraduationTask />
                )}

                {cards.map(({ suggestion }) =>
                    suggestion.task.id === SCHEDULE_CLASSICAL_GAME_TASK_ID ? (
                        <ScheduleClassicalGameDaily key={suggestion.task.id} />
                    ) : (
                        <DailyTrainingPlanItem
                            key={suggestion.task.id}
                            suggestion={suggestion}
                            onOpenTask={onOpenTask}
                            startDate={startDate}
                            endDate={endDate}
                        />
                    ),
                )}
            </Box>

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
    const { isCurrentUser, pinnedTasks, openPinEditor, timeline, user, toggleSkip } =
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

    const isComplete = isDailyTaskDone(
        timeWorkedMinutes,
        goalMinutes,
        isTaskFinished(user, task, timeline),
    );

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
                label: isPinned ? tCommon('editPin') : tCommon('pinToDaily'),
                icon: isPinned ? (
                    <PushPin fontSize='small' color='dojoOrange' />
                ) : (
                    <PushPinOutlined fontSize='small' color='dojoOrange' />
                ),
                onClick: () => openPinEditor(task),
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
        <Box key={task.id} sx={{ minWidth: 0 }}>
            <Card variant='outlined' sx={dailyCardSx(isComplete)}>
                <DailyTaskMenu actions={menuActions} />
                {isCurrentUser && goalMinutes > 0 && <SwapTaskButton task={suggestion.task} />}
                {isPinned && (
                    // Pinned tasks show their pin, so it's clear without opening the menu.
                    <Tooltip title={isCurrentUser ? tCommon('editPin') : tCommon('pinned')}>
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
                                aria-label={isCurrentUser ? tCommon('editPin') : tCommon('pinned')}
                                disabled={!isCurrentUser}
                                onClick={() => openPinEditor(task)}
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
                    // Clicking a task shows its details; only Log training opens logging.
                    onClick={() => onOpenTask(task, TaskDialogView.Details)}
                >
                    <CardContent sx={{ height: 1, p: 2, pb: 1 }}>
                        <Stack sx={{ height: 1 }}>
                            <Stack spacing={0.75} sx={{ alignItems: 'start', pr: 3 }}>
                                <Box sx={{ pr: 4 }}>
                                    <CategoryLabel category={task.category} />
                                </Box>

                                <Typography
                                    sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.3 }}
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
                                        mt: 0.75,
                                        lineHeight: 1.5,
                                        // One line keeps the cards compact; the full
                                        // description is in the task's details.
                                        lineClamp: 1,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 1,
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
                                    sx={{ flexGrow: 1, justifyContent: 'end', mt: 1.5 }}
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

                    <Tooltip title={isCurrentUser ? tCommon('logTraining') : ''}>
                        <Box component='span' sx={{ ml: 'auto' }}>
                            <DailyTimePill
                                worked={timeWorkedMinutes}
                                goal={goalMinutes}
                                done={isComplete}
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
        </Box>
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
