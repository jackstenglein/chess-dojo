'use client';

import { useApi } from '@/api/Api';
import { listPuzzleRushSessions } from '@/api/puzzleApi';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { PlayMaiaDialog } from '@/components/playbot/PlayMaiaDialog';
import { useTimelineContext } from '@/components/profile/activity/useTimeline';
import { getTimeControl } from '@/components/tournaments/round-robin/TimeControlChip';
import { formatTime, Requirement, RequirementCategory } from '@/database/requirement';
import { isFree } from '@/database/user';
import LoadingPage from '@/loading/LoadingPage';
import { ChessDojoIcon } from '@/style/ChessDojoIcon';
import { DiscordIcon } from '@/style/SocialMediaIcons';
import { CategoryColors } from '@/style/ThemeProvider';
import { useTranslatedRequirement } from '@/translation/useTranslatedRequirement';
import {
    AccessTime,
    ArrowForward,
    AutoStories,
    Check,
    ChevronRight,
    DashboardCustomize,
    EmojiEvents,
    Flag,
    Lock,
    PlayArrowRounded,
    SmartToy,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardActionArea,
    CardActions,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    LinearProgress,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import { ReactNode, use, useEffect, useMemo, useRef, useState } from 'react';
import { CategoryLabel } from '../CategoryLabel';
import { useFreePlanEditor } from '../custom/useFreePlanEditor';
import {
    dailyCardActionsSx,
    dailyCardSx,
    dailyPrimaryButtonSx,
    DailyTimePill,
} from '../daily/DailyCard';
import { turnColor } from '../Position';
import { TaskDialog, TaskDialogView } from '../TaskDialog';
import { TrainingPlanContext } from '../TrainingPlanTab';
import senseiJesseImage from './sensei-jesse.png';
import {
    getStarterCredits,
    getStarterSteps,
    isOnePositionTask,
    isStarterWelcomeTask,
    StarterStep,
    StarterStepId,
    StarterStepTask,
} from './starterPlan';
import { StarterPreviewMode } from './starterPreview';
import {
    getStarterResetAt,
    getStarterRushUndoneAt,
    Tutorials,
    withStarterPlanFinished,
    withStarterReset,
    withStarterRushUndone,
    withStarterTask,
    withStarterTaskCredited,
    withStarterTaskUndone,
} from './starterProgress';

/** The minutes suggested for a task that has no expected time. */
const DEFAULT_TASK_MINUTES = 30;

/**
 * Returns whether the current user has finished a Dojo Rush run, or undefined
 * while that is still loading. A failed request counts as no run, so the step
 * stays open rather than blocking the plan.
 */
function useHasDojoRushRun(since?: number): boolean | undefined {
    const [hasRun, setHasRun] = useState<boolean>();
    useEffect(() => {
        let cancelled = false;
        listPuzzleRushSessions()
            .then((response) => {
                if (!cancelled) {
                    // Runs are listed most recent first; only runs since `since` count.
                    setHasRun(
                        response.data.sessions.some(
                            (run) => !since || new Date(run.createdAt).getTime() >= since,
                        ),
                    );
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
    }, [since]);
    return hasRun;
}

/**
 * The plan new members follow before the full training plan. Tasks marked done here
 * are kept apart from the member's real progress; when they finish (or skip) the
 * starter plan, those tasks are credited to the full training plan, which unlocks.
 */
export function StarterTrainingPlan({
    preview = StarterPreviewMode.Off,
}: {
    /** The local dev preview mode, for testing with an existing account. */
    preview?: StarterPreviewMode;
}) {
    const t = useTranslations('profile.trainingPlan.starter');
    const api = useApi();
    const { updateUser } = useAuth();
    const { onNewEntry } = useTimelineContext();
    const { user, requirements, timeline, isLoading } = use(TrainingPlanContext);
    const { createPlan } = useFreePlanEditor();
    const isPreview = preview !== StarterPreviewMode.Off;
    // Dojo Rush runs from before the member last undid the step do not count, nor, in
    // the preview, runs from before the last reset.
    const rushSince = Math.max(
        getStarterRushUndoneAt(user.tutorials) ?? 0,
        (isPreview ? getStarterResetAt(user.tutorials) : undefined) ?? 0,
    );
    const hasDojoRushRun = useHasDojoRushRun(rushSince || undefined);
    const request = useRequest();

    const [detailsTask, setDetailsTask] = useState<{ task: Requirement; name?: string }>();
    const [markDoneTask, setMarkDoneTask] = useState<{ task: Requirement; name?: string }>();

    const steps = useMemo(
        () =>
            getStarterSteps({
                user,
                requirements,
                timeline,
                hasDojoRushRun: !!hasDojoRushRun,
                // An existing account previews the plan as a brand-new member would.
                ignoreRealProgress: isPreview,
            }),
        [user, requirements, timeline, hasDojoRushRun, isPreview],
    );

    // ?starterPlan=reset clears the account's starter progress once per page load.
    const hasReset = useRef(false);
    useEffect(() => {
        if (preview !== StarterPreviewMode.Reset || hasReset.current) {
            return;
        }
        hasReset.current = true;
        const tutorials = withStarterReset(user.tutorials, new Date());
        updateUser({ tutorials });
        void api.updateUser({ tutorials });
    }, [preview, user.tutorials, updateUser, api]);

    const stageRows = getStageRows(steps);
    /**
     * The starter step's description, for a task the starter plan renames: its own
     * description gives the full plan's count, which the dialog leaves out.
     */
    const getStepDescription = ({ task, name }: { task: Requirement; name?: string }) => {
        const step = steps.find((s) => s.tasks.some((st) => st.task.id === task.id));
        return name && step ? t(`steps.${step.id}.description`) : undefined;
    };
    /** The page where the task's step is done, such as Import a game, until it is done. */
    const getStepLink = (task: Requirement) => {
        const step = steps.find((s) => s.tasks.some((st) => st.task.id === task.id));
        const link = step && !step.complete ? STEP_LINKS[step.id] : undefined;
        return link && { href: link.href, label: t(`actions.${link.label}`) };
    };
    const isTaskDone = (taskId: string) =>
        steps.some((s) => s.tasks.some((st) => st.task.id === taskId && st.done));

    if (isLoading || hasDojoRushRun === undefined) {
        return <LoadingPage />;
    }

    // Progress counts tasks: each welcome task, and one for each other step.
    const doneCount = steps.reduce((sum, s) => sum + s.current, 0);
    const totalCount = steps.reduce((sum, s) => sum + s.total, 0);
    const allDone = doneCount >= totalCount;

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

    // Local preview only: clears the account's starter progress to start over.
    const onReset = () => {
        request.onStart();
        saveTutorials(withStarterReset(user.tutorials, new Date()))
            .then(() => request.onSuccess())
            .catch((err: unknown) => request.onFailure(err));
    };

    // Undoing only changes the starter plan; the member's real progress is untouched.
    const saveUndo = (tutorials: Tutorials) => {
        request.onStart();
        saveTutorials(tutorials)
            .then(() => request.onSuccess())
            .catch((err: unknown) => request.onFailure(err));
    };
    const onUndo = (task: Requirement) => saveUndo(withStarterTaskUndone(user.tutorials, task.id));
    const onUndoRush = () => saveUndo(withStarterRushUndone(user.tutorials, new Date()));

    /**
     * Credits every starter task to the member's real progress, then marks the starter
     * plan finished. Each credited task is remembered, so a retry after a failure never
     * credits a task twice.
     * @returns Whether the starter plan was finished.
     */
    const onFinish = async (): Promise<boolean> => {
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
            return true;
        } catch (err) {
            request.onFailure(err);
            await saveTutorials(tutorials).catch(() => undefined);
            return false;
        }
    };

    /** Finishes the starter plan and switches a free-tier member to a new custom plan. */
    const onBuildOwnPlan = async () => {
        if (await onFinish()) {
            createPlan();
        }
    };

    return (
        <Stack spacing={2} sx={{ width: 1 }} data-testid='starter-training-plan'>
            <RequestSnackbar request={request} />

            {isPreview && (
                // Only on a local dev server, so this testing note is not translated.
                <Alert
                    severity='info'
                    variant='outlined'
                    sx={{ width: 1, alignItems: 'center' }}
                    action={
                        <Button
                            color='inherit'
                            size='small'
                            disabled={request.isLoading()}
                            onClick={onReset}
                            data-testid='reset-starter-plan'
                        >
                            Reset starter plan
                        </Button>
                    }
                >
                    Starter plan preview (local dev only). Your account&apos;s real progress is
                    ignored here; finishing still credits real progress. Use ?starterPlan=reset to
                    start over or ?starterPlan=off to turn the preview off.
                </Alert>
            )}

            {detailsTask && (
                <TaskDialog
                    open
                    onClose={() => setDetailsTask(undefined)}
                    task={firstPositionOnly(detailsTask.task)}
                    initialView={TaskDialogView.Details}
                    progress={user.progress[detailsTask.task.id]}
                    cohort={user.dojoCohort}
                    starterMode={{
                        label: t('actions.markDone'),
                        title: detailsTask.name,
                        description: getStepDescription(detailsTask),
                        link: getStepLink(detailsTask.task),
                        // Done tasks have nothing to mark; they are undone from the plan.
                        onMarkComplete: isTaskDone(detailsTask.task.id)
                            ? undefined
                            : () => {
                                  setDetailsTask(undefined);
                                  if (isStarterWelcomeTask(detailsTask.task)) {
                                      // Welcome tasks are just completed, with no time to log.
                                      onMarkDone(detailsTask.task, 0);
                                  } else {
                                      setMarkDoneTask(detailsTask);
                                  }
                              },
                    }}
                />
            )}

            {markDoneTask && (
                <MarkDoneDialog
                    task={markDoneTask.task}
                    name={markDoneTask.name}
                    loading={request.isLoading()}
                    onSave={(minutes) => onMarkDone(markDoneTask.task, minutes)}
                    onClose={() => setMarkDoneTask(undefined)}
                />
            )}

            <StarterHero stages={stageRows} doneCount={doneCount} totalCount={totalCount} />

            {allDone && (
                <Card variant='outlined' sx={dailyCardSx(true)} data-testid='starter-plan-done'>
                    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                        <Stack direction='row' sx={{ alignItems: 'start', gap: 2 }}>
                            <EmojiEvents color='success' sx={{ fontSize: '2.25rem' }} />
                            <Stack
                                sx={{
                                    gap: 1.5,
                                    flexGrow: 1,
                                    alignItems: { xs: 'stretch', sm: 'start' },
                                }}
                            >
                                <Stack spacing={0.5}>
                                    <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                                        {t('complete.title')}
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary'>
                                        {t('complete.description')}
                                    </Typography>
                                </Stack>
                                <Button
                                    variant='contained'
                                    color='success'
                                    size='large'
                                    disableElevation
                                    endIcon={<ArrowForward />}
                                    loading={request.isLoading()}
                                    onClick={() => void onFinish()}
                                    sx={{ textTransform: 'none', fontWeight: 600 }}
                                    data-testid='starter-continue-button'
                                >
                                    {t('continue')}
                                </Button>
                            </Stack>
                        </Stack>
                    </CardContent>
                </Card>
            )}

            <Stack sx={{ width: 1 }}>
                {stageRows.map((stage, i) => (
                    <StarterStageRow
                        key={stage.id}
                        stage={stage}
                        number={i + 1}
                        isLast={i === stageRows.length - 1}
                        disabled={request.isLoading()}
                        onDetails={(task, name) => setDetailsTask({ task, name })}
                        onMarkDone={(task, name) => setMarkDoneTask({ task, name })}
                        onUndo={onUndo}
                        onUndoRush={onUndoRush}
                    />
                ))}
            </Stack>

            {isFree(user) ? (
                // Free-tier members can't skip to the full plan, so they're offered
                // their own custom plan instead.
                <Stack
                    direction='row'
                    sx={{
                        width: 1,
                        alignItems: 'start',
                        gap: 1.5,
                        p: 2,
                        borderRadius: 3,
                        border: 1,
                        borderStyle: 'dashed',
                        borderColor: 'divider',
                    }}
                    data-testid='starter-build-own-plan'
                >
                    <DashboardCustomize
                        sx={{ color: 'primary.main', fontSize: '1.75rem', mt: 0.25 }}
                    />
                    <Stack
                        sx={{ gap: 1.5, flexGrow: 1, alignItems: { xs: 'stretch', sm: 'start' } }}
                    >
                        <Typography sx={{ fontSize: '1.15rem', fontWeight: 600, lineHeight: 1.4 }}>
                            {t('buildOwn.description')}
                        </Typography>
                        <Button
                            variant='contained'
                            size='large'
                            endIcon={<ArrowForward />}
                            disabled={request.isLoading()}
                            onClick={() => void onBuildOwnPlan()}
                            sx={{ textTransform: 'none' }}
                            data-testid='starter-build-own-plan-button'
                        >
                            {t('buildOwn.action')}
                        </Button>
                    </Stack>
                </Stack>
            ) : (
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    sx={{
                        width: 1,
                        alignItems: { xs: 'stretch', md: 'center' },
                        gap: 1.5,
                        p: 2,
                        borderRadius: 3,
                        border: 1,
                        borderStyle: 'dashed',
                        borderColor: 'divider',
                    }}
                >
                    <Stack direction='row' sx={{ alignItems: 'center', gap: 1.5, flexGrow: 1 }}>
                        <Lock sx={{ color: 'text.disabled' }} />
                        <Typography variant='body2' color='text.secondary'>
                            {t('locked.description')}
                        </Typography>
                    </Stack>
                    {!allDone && (
                        <Button
                            variant='outlined'
                            endIcon={<ArrowForward />}
                            disabled={request.isLoading()}
                            onClick={() => void onFinish()}
                            sx={{ textTransform: 'none', flexShrink: 0 }}
                            data-testid='skip-starter-plan'
                        >
                            {t('skip')}
                        </Button>
                    )}
                </Stack>
            )}
        </Stack>
    );
}

/**
 * Returns the task with only its first position, for tasks the starter plan asks only
 * one position of, so the task's details show just the position to play.
 */
function firstPositionOnly(task: Requirement): Requirement {
    if (!isOnePositionTask(task) || !task.positions) {
        return task;
    }
    return { ...task, positions: task.positions.slice(0, 1) };
}

/**
 * The cartoon of Sensei Jesse. Image imports are typed as URLs but arrive as Next.js
 * static image objects, so this takes the URL from either.
 */
const SENSEI_IMAGE: string =
    typeof senseiJesseImage === 'string'
        ? senseiJesseImage
        : (senseiJesseImage as unknown as { src: string }).src;

/** The training plan category each step belongs to, for its label and colour. */
const STEP_CATEGORIES: Record<StarterStepId, RequirementCategory> = {
    [StarterStepId.Welcome]: RequirementCategory.Welcome,
    [StarterStepId.DojoRush]: RequirementCategory.Tactics,
    [StarterStepId.MasterGame]: RequirementCategory.Games,
    [StarterStepId.EndgameAlgorithm]: RequirementCategory.Endgame,
    [StarterStepId.ClassicalGame]: RequirementCategory.Games,
    [StarterStepId.AnnotateGame]: RequirementCategory.Games,
};

/**
 * Steps that name their task, because it differs by cohort (e.g. "Algorithm #7").
 * The other steps' tasks are named for the full plan ("Play 30 classical games per
 * year"), so they go by the step's own title instead.
 */
const SHOWS_TASK_NAME = new Set([StarterStepId.EndgameAlgorithm]);

/** Pages where the member does a step, linked from its card. */
const STEP_LINKS: Partial<Record<StarterStepId, { href: string; label: string }>> = {
    [StarterStepId.ClassicalGame]: { href: '/tournaments', label: 'viewTournaments' },
    [StarterStepId.AnnotateGame]: { href: '/games/import', label: 'importGame' },
    [StarterStepId.DojoRush]: { href: '/puzzles/rush', label: 'startRush' },
};

/** The three stages of the starter plan and the steps in each, from top to bottom. */
const STAGES: { id: 'welcome' | 'training' | 'games'; steps: StarterStepId[] }[] = [
    { id: 'welcome', steps: [StarterStepId.Welcome] },
    {
        id: 'training',
        steps: [StarterStepId.DojoRush, StarterStepId.MasterGame, StarterStepId.EndgameAlgorithm],
    },
    { id: 'games', steps: [StarterStepId.ClassicalGame, StarterStepId.AnnotateGame] },
];

/** A stage of the starter plan with its steps and how many of its tasks are done. */
interface StageRow {
    id: (typeof STAGES)[number]['id'];
    steps: StarterStep[];
    done: number;
    total: number;
}

/** Groups the steps into their stages, leaving out empty stages. */
function getStageRows(steps: StarterStep[]): StageRow[] {
    return STAGES.map(({ id, steps: ids }) => {
        const stageSteps = steps.filter((s) => ids.includes(s.id));
        return {
            id,
            steps: stageSteps,
            done: stageSteps.reduce((sum, s) => sum + s.current, 0),
            total: stageSteps.reduce((sum, s) => sum + s.total, 0),
        };
    }).filter((stage) => stage.steps.length > 0);
}

/**
 * The top of the starter plan: its title and intro, Sensei Jesse welcoming the member
 * like a guide at the start of a game, then the plan's progress and its three stages.
 */
function StarterHero({
    stages,
    doneCount,
    totalCount,
}: {
    stages: StageRow[];
    doneCount: number;
    totalCount: number;
}) {
    const t = useTranslations('profile.trainingPlan.starter');
    const allDone = doneCount >= totalCount;
    const welcomeColor = CategoryColors[RequirementCategory.Welcome];

    return (
        <Card
            variant='outlined'
            sx={{
                width: 1,
                borderRadius: 4,
                background: `linear-gradient(135deg, ${welcomeColor}24 0%, transparent 55%), linear-gradient(315deg, #f7941d1c 0%, transparent 50%)`,
            }}
        >
            <CardContent
                sx={{ p: { xs: 2.5, sm: 3.5 }, '&:last-child': { pb: { xs: 2.5, sm: 3.5 } } }}
            >
                <Stack spacing={3}>
                    <Stack spacing={1}>
                        <Stack direction='row' sx={{ alignItems: 'center', gap: 1.5 }}>
                            <ChessDojoIcon
                                aria-hidden
                                sx={{
                                    fontSize: { xs: '2.5rem', sm: '3rem' },
                                    color: 'text.primary',
                                }}
                            />
                            <Typography
                                variant='h4'
                                sx={{ fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}
                            >
                                {t('title')}
                            </Typography>
                        </Stack>
                        <Typography
                            sx={{
                                fontWeight: 700,
                                fontSize: '1.15rem',
                                color: CategoryColors[RequirementCategory.Welcome],
                            }}
                        >
                            {t('planName')}
                        </Typography>
                    </Stack>

                    <SenseiGreeting />

                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        sx={{ gap: { xs: 2, md: 4 }, alignItems: { md: 'center' } }}
                    >
                        <Stack spacing={0.75} sx={{ width: 1, maxWidth: { md: 360 } }}>
                            <Stack direction='row' sx={{ alignItems: 'center', gap: 0.75 }}>
                                {allDone && <Check fontSize='small' color='success' />}
                                <Typography
                                    variant='body2'
                                    sx={{
                                        fontWeight: 700,
                                        color: allDone ? 'success.main' : 'text.primary',
                                    }}
                                >
                                    {t('progress', { done: doneCount, total: totalCount })}
                                </Typography>
                            </Stack>
                            <LinearProgress
                                variant='determinate'
                                value={totalCount > 0 ? (100 * doneCount) / totalCount : 0}
                                color={allDone ? 'success' : 'primary'}
                                sx={{
                                    height: 10,
                                    borderRadius: 5,
                                    backgroundColor: 'action.hover',
                                }}
                            />
                        </Stack>

                        <Stack
                            direction='row'
                            sx={{
                                gap: 1,
                                flexWrap: 'wrap',
                                ml: { md: 'auto' },
                                justifyContent: { md: 'flex-end' },
                            }}
                        >
                            {stages.map((stage, i) => {
                                const complete = stage.done >= stage.total;
                                return (
                                    <Chip
                                        key={stage.id}
                                        size='small'
                                        icon={
                                            complete ? (
                                                <Check sx={{ fontSize: '1rem' }} />
                                            ) : undefined
                                        }
                                        label={`${i + 1}. ${t(`stages.${stage.id}.title`)}`}
                                        color={complete ? 'success' : 'default'}
                                        variant={complete ? 'filled' : 'outlined'}
                                        sx={{ fontWeight: 600 }}
                                    />
                                );
                            })}
                        </Stack>
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    );
}

/**
 * Sensei Jesse greeting the member, drawn like a character's dialogue box in a game:
 * his portrait, a name tag and a speech box.
 */
function SenseiGreeting() {
    const t = useTranslations('profile.trainingPlan.starter.sensei');

    return (
        <Stack direction='row' sx={{ gap: { xs: 1.5, sm: 2.5 }, alignItems: 'end' }}>
            <Box
                component='img'
                src={SENSEI_IMAGE}
                alt={t('name')}
                sx={{
                    width: { xs: 80, sm: 104 },
                    height: { xs: 80, sm: 104 },
                    flexShrink: 0,
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.35))',
                }}
            />
            <Box
                sx={(theme) => ({
                    position: 'relative',
                    flexGrow: 1,
                    maxWidth: 640,
                    px: 2.5,
                    pt: 2.25,
                    pb: 2,
                    borderRadius: 3,
                    border: 2,
                    borderColor: (theme.vars ?? theme).palette.text.primary,
                    backgroundColor: (theme.vars ?? theme).palette.background.paper,
                    // The tail of the speech box, pointing at the sensei.
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: -11,
                        bottom: 22,
                        borderStyle: 'solid',
                        borderWidth: '9px 11px 9px 0',
                        borderColor: `transparent ${(theme.vars ?? theme).palette.text.primary} transparent transparent`,
                    },
                })}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        top: -13,
                        left: 16,
                        px: 1.25,
                        py: 0.25,
                        borderRadius: 1.5,
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: '#1b1b1b',
                        backgroundColor: '#f7941d',
                    }}
                >
                    {t('name')}
                </Box>
                <Typography sx={{ fontWeight: 600, lineHeight: 1.55 }}>{t('greeting')}</Typography>
            </Box>
        </Stack>
    );
}

