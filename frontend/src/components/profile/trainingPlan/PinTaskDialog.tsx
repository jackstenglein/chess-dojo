import { formatTime } from '@/database/requirement';
import { PushPin } from '@mui/icons-material';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    FormControlLabel,
    Stack,
    Switch,
    SxProps,
    Theme,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { useLocale, useTranslations } from 'next-intl';
import { use, useMemo, useState } from 'react';
import { DEFAULT_PINNED_MINUTES } from './pinSchedule';
import { SectionLabel } from './SectionLabel';
import { Stepper } from './Stepper';
import { TaskDialogHeader, taskDialogPrimaryButtonSx } from './TaskDialogFrame';
import { taskDisplayName } from './taskDisplayName';
import { TrainingPlanContext } from './TrainingPlanTab';

const QUICK_MINUTES = [15, 30, 45, 60];
const STEP_MINUTES = 5;

/** The quiet toggle-button look the task dialog uses for its quick-time buttons. */
const toggleGroupSx: SxProps<Theme> = {
    '& .MuiToggleButton-root': {
        textTransform: 'none',
        py: 0.5,
        color: 'text.secondary',
        borderColor: 'divider',
    },
    '& .Mui-selected': { color: 'text.primary !important' },
};

/** The days: like the quick-time buttons, but a chosen day is filled in blue so it stands out. */
const dayToggleGroupSx: SxProps<Theme> = {
    '& .MuiToggleButton-root': {
        textTransform: 'none',
        py: 0.5,
        px: 0,
        color: 'text.secondary',
        borderColor: 'divider',
    },
    '& .MuiToggleButton-root.Mui-selected, & .MuiToggleButton-root.Mui-selected:hover': {
        color: 'primary.contrastText',
        backgroundColor: 'primary.main',
        fontWeight: 600,
    },
};

/**
 * Returns the short names of the days of the week in the given locale, indexed by
 * day (Sunday is 0; Saturday is 6).
 */
export function useShortDayNames(): string[] {
    const locale = useLocale();
    return useMemo(() => {
        const format = new Intl.DateTimeFormat(locale, { weekday: 'short' });
        // 2026-11-15 is a Sunday.
        return [0, 1, 2, 3, 4, 5, 6].map((i) => format.format(new Date(2026, 10, 15 + i)));
    }, [locale]);
}

/**
 * Lets the user pin a task to chosen days with a set time for each day, or change
 * or remove an existing pin. Suggested tasks then only fill the time left over.
 */
export function PinTaskDialog() {
    const { pinEditorTask: task, closePinEditor } = use(TrainingPlanContext);
    if (!task) {
        return null;
    }
    // Keyed by task so the form starts fresh for each task.
    return <PinTaskDialogForm key={task.id} onClose={closePinEditor} />;
}

