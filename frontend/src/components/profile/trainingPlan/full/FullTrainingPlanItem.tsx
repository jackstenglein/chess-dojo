import { useRequirements } from '@/api/cache/requirements';
import {
    CustomTask,
    Requirement,
    RequirementProgress,
    ScoreboardDisplay,
    formatTime,
    getCurrentCount,
    getTotalCount,
    getTotalTime,
    goalPeriod,
    goalPeriodLabel,
    isBlocked,
    isExpired,
    isPinnable,
} from '@/database/requirement';
import { ALL_COHORTS, User } from '@/database/user';
import ScoreboardProgress, { ProgressText } from '@/scoreboard/ScoreboardProgress';
import { CategoryColors } from '@/style/ThemeProvider';
import { useTranslatedRequirement } from '@/translation/useTranslatedRequirement';
import {
    AddCircle,
    DeleteOutlined,
    EditOutlined,
    Lock,
    PushPin,
    PushPinOutlined,
} from '@mui/icons-material';
import {
    Box,
    Checkbox,
    Chip,
    Divider,
    Grid,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useTimelineContext } from '../../activity/useTimeline';
import { TaskTimerIconButton } from '../daily/TaskTimerIconButton';
import { MINIMUM_TASKS } from '../suggestedTasks';
import { TaskDialog, TaskDialogView } from '../TaskDialog';

interface FullTrainingPlanItemProps {
    user: User;
    progress?: RequirementProgress;
    requirement: Requirement | CustomTask;
    cohort: string;
    isCurrentUser: boolean;
    onPinClick: (req: Requirement | CustomTask) => void;
    isPinned: boolean;
    /** If provided, renders a button to remove the task from the custom plan. */
    onRemove?: () => void;
    /** If provided, renders a button to edit the task. */
    onEdit?: () => void;
    /** The label of the remove button. Defaults to removing the task from the plan. */
    removeLabel?: string;
}