/**
 * A stage of the starter plan: its number on a line joining the stages from top to
 * bottom, its name and progress, and its tasks as cards side by side.
 */
function StarterStageRow({
    stage,
    number,
    isLast,
    ...handlers
}: {
    stage: StageRow;
    number: number;
    isLast: boolean;
    disabled: boolean;
    onDetails: (task: Requirement, name?: string) => void;
    onMarkDone: (task: Requirement, name?: string) => void;
    onUndo: (task: Requirement) => void;
    onUndoRush: () => void;
}) {
    const t = useTranslations('profile.trainingPlan.starter');
    const complete = stage.done >= stage.total;
    // The welcome stage shows its tasks themselves; the others show a card per step.
    const welcomeTasks = stage.id === 'welcome' ? (stage.steps[0]?.tasks ?? []) : [];

    return (
        <Stack direction='row' sx={{ gap: { xs: 1.5, sm: 2 } }}>
            <Stack sx={{ alignItems: 'center', flexShrink: 0, width: 36 }}>
                <Box
                    sx={(theme) => ({
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        border: 2,
                        borderColor: complete
                            ? (theme.vars ?? theme).palette.success.main
                            : (theme.vars ?? theme).palette.text.secondary,
                        backgroundColor: complete
                            ? (theme.vars ?? theme).palette.success.main
                            : 'transparent',
                        color: complete
                            ? (theme.vars ?? theme).palette.success.contrastText
                            : (theme.vars ?? theme).palette.text.primary,
                    })}
                >
                    {complete ? <Check sx={{ fontSize: '1.2rem' }} /> : number}
                </Box>
                {!isLast && (
                    <Box
                        sx={{
                            flexGrow: 1,
                            width: 2,
                            my: 0.5,
                            borderRadius: 1,
                            backgroundColor: complete ? 'success.main' : 'divider',
                        }}
                    />
                )}
            </Stack>

            <Stack spacing={1.75} sx={{ flexGrow: 1, minWidth: 0, pb: isLast ? 0 : 4 }}>
                <Stack
                    direction='row'
                    sx={(theme) => ({
                        alignItems: 'center',
                        gap: 2,
                        flexWrap: 'wrap',
                        px: 2,
                        py: 1.25,
                        borderRadius: 3,
                        border: 1,
                        borderColor: complete
                            ? theme.alpha((theme.vars ?? theme).palette.success.main, 0.5)
                            : (theme.vars ?? theme).palette.divider,
                        backgroundColor: complete
                            ? theme.alpha((theme.vars ?? theme).palette.success.main, 0.06)
                            : theme.alpha((theme.vars ?? theme).palette.text.primary, 0.03),
                    })}
                >
                    <Stack spacing={0.25} sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography
                            variant='caption'
                            sx={{
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                lineHeight: 1.2,
                                color: complete ? 'success.main' : 'text.secondary',
                            }}
                        >
                            {t('stageNumber', { number })}
                        </Typography>
                        <Typography variant='h6' sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                            {t(`stages.${stage.id}.title`)}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                            {t(`stages.${stage.id}.description`)}
                        </Typography>
                    </Stack>
                    <Chip
                        size='small'
                        label={t('stepProgress', { done: stage.done, total: stage.total })}
                        color={complete ? 'success' : 'default'}
                        variant={complete ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 600, height: 24 }}
                    />
                </Stack>

                <Grid container columnSpacing={2} rowSpacing={2}>
                    {stage.id === 'welcome'
                        ? welcomeTasks.map((stepTask) => (
                              <Grid key={stepTask.task.id} size={{ xs: 12, sm: 6, md: 4 }}>
                                  <WelcomeTaskCard
                                      stepTask={stepTask}
                                      disabled={handlers.disabled}
                                      onDetails={handlers.onDetails}
                                      onUndo={handlers.onUndo}
                                  />
                              </Grid>
                          ))
                        : stage.steps.map((step) => (
                              <Grid key={step.id} size={{ xs: 12, md: 12 / stage.steps.length }}>
                                  <StarterStepCard step={step} {...handlers} />
                              </Grid>
                          ))}
                </Grid>
            </Stack>
        </Stack>
    );
}

