import { useRequirements } from '@/api/cache/requirements';
import { useAuth, useFreeTier } from '@/auth/Auth';
import { formatTime } from '@/board/pgn/boardTools/underboard/clock/ClockUsage';
import { useTimer } from '@/components/navigation/navbar/TimerButton';
import { TimelineProvider, useTimelineContext } from '@/components/profile/activity/useTimeline';
import DeleteCustomTaskModal from '@/components/profile/trainingPlan/DeleteCustomTaskModal';
import Position from '@/components/profile/trainingPlan/Position';
import ProgressHistory from '@/components/profile/trainingPlan/ProgressHistory';
import ProgressUpdater from '@/components/profile/trainingPlan/ProgressUpdater';
import ModalTitle from '@/components/ui/ModalTitle';
import {
    CustomTask,
    getTotalCount,
    getUnitScore,
    isComplete,
    isRequirement,
    Requirement,
    RequirementProgress,
    ScoreboardDisplay,
} from '@/database/requirement';
import { ALL_COHORTS, compareCohorts, dojoCohorts } from '@/database/user';
import { AccessAlarm, Check, Lock, Loop, Pause, PlayArrow, Scoreboard } from '@mui/icons-material';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import CustomTaskEditor from './CustomTaskEditor';
import { TaskDescription } from './TaskDescription';

export enum TaskDialogView {
    Details = 'DETAILS',
    Progress = 'PROGRESS',
    History = 'HISTORY',
}

interface TaskDialogProps {
    open: boolean;
    onClose: () => void;
    task: Requirement | CustomTask;
    initialView: TaskDialogView;
    progress: RequirementProgress | undefined;
    cohort: string;
}

export function TaskDialog({ open, initialView, ...props }: TaskDialogProps) {
    const [view, setView] = useState(initialView);
    const { user } = useAuth();
    return (
        <TimelineProvider owner={user?.username || ''}>
            <Dialog
                open={open}
                onClose={props.onClose}
                maxWidth={view === TaskDialogView.Details ? 'lg' : 'md'}
                fullWidth
            >
                {view === TaskDialogView.Details && <DetailsDialog {...props} setView={setView} />}
                {(view === TaskDialogView.Progress || view === TaskDialogView.History) && (
                    <ProgressDialog {...props} view={view} setView={setView} />
                )}
            </Dialog>
        </TimelineProvider>
    );
}

type ProgressDialogProps = Omit<TaskDialogProps, 'open' | 'initialView'> & {
    view: TaskDialogView;
    setView: (v: TaskDialogView) => void;
};

function ProgressDialog({ onClose, task, progress, cohort, view, setView }: ProgressDialogProps) {
    const { user } = useAuth();

    const cohortOptions = task.counts[ALL_COHORTS]
        ? dojoCohorts
        : Object.keys(task.counts).sort(compareCohorts);

    let selectedCohort = cohortOptions[0];
    if (cohort && cohortOptions.includes(cohort)) {
        selectedCohort = cohort;
    } else if (user?.dojoCohort && cohortOptions.includes(user.dojoCohort)) {
        selectedCohort = user.dojoCohort;
    }

    const totalCount = task.counts[selectedCohort] || 0;
    const isNonDojo = task.scoreboardDisplay === ScoreboardDisplay.NonDojo;

    let requirementName = task.name.replaceAll('{{count}}', `${totalCount}`);
    if (task.scoreboardDisplay === ScoreboardDisplay.Checkbox && totalCount > 1) {
        requirementName += ` (${totalCount})`;
    }

    let dialogTitle = '';
    if (view === TaskDialogView.History) {
        dialogTitle = `${requirementName} History`;
    } else if (isNonDojo) {
        dialogTitle = `Add time to ${requirementName}?`;
    } else {
        dialogTitle = `Update ${requirementName}?`;
    }

    return (
        <>
            <DialogTitle>{dialogTitle}</DialogTitle>

            {view === TaskDialogView.History && (
                <ProgressHistory requirement={task} onClose={onClose} setView={setView} />
            )}
            {view === TaskDialogView.Progress && (
                <ProgressUpdater
                    requirement={task}
                    progress={progress}
                    cohort={selectedCohort}
                    onClose={onClose}
                    setView={setView}
                />
            )}
        </>
    );
}

