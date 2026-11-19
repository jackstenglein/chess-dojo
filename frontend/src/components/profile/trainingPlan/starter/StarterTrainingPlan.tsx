'use client';

import { useApi } from '@/api/Api';
import { listPuzzleRushSessions } from '@/api/puzzleApi';
import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { isComplete, Requirement } from '@/database/requirement';
import LoadingPage from '@/loading/LoadingPage';
import { useTranslatedRequirement } from '@/translation/useTranslatedRequirement';
import { Check, EmojiEvents, RadioButtonUnchecked } from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    LinearProgress,
    Stack,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { use, useEffect, useMemo, useState } from 'react';
import { dailyCardSx, dailyPrimaryButtonSx } from '../daily/DailyCard';
import { TaskDialog, TaskDialogView } from '../TaskDialog';
import { TrainingPlanContext } from '../TrainingPlanTab';
import { getStarterSteps, STARTER_PLAN_TUTORIAL, StarterStep, StarterStepId } from './starterPlan';

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
 * The plan new members follow before the full training plan: the Welcome to the
 * Dojo tasks, one classical game, one annotated game and one Dojo Rush run. Once
 * every step is done (or the member skips it) the daily and weekly plan take over.
 */
export function StarterTrainingPlan() {
    const t = useTranslations('profile.trainingPlan.starter');
    const api = useApi();
    const { updateUser } = useAuth();
    const { user, requirements, timeline, isLoading } = use(TrainingPlanContext);
    const hasDojoRushRun = useHasDojoRushRun();

    const [dialog, setDialog] = useState<{ task: Requirement; view: TaskDialogView }>();

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

    const moveToFullPlan = () => {
        const tutorials = { ...user.tutorials, [STARTER_PLAN_TUTORIAL]: true };
        updateUser({ tutorials });
        void api.updateUser({ tutorials });
    };

    const openTask = (task: Requirement, view: TaskDialogView) => setDialog({ task, view });

    return (
        <Stack spacing={2} sx={{ width: 1 }} data-testid='starter-training-plan'>
            {dialog && (
                <TaskDialog
                    open
                    onClose={() => setDialog(undefined)}
                    task={dialog.task}
                    initialView={dialog.view}
                    progress={user.progress[dialog.task.id]}
                    cohort={user.dojoCohort}
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
                                onClick={moveToFullPlan}
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
                    <StarterStepCard key={step.id} step={step} index={i} onOpenTask={openTask} />
                ))}
            </Stack>

            {!allDone && (
                <Box>
                    <Button
                        size='small'
                        color='inherit'
                        onClick={moveToFullPlan}
                        sx={{ textTransform: 'none', color: 'text.secondary' }}
                        data-testid='skip-starter-plan'
                    >
                        {t('skip')}
                    </Button>
                </Box>
            )}
        </Stack>
    );
}

function StarterStepCard({
    step,
    index,
    onOpenTask,
}: {
    step: StarterStep;
    index: number;
    onOpenTask: (task: Requirement, view: TaskDialogView) => void;
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

                        {step.id === StarterStepId.Welcome && step.tasks && (
                            <Stack spacing={0.5} sx={{ pt: 0.5 }}>
                                {step.tasks.map((task) => (
                                    <WelcomeTaskRow
                                        key={task.id}
                                        task={task}
                                        onOpenTask={onOpenTask}
                                    />
                                ))}
                            </Stack>
                        )}

                        {!step.complete && <StepActions step={step} onOpenTask={onOpenTask} />}
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    );
}

function StepActions({
    step,
    onOpenTask,
}: {
    step: StarterStep;
    onOpenTask: (task: Requirement, view: TaskDialogView) => void;
}) {
    const t = useTranslations('profile.trainingPlan.starter.actions');
    const task = step.task;

    switch (step.id) {
        case StarterStepId.ClassicalGame:
            return (
                <Stack direction='row' sx={{ gap: 1, flexWrap: 'wrap', pt: 0.5 }}>
                    {task && (
                        <>
                            <Button
                                size='small'
                                variant='contained'
                                disableElevation
                                onClick={() => onOpenTask(task, TaskDialogView.Progress)}
                                sx={dailyPrimaryButtonSx}
                            >
                                {t('logGame')}
                            </Button>
                            <Button
                                size='small'
                                onClick={() => onOpenTask(task, TaskDialogView.Details)}
                                sx={{ textTransform: 'none' }}
                            >
                                {t('howItWorks')}
                            </Button>
                        </>
                    )}
                </Stack>
            );

        case StarterStepId.AnnotateGame:
            return (
                <Stack direction='row' sx={{ gap: 1, flexWrap: 'wrap', pt: 0.5 }}>
                    <Button
                        size='small'
                        variant='contained'
                        disableElevation
                        component={Link}
                        href='/games/import'
                        sx={dailyPrimaryButtonSx}
                    >
                        {t('importGame')}
                    </Button>
                    {task && (
                        <Button
                            size='small'
                            onClick={() => onOpenTask(task, TaskDialogView.Progress)}
                            sx={{ textTransform: 'none' }}
                        >
                            {t('logAnnotation')}
                        </Button>
                    )}
                </Stack>
            );

        case StarterStepId.DojoRush:
            return (
                <Box sx={{ pt: 0.5 }}>
                    <Button
                        size='small'
                        variant='contained'
                        disableElevation
                        component={Link}
                        href='/puzzles/rush'
                        sx={dailyPrimaryButtonSx}
                    >
                        {t('startRush')}
                    </Button>
                </Box>
            );

        default:
            return null;
    }
}

function WelcomeTaskRow({
    task,
    onOpenTask,
}: {
    task: Requirement;
    onOpenTask: (task: Requirement, view: TaskDialogView) => void;
}) {
    const t = useTranslations('profile.trainingPlan.starter.actions');
    const translated = useTranslatedRequirement(task) ?? task;
    const { user } = use(TrainingPlanContext);
    const done = isComplete(user.dojoCohort, task, user.progress[task.id]);

    return (
        <Stack direction='row' sx={{ alignItems: 'center', gap: 1 }}>
            {done ? (
                <Check fontSize='small' color='success' />
            ) : (
                <RadioButtonUnchecked fontSize='small' sx={{ color: 'text.disabled' }} />
            )}
            <Typography
                variant='body2'
                sx={{
                    flexGrow: 1,
                    color: done ? 'text.secondary' : 'text.primary',
                    textDecoration: done ? 'line-through' : undefined,
                }}
            >
                {translated.name}
            </Typography>
            <Button
                size='small'
                onClick={() =>
                    onOpenTask(task, done ? TaskDialogView.Details : TaskDialogView.Progress)
                }
                sx={{ textTransform: 'none', flexShrink: 0 }}
            >
                {done ? t('view') : t('open')}
            </Button>
        </Stack>
    );
}
