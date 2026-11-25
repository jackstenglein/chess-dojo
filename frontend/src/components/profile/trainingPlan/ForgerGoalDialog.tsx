'use client';

import { useApi } from '@/api/Api';
import { useAuth } from '@/auth/Auth';
import {
    CustomTask,
    GoalPeriod,
    goalPeriod,
    goalPeriodLabel,
    ScoreboardDisplay,
} from '@/database/requirement';
import { dojoCohorts } from '@/database/user';
import {
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import { useState } from 'react';

/** The Dojo Tactics Forger's task on each user's training plan (kept in user.customTasks). */
export const TACTICS_FORGER_TASK_ID = 'dojo-tactics-forger';

/** The task's description on the training plan. */
export const TACTICS_FORGER_TASK_DESCRIPTION =
    'Time spent solving puzzles in the Dojo Tactics Forger, logged automatically. Use Set goal to pick your own goal in minutes.';

type Period = GoalPeriod | 'total';

/** Goal choices that fit each period, in minutes. */
const PRESETS: Record<Period, number[]> = {
    day: [15, 30, 45, 60],
    week: [60, 120, 180, 300],
    month: [300, 600, 900, 1200],
    total: [300, 600, 1200, 3000],
};

const PERIODS: [Period, string][] = [
    ['day', 'Per day'],
    ['week', 'Per week'],
    ['month', 'Per month'],
    ['total', 'Total'],
];

const fmtMinutes = (m: number) =>
    m < 60
        ? `${m} min`
        : m % 60
          ? `${Math.floor(m / 60)}h ${m % 60}m`
          : `${m / 60} hour${m === 60 ? '' : 's'}`;

/** The goal in minutes the user set on the Forger task, or 0 when it has none. */
export function forgerGoal(task: CustomTask | undefined, cohort: string | undefined): number {
    if (task?.scoreboardDisplay !== ScoreboardDisplay.Minutes) return 0;
    return task.counts[cohort ?? ''] ?? Object.values(task.counts)[0] ?? 0;
}

/**
 * Lets the user set (or clear) their own goal, in minutes, for the Dojo Tactics Forger task.
 * With a goal the task shows a progress bar of minutes played; without one it only logs time.
 */
export function ForgerGoalDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { user } = useAuth();
    const api = useApi();
    const task = user?.customTasks?.find((t) => t.id === TACTICS_FORGER_TASK_ID);
    const current = forgerGoal(task, user?.dojoCohort);
    const currentPeriod: Period = (task && goalPeriod(task)) || (current ? 'total' : 'week');
    const [period, setPeriod] = useState<Period>(currentPeriod);
    const [value, setValue] = useState(current ? String(current) : '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    if (!user || !task) return null;

    const save = async (goal: number) => {
        if (!Number.isInteger(goal) || goal < 0) {
            setError('Enter a whole number of minutes');
            return;
        }
        setSaving(true);
        const updated: CustomTask = {
            ...task,
            description: TACTICS_FORGER_TASK_DESCRIPTION,
            counts: Object.fromEntries(dojoCohorts.map((c) => [c, goal])),
            scoreboardDisplay: goal > 0 ? ScoreboardDisplay.Minutes : ScoreboardDisplay.NonDojo,
            // The period lives in the unit label; see goalPeriod().
            progressBarSuffix: period === 'total' ? 'Minutes' : `Minutes per ${period}`,
            updatedAt: new Date().toISOString(),
        };
        try {
            await api.updateUser({
                customTasks: (user.customTasks ?? []).map((t) => (t.id === task.id ? updated : t)),
            });
            onClose();
        } catch {
            setError('Couldn’t save your goal. Try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth='xs' fullWidth>
            <DialogTitle>Set your Tactics Forger goal</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                    Your time in the Dojo Tactics Forger is logged to your training plan
                    automatically. Pick a goal for each day, week or month (it starts over each
                    time), or for all time. Leave it empty to just log your time.
                </DialogContentText>
                <ToggleButtonGroup
                    exclusive
                    size='small'
                    fullWidth
                    value={period}
                    onChange={(_, p: Period | null) => {
                        if (!p) return;
                        setPeriod(p);
                        setValue('');
                    }}
                    sx={{
                        mb: 2,
                        '& .MuiToggleButton-root': {
                            textTransform: 'none',
                            whiteSpace: 'nowrap',
                            px: 0.5,
                        },
                    }}
                >
                    {PERIODS.map(([p, label]) => (
                        <ToggleButton key={p} value={p}>
                            {label}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
                <Stack direction='row' spacing={1} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
                    {PRESETS[period].map((m) => (
                        <Chip
                            key={m}
                            label={fmtMinutes(m)}
                            color={value === String(m) ? 'primary' : 'default'}
                            onClick={() => setValue(String(m))}
                        />
                    ))}
                </Stack>
                <TextField
                    label={`Goal in minutes ${period === 'total' ? '(all time)' : goalPeriodLabel(period).replace('today', 'per day').replace('this ', 'per ')}`}
                    type='number'
                    fullWidth
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value);
                        setError('');
                    }}
                    error={!!error}
                    helperText={
                        error ||
                        (current
                            ? `Current goal: ${fmtMinutes(current)} ${currentPeriod === 'total' ? 'in all' : `per ${currentPeriod}`}`
                            : 'No goal yet')
                    }
                    slotProps={{ htmlInput: { min: 0, step: 30 } }}
                />
            </DialogContent>
            <DialogActions
                sx={{ '& .MuiButton-root': { textTransform: 'none', whiteSpace: 'nowrap' } }}
            >
                {current > 0 && (
                    <Button color='error' disabled={saving} onClick={() => void save(0)}>
                        Remove goal
                    </Button>
                )}
                <Button disabled={saving} onClick={onClose}>
                    Not now
                </Button>
                <Button
                    variant='contained'
                    loading={saving}
                    onClick={() => void save(Number(value || '0'))}
                >
                    Save goal
                </Button>
            </DialogActions>
        </Dialog>
    );
}