/**
 * A step of the starter plan, drawn like a card in Today: its category label, the
 * step's name and what to do, and the actions along the bottom.
 */
function StarterStepCard({
    step,
    disabled,
    onDetails,
    onMarkDone,
    onUndo,
    onUndoRush,
}: {
    step: StarterStep;
    disabled: boolean;
    onDetails: (task: Requirement, name?: string) => void;
    onMarkDone: (task: Requirement, name?: string) => void;
    onUndo: (task: Requirement) => void;
    onUndoRush: () => void;
}) {
    const t = useTranslations('profile.trainingPlan.starter');
    const category = step.tasks[0]?.task.category ?? STEP_CATEGORIES[step.id];
    // Every step with a task opens its details when clicked; Dojo Rush has no task.
    const clickTask = step.tasks[0]?.task;
    const taskTitle = SHOWS_TASK_NAME.has(step.id) ? undefined : t(`steps.${step.id}.title`);

    return (
        <Card
            variant='outlined'
            sx={dailyCardSx(step.complete)}
            data-testid={`starter-step-${step.id}`}
        >
            <ClickableStepArea
                onClick={clickTask ? () => onDetails(clickTask, taskTitle) : undefined}
            >
                <CardContent sx={{ height: 1, p: 2.5, pb: 1.5 }}>
                    <Stack sx={{ height: 1 }}>
                        <Stack direction='row' sx={{ alignItems: 'center', gap: 1 }}>
                            <CategoryLabel category={category} />
                            <Box sx={{ flexGrow: 1 }} />
                            {step.complete && <Check fontSize='small' color='success' />}
                        </Stack>

                        <Typography
                            sx={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.3, mt: 1 }}
                        >
                            {t(`steps.${step.id}.title`)}
                        </Typography>
                        <Typography
                            variant='body2'
                            sx={{ color: 'text.secondary', lineHeight: 1.55, mt: 1 }}
                        >
                            {t(`steps.${step.id}.description`)}
                        </Typography>

                        {step.tasks[0] && SHOWS_TASK_NAME.has(step.id) && (
                            <StepTaskName stepTask={step.tasks[0]} />
                        )}
                        {step.id === StarterStepId.ClassicalGame && <SuggestedTimeControl />}
                    </Stack>
                </CardContent>
            </ClickableStepArea>

            <StepActions
                step={step}
                disabled={disabled}
                onDetails={onDetails}
                onMarkDone={onMarkDone}
                onUndo={onUndo}
                onUndoRush={onUndoRush}
            />
        </Card>
    );
}

