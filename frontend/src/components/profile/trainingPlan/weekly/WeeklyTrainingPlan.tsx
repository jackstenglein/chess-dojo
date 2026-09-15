import { CustomTask, getCurrentCount, Requirement } from '@/database/requirement';
import LoadingPage from '@/loading/LoadingPage';
import { CategoryColors, themeRequirementCategory } from '@/style/ThemeProvider';
import { useTranslatedRequirement } from '@/translation/useTranslatedRequirement';
import { Check, ExpandMore } from '@mui/icons-material';
import {
    alpha,
    Box,
    ButtonBase,
    Card,
    Chip,
    Collapse,
    FormControlLabel,
    Grid,
    IconButton,
    Stack,
    Switch,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { use, useMemo, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { taskTitle } from '../daily/DailyTrainingPlan';
import { SuggestedTask } from '../suggestedTasks';
import { TaskDialog, TaskDialogView } from '../TaskDialog';
import { TimeProgressChip } from '../TimeProgressChip';
import { TrainingPlanContext } from '../TrainingPlanTab';
import { useTrainingPlanProgress } from '../useTrainingPlan';
import { WorkGoalSettingsEditor } from '../WorkGoalSettingsEditor';

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];

export function WeeklyTrainingPlan() {
    const t = useTranslations('profile.trainingPlan.weekly');
    const tCommon = useTranslations('profile.trainingPlan.common');
    const { startDate, endDate, weekSuggestions, timeline, isCurrentUser, isLoading, user } =
        use(TrainingPlanContext);

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

    const onOpenTask = (task: Requirement | CustomTask, view: TaskDialogView) => {
        setSelectedTask(task);
        setTaskDialogView(view);
    };

    const onCloseTask = () => {
        setSelectedTask(undefined);
        setTaskDialogView(undefined);
    };

    const toggleExpanded = () => {
        setExpanded((v) => !v);
    };

    return (
        <Stack
            spacing={2}
            sx={{
                width: 1,
            }}
        >
            <Stack
                direction='row'
                sx={{
                    alignItems: 'center',
                    width: 1,
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
                    {t('thisWeek')}
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
                <Stack
                    spacing={2}
                    sx={{
                        mb: 1,
                    }}
                >
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
                                <Typography
                                    variant='body2'
                                    sx={{
                                        color: 'text.secondary',
                                    }}
                                >
                                    {t('activeOnlyLabel')}
                                </Typography>
                            }
                            sx={{ ml: 1, width: 'fit-content' }}
                        />
                    </Tooltip>

                    {isLoading ? (
                        <LoadingPage />
                    ) : (
                        <Grid container columns={7} sx={{ minHeight: '158px' }}>
                            {days.map((_, i) => (
                                <Grid key={i} size={1}>
                                    <WeeklyTrainingPlanDay
                                        dayIndex={(i + user.weekStart) % 7}
                                        onOpenTask={onOpenTask}
                                        activeOnly={activeOnly}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </Stack>
            </Collapse>

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
        </Stack>
    );
}

function WeeklyTrainingPlanDay({
    dayIndex,
    onOpenTask,
    activeOnly,
}: {
    dayIndex: number;
    onOpenTask: (task: Requirement | CustomTask, view: TaskDialogView) => void;
    activeOnly: boolean;
}) {
    const t = useTranslations('profile.trainingPlan.weekly');
    const { suggestionsByDay, startDate, timeline, user, allRequirements, pinnedTasks } =
        use(TrainingPlanContext);
    const suggestedTasks = suggestionsByDay[dayIndex];
    const todayIndex = new Date().getDay();

    const dayStart = getDayOfWeekAfterDate(new Date(startDate), dayIndex);
    const end = new Date(dayStart);
    end.setDate(end.getDate() + 1);
    const dayEnd = end.toISOString();

    const [_, __, ___, extraTaskIds] = useTrainingPlanProgress({
        startDate: dayStart,
        endDate: dayEnd,
        tasks: suggestedTasks,
        timeline,
    });

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

    return (
        <Stack
            sx={{
                height: 1,
            }}
        >
            <Typography
                variant='subtitle1'
                color={todayIndex === dayIndex ? 'primary' : 'textSecondary'}
                sx={{
                    fontWeight: 'bold',
                    ml: 0.25,
                }}
            >
                {t(days[dayIndex])}
            </Typography>

            <Card
                sx={{
                    flexGrow: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderLeft: dayIndex === 0 ? undefined : 'none',
                }}
            >
                <Stack
                    spacing={1}
                    sx={{
                        py: 1,
                        px: 0.5,
                    }}
                >
                    {suggestedTasks.map(
                        (t) =>
                            (t.goalMinutes > 0 ||
                                pinnedTasks.some((pin) => pin.id === t.task.id)) && (
                                <WeeklyTrainingPlanItem
                                    key={t.task.id}
                                    suggestion={t}
                                    onOpenTask={onOpenTask}
                                    startDate={dayStart}
                                    endDate={dayEnd}
                                    activeOnly={activeOnly}
                                />
                            ),
                    )}

                    {extraTasks.map((task) => (
                        <WeeklyTrainingPlanItem
                            key={task.id}
                            suggestion={{ task, goalMinutes: 0 }}
                            onOpenTask={onOpenTask}
                            startDate={dayStart}
                            endDate={dayEnd}
                            activeOnly={false} // Extra tasks are always active
                        />
                    ))}
                </Stack>
            </Card>
        </Stack>
    );
}

function WeeklyTrainingPlanItem({
    suggestion,
    onOpenTask,
    startDate,
    endDate,
    activeOnly,
}: {
    suggestion: SuggestedTask;
    onOpenTask: (task: Requirement | CustomTask, view: TaskDialogView) => void;
    startDate: string;
    endDate: string;
    activeOnly: boolean;
}) {
    const task = useTranslatedRequirement(suggestion.task) ?? suggestion.task;
    const tTime = useTranslations('common');
    const tCategoryShort = useTranslations('enums.requirementCategoryShort');
    const { isCurrentUser, user, timeline } = use(TrainingPlanContext);
    const tasks = useMemo(() => [suggestion], [suggestion]);
    const [goalMinutes, timeWorked, _, __, active] = useTrainingPlanProgress({
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

    const isComplete = timeWorked >= goalMinutes;

    if (activeOnly && !active) {
        return null;
    }

    const onOpenProgress = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        onOpenTask(task, TaskDialogView.Progress);
    };

    return (
        <Stack
            direction='row'
            sx={{
                borderRadius: 1.5,
                position: 'relative',
                overflow: 'hidden',
                opacity: isComplete ? 0.6 : undefined,
            }}
        >
            <Box
                sx={{
                    minWidth: '4px',
                    minHeight: 1,
                    backgroundColor: CategoryColors[task.category],
                }}
            />
            <ButtonBase
                onClick={() =>
                    onOpenTask(
                        task,
                        isCurrentUser && currentCount > 0
                            ? TaskDialogView.Progress
                            : TaskDialogView.Details,
                    )
                }
                sx={{
                    flexGrow: 1,
                    pl: 0.75,
                    pr: 0.5,
                    py: 1,
                    textAlign: 'start',
                    backgroundColor: alpha(CategoryColors[task.category], 0.2),
                    '&:hover:not(:has(#time-progress-chip:hover))': {
                        backgroundColor: alpha(CategoryColors[task.category], 0.13),
                    },
                }}
            >
                <Stack
                    spacing={3}
                    sx={{
                        width: 1,
                    }}
                >
                    <Typography
                        variant='body2'
                        sx={{
                            fontWeight: 'bold',
                        }}
                    >
                        {taskTitle({ task, cohort: user.dojoCohort, goalMinutes, tCommon: tTime })}
                    </Typography>

                    <Stack
                        direction='row'
                        sx={{
                            flexWrap: 'wrap',
                            gap: 1,
                        }}
                    >
                        <Chip
                            label={
                                tCategoryShort.has(task.category)
                                    ? tCategoryShort(task.category)
                                    : task.category
                            }
                            color={themeRequirementCategory(task.category)}
                            size='small'
                            sx={{
                                fontSize: '0.75rem',
                                height: 'auto',
                                '& .MuiChip-label': {
                                    px: 0.5,
                                },
                            }}
                        />

                        <TimeProgressChip
                            goal={goalMinutes}
                            value={timeWorked}
                            slotProps={{
                                container: {
                                    id: 'time-progress-chip',
                                },
                                chip: {
                                    size: 'small',
                                    icon: isComplete ? (
                                        <Check fontSize='inherit' color='success' />
                                    ) : undefined,
                                    onClick: isCurrentUser ? onOpenProgress : undefined,
                                    sx: {
                                        fontSize: '0.75rem',
                                        height: 'auto',
                                        '& .MuiChip-label': {
                                            px: 0.5,
                                        },
                                    },
                                },
                            }}
                        />
                    </Stack>
                </Stack>
            </ButtonBase>
        </Stack>
    );
}

function getDayOfWeekAfterDate(reference: Date, day: number): string {
    reference.setHours(0, 0, 0, 0);
    if (reference.getDay() < day) {
        reference.setDate(reference.getDate() + day - reference.getDay());
    } else if (reference.getDay() > day) {
        reference.setDate(reference.getDate() + 7 - reference.getDay() + day);
    }
    return reference.toISOString();
}