type DetailsDialogProps = Pick<TaskDialogProps, 'task' | 'onClose' | 'cohort'> & {
    setView: (view: TaskDialogView) => void;
};

function DetailsDialog({ task, onClose, cohort, setView }: DetailsDialogProps) {
    const { user } = useAuth();
    const { entries: timeline } = useTimelineContext();
    const [showEditor, setShowEditor] = useState(false);
    const [showDeleter, setShowDeleter] = useState(false);
    const isFreeTier = useFreeTier();

    const { isRunning, timerSeconds, onStart, onPause } = useTimer();

    const selectedCohort = useMemo(() => {
        if (!task) {
            return cohort || user?.dojoCohort;
        }

        const cohortOptions = task.counts[ALL_COHORTS] ? dojoCohorts : Object.keys(task.counts);

        if (cohort && cohortOptions.includes(cohort)) {
            return cohort;
        }
        if (user?.dojoCohort && cohortOptions.includes(user.dojoCohort)) {
            return user.dojoCohort;
        }

        return cohortOptions.sort(compareCohorts)[0];
    }, [task, user?.dojoCohort, cohort]);

    const { requirements } = useRequirements(ALL_COHORTS, false);

    const blocker = useMemo(() => {
        if (!isRequirement(task)) {
            return { isBlocked: false };
        }

        if (!task.blockers || task.blockers.length === 0) {
            return { isBlocked: false };
        }

        const requirementMap = requirements.reduce<Record<string, Requirement>>((acc, r) => {
            acc[r.id] = r;
            return acc;
        }, {});
        for (const blockerId of task.blockers) {
            const blocker = requirementMap[blockerId];
            if (
                blocker &&
                selectedCohort &&
                !isComplete(selectedCohort, blocker, user?.progress[blockerId], timeline, false)
            ) {
                return {
                    isBlocked: true,
                    reason: `This task is locked until you complete ${blocker.category} - ${blocker.name}.`,
                };
            }
        }
        return { isBlocked: false };
    }, [task, requirements, selectedCohort, user, timeline]);

    if (!selectedCohort) {
        return null;
    }

    const progress = user?.progress[task.id];

    const totalCount = task.counts[selectedCohort] || task.counts[ALL_COHORTS];
    const currentCount = progress?.counts?.[selectedCohort] || progress?.counts?.[ALL_COHORTS] || 0;
    const isCompleted = currentCount >= totalCount;

    let requirementName = task.name.replaceAll('{{count}}', `${totalCount}`);
    if (task.scoreboardDisplay === ScoreboardDisplay.Checkbox && totalCount > 1) {
        requirementName += ` (${totalCount})`;
    }

    let description =
        isRequirement(task) && isFreeTier
            ? task.freeDescription || task.description
            : task.description;
    description = description.replaceAll('{{count}}', `${totalCount}`);

    return (
        <>
            <DialogContent>
                <Stack spacing={3}>
                    <ModalTitle onClose={onClose}>
                        <Stack>
                            <Typography variant='h4'>{requirementName}</Typography>
                            <Typography variant='h5' color='text.secondary'>
                                {task.category}
                            </Typography>
                        </Stack>
                    </ModalTitle>

                    <Stack direction='row' gap={2} alignItems='center'>
                        {blocker.isBlocked ? (
                            <Tooltip title={blocker.reason}>
                                <Chip icon={<Lock />} label='Locked' color='error' />
                            </Tooltip>
                        ) : (
                            isCompleted && (
                                <Chip icon={<Check />} label='Completed' color='success' />
                            )
                        )}

                        {!isRequirement(task) && task.owner === user?.username && (
                            <>
                                <Button variant='contained' onClick={() => setShowEditor(true)}>
                                    Edit Task
                                </Button>
                                <Button
                                    variant='contained'
                                    color='error'
                                    onClick={() => setShowDeleter(true)}
                                >
                                    Delete Task
                                </Button>

                                <CustomTaskEditor
                                    open={showEditor}
                                    onClose={() => setShowEditor(false)}
                                    task={task}
                                    initialCategory={task.category}
                                />

                                <DeleteCustomTaskModal
                                    task={task}
                                    open={showDeleter}
                                    onCancel={() => setShowDeleter(false)}
                                    onDelete={onClose}
                                />
                            </>
                        )}
                    </Stack>

                    {isRequirement(task) && (
                        <Stack direction='row' spacing={2} flexWrap='wrap' rowGap={1}>
                            <DojoPointChip requirement={task} cohort={selectedCohort} />
                            <ExpirationChip requirement={task} />
                            <RepeatChip requirement={task} />
                            {task.blockers && <BlockerChips requirement={task} />}
                        </Stack>
                    )}

                    <TaskDescription>
                        {description.replaceAll('{{count}}', `${totalCount}`)}
                    </TaskDescription>

                    {isRequirement(task) && task.positions && (
                        <Grid container gap={2}>
                            {task.positions.map((p) => (
                                <Grid key={p.fen} size='auto'>
                                    <Position position={p} />
                                </Grid>
                            ))}
                        </Grid>
                    )}

                    {isRequirement(task) &&
                        task.videoUrls?.map((url, idx) => (
                            <Box sx={{ mt: 3, width: 1, aspectRatio: '1.77' }} key={url}>
                                <iframe
                                    src={url}
                                    title={`${task.name} Video ${idx + 1}`}
                                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share'
                                    allowFullScreen={true}
                                    style={{ width: '100%', height: '100%' }}
                                    frameBorder={0}
                                />
                            </Box>
                        ))}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ flexWrap: 'wrap' }}>
                <Box sx={{ mr: 'auto' }}>
                    {isRunning ? (
                        <Button
                            variant='contained'
                            color='error'
                            startIcon={<Pause />}
                            onClick={() => {
                                onPause();
                                setView(TaskDialogView.Progress);
                            }}
                        >
                            Pause Timer ({formatTime(timerSeconds)})
                        </Button>
                    ) : (
                        <Button
                            variant='contained'
                            color='secondary'
                            startIcon={<PlayArrow />}
                            onClick={() => onStart(task)}
                        >
                            Start Timer
                        </Button>
                    )}
                </Box>

                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={() => setView(TaskDialogView.Progress)}>Update Progress</Button>
                <Button onClick={() => setView(TaskDialogView.History)}>Show History</Button>
            </DialogActions>
        </>
    );
}