/** Makes a step card's body clickable when it has an action, like the cards in Today. */
function ClickableStepArea({ onClick, children }: { onClick?: () => void; children: ReactNode }) {
    if (!onClick) {
        return <>{children}</>;
    }
    return (
        <CardActionArea onClick={onClick} sx={{ flexGrow: 1, borderRadius: 'inherit' }}>
            {children}
        </CardActionArea>
    );
}

/** The name of the cohort's task behind a single-task step, e.g. "Complete Algorithm #1". */
function StepTaskName({ stepTask }: { stepTask: StarterStepTask }) {
    const t = useTranslations('profile.trainingPlan.starter.actions');
    const translated = useTranslatedRequirement(stepTask.task) ?? stepTask.task;
    const name = (translated.shortName || translated.name).replaceAll('{{count}}', '1');
    // Tasks with several positions only ask for the first one here.
    const hasSeveralPositions = (stepTask.task.positions?.length ?? 0) > 1;
    return (
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'end', mt: 2 }}>
            <Typography variant='body2' sx={{ fontWeight: 600 }}>
                {hasSeveralPositions ? t('firstPosition', { name }) : name}
            </Typography>
        </Box>
    );
}

/** The suggested time control for the member's classical game, based on their cohort. */
function SuggestedTimeControl() {
    const t = useTranslations('profile.trainingPlan.starter.steps.classicalGame');
    const { user } = use(TrainingPlanContext);
    const timeControl = getTimeControl(user.dojoCohort);
    if (!timeControl) {
        return null;
    }
    return (
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'end', mt: 2 }}>
            <Stack direction='row' sx={{ alignItems: 'center', gap: 0.75 }}>
                <AccessTime fontSize='small' sx={{ color: 'text.secondary' }} />
                <Typography variant='body2' sx={{ fontWeight: 600 }}>
                    {t('timeControl', { timeControl })}
                </Typography>
            </Stack>
        </Box>
    );
}

