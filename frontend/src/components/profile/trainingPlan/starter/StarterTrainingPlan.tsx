'use client';

import { useApi } from '@/api/Api';
import { listPuzzleRushSessions } from '@/api/puzzleApi';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { useTimelineContext } from '@/components/profile/activity/useTimeline';
import { Requirement } from '@/database/requirement';
import LoadingPage from '@/loading/LoadingPage';
import { useTranslatedRequirement } from '@/translation/useTranslatedRequirement';
import { Check, EmojiEvents, Lock, RadioButtonUnchecked } from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    LinearProgress,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import { use, useEffect, useMemo, useState } from 'react';
import { dailyCardSx, dailyPrimaryButtonSx } from '../daily/DailyCard';
import { TaskDialog, TaskDialogView } from '../TaskDialog';
import { TrainingPlanContext } from '../TrainingPlanTab';
import {
    getStarterCredits,
    getStarterSteps,
    StarterStep,
    StarterStepId,
    StarterStepTask,
} from './starterPlan';
import {
    Tutorials,
    withoutStarterTask,
    withStarterPlanFinished,
    withStarterTask,
    withStarterTaskCredited,
} from './starterProgress';

/** The minutes suggested for a task that has no expected time. */
const DEFAULT_TASK_MINUTES = 30;

/**
 * Returns whether the current user has finished a Dojo Rush run, or undefined
 * while that is still loading. A failed request counts as no run, so the step
 * stays open rather than blocking the plan.
 */