function dojoPointDescription(requirement: Requirement, cohort: string) {
    if (requirement.totalScore) {
        return `This task awards ${requirement.totalScore} Dojo Point
                ${requirement.totalScore !== 1 ? 's' : ''} upon completion.`;
    }

    const unitScore = Math.round(100 * getUnitScore(cohort, requirement)) / 100;

    if (unitScore === 0) {
        return 'This task awards no Dojo Points.';
    }

    if (getTotalCount(cohort, requirement) === 1) {
        return `This task awards ${unitScore} Dojo Point${unitScore !== 1 ? 's' : ''} upon
                completion.`;
    }

    let unit = 'unit';
    if (requirement.progressBarSuffix === '%') {
        unit = 'percentage';
    } else if (requirement.progressBarSuffix) {
        unit = requirement.progressBarSuffix.toLowerCase();
        if (unit.endsWith('s')) {
            unit = unit.substring(0, unit.length - 1);
        }
    }

    return `This task awards ${unitScore} Dojo Point${
        unitScore !== 1 ? 's' : ''
    } per ${unit} completed.`;
}

function DojoPointChip({ requirement, cohort }: { requirement: Requirement; cohort: string }) {
    if (!isRequirement(requirement)) {
        return null;
    }

    const description = dojoPointDescription(requirement, cohort);
    let unitScore = getUnitScore(cohort, requirement);
    if (requirement.scoreboardDisplay === ScoreboardDisplay.Minutes) {
        unitScore *= 60;
    }

    const score = requirement.totalScore
        ? requirement.totalScore
        : Math.round(100 * unitScore) / 100;

    return (
        <Tooltip title={description}>
            <Chip
                color='secondary'
                icon={<Scoreboard />}
                label={`${score} point${score !== 1 ? 's' : ''}`}
            />
        </Tooltip>
    );
}