/**
 * The actions along the bottom of a single-task step: mark it done (or undo it), a
 * link to where the step is done, and its time as a pill like the cards in Today.
 */
function StepActions({
    step,
    disabled,
    onDetails,
    onMarkDone,
    onUndo,
    onUndoRush,
}: {
    step: StarterStep;
    disabled: boolean;
    onDetails: (task: Requirement, name?: string) => void;
    onMarkDone: (task: Requirement, name?: string) => void;
    onUndo: (task: Requirement) => void;
    onUndoRush: () => void;
}) {
    const t = useTranslations('profile.trainingPlan.starter.actions');
    const tStep = useTranslations('profile.trainingPlan.starter.steps');
    const stepTask = step.tasks.at(0);
    const markDoneName = SHOWS_TASK_NAME.has(step.id) ? undefined : tStep(`${step.id}.title`);
    const link = STEP_LINKS[step.id];
    const expectedMinutes = stepTask?.task.expectedMinutes || DEFAULT_TASK_MINUTES;
    // The algorithm and sparring steps are played against the bot from their first
    // position; marking them completed stays as the other option.
    const botPosition =
        stepTask && isOnePositionTask(stepTask.task) ? stepTask.task.positions?.[0] : undefined;
    const [playBotOpen, setPlayBotOpen] = useState(false);

    // A completed step shows the same footer as a completed welcome card.
    if (step.complete && (stepTask || step.id === StarterStepId.DojoRush)) {
        return (
            <CardActions disableSpacing sx={dailyCardActionsSx}>
                <CompletedFooter
                    disabled={disabled}
                    onUndo={() => (stepTask ? onUndo(stepTask.task) : onUndoRush())}
                />
            </CardActions>
        );
    }

    return (
        <CardActions disableSpacing sx={dailyCardActionsSx}>
            {botPosition && (
                <PlayMaiaDialog
                    open={playBotOpen}
                    onClose={() => setPlayBotOpen(false)}
                    fen={botPosition.fen.trim()}
                    limitSeconds={botPosition.limitSeconds}
                    incrementSeconds={botPosition.incrementSeconds}
                    positionTitle={botPosition.title}
                    playerColor={turnColor(botPosition.fen)}
                    starterTaskId={stepTask?.task.id}
                />
            )}
            {botPosition && stepTask && !stepTask.done && (
                <Button
                    size='small'
                    variant='contained'
                    disableElevation
                    startIcon={<SmartToy />}
                    onClick={() => setPlayBotOpen(true)}
                    sx={dailyPrimaryButtonSx}
                >
                    {t('playBot')}
                </Button>
            )}
            {stepTask && !stepTask.done && (
                <Button
                    size='small'
                    variant={botPosition ? 'text' : 'contained'}
                    disableElevation
                    disabled={disabled}
                    onClick={() => onMarkDone(stepTask.task, markDoneName)}
                    sx={botPosition ? { textTransform: 'none' } : dailyPrimaryButtonSx}
                >
                    {t('markDone')}
                </Button>
            )}
            {link && !step.complete && (
                <Button
                    size='small'
                    variant={stepTask ? 'text' : 'contained'}
                    disableElevation
                    component={Link}
                    href={link.href}
                    sx={stepTask ? { textTransform: 'none' } : dailyPrimaryButtonSx}
                >
                    {t(link.label)}
                </Button>
            )}
            {stepTask && !link && !botPosition && (
                <Button
                    size='small'
                    onClick={() => onDetails(stepTask.task, markDoneName)}
                    sx={{ textTransform: 'none' }}
                >
                    {t('details')}
                </Button>
            )}

            {stepTask && (
                <Box component='span' sx={{ ml: 'auto' }}>
                    <DailyTimePill
                        worked={stepTask.record?.minutes ?? (stepTask.done ? expectedMinutes : 0)}
                        goal={stepTask.record?.minutes || expectedMinutes}
                        label={
                            stepTask.record
                                ? t('minutesSpent', { minutes: stepTask.record.minutes })
                                : undefined
                        }
                        onClick={
                            stepTask.done ? () => onDetails(stepTask.task, markDoneName) : undefined
                        }
                    />
                </Box>
            )}
        </CardActions>
    );
}

