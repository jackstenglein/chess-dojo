import { useRequirements } from '@/api/cache/requirements';
import { useAuth, useFreeTier } from '@/auth/Auth';
import { formatTime } from '@/board/pgn/boardTools/underboard/clock/ClockUsage';
import { useTimelineContext } from '@/components/profile/activity/useTimeline';
import DeleteCustomTaskModal from '@/components/profile/trainingPlan/DeleteCustomTaskModal';
import Position from '@/components/profile/trainingPlan/Position';
import ProgressHistory from '@/components/profile/trainingPlan/ProgressHistory';
import { ProgressUpdater } from '@/components/profile/trainingPlan/ProgressUpdater';
import { TimerContext } from '@/components/timer/TimerContext';
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
import { useTranslatedRequirement } from '@/translation/useTranslatedRequirement';
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
import { useTranslations } from 'next-intl';
import { use, useMemo, useState } from 'react';
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

export function TaskDialog({ open, initialView, task: rawTask, ...props }: TaskDialogProps) {
    const [view, setView] = useState(initialView);
    const task = useTranslatedRequirement(rawTask) ?? rawTask;
    return (
        <Dialog
            open={open}
            onClose={props.onClose}
            maxWidth={view === TaskDialogView.Details ? 'lg' : 'md'}
            fullWidth
        >
            {view === TaskDialogView.Details && (
                <DetailsDialog {...props} task={task} setView={setView} />
            )}
            {(view === TaskDialogView.Progress || view === TaskDialogView.History) && (
                <ProgressDialog {...props} task={task} view={view} setView={setView} />
            )}
        </Dialog>
    );
}

type ProgressDialogProps = Omit<TaskDialogProps, 'open' | 'initialView'> & {
    view: TaskDialogView;
    setView: (v: TaskDialogView) => void;
};

function ProgressDialog({ onClose, task, progress, cohort, view, setView }: ProgressDialogProps) {
    const t = useTranslations('profile.trainingPlan.taskDialog');
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
        dialogTitle = t('historyTitle', { name: requirementName });
    } else if (isNonDojo) {
        dialogTitle = t('addTimeTitle', { name: requirementName });
    } else {
        dialogTitle = t('updateTitle', { name: requirementName });
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
    const t = useTranslations('profile.trainingPlan.taskDialog');
    const tCommon = useTranslations('profile.trainingPlan.common');
    const tCategory = useTranslations('enums.requirementCategory');
    const { user } = useAuth();
    const { entries: timeline } = useTimelineContext();
    const [showEditor, setShowEditor] = useState(false);
    const [showDeleter, setShowDeleter] = useState(false);
    const isFreeTier = useFreeTier();
    const {
        isRunning: timerRunning,
        timerSeconds,
        onStart: onStartTimer,
        onPause: onPauseTimer,
        task: timerTask,
        getLabel: getTimerLabel,
    } = use(TimerContext);
    const timerIsOtherTask = timerTask && timerTask.id !== task.id;

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
                    reason: t('taskLockedUntil', {
                        category: blocker.category,
                        name: blocker.name,
                    }),
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
                            <Typography
                                variant='h5'
                                sx={{
                                    color: 'text.secondary',
                                }}
                            >
                                {tCategory.has(task.category)
                                    ? tCategory(task.category)
                                    : task.category}
                            </Typography>
                        </Stack>
                    </ModalTitle>

                    <Stack
                        direction='row'
                        sx={{
                            gap: 2,
                            alignItems: 'center',
                        }}
                    >
                        {blocker.isBlocked ? (
                            <Tooltip title={blocker.reason}>
                                <Chip icon={<Lock />} label={t('locked')} color='error' />
                            </Tooltip>
                        ) : (
                            isCompleted && (
                                <Chip icon={<Check />} label={t('completed')} color='success' />
                            )
                        )}

                        {!isRequirement(task) && task.owner === user?.username && (
                            <>
                                <Button variant='contained' onClick={() => setShowEditor(true)}>
                                    {t('editTask')}
                                </Button>
                                <Button
                                    variant='contained'
                                    color='error'
                                    onClick={() => setShowDeleter(true)}
                                >
                                    {t('deleteTask')}
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
                        <Stack
                            direction='row'
                            spacing={2}
                            sx={{
                                flexWrap: 'wrap',
                                rowGap: 1,
                            }}
                        >
                            <DojoPointChip requirement={task} cohort={selectedCohort} />
                            <ExpirationChip requirement={task} progress={progress} />
                            <RepeatChip requirement={task} />
                            {task.blockers && <BlockerChips requirement={task} />}
                        </Stack>
                    )}

                    <TaskDescription>
                        {description.replaceAll('{{count}}', `${totalCount}`)}
                    </TaskDescription>

                    {isRequirement(task) && task.positions && (
                        <Grid
                            container
                            sx={{
                                gap: 2,
                            }}
                        >
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
                                    style={{ width: '100%', height: '100%', border: 0 }}
                                />
                            </Box>
                        ))}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ flexWrap: 'wrap' }}>
                <Box sx={{ flexGrow: 1 }}>
                    {timerRunning ? (
                        <Button
                            color='warning'
                            startIcon={<Pause />}
                            onClick={() => {
                                onPauseTimer();
                                setView(TaskDialogView.Progress);
                            }}
                        >
                            {t('pauseTimer', { time: formatTime(timerSeconds) })}
                        </Button>
                    ) : (
                        <Button
                            color={timerIsOtherTask ? 'error' : 'warning'}
                            startIcon={<PlayArrow />}
                            onClick={() => onStartTimer(task.id)}
                        >
                            {getTimerLabel(task.id)}
                        </Button>
                    )}
                </Box>

                <Button onClick={onClose}>{tCommon('cancel')}</Button>
                <Button onClick={() => setView(TaskDialogView.Progress)}>
                    {tCommon('updateProgress')}
                </Button>
                <Button onClick={() => setView(TaskDialogView.History)}>
                    {tCommon('showHistory')}
                </Button>
            </DialogActions>
        </>
    );
}

