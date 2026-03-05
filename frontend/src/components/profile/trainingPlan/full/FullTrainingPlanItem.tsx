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
    isBlocked,
    isExpired,
    isPinnable,
} from '@/database/requirement';
import { ALL_COHORTS, User } from '@/database/user';
import ScoreboardProgress, { ProgressText } from '@/scoreboard/ScoreboardProgress';
import { AddCircle, Lock, PushPin, PushPinOutlined } from '@mui/icons-material';
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
import { useMemo, useState } from 'react';
import { useTimelineContext } from '../../activity/useTimeline';
import { TaskDialog, TaskDialogView } from '../TaskDialog';

interface FullTrainingPlanItemProps {
    user: User;
    progress?: RequirementProgress;
    requirement: Requirement | CustomTask;
    cohort: string;
    isCurrentUser: boolean;
    togglePin: (req: Requirement | CustomTask) => void;
    isPinned: boolean;
}

export const FullTrainingPlanItem = ({
    user,
    progress,
    requirement,
    cohort,
    isCurrentUser,
    togglePin,
    isPinned,
}: FullTrainingPlanItemProps) => {
    const [taskDialogView, setTaskDialogView] = useState<TaskDialogView>();
    const { requirements } = useRequirements(ALL_COHORTS, false);
    const { entries } = useTimelineContext();

    const blocker = useMemo(() => {
        return isBlocked(cohort, user, requirement, requirements, entries);
    }, [requirement, requirements, cohort, user, entries]);

    const totalCount = getTotalCount(cohort, requirement, true);
    const currentCount = getCurrentCount({ cohort, requirement, progress, timeline: entries });
    const time = formatTime(getTotalTime(cohort, progress));
    const expired = isExpired(requirement, progress);

    let UpdateElement = null;

    switch (requirement.scoreboardDisplay) {
        case ScoreboardDisplay.Hidden:
        case ScoreboardDisplay.Checkbox:
            UpdateElement = (
                <Tooltip title='Update Progress'>
                    <Checkbox
                        aria-label={`Checkbox ${requirement.name}`}
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
                currentCount >= totalCount ? (
                    <Tooltip title='Update Progress'>
                        <Checkbox
                            checked
                            onClick={() => setTaskDialogView(TaskDialogView.Progress)}
                            disabled={!isCurrentUser}
                        />
                    </Tooltip>
                ) : !isCurrentUser ? null : (
                    <Tooltip title='Update Progress'>
                        <IconButton
                            aria-label={`Update ${requirement.name}`}
                            onClick={() => setTaskDialogView(TaskDialogView.Progress)}
                            data-testid='update-task-button'
                        >
                            <AddCircle color='primary' />
                        </IconButton>
                    </Tooltip>
                );
            break;

        case ScoreboardDisplay.NonDojo:
            UpdateElement = (
                <Tooltip title='Update Progress'>
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
            <Stack spacing={2} mt={2}>
                <Grid
                    container
                    columnGap={0.5}
                    alignItems='center'
                    justifyContent='space-between'
                    position='relative'
                >
                    <Grid
                        size={9}
                        onClick={() => setTaskDialogView(TaskDialogView.Details)}
                        sx={{ cursor: 'pointer', position: 'relative' }}
                        id='task-details'
                        display='flex'
                        flexDirection='column'
                        rowGap='0.25rem'
                    >
                        {expired && (
                            <Tooltip title="It's time for you to renew this task!">
                                <Chip
                                    variant='outlined'
                                    color='warning'
                                    label='Renew'
                                    size='small'
                                    sx={{ alignSelf: 'start', mb: 0.5 }}
                                />
                            </Tooltip>
                        )}

                        <Stack
                            direction='row'
                            flexWrap='wrap'
                            justifyContent='space-between'
                            alignItems='center'
                            columnGap='1rem'
                        >
                            <Typography
                                sx={{
                                    opacity: blocker.isBlocked ? 0.5 : 1,
                                    fontWeight: 'bold',
                                }}
                            >
                                {requirementName}
                            </Typography>

                            {displayProgress(requirement) && (
                                <Box
                                    mr={1}
                                    data-testid={`${requirement.name.replaceAll(' ', '-')}-progress-text`}
                                >
                                    <ProgressText
                                        value={currentCount}
                                        max={totalCount}
                                        min={requirement.startCount}
                                        isTime={
                                            requirement.scoreboardDisplay ===
                                            ScoreboardDisplay.Minutes
                                        }
                                    />
                                </Box>
                            )}
                        </Stack>
                        {displayProgress(requirement) && (
                            <ScoreboardProgress
                                value={currentCount}
                                max={totalCount}
                                min={requirement.startCount || 0}
                                isTime={requirement.scoreboardDisplay === ScoreboardDisplay.Minutes}
                                hideProgressText={true}
                                sx={{ height: '6px' }}
                            />
                        )}
                    </Grid>
                    <Grid size={{ xs: 2, sm: 'auto' }} id='task-status'>
                        <Stack direction='row' alignItems='center' justifyContent='end'>
                            {!blocker.isBlocked && (
                                <Typography
                                    color='text.secondary'
                                    sx={{
                                        display: { xs: 'none', sm: 'initial' },
                                        fontWeight: 'bold',
                                    }}
                                    noWrap
                                    textOverflow='unset'
                                    mr={1}
                                >
                                    {time}
                                </Typography>
                            )}
                            {UpdateElement}

                            {isCurrentUser && isPinnable(requirement) && (
                                <Tooltip
                                    title={
                                        isPinned ? 'Unpin from Daily Tasks' : 'Pin to Daily Tasks'
                                    }
                                >
                                    <IconButton onClick={() => togglePin(requirement)}>
                                        {isPinned ? (
                                            <PushPin color='dojoOrange' />
                                        ) : (
                                            <PushPinOutlined color='dojoOrange' />
                                        )}
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