/**
 * The footer of every completed card on the starter plan: "Completed" on the left and
 * Undo on the right.
 */
function CompletedFooter({ disabled, onUndo }: { disabled: boolean; onUndo: () => void }) {
    const t = useTranslations('profile.trainingPlan.starter.actions');
    return (
        <Stack direction='row' sx={{ alignItems: 'center', gap: 1, width: 1, minHeight: 30 }}>
            <Stack direction='row' sx={{ alignItems: 'center', gap: 0.5, flexGrow: 1 }}>
                <Check sx={{ fontSize: '1rem', color: 'success.main' }} />
                <Typography variant='caption' sx={{ color: 'success.main', fontWeight: 600 }}>
                    {t('completed')}
                </Typography>
            </Stack>
            <Button
                size='small'
                color='inherit'
                disabled={disabled}
                onClick={onUndo}
                sx={{ textTransform: 'none', color: 'text.secondary', minWidth: 0 }}
            >
                {t('undo')}
            </Button>
        </Stack>
    );
}

/** The kinds of welcome task, each drawn with its own look. */
type WelcomeKind = 'guide' | 'video' | 'community' | 'task';

/** Discord's brand colour, for the Discord task's card. */
const DISCORD_COLOR = '#5865F2';

/** Works out what kind of welcome task this is from its name. */
function getWelcomeKind(task: Requirement): WelcomeKind {
    if (/discord/i.test(task.name)) {
        return 'community';
    }
    if (/watch|video/i.test(task.name)) {
        return 'video';
    }
    if (/intro|guide|read/i.test(task.name)) {
        return 'guide';
    }
    return 'task';
}

