import { CustomTask, Requirement } from '@/database/requirement';
import { ExpandMore, Undo } from '@mui/icons-material';
import { Button, Chip, Collapse, Snackbar, Stack } from '@mui/material';
import { useTranslations } from 'next-intl';
import { use, useState } from 'react';
import { GRADUATION_SKIP_ID, groupSkippedIds } from '../skippedTasks';
import { SCHEDULE_CLASSICAL_GAME_TASK_ID } from '../suggestedTasks';
import { taskDisplayName } from '../taskDisplayName';
import { TrainingPlanContext } from '../TrainingPlanTab';

/**
 * Returns a readable name for a group of skipped ids, or undefined if the ids no
 * longer match a task (for example, a custom task that has since been deleted).
 */
function useSkippedName() {
    const { user, allRequirements } = use(TrainingPlanContext);
    const tGraduation = useTranslations('profile.trainingPlan.graduationTask');
    const tSchedule = useTranslations('profile.trainingPlan.scheduleGame');

    return (group: string[]): string | undefined => {
        const id = group[0];
        if (id === GRADUATION_SKIP_ID) {
            return tGraduation('title', { cohort: user.dojoCohort });
        }
        if (id === SCHEDULE_CLASSICAL_GAME_TASK_ID) {
            return tSchedule('title');
        }
        const task: Requirement | CustomTask | undefined =
            user.customTasks?.find((t) => t.id === id) ?? allRequirements.find((r) => r.id === id);
        return task ? taskDisplayName({ task, cohort: user.dojoCohort }) : undefined;
    };
}

/**
 * Renders a collapsed row listing the tasks skipped this week, each of which can be
 * restored to the plan. Hidden when nothing is skipped.
 */
export function SkippedTasksRow() {
    const t = useTranslations('profile.trainingPlan.daily');
    const { skippedTaskIds, toggleSkip, isCurrentUser } = use(TrainingPlanContext);
    const getName = useSkippedName();
    const [open, setOpen] = useState(false);

    if (!isCurrentUser) {
        return null;
    }

    const groups = groupSkippedIds(skippedTaskIds ?? [])
        .map((group) => ({ group, name: getName(group) }))
        .filter((g): g is { group: string[]; name: string } => Boolean(g.name));

    if (groups.length === 0) {
        return null;
    }

    return (
        <Stack sx={{ mt: 1.5, alignItems: 'flex-start' }} data-testid='skipped-tasks'>
            <Button
                size='small'
                color='inherit'
                onClick={() => setOpen((v) => !v)}
                endIcon={
                    <ExpandMore
                        sx={{
                            transform: open ? 'rotate(180deg)' : undefined,
                            transition: 'transform 150ms',
                        }}
                    />
                }
                sx={{ color: 'text.secondary', textTransform: 'none' }}
                data-testid='skipped-tasks-toggle'
            >
                {t('skippedHeading', { count: groups.length })}
            </Button>
            <Collapse in={open}>
                <Stack direction='row' sx={{ flexWrap: 'wrap', gap: 1, pt: 1 }}>
                    {groups.map(({ group, name }) => (
                        <Chip
                            key={group.join(',')}
                            label={name}
                            variant='outlined'
                            deleteIcon={<Undo />}
                            onDelete={() => toggleSkip(...group)}
                            onClick={() => toggleSkip(...group)}
                            aria-label={t('restore', { name })}
                            data-testid='skipped-task-chip'
                        />
                    ))}
                </Stack>
            </Collapse>
        </Stack>
    );
}

/** Confirms a skip and offers to undo it. */
export function SkipUndoSnackbar() {
    const t = useTranslations('profile.trainingPlan.daily');
    const tQuickLog = useTranslations('profile.trainingPlan.quickLog');
    const { lastSkipped, clearLastSkipped, undoSkip } = use(TrainingPlanContext);
    const getName = useSkippedName();
    const name = lastSkipped ? getName(lastSkipped) : undefined;

    return (
        <Snackbar
            open={Boolean(lastSkipped)}
            autoHideDuration={8000}
            onClose={(_, reason) => {
                if (reason !== 'clickaway') {
                    clearLastSkipped();
                }
            }}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            message={name ? t('skippedToast', { name }) : undefined}
            action={
                lastSkipped && (
                    <Button
                        size='small'
                        color='secondary'
                        onClick={undoSkip}
                        data-testid='skip-undo'
                    >
                        {tQuickLog('undo')}
                    </Button>
                )
            }
            data-testid='skip-snackbar'
        />
    );
}