function useHasDojoRushRun(): boolean | undefined {
    const [hasRun, setHasRun] = useState<boolean>();
    useEffect(() => {
        let cancelled = false;
        listPuzzleRushSessions()
            .then((response) => {
                if (!cancelled) {
                    setHasRun(response.data.sessions.length > 0);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setHasRun(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, []);
    return hasRun;
}

/**
 * The plan new members follow before the full training plan. Tasks marked done here
 * are kept apart from the member's real progress; when they finish (or skip) the
 * starter plan, those tasks are credited to the full training plan, which unlocks.
 */
export function StarterTrainingPlan() {
    const t = useTranslations('profile.trainingPlan.starter');
    const api = useApi();
    const { updateUser } = useAuth();
    const { onNewEntry } = useTimelineContext();
    const { user, requirements, timeline, isLoading } = use(TrainingPlanContext);
    const hasDojoRushRun = useHasDojoRushRun();
    const request = useRequest();

    const [detailsTask, setDetailsTask] = useState<Requirement>();
    const [markDoneTask, setMarkDoneTask] = useState<Requirement>();

    const steps = useMemo(
        () =>
            getStarterSteps({
                user,
                requirements,
                timeline,
                hasDojoRushRun: !!hasDojoRushRun,
            }),
        [user, requirements, timeline, hasDojoRushRun],
    );

    if (isLoading || hasDojoRushRun === undefined) {
        return <LoadingPage />;
    }

    const doneCount = steps.filter((s) => s.complete).length;
    const allDone = doneCount === steps.length;

    const saveTutorials = async (tutorials: Tutorials) => {
        updateUser({ tutorials });
        await api.updateUser({ tutorials });
    };

    const onMarkDone = (task: Requirement, minutes: number) => {
        request.onStart();
        saveTutorials(withStarterTask(user.tutorials, task.id, minutes, new Date()))
            .then(() => {
                request.onSuccess();
                setMarkDoneTask(undefined);
            })
            .catch((err: unknown) => request.onFailure(err));
    };

    const onUndo = (task: Requirement) => {
        request.onStart();
        saveTutorials(withoutStarterTask(user.tutorials, task.id))
            .then(() => request.onSuccess())
            .catch((err: unknown) => request.onFailure(err));
    };

    /**
     * Credits every starter task to the member's real progress, then marks the starter
     * plan finished. Each credited task is remembered, so a retry after a failure never
     * credits a task twice.
     */
    const onFinish = async () => {
        request.onStart();
        let tutorials = user.tutorials ?? {};
        try {
            for (const credit of getStarterCredits(user, steps, timeline)) {
                const resp = await api.updateUserProgress({
                    cohort: user.dojoCohort,
                    requirementId: credit.task.id,
                    previousCount: credit.previousCount,
                    newCount: credit.newCount,
                    incrementalMinutesSpent: credit.minutes,
                    date: DateTime.fromISO(credit.date),
                    notes: '',
                });
                onNewEntry(resp.data.timelineEntry);
                tutorials = withStarterTaskCredited(tutorials, credit.task.id);
            }
            await saveTutorials(withStarterPlanFinished(tutorials));
            request.onSuccess();
        } catch (err) {
            request.onFailure(err);
            await saveTutorials(tutorials).catch(() => undefined);
        }
    };

    return (
        <Stack spacing={2} sx={{ width: 1 }} data-testid='starter-training-plan'>
            <RequestSnackbar request={request} />

            {detailsTask && (
                <TaskDialog
                    open
                    onClose={() => setDetailsTask(undefined)}
                    task={detailsTask}
                    initialView={TaskDialogView.Details}
                    progress={user.progress[detailsTask.id]}
                    cohort={user.dojoCohort}
                />
            )}

            {markDoneTask && (
                <MarkDoneDialog
                    task={markDoneTask}
                    loading={request.isLoading()}
                    onSave={(minutes) => onMarkDone(markDoneTask, minutes)}
                    onClose={() => setMarkDoneTask(undefined)}
                />
            )}

            <Stack spacing={0.5}>
                <Typography variant='h5' sx={{ fontWeight: 'bold' }}>
                    {t('title')}
                </Typography>
                <Typography color='text.secondary'>{t('subtitle')}</Typography>
            </Stack>

            <Stack spacing={0.75} sx={{ maxWidth: 520 }}>
                <Typography variant='body2' sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    {t('progress', { done: doneCount, total: steps.length })}
                </Typography>
                <LinearProgress
                    variant='determinate'
                    value={(100 * doneCount) / steps.length}
                    color={allDone ? 'success' : 'primary'}
                    sx={{ height: 8, borderRadius: 4, backgroundColor: 'action.hover' }}
                />
            </Stack>

            {allDone && (
                <Card variant='outlined' sx={dailyCardSx(true)} data-testid='starter-plan-done'>
                    <CardContent>
                        <Stack spacing={1.5} sx={{ alignItems: 'start' }}>
                            <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
                                <EmojiEvents color='success' />
                                <Typography variant='h6' sx={{ fontWeight: 700 }}>
                                    {t('complete.title')}
                                </Typography>
                            </Stack>
                            <Typography color='text.secondary'>
                                {t('complete.description')}
                            </Typography>
                            <Button
                                variant='contained'
                                color='success'
                                disableElevation
                                loading={request.isLoading()}
                                onClick={() => void onFinish()}
                                sx={dailyPrimaryButtonSx}
                            >
                                {t('continue')}
                            </Button>
                        </Stack>
                    </CardContent>
                </Card>
            )}

            <Stack spacing={1.5}>
                {steps.map((step, i) => (
                    <StarterStepCard
                        key={step.id}
                        step={step}
                        index={i}
                        disabled={request.isLoading()}
                        onDetails={setDetailsTask}
                        onMarkDone={setMarkDoneTask}
                        onUndo={onUndo}
                    />
                ))}
            </Stack>

            <Card variant='outlined' sx={{ borderRadius: 3, borderStyle: 'dashed' }}>
                <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                    <Stack direction='row' spacing={1.5} sx={{ alignItems: 'start' }}>
                        <Lock sx={{ color: 'text.secondary', mt: 0.25 }} />
                        <Stack spacing={0.5} sx={{ alignItems: 'start' }}>
                            <Typography sx={{ fontWeight: 700 }}>{t('locked.title')}</Typography>
                            <Typography variant='body2' color='text.secondary'>
                                {t('locked.description')}
                            </Typography>
                            {!allDone && (
                                <Button
                                    size='small'
                                    color='inherit'
                                    disabled={request.isLoading()}
                                    onClick={() => void onFinish()}
                                    sx={{ textTransform: 'none', color: 'text.secondary', px: 0 }}
                                    data-testid='skip-starter-plan'
                                >
                                    {t('skip')}
                                </Button>
                            )}
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>
        </Stack>
    );
}

function StarterStepCard({
    step,
    index,
    disabled,
    onDetails,
    onMarkDone,
    onUndo,
}: {
    step: StarterStep;
    index: number;
    disabled: boolean;
    onDetails: (task: Requirement) => void;
    onMarkDone: (task: Requirement) => void;
    onUndo: (task: Requirement) => void;
}) {
    const t = useTranslations('profile.trainingPlan.starter');

    return (
        <Card
            variant='outlined'
            sx={dailyCardSx(step.complete)}
            data-testid={`starter-step-${step.id}`}
        >
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Stack direction='row' spacing={2} sx={{ alignItems: 'start' }}>
                    {step.complete ? (
                        <Check color='success' sx={{ mt: 0.25 }} />
                    ) : (
                        <RadioButtonUnchecked sx={{ mt: 0.25, color: 'text.disabled' }} />
                    )}

                    <Stack spacing={1} sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Stack
                            direction='row'
                            sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}
                        >
                            <Typography sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
                                {t('stepNumber', { number: index + 1 })} ·{' '}
                                {t(`steps.${step.id}.title`)}
                            </Typography>
                            {step.total > 1 && (
                                <Chip
                                    size='small'
                                    label={t('stepProgress', {
                                        done: step.current,
                                        total: step.total,
                                    })}
                                    color={step.complete ? 'success' : 'default'}
                                />
                            )}
                        </Stack>
                        <Typography variant='body2' color='text.secondary'>
                            {t(`steps.${step.id}.description`)}
                        </Typography>

                        {step.tasks.length > 0 && (
                            <Stack spacing={0.5} sx={{ pt: 0.5 }}>
                                {step.tasks.map((stepTask) => (
                                    <StarterTaskRow
                                        key={stepTask.task.id}
                                        stepTask={stepTask}
                                        disabled={disabled}
                                        onDetails={onDetails}
                                        onMarkDone={onMarkDone}
                                        onUndo={onUndo}
                                    />
                                ))}
                            </Stack>
                        )}

                        {!step.complete && <StepLinks step={step} />}
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    );
}

/** Links to the pages where the member does a step, for steps done outside the plan. */
function StepLinks({ step }: { step: StarterStep }) {
    const t = useTranslations('profile.trainingPlan.starter.actions');
    const href =
        step.id === StarterStepId.AnnotateGame
            ? '/games/import'
            : step.id === StarterStepId.DojoRush
              ? '/puzzles/rush'
              : undefined;
    if (!href) {
        return null;
    }
    return (
        <Box sx={{ pt: 0.5 }}>
            <Button
                size='small'
                variant={step.id === StarterStepId.DojoRush ? 'contained' : 'outlined'}
                disableElevation
                component={Link}
                href={href}
                sx={dailyPrimaryButtonSx}
            >
                {step.id === StarterStepId.DojoRush ? t('startRush') : t('importGame')}
            </Button>
        </Box>
    );
}

function StarterTaskRow({
    stepTask,
    disabled,
    onDetails,
    onMarkDone,
    onUndo,
}: {
    stepTask: StarterStepTask;
    disabled: boolean;
    onDetails: (task: Requirement) => void;
    onMarkDone: (task: Requirement) => void;
    onUndo: (task: Requirement) => void;
}) {
    const t = useTranslations('profile.trainingPlan.starter.actions');
    const { task, done, record } = stepTask;
    const translated = useTranslatedRequirement(task) ?? task;

    return (
        <Stack
            direction='row'
            sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}
            data-testid={`starter-task-${task.id}`}
        >
            {done ? (
                <Check fontSize='small' color='success' />
            ) : (
                <RadioButtonUnchecked fontSize='small' sx={{ color: 'text.disabled' }} />
            )}
            <Typography
                variant='body2'
                sx={{
                    flexGrow: 1,
                    minWidth: 0,
                    fontWeight: 600,
                    color: done ? 'text.secondary' : 'text.primary',
                }}
            >
                {translated.name.replaceAll('{{count}}', '1')}
                {record && (
                    <Typography component='span' variant='body2' color='text.secondary'>
                        {' · '}
                        {t('minutesSpent', { minutes: record.minutes })}
                    </Typography>
                )}
            </Typography>

            <Button
                size='small'
                onClick={() => onDetails(task)}
                sx={{ textTransform: 'none', flexShrink: 0 }}
            >
                {t('details')}
            </Button>
            {!done && (
                <Button
                    size='small'
                    variant='contained'
                    disableElevation
                    disabled={disabled}
                    onClick={() => onMarkDone(task)}
                    sx={dailyPrimaryButtonSx}
                >
                    {t('markDone')}
                </Button>
            )}
            {record && (
                <Button
                    size='small'
                    color='inherit'
                    disabled={disabled}
                    onClick={() => onUndo(task)}
                    sx={{ textTransform: 'none', flexShrink: 0, color: 'text.secondary' }}
                >
                    {t('undo')}
                </Button>
            )}
        </Stack>
    );
}

/** Asks how long a task took, then marks it done on the starter plan. */
function MarkDoneDialog({
    task,
    loading,
    onSave,
    onClose,
}: {
    task: Requirement;
    loading: boolean;
    onSave: (minutes: number) => void;
    onClose: () => void;
}) {
    const t = useTranslations('profile.trainingPlan.starter.markDone');
    const translated = useTranslatedRequirement(task) ?? task;
    const [minutes, setMinutes] = useState(`${task.expectedMinutes || DEFAULT_TASK_MINUTES}`);
    const value = Number(minutes);
    const invalid = minutes.trim() === '' || !Number.isInteger(value) || value < 0;

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth='xs'>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    <Typography sx={{ fontWeight: 600 }}>
                        {translated.name.replaceAll('{{count}}', '1')}
                    </Typography>
                    <TextField
                        autoFocus
                        type='number'
                        label={t('minutesLabel')}
                        value={minutes}
                        onChange={(e) => setMinutes(e.target.value)}
                        error={invalid}
                        helperText={invalid ? t('minutesInvalid') : t('minutesHelper')}
                        slotProps={{ htmlInput: { min: 0, step: 5 } }}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>
                    {t('cancel')}
                </Button>
                <Button
                    variant='contained'
                    loading={loading}
                    disabled={invalid}
                    onClick={() => onSave(value)}
                >
                    {t('save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