/**
 * Returns the title shown on a welcome task's card. A video's card already looks like
 * a video, so a leading "Watch" is dropped from its name ("Watch the Intro Video"
 * becomes "The Intro Video").
 */
function getWelcomeTitle(kind: WelcomeKind, name: string): string {
    if (kind !== 'video') {
        return name;
    }
    const title = name.replace(/^\s*watch\s+/i, '');
    return title ? title.charAt(0).toUpperCase() + title.slice(1) : name;
}

/**
 * The top of a welcome task's card, drawn to match what the task is: a play button on
 * a dark thumbnail for a video, an open book for a guide, the Discord logo for Discord.
 */
function WelcomeCardMedia({ kind, minutes }: { kind: WelcomeKind; minutes: number }) {
    const tTime = useTranslations('common');
    const welcomeColor = CategoryColors[RequirementCategory.Welcome];

    if (kind === 'video') {
        return (
            <Box
                sx={{
                    position: 'relative',
                    height: 96,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `linear-gradient(135deg, #1b1b24 0%, #2c2233 60%, ${welcomeColor}55 100%)`,
                }}
            >
                <Box
                    sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.92)',
                        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
                    }}
                >
                    <PlayArrowRounded sx={{ color: '#1b1b24', fontSize: '2rem' }} />
                </Box>
                <Box
                    sx={{
                        position: 'absolute',
                        right: 8,
                        bottom: 8,
                        px: 0.75,
                        borderRadius: 1,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#fff',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    }}
                >
                    {formatTime(minutes, tTime)}
                </Box>
            </Box>
        );
    }

    const { icon, background, color } = {
        community: {
            icon: <DiscordIcon sx={{ fontSize: '2.25rem' }} />,
            background: DISCORD_COLOR,
            color: '#fff',
        },
        guide: {
            icon: <AutoStories sx={{ fontSize: '2.25rem' }} />,
            background: `linear-gradient(135deg, ${welcomeColor}33 0%, ${welcomeColor}12 100%)`,
            color: welcomeColor,
        },
        task: {
            icon: <Flag sx={{ fontSize: '2.25rem' }} />,
            background: `${welcomeColor}1f`,
            color: welcomeColor,
        },
    }[kind];

    return (
        <Box
            sx={{
                height: 96,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background,
                color,
            }}
        >
            {icon}
        </Box>
    );
}