export const FullTrainingPlanItem = ({
    user,
    progress,
    requirement: rawRequirement,
    cohort,
    isCurrentUser,
    onPinClick,
    isPinned,
    onRemove,
    onEdit,
    removeLabel,
}: FullTrainingPlanItemProps) => {
    const requirement = useTranslatedRequirement(rawRequirement) ?? rawRequirement;
    const t = useTranslations('profile.trainingPlan.full');
    const tCommon = useTranslations('profile.trainingPlan.common');
    const tPlan = useTranslations('profile.trainingPlan.customPlan');
    const tTime = useTranslations('common');
    const [taskDialogView, setTaskDialogView] = useState<TaskDialogView>();
    const { requirements } = useRequirements(ALL_COHORTS, false);
    const { entries } = useTimelineContext();

    const blocker = useMemo(() => {
        return isBlocked(cohort, user, requirement, requirements, entries);
    }, [requirement, requirements, cohort, user, entries]);

    const totalCount = getTotalCount(cohort, requirement, true);
    const currentCount = getCurrentCount({ cohort, requirement, progress, timeline: entries });
    // A goal per day, week or month shows that period's minutes ("12m / 30m today").
    const period = goalPeriod(requirement);
    const time = formatTime(getTotalTime(cohort, progress), tTime);
    const expired = isExpired(requirement, progress);
    const isMinimumTask = MINIMUM_TASKS.has(requirement.id);
    const minimumReached = isMinimumTask && currentCount >= totalCount;

    let UpdateElement = null;

    switch (requirement.scoreboardDisplay) {
        case ScoreboardDisplay.Hidden:
        case ScoreboardDisplay.Checkbox:
            UpdateElement = (
                <Tooltip title={isCurrentUser ? tCommon('logTraining') : ''}>
                    <Checkbox
                        aria-label={t('checkboxAriaLabel', { name: requirement.name })}
                        checked={currentCount >= totalCount}
                        onClick={() => setTaskDialogView(TaskDialogView.Progress)}
                        disabled={!isCurrentUser}
                    />
                </Tooltip>
            );
            break;

        case ScoreboardDisplay.ProgressBar:
        case ScoreboardDisplay.Minutes:
        case ScoreboardDisplay.Unspecified:
        case ScoreboardDisplay.Yearly:
            UpdateElement =
                currentCount >= totalCount && !isMinimumTask ? (
                    <Tooltip title={isCurrentUser ? tCommon('logTraining') : ''}>
                        <Checkbox
                            checked
                            onClick={() => setTaskDialogView(TaskDialogView.Progress)}
                            disabled={!isCurrentUser}
                        />
                    </Tooltip>
                ) : !isCurrentUser ? null : (
                    <Tooltip title={tCommon('logTraining')}>
                        <IconButton
                            aria-label={t('updateAriaLabel', { name: requirement.name })}
                            onClick={() => setTaskDialogView(TaskDialogView.Progress)}
                            data-testid='update-task-button'
                        >
                            <AddCircle color='primary' />
                        </IconButton>
                    </Tooltip>
                );
            break;

        case ScoreboardDisplay.NonDojo:
            UpdateElement = !isCurrentUser ? null : (
                <Tooltip title={tCommon('logTraining')}>
                    <IconButton
                        aria-label={`Update ${requirement.name}`}
                        onClick={() => setTaskDialogView(TaskDialogView.Progress)}
                    >
                        <AddCircle color='primary' />
                    </IconButton>
                </Tooltip>
            );
            break;
    }

    let requirementName = requirement.name.replaceAll('{{count}}', `${totalCount}`);
    if (requirement.scoreboardDisplay === ScoreboardDisplay.Checkbox && totalCount > 1) {
        requirementName += ` (${totalCount})`;
    }

    if (blocker.isBlocked) {
        UpdateElement = <Lock sx={{ marginRight: 1, color: 'text.secondary' }} />;
    }

    return (
        <Tooltip title={blocker.reason} followCursor>
            <Stack
                spacing={2}
                data-testid={`${requirement.name.replaceAll(' ', '-')}-training-plan-entry`}
                sx={{
                    mt: 2,
                }}
            >
                <Grid
                    container
                    sx={{
                        columnGap: 1,
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        position: 'relative',
                    }}
                >
                    <Grid
                        size={{ xs: 'grow', md: 9 }}
                        // Clicking a task shows its details; only its log controls open logging.
                        onClick={() => setTaskDialogView(TaskDialogView.Details)}
                        id='task-details'
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            rowGap: '0.25rem',
                            cursor: 'pointer',
                            position: 'relative',
                            maxWidth: { sm: '75%' },
                        }}
                    >
                        {expired && (
                            <Tooltip title={t('renewTooltip')}>
                                <Chip
                                    variant='outlined'
                                    color='warning'
                                    label={t('renewLabel')}
                                    size='small'
                                    sx={{ alignSelf: 'start', mb: 0.5 }}
                                />
                            </Tooltip>
                        )}
                        {minimumReached && (
                            <Tooltip title={t('minimumReachedTooltip')}>
                                <Chip
                                    variant='outlined'
                                    color='success'
                                    label={t('minimumReachedLabel')}
                                    size='small'
                                    sx={{ alignSelf: 'start', mb: 0.5 }}
                                />
                            </Tooltip>
                        )}

                        <Stack
                            direction='row'
                            sx={{
                                flexWrap: 'wrap',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                columnGap: '1rem',
                            }}
                        >
                            <Typography
                                sx={{
                                    opacity: blocker.isBlocked ? 0.5 : 1,
                                    fontWeight: 600,
                                }}
                            >
                                {requirementName}
                            </Typography>

                            {displayProgress(requirement) && (
                                <Box
                                    data-testid={`${requirement.name.replaceAll(' ', '-')}-progress-text`}
                                    sx={{
                                        mr: 1,
                                    }}
                                >
                                    <ProgressText
                                        value={currentCount}
                                        max={totalCount}
                                        label={
                                            period
                                                ? `${formatTime(currentCount, tTime)} / ${formatTime(totalCount, tTime)} ${goalPeriodLabel(period)}`
                                                : undefined
                                        }
                                        min={requirement.startCount}
                                        suffix={isMinimumTask ? 'min.' : ''}
                                        isTime={
                                            requirement.scoreboardDisplay ===
                                            ScoreboardDisplay.Minutes
                                        }
                                    />
                                </Box>
                            )}
                        </Stack>
                        {displayProgress(requirement) && (
                            <Box sx={{ color: CategoryColors[requirement.category] }}>
                                <ScoreboardProgress
                                    color='inherit'
                                    value={currentCount}
                                    max={totalCount}
                                    min={requirement.startCount || 0}
                                    isTime={
                                        requirement.scoreboardDisplay === ScoreboardDisplay.Minutes
                                    }
                                    hideProgressText={true}
                                    sx={{
                                        height: '6px',
                                        borderRadius: 3,
                                        backgroundColor: 'action.hover',
                                        '& .MuiLinearProgress-bar': {
                                            borderRadius: 3,
                                            backgroundColor: 'currentColor',
                                        },
                                    }}
                                />
                            </Box>
                        )}
                    </Grid>
                    <Grid size='auto' id='task-status'>
                        <Stack
                            direction='row'
                            sx={{
                                alignItems: 'center',
                                justifyContent: 'end',
                            }}
                        >
                            {!blocker.isBlocked && (
                                <Typography
                                    noWrap
                                    variant='body2'
                                    sx={{
                                        color: 'text.secondary',
                                        textOverflow: 'unset',
                                        mr: 1,
                                        display: { xs: 'none', sm: 'initial' },
                                        fontVariantNumeric: 'tabular-nums',
                                    }}
                                >
                                    {time}
                                </Typography>
                            )}
                            {UpdateElement}

                            {isCurrentUser && isPinnable(requirement) && (
                                <Tooltip
                                    title={isPinned ? tCommon('editPin') : tCommon('pinToDaily')}
                                >
                                    <IconButton onClick={() => onPinClick(requirement)}>
                                        {isPinned ? (
                                            <PushPin color='dojoOrange' />
                                        ) : (
                                            <PushPinOutlined color='dojoOrange' />
                                        )}
                                    </IconButton>
                                </Tooltip>
                            )}

                            {isCurrentUser && (
                                <Box sx={{ display: { xs: 'none', sm: 'unset' } }}>
                                    <TaskTimerIconButton taskId={requirement.id} />
                                </Box>
                            )}

                            {onEdit && (
                                <Tooltip title={tPlan('editTask')}>
                                    <IconButton
                                        onClick={onEdit}
                                        aria-label={tPlan('editTask')}
                                        data-testid='edit-plan-task-button'
                                    >
                                        <EditOutlined sx={{ color: 'text.secondary' }} />
                                    </IconButton>
                                </Tooltip>
                            )}

                            {onRemove && (
                                <Tooltip title={removeLabel ?? tPlan('removeTask')}>
                                    <IconButton
                                        onClick={onRemove}
                                        aria-label={removeLabel ?? tPlan('removeTask')}
                                        data-testid='remove-task-from-plan-button'
                                    >
                                        <DeleteOutlined sx={{ color: 'text.secondary' }} />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Stack>
                    </Grid>
                </Grid>
                <Divider />

                {taskDialogView && (
                    <TaskDialog
                        open
                        onClose={() => setTaskDialogView(undefined)}
                        task={requirement}
                        initialView={taskDialogView}
                        progress={progress}
                        cohort={cohort}
                    />
                )}
            </Stack>
        </Tooltip>
    );
};

/**
 * Returns true if the task should display a progress bar.
 * @param task The task to check.
 */
export function displayProgress(task: Requirement | CustomTask): boolean {
    switch (task.scoreboardDisplay) {
        case ScoreboardDisplay.Unspecified:
        case ScoreboardDisplay.ProgressBar:
        case ScoreboardDisplay.Minutes:
        case ScoreboardDisplay.Yearly:
            return true;
    }
    return false;
}
