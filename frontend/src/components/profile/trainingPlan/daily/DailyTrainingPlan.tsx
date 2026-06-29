import {
    CustomTask,
    formatTime,
    getCurrentCount,
    getTotalCount,
    isPinnable,
    isRequirement,
    Requirement,
} from '@/database/requirement';
import { shouldPromptGraduation } from '@/database/user';
import LoadingPage from '@/loading/LoadingPage';
import { themeRequirementCategory } from '@/style/ThemeProvider';
import { useTranslatedRequirement } from '@/translation/useTranslatedRequirement';
import {
    Check,
    ExpandMore,
    Help,
    NotInterested,
    PushPin,
    PushPinOutlined,
} from '@mui/icons-material';
import {
    Box,
    Card,
    CardActionArea,
    CardActions,
    CardContent,
    Chip,
    Collapse,
    Grid,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { use, useMemo, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { displayProgress } from '../full/FullTrainingPlanItem';
import { ScheduleClassicalGameDaily } from '../ScheduleClassicalGame';
import { SCHEDULE_CLASSICAL_GAME_TASK_ID, SuggestedTask } from '../suggestedTasks';
import { TaskDescription } from '../TaskDescription';
import { TaskDialog, TaskDialogView } from '../TaskDialog';
import { TimeProgressChip } from '../TimeProgressChip';
import { TrainingPlanContext } from '../TrainingPlanTab';
import { useTrainingPlanProgress } from '../useTrainingPlan';
import { WorkGoalSettingsEditor } from '../WorkGoalSettingsEditor';
import { GraduationTask } from './GraduationTask';
import { TaskTimerIconButton } from './TaskTimerIconButton';

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

    const [goalTime, _, workedTime, extraTaskIds] = useTrainingPlanProgress({
        startDate,
        endDate,
        tasks: suggestionsByDay[new Date().getDay()],
        timeline,
    });

    const toggleExpanded = () => {
        setExpanded((v) => !v);
    };

    return (
        <Stack data-testid='training-plan-today' spacing={2} width={1}>
            <Stack direction='row' alignItems='center'>
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

                <Typography variant='h5' fontWeight='bold' ml={0.5} mr={2}>
                    {t('today')}
                </Typography>

                <WorkGoalSettingsEditor
                    currentGoal={goalTime}
                    currentValue={workedTime}
                    disabled={!isCurrentUser}
                    initialWeekStart={user.weekStart}
                    workGoal={user.workGoal}
                    workGoalHistory={user.workGoalHistory}
                />
            </Stack>

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
        <Stack width={1}>
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
                {shouldPromptGraduation(user) && !skippedTaskIds?.includes('graduation') && (
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
    const t = useTranslations('profile.trainingPlan.daily');
    const tCommon = useTranslations('profile.trainingPlan.common');
    const tTime = useTranslations('common');
    const tCategory = useTranslations('enums.requirementCategory');
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
    return (
        <Grid key={task.id} size={{ xs: 12, md: 4 }}>
            <Card
                variant='outlined'
                sx={{
                    height: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    opacity: isComplete ? 0.6 : undefined,
                }}
            >
                <CardActionArea
                    sx={{ flexGrow: 1 }}
                    onClick={() =>
                        onOpenTask(
                            task,
                            isCurrentUser && currentCount > 0
                                ? TaskDialogView.Progress
                                : TaskDialogView.Details,
                        )
                    }
                >
                    <CardContent sx={{ height: 1 }}>
                        <Stack sx={{ height: 1 }}>
                            <Stack spacing={1} alignItems='start'>
                                <Chip
                                    variant='outlined'
                                    label={
                                        tCategory.has(task.category)
                                            ? tCategory(task.category)
                                            : task.category
                                    }
                                    color={themeRequirementCategory(task.category)}
                                    size='small'
                                />

                                <Typography variant='h6' fontWeight='bold'>
                                    {taskTitle({
                                        task,
                                        cohort: user.dojoCohort,
                                        goalMinutes,
                                        tCommon: tTime,
                                    })}
                                </Typography>
                            </Stack>

                            {task.description && (
                                <Box
                                    color='text.secondary'
                                    sx={{
                                        mt: 1,
                                        lineClamp: 4,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 4,
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
                                <Stack sx={{ flexGrow: 1, justifyContent: 'end', mt: 2 }}>
                                    <Typography color='textSecondary'>
                                        {t('progressCompleted', {
                                            current: Math.max(
                                                currentCount - (task.startCount || 0),
                                                0,
                                            ),
                                            total: Math.max(totalCount - (task.startCount || 0), 0),
                                            suffix: task.progressBarSuffix.toLowerCase(),
                                        })}
                                    </Typography>
                                </Stack>
                            )}
                        </Stack>
                    </CardContent>
                </CardActionArea>
                <CardActions disableSpacing>
                    <Tooltip title={tCommon('viewTaskDetails')}>
                        <IconButton
                            sx={{ color: 'text.secondary' }}
                            onClick={() => onOpenTask(task, TaskDialogView.Details)}
                        >
                            <Help />
                        </IconButton>
                    </Tooltip>

                    {isCurrentUser && (
                        <>
                            <Tooltip title={tCommon('skipForWeek')}>
                                <IconButton
                                    onClick={() => toggleSkip(task.id)}
                                    sx={{
                                        color: 'text.secondary',
                                        marginLeft: 'auto',
                                    }}
                                >
                                    <NotInterested />
                                </IconButton>
                            </Tooltip>

                            {isPinnable(task) && (
                                <Tooltip
                                    title={
                                        isPinned ? tCommon('unpinFromDaily') : tCommon('pinToDaily')
                                    }
                                >
                                    <IconButton onClick={() => togglePin(task)}>
                                        {isPinned ? (
                                            <PushPin color='dojoOrange' />
                                        ) : (
                                            <PushPinOutlined color='dojoOrange' />
                                        )}
                                    </IconButton>
                                </Tooltip>
                            )}

                            <TaskTimerIconButton taskId={task.id} />
                        </>
                    )}

                    <Tooltip title={isCurrentUser ? tCommon('updateProgress') : ''}>
                        <TimeProgressChip
                            value={timeWorkedMinutes}
                            goal={goalMinutes}
                            slotProps={{
                                chip: {
                                    icon: isComplete ? (
                                        <Check fontSize='inherit' color='success' />
                                    ) : undefined,
                                    onClick: isCurrentUser
                                        ? () => onOpenTask(task, TaskDialogView.Progress)
                                        : undefined,
                                },
                                container: { mx: 0.5 },
                            }}
                            data-testid='update-task-button'
                        />
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
