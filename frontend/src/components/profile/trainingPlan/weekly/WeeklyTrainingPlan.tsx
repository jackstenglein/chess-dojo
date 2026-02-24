import { CustomTask, Requirement } from '@/database/requirement';
import LoadingPage from '@/loading/LoadingPage';
import { CategoryColors, themeRequirementCategory } from '@/style/ThemeProvider';
import { displayRequirementCategoryShort } from '@jackstenglein/chess-dojo-common/src/database/requirement';
import { Check, ExpandMore } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    alpha,
    Box,
    ButtonBase,
    Card,
    Chip,
    Grid,
    Stack,
    Typography,
} from '@mui/material';
import { use, useMemo, useState } from 'react';
import { taskTitle } from '../daily/DailyTrainingPlan';
import { SuggestedTask } from '../suggestedTasks';
import { TaskDialog, TaskDialogView } from '../TaskDialog';
import { TimeProgressChip } from '../TimeProgressChip';
import { TrainingPlanContext } from '../TrainingPlanTab';
import { useTrainingPlanProgress } from '../useTrainingPlan';
import { WorkGoalSettingsEditor } from '../WorkGoalSettingsEditor';
import { useLocalStorage } from 'usehooks-ts';

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];

export function WeeklyTrainingPlan() {
    const { startDate, endDate, weekSuggestions, timeline, isCurrentUser, isLoading, user } =
        use(TrainingPlanContext);

    const [goalTime, _, workedTime] = useTrainingPlanProgress({
        startDate,
        endDate,
        tasks: weekSuggestions,
        timeline,
    });

    const [expanded, setExpanded] = useLocalStorage<boolean>("training-plan-weekly-expanded",true);

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

    const handleAccordionChange = (_event: React.SyntheticEvent, isExpanded: boolean) => {
        setExpanded(isExpanded);
    };

    return (
        <Stack spacing={2} width={1}>
            <Accordion
                expanded={expanded}
                onChange={handleAccordionChange}
                sx={{
                    '&:before': {
                        display: 'none',
                    },
                    boxShadow: 'none',
                    border: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <AccordionSummary
                    expandIcon={<ExpandMore />}
                    sx={{
                        '& .MuiAccordionSummary-content': {
                            alignItems: 'center',
                        },
                    }}
                >
                    <Stack direction='row' alignItems='center' spacing={2} width={1}>
                        <Typography variant='h5' fontWeight='bold'>
                            This Week
                        </Typography>

                        <WorkGoalSettingsEditor
                            currentGoal={goalTime}
                            currentValue={workedTime}
                            disabled={!isCurrentUser}
                            initialWeekStart={user.weekStart}
                            workGoal={user.workGoal}
                        />
                    </Stack>
                </AccordionSummary>

                <AccordionDetails>
                    {isLoading ? (
                        <LoadingPage />
                    ) : (
                        <Grid container columns={7}>
                            {days.map((_, i) => (
                                <Grid key={i} size={1}>
                                    <WeeklyTrainingPlanDay
                                        dayIndex={(i + user.weekStart) % 7}
                                        onOpenTask={onOpenTask}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </AccordionDetails>
            </Accordion>

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
}: {
    dayIndex: number;
    onOpenTask: (task: Requirement | CustomTask, view: TaskDialogView) => void;
}) {
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
        <Stack height={1}>
            <Typography
                variant='subtitle1'
                fontWeight='bold'
                color={todayIndex === dayIndex ? 'primary' : 'text.secondary'}
                sx={{ ml: 0.25 }}
            >
                {days[dayIndex]}
            </Typography>

            <Card
                sx={{
                    flexGrow: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderLeft: dayIndex === 0 ? undefined : 'none',
                }}
            >
                <Stack spacing={1} py={1} px={0.5}>
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
}: {
    suggestion: SuggestedTask;
    onOpenTask: (task: Requirement | CustomTask, view: TaskDialogView) => void;
    startDate: string;
    endDate: string;
}) {
    const { task } = suggestion;
    const { isCurrentUser, user, timeline } = use(TrainingPlanContext);
    const tasks = useMemo(() => [suggestion], [suggestion]);
    const [goalMinutes, timeWorked] = useTrainingPlanProgress({
        startDate,
        endDate,
        tasks,
        timeline,
    });

    const isComplete = timeWorked >= goalMinutes;

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
                onClick={() => onOpenTask(task, TaskDialogView.Details)}
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
                <Stack spacing={3} width={1}>
                    <Typography variant='body2' fontWeight='bold'>
                        {taskTitle({ task, cohort: user.dojoCohort, goalMinutes })}
                    </Typography>

                    <Stack direction='row' flexWrap='wrap' gap={1}>
                        <Chip
                            label={displayRequirementCategoryShort(task.category)}
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