function dojoPointDescription(
    requirement: Requirement,
    cohort: string,
    t: ReturnType<typeof useTranslations<'profile.trainingPlan.taskDialog'>>,
) {
    if (requirement.totalScore) {
        return t('dojoPointsTotal', { score: requirement.totalScore });
    }

    const unitScore = Math.round(100 * getUnitScore(cohort, requirement)) / 100;

    if (unitScore === 0) {
        return t('dojoPointsNone');
    }

    if (getTotalCount(cohort, requirement) === 1) {
        return t('dojoPointsTotal', { score: unitScore });
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

    return t('dojoPointsPerUnit', { score: unitScore, unit });
}

function DojoPointChip({ requirement, cohort }: { requirement: Requirement; cohort: string }) {
    const t = useTranslations('profile.trainingPlan.taskDialog');
    if (!isRequirement(requirement)) {
        return null;
    }

    const description = dojoPointDescription(requirement, cohort, t);
    let unitScore = getUnitScore(cohort, requirement);
    if (requirement.scoreboardDisplay === ScoreboardDisplay.Minutes) {
        unitScore *= 60;
    }

    const score = requirement.totalScore
        ? requirement.totalScore
        : Math.round(100 * unitScore) / 100;

    return (
        <Tooltip title={description}>
            <Chip color='secondary' icon={<Scoreboard />} label={t('pointsLabel', { score })} />
        </Tooltip>
    );
}

function ExpirationChip({
    requirement,
    progress,
}: {
    requirement: Requirement;
    progress?: RequirementProgress;
}) {
    const t = useTranslations('profile.trainingPlan.taskDialog');
    if (!isRequirement(requirement)) {
        return null;
    }

    if (requirement.scoreboardDisplay === ScoreboardDisplay.Yearly) {
        return (
            <Tooltip title={t('expirationYearly')}>
                <Chip color='secondary' icon={<AccessAlarm />} label={t('oneYear')} />
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
    const isYears = expirationYears >= 1;

    let formattedDate: string | undefined;
    if (progress?.updatedAt) {
        const expirationDate = new Date(progress.updatedAt);
        expirationDate.setDate(expirationDate.getDate() + requirement.expirationDays);
        formattedDate = expirationDate.toLocaleDateString();
    }

    const title = formattedDate
        ? isYears
            ? t('expirationYearsWithDate', { value, date: formattedDate })
            : t('expirationMonthsWithDate', { value, date: formattedDate })
        : isYears
          ? t('expirationYears', { value })
          : t('expirationMonths', { value });

    const chipLabel = formattedDate
        ? isYears
            ? t('expirationYearsLabelWithDate', { value, date: formattedDate })
            : t('expirationMonthsLabelWithDate', { value, date: formattedDate })
        : isYears
          ? t('expirationYearsLabel', { value })
          : t('expirationMonthsLabel', { value });

    return (
        <Tooltip title={title}>
            <Chip color='secondary' icon={<AccessAlarm />} label={chipLabel} />
        </Tooltip>
    );
}

const RepeatChip = ({ requirement }: { requirement: Requirement }) => {
    const t = useTranslations('profile.trainingPlan.taskDialog');
    let title = '';
    let label = '';

    if (requirement.scoreboardDisplay === ScoreboardDisplay.Yearly) {
        title = t('repeatYearly');
        label = t('progressCarriesOver');
    } else if (requirement.numberOfCohorts === -1) {
        title = t('repeatResets');
        label = t('progressResets');
    } else if (requirement.numberOfCohorts === 1 || requirement.numberOfCohorts === 0) {
        title = t('repeatCarriesOver');
        label = t('progressCarriesOver');
    } else {
        title = t('repeatNCohorts', { count: requirement.numberOfCohorts });
        label = t('nCohorts', { count: requirement.numberOfCohorts });
    }

    return (
        <Tooltip title={title}>
            <Chip color='secondary' icon={<Loop />} label={label} />
        </Tooltip>
    );
};

const BlockerChips = ({ requirement }: { requirement: Requirement }) => {
    const t = useTranslations('profile.trainingPlan.taskDialog');
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
                        title={t('blockerTooltip', {
                            category: blocker.category,
                            name: blocker.name,
                        })}
                    >
                        <Chip color='secondary' icon={<Lock />} label={blocker.name} />
                    </Tooltip>
                );
            })}
        </>
    );
};
