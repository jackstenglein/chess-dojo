import { CustomTask, Requirement } from '@/database/requirement';
import { CategoryColors } from '@/style/ThemeProvider';
import { getSubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { SwapHoriz } from '@mui/icons-material';
import {
    Box,
    Button,
    IconButton,
    ListSubheader,
    Menu,
    MenuItem,
    Snackbar,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { use, useMemo, useState } from 'react';
import { getSwapCandidates } from '../swapTask';
import { taskDisplayName } from '../taskDisplayName';
import { TrainingPlanIcon } from '../TrainingPlanIcon';
import { TrainingPlanContext } from '../TrainingPlanTab';

/** The label for a task in the swap list: its category icon and name. */
function SwapOption({ task, cohort }: { task: Requirement | CustomTask; cohort: string }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Box sx={{ width: 18, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                <TrainingPlanIcon
                    category={task.category}
                    sx={{ fontSize: '1rem', color: CategoryColors[task.category] }}
                />
            </Box>
            <Typography variant='body2' noWrap>
                {taskDisplayName({ task, cohort })}
            </Typography>
        </Box>
    );
}

/**
 * Renders a button that swaps a task on today's plan for another task in the same
 * category, keeping its time. Sits beside the card's overflow menu.
 */
export function SwapTaskButton({ task }: { task: Requirement | CustomTask }) {
    const t = useTranslations('profile.trainingPlan.daily');
    const tCategory = useTranslations('enums.requirementCategory');
    const { user, requirements, timeline, skippedTaskIds, suggestionsByDay, swapTask } =
        use(TrainingPlanContext);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const category = tCategory.has(task.category) ? tCategory(task.category) : task.category;

    const candidates = useMemo(
        () =>
            getSwapCandidates({
                task,
                cohort: user.dojoCohort,
                requirements,
                customTasks: user.customTasks,
                progress: user.progress,
                timeline,
                todayIds: (suggestionsByDay[new Date().getDay()] ?? []).map((s) => s.task.id),
                skippedIds: skippedTaskIds,
                subscriptionTier: getSubscriptionTier(user),
            }),
        [task, user, requirements, timeline, suggestionsByDay, skippedTaskIds],
    );

    const label =
        candidates.length > 0 ? t('swapTooltip', { category }) : t('swapNone', { category });

    return (
        <>
            <Tooltip title={label}>
                {/* The span keeps the tooltip working while the button is disabled. */}
                <Box component='span' sx={{ position: 'absolute', top: 6, right: 38, zIndex: 1 }}>
                    <IconButton
                        size='small'
                        aria-label={label}
                        disabled={candidates.length === 0}
                        onClick={(e) => setAnchorEl(e.currentTarget)}
                        sx={{ color: 'text.secondary' }}
                        data-testid='swap-task-button'
                    >
                        <SwapHoriz fontSize='small' />
                    </IconButton>
                </Box>
            </Tooltip>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { maxHeight: 360, maxWidth: 360 } } }}
                data-testid='swap-task-menu'
            >
                <ListSubheader sx={{ lineHeight: 2.5, bgcolor: 'background.paper' }}>
                    {t('swapHeading', { category })}
                </ListSubheader>
                {candidates.map((candidate) => (
                    <MenuItem
                        key={candidate.id}
                        onClick={() => {
                            setAnchorEl(null);
                            swapTask(task.id, candidate.id);
                        }}
                        data-testid='swap-task-option'
                    >
                        <SwapOption task={candidate} cohort={user.dojoCohort} />
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
}

/** Confirms a swap and offers to undo it. */
export function SwapUndoSnackbar() {
    const t = useTranslations('profile.trainingPlan.daily');
    const tQuickLog = useTranslations('profile.trainingPlan.quickLog');
    const { user, requirements, allRequirements, lastSwap, undoSwap, clearLastSwap } =
        use(TrainingPlanContext);

    const nameOf = (id: string) => {
        const task =
            user.customTasks?.find((c) => c.id === id) ??
            requirements.find((r) => r.id === id) ??
            allRequirements.find((r) => r.id === id);
        return task ? taskDisplayName({ task, cohort: user.dojoCohort }) : '';
    };

    return (
        <Snackbar
            open={Boolean(lastSwap)}
            autoHideDuration={8000}
            onClose={(_, reason) => {
                if (reason !== 'clickaway') {
                    clearLastSwap();
                }
            }}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            message={
                lastSwap
                    ? t('swapped', { from: nameOf(lastSwap.fromId), to: nameOf(lastSwap.toId) })
                    : undefined
            }
            action={
                lastSwap && (
                    <Button
                        size='small'
                        color='secondary'
                        onClick={undoSwap}
                        data-testid='swap-undo'
                    >
                        {tQuickLog('undo')}
                    </Button>
                )
            }
            data-testid='swap-snackbar'
        />
    );
}