function ExpirationChip({ requirement }: { requirement: Requirement }) {
    if (!isRequirement(requirement)) {
        return null;
    }

    if (requirement.scoreboardDisplay === ScoreboardDisplay.Yearly) {
        return (
            <Tooltip title='Activity logged on this task expires after 1 year'>
                <Chip color='secondary' icon={<AccessAlarm />} label='1 year' />
            </Tooltip>
        );
    }

    if (requirement.expirationDays < 0) {
        return null;
    }

    const expirationYears = requirement.expirationDays / 365;
    if (!expirationYears) {
        return null;
    }

    const value = expirationYears >= 1 ? expirationYears : Math.round(expirationYears * 12);

    const title = `Progress on this task expires after ${value} ${
        expirationYears >= 1 ? 'year' : 'month'
    }${value !== 1 ? 's' : ''}.`;

    return (
        <Tooltip title={title}>
            <Chip
                color='secondary'
                icon={<AccessAlarm />}
                label={`${value} ${expirationYears >= 1 ? 'year' : 'month'}${
                    value !== 1 ? 's' : ''
                }`}
            />
        </Tooltip>
    );
}

const RepeatChip: React.FC<{ requirement: Requirement }> = ({ requirement }) => {
    let title = '';
    let label = '';

    if (requirement.scoreboardDisplay === ScoreboardDisplay.Yearly) {
        title = 'Progress on this task carries over to other cohorts';
        label = 'Progress Carries Over';
    } else if (requirement.numberOfCohorts === -1) {
        title = 'Progress on this task resets across each cohort';
        label = 'Progress Resets';
    } else if (requirement.numberOfCohorts === 1 || requirement.numberOfCohorts === 0) {
        title = 'Progress on this task carries over to other cohorts';
        label = 'Progress Carries Over';
    } else {
        title = `This task must be completed in ${requirement.numberOfCohorts} cohorts`;
        label = `${requirement.numberOfCohorts} Cohorts`;
    }

    return (
        <Tooltip title={title}>
            <Chip color='secondary' icon={<Loop />} label={label} />
        </Tooltip>
    );
};

const BlockerChips: React.FC<{ requirement: Requirement }> = ({ requirement }) => {
    const { requirements } = useRequirements(ALL_COHORTS, false);
    const requirementMap = useMemo(() => {
        return requirements.reduce<Record<string, Requirement>>((acc, r) => {
            acc[r.id] = r;
            return acc;
        }, {});
    }, [requirements]);

    if (!requirement.blockers || requirement.blockers.length === 0) {
        return null;
    }

    return (
        <>
            {requirement.blockers.map((id) => {
                const blocker = requirementMap[id];
                if (!blocker) {
                    return null;
                }

                return (
                    <Tooltip
                        key={id}
                        title={`You must complete ${blocker.category} - ${blocker.name} to update this task`}
                    >
                        <Chip color='secondary' icon={<Lock />} label={blocker.name} />
                    </Tooltip>
                );
            })}
        </>
    );
};
