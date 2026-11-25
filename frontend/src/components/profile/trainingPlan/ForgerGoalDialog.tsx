'use client';

import { useApi } from '@/api/Api';
import { useAuth } from '@/auth/Auth';
import { CustomTask, ScoreboardDisplay } from '@/database/requirement';
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
} from '@mui/material';
import { useState } from 'react';

/** The Dojo Tactics Forger's task on each user's training plan (kept in user.customTasks). */
export const TACTICS_FORGER_TASK_ID = 'dojo-tactics-forger';

/** The task's description on the training plan. */
export const TACTICS_FORGER_TASK_DESCRIPTION =
    'Time spent solving puzzles in the Dojo Tactics Forger, logged automatically. Use Set goal to pick your own goal in minutes.';

const PRESETS = [300, 600, 1200, 3000];

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
            progressBarSuffix: 'Minutes',
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
                    automatically. Pick a goal in minutes to track it with a progress bar, or leave
                    it empty to just log your time.
                </DialogContentText>
                <Stack direction='row' spacing={1} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
                    {PRESETS.map((m) => (
                        <Chip
                            key={m}
                            label={`${m / 60} hours`}
                            color={value === String(m) ? 'primary' : 'default'}
                            onClick={() => setValue(String(m))}
                        />
                    ))}
                </Stack>
                <TextField
                    label='Goal (minutes)'
                    type='number'
                    fullWidth
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value);
                        setError('');
                    }}
                    error={!!error}
                    helperText={
                        error || (current ? `Current goal: ${current} minutes` : 'No goal yet')
                    }
                    slotProps={{ htmlInput: { min: 0, step: 30 } }}
                />
            </DialogContent>
            <DialogActions>
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