function PinTaskDialogForm({ onClose }: { onClose: () => void }) {
    const t = useTranslations('profile.trainingPlan.pin');
    const tCommon = useTranslations('profile.trainingPlan.common');
    const tTime = useTranslations('common');
    const dayNames = useShortDayNames();
    const { pinEditorTask, user, pinnedTasks, savePin, togglePin } = use(TrainingPlanContext);
    const task = pinEditorTask;

    const isPinned = pinnedTasks.some((p) => p.id === task?.id);
    const saved = task ? user.pinnedTaskMinutes?.[task.id] : undefined;

    // Each day keeps its minutes while it is switched off, so turning it back on restores them.
    const [minutes, setMinutes] = useState<number[]>(() =>
        [0, 1, 2, 3, 4, 5, 6].map((d) => saved?.[d] || DEFAULT_PINNED_MINUTES),
    );
    const [selected, setSelected] = useState<number[]>(() =>
        saved ? [0, 1, 2, 3, 4, 5, 6].filter((d) => saved[d] > 0) : [0, 1, 2, 3, 4, 5, 6],
    );
    const [perDay, setPerDay] = useState(() => {
        const chosen = (saved ?? []).filter((m) => m > 0);
        return chosen.some((m) => m !== chosen[0]);
    });

    const days = useMemo(
        () => [0, 1, 2, 3, 4, 5, 6].map((i) => (i + (user.weekStart ?? 0)) % 7),
        [user.weekStart],
    );

    if (!task) {
        return null;
    }

    const selectedDays = days.filter((d) => selected.includes(d));
    const sharedMinutes = minutes[selectedDays[0] ?? days[0]];

    const onToggleDays = (_: unknown, value: number[]) => {
        if (!perDay) {
            // With one time for every day, a day switched on takes that time.
            setMinutes((current) => current.map((m, d) => (value.includes(d) ? sharedMinutes : m)));
        }
        setSelected(value);
    };

    const setAllMinutes = (value: number) => {
        setMinutes((current) => current.map(() => value));
    };

    const setDayMinutes = (day: number, value: number) => {
        setMinutes((current) => current.map((m, d) => (d === day ? value : m)));
    };

    const onSave = () => {
        savePin(
            task,
            minutes.map((m, d) => (selected.includes(d) ? m : 0)),
        );
        onClose();
    };

    const onUnpin = () => {
        togglePin(task);
        onClose();
    };

    const name = taskDisplayName({ task, cohort: user.dojoCohort });
    const valid = selectedDays.length > 0 && selectedDays.every((d) => minutes[d] > 0);

    return (
        <Dialog
            open
            onClose={onClose}
            fullWidth
            maxWidth='md'
            slotProps={{ paper: { sx: { maxWidth: 480 } } }}
            data-testid='pin-task-dialog'
        >
            <TaskDialogHeader
                category={task.category}
                title={name}
                caption={isPinned ? tCommon('editPin') : tCommon('pinToDaily')}
                onClose={onClose}
            />
            {/* Marks this as the pin dialog, next to the close button. */}
            <Box sx={{ position: 'absolute', top: 20, right: 56, display: 'flex' }} aria-hidden>
                <PushPin color='dojoOrange' fontSize='small' />
            </Box>
            <DialogContent sx={{ pt: 0.5 }}>
                <Stack spacing={2.5}>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                        {t('description')}
                    </Typography>

                    <Stack spacing={0.75}>
                        <SectionLabel>{t('days')}</SectionLabel>
                        <ToggleButtonGroup
                            value={selectedDays}
                            onChange={onToggleDays}
                            size='small'
                            fullWidth
                            aria-label={t('days')}
                            sx={dayToggleGroupSx}
                        >
                            {days.map((d) => (
                                <ToggleButton key={d} value={d} data-testid={`pin-day-${d}`}>
                                    {dayNames[d]}
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                    </Stack>

                    {selectedDays.length > 0 && (
                        <Stack spacing={0.75}>
                            <Stack
                                direction='row'
                                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                            >
                                <SectionLabel>{t('timePerDay')}</SectionLabel>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            size='small'
                                            checked={perDay}
                                            onChange={(e) => {
                                                setPerDay(e.target.checked);
                                                if (!e.target.checked) {
                                                    setAllMinutes(sharedMinutes);
                                                }
                                            }}
                                        />
                                    }
                                    label={
                                        <Typography
                                            variant='caption'
                                            sx={{ color: 'text.secondary' }}
                                        >
                                            {t('perDay')}
                                        </Typography>
                                    }
                                    sx={{ mr: 0 }}
                                />
                            </Stack>

                            {perDay ? (
                                <Stack spacing={1}>
                                    {selectedDays.map((d) => (
                                        <Stack
                                            key={d}
                                            direction='row'
                                            sx={{ alignItems: 'center', gap: 2 }}
                                        >
                                            <Typography
                                                variant='body2'
                                                sx={{
                                                    width: 48,
                                                    flexShrink: 0,
                                                    color: 'text.primary',
                                                }}
                                            >
                                                {dayNames[d]}
                                            </Typography>
                                            <MinutesStepper
                                                label={dayNames[d]}
                                                value={minutes[d]}
                                                onChange={(v) => setDayMinutes(d, v)}
                                                data-testid={`pin-minutes-${d}`}
                                            />
                                        </Stack>
                                    ))}
                                </Stack>
                            ) : (
                                <Stack spacing={1}>
                                    <MinutesStepper
                                        label={tCommon('minutes')}
                                        value={sharedMinutes}
                                        onChange={setAllMinutes}
                                        data-testid='pin-minutes'
                                    />
                                    <ToggleButtonGroup
                                        exclusive
                                        fullWidth
                                        size='small'
                                        value={sharedMinutes}
                                        onChange={(_, m: number | null) =>
                                            m !== null && setAllMinutes(m)
                                        }
                                        sx={toggleGroupSx}
                                    >
                                        {QUICK_MINUTES.map((m) => (
                                            <ToggleButton key={m} value={m}>
                                                {formatTime(m, tTime)}
                                            </ToggleButton>
                                        ))}
                                    </ToggleButtonGroup>
                                </Stack>
                            )}
                        </Stack>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
                {isPinned && (
                    <Button
                        color='error'
                        onClick={onUnpin}
                        sx={{ mr: 'auto', ml: -1, textTransform: 'none' }}
                    >
                        {t('unpin')}
                    </Button>
                )}
                <Button color='inherit' onClick={onClose} sx={{ textTransform: 'none' }}>
                    {tCommon('cancel')}
                </Button>
                <Button
                    variant='contained'
                    disableElevation
                    onClick={onSave}
                    disabled={!valid}
                    sx={taskDialogPrimaryButtonSx}
                >
                    {isPinned ? tCommon('save') : t('pin')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

/** The task dialog's minutes stepper: − and + move by 5 minutes. */
function MinutesStepper({
    label,
    value,
    onChange,
    'data-testid': dataTestId,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    'data-testid'?: string;
}) {
    const t = useTranslations('profile.trainingPlan.progressUpdater');
    return (
        <Stepper
            value={`${value}`}
            onChange={(text) => onChange(Math.max(0, parseInt(text.replace(/[^0-9]/g, '')) || 0))}
            onDecrement={() => onChange(Math.max(STEP_MINUTES, value - STEP_MINUTES))}
            onIncrement={() => onChange(value + STEP_MINUTES)}
            decrementDisabled={value <= STEP_MINUTES}
            unit={t('minutesShort')}
            label={label}
            decrementLabel={t('removeTime')}
            incrementLabel={t('addTime')}
            data-testid={dataTestId}
        />
    );
}