/**
 * A welcome task as a small card within the welcome step. Clicking it opens the task,
 * where the member reads or watches it and marks it completed; once done, the card
 * turns green with the time spent and can be undone.
 */
function WelcomeTaskCard({
    stepTask,
    disabled,
    onDetails,
    onUndo,
}: {
    stepTask: StarterStepTask;
    disabled: boolean;
    onDetails: (task: Requirement, name?: string) => void;
    onUndo: (task: Requirement) => void;
}) {
    const t = useTranslations('profile.trainingPlan.starter');
    const { task, done } = stepTask;
    const translated = useTranslatedRequirement(task) ?? task;
    const kind = getWelcomeKind(task);

    return (
        <Card variant='outlined' sx={dailyCardSx(done)} data-testid={`starter-task-${task.id}`}>
            <CardActionArea
                onClick={() => onDetails(task)}
                sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                }}
            >
                <Box sx={{ position: 'relative', opacity: done ? 0.6 : 1 }}>
                    <WelcomeCardMedia
                        kind={kind}
                        minutes={task.expectedMinutes || DEFAULT_TASK_MINUTES}
                    />
                    {done && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'success.main',
                                color: 'success.contrastText',
                            }}
                        >
                            <Check sx={{ fontSize: '1rem' }} />
                        </Box>
                    )}
                </Box>
                <Stack spacing={0.5} sx={{ p: 1.75, flexGrow: 1 }}>
                    <Typography
                        variant='caption'
                        sx={{
                            fontWeight: 600,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            lineHeight: 1,
                            color:
                                kind === 'community'
                                    ? DISCORD_COLOR
                                    : CategoryColors[RequirementCategory.Welcome],
                        }}
                    >
                        {t(`welcomeKinds.${kind}.label`)}
                    </Typography>
                    <Typography sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                        {getWelcomeTitle(kind, translated.name.replaceAll('{{count}}', '1'))}
                    </Typography>
                </Stack>
            </CardActionArea>

            <Stack
                direction='row'
                sx={{ alignItems: 'center', gap: 1, px: 1.75, pb: 1.5, minHeight: 40 }}
            >
                {done ? (
                    <CompletedFooter disabled={disabled} onUndo={() => onUndo(task)} />
                ) : (
                    <Button
                        size='small'
                        onClick={() => onDetails(task)}
                        endIcon={<ChevronRight />}
                        sx={{ textTransform: 'none', fontWeight: 600, px: 0, minWidth: 0 }}
                    >
                        {t(`welcomeKinds.${kind}.action`)}
                    </Button>
                )}
            </Stack>
        </Card>
    );
}

/** Asks how long a task took, then marks it done on the starter plan. */
function MarkDoneDialog({
    task,
    name,
    loading,
    onSave,
    onClose,
}: {
    task: Requirement;
    /** What to call the task, if not its own name. */
    name?: string;
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
                        {name ?? translated.name.replaceAll('{{count}}', '1')}
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
