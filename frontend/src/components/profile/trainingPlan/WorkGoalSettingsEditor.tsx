import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { WeekDays } from '@/components/calendar/filters/CalendarFilters';
import { WorkGoalHistory, WorkGoalSettings } from '@/database/user';
import { Settings } from '@mui/icons-material';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    FormLabel,
    Grid,
    MenuItem,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { Fragment, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { TimeProgressChip } from './TimeProgressChip';
import { DAY_NAMES, DEFAULT_WORK_GOAL } from './workGoal';

const NUMBER_REGEX = /^[0-9]*$/;

/** Renders an editor that allows the user to update their work goal settings. */
export function WorkGoalSettingsEditor({
    currentGoal,
    currentValue,
    initialWeekStart = 0,
    workGoal = DEFAULT_WORK_GOAL,
    workGoalHistory = [],
    disabled,
}: {
    /** The current goal to display in the chip that opens the editor. */
    currentGoal: number;
    /** The current value to display in the chip that opens the editor. */
    currentValue: number;
    /** The initial day the week starts on. */
    initialWeekStart?: WeekDays;
    /** The initial work goal settings. If undefined, the default settings will be used. */
    workGoal?: WorkGoalSettings;
    /** The user's history of the work goal. */
    workGoalHistory?: WorkGoalHistory[];
    /** Whether the editor is disabled. */
    disabled: boolean;
}) {
    const t = useTranslations('profile.trainingPlan.workGoal');
    const tCommon = useTranslations('profile.trainingPlan.common');
    const [open, setOpen] = useState(false);
    const api = useApi();
    const request = useRequest();

    const [originalWeekStart] = useLocalStorage<WeekDays>('calendarFilters.weekStartOn', 0);

    const [weekStart, setWeekStart] = useState(initialWeekStart ?? originalWeekStart);
    const timePerDay = useTimePerDay(workGoal);
    const minutesPerWeek = timePerDay.reduce((sum, t) => sum + t.total, 0);

    const onClose = () => setOpen(false);

    const onSave = async () => {
        let error = false;
        for (const timeEditor of timePerDay) {
            const newErrors: Record<string, string> = {};
            if (!NUMBER_REGEX.test(timeEditor.hours)) {
                newErrors.hours = t('hoursError');
            }
            if (!NUMBER_REGEX.test(timeEditor.minutes)) {
                newErrors.minutes = t('minutesError');
            }
            timeEditor.setErrors(newErrors);
            error = error || Object.keys(newErrors).length > 0;
        }

        if (error) {
            return;
        }

        let newWorkGoalHistory: WorkGoalHistory[] | undefined = undefined;
        if (
            workGoalHistory.length === 0 ||
            workGoalHistory
                .at(-1)
                ?.workGoal.minutesPerDay.some((min, i) => timePerDay[i].total !== min)
        ) {
            newWorkGoalHistory = workGoalHistory.concat({
                date: new Date().toISOString(),
                workGoal: {
                    minutesPerDay: timePerDay.map((t) => t.total),
                },
            });
        }
        try {
            request.onStart();
            await api.updateUser({
                weekStart,
                workGoal: {
                    minutesPerDay: timePerDay.map((t) => t.total),
                },
                workGoalHistory: newWorkGoalHistory,
            });
            request.onSuccess();
            onClose();
        } catch (err) {
            request.onFailure(err);
        }
    };

    return (
        <>
            <Tooltip title={disabled ? undefined : t('editGoalTooltip')}>
                <TimeProgressChip
                    goal={currentGoal}
                    value={currentValue}
                    slotProps={{
                        chip: {
                            deleteIcon: <Settings />,
                            onDelete: disabled ? undefined : () => setOpen(true),
                            onClick: disabled ? undefined : () => setOpen(true),
                        },
                    }}
                />
            </Tooltip>
            <Dialog open={open} onClose={request.isLoading() ? undefined : onClose} fullWidth>
                <RequestSnackbar request={request} />

                <DialogContent>
                    <TextField
                        label={t('startWeekOn')}
                        select
                        value={weekStart}
                        onChange={(e) => setWeekStart(parseInt(e.target.value) as WeekDays)}
                        fullWidth
                        sx={{ mb: 3 }}
                    >
                        <MenuItem value={0}>{t('Sunday')}</MenuItem>
                        <MenuItem value={1}>{t('Monday')}</MenuItem>
                        <MenuItem value={2}>{t('Tuesday')}</MenuItem>
                        <MenuItem value={3}>{t('Wednesday')}</MenuItem>
                        <MenuItem value={4}>{t('Thursday')}</MenuItem>
                        <MenuItem value={5}>{t('Friday')}</MenuItem>
                        <MenuItem value={6}>{t('Saturday')}</MenuItem>
                    </TextField>

                    <Grid
                        container
                        sx={{
                            alignItems: 'baseline',
                            rowGap: 2,
                        }}
                    >
                        <Grid
                            size={12}
                            sx={{
                                mt: 1,
                            }}
                        >
                            <FormLabel>{t('workGoalLabel')}</FormLabel>
                        </Grid>

                        {new Array(7).fill(0).map((_, i) => {
                            const dayIndex = (weekStart + i) % 7;
                            const day = DAY_NAMES[dayIndex];
                            const time = timePerDay[dayIndex];
                            return (
                                <Fragment key={day}>
                                    <Grid size={{ xs: 4.5, sm: 3 }}>
                                        <Typography>{t(day)}</Typography>
                                    </Grid>

                                    <Grid size={{ xs: 7.5, sm: 9 }}>
                                        <Stack
                                            direction='row'
                                            sx={{
                                                gap: { xs: 0.5, sm: 1 },
                                            }}
                                        >
                                            <TextField
                                                label={tCommon('hours')}
                                                value={time.hours}
                                                onChange={(e) => time.setHours(e.target.value)}
                                                error={!!time.errors.hours}
                                                helperText={time.errors.hours}
                                            />
                                            <TextField
                                                label={tCommon('minutes')}
                                                value={time.minutes}
                                                onChange={(e) => time.setMinutes(e.target.value)}
                                                error={!!time.errors.minutes}
                                                helperText={time.errors.minutes}
                                            />
                                        </Stack>
                                    </Grid>
                                </Fragment>
                            );
                        })}

                        <Grid
                            size={12}
                            sx={{
                                mt: 1,
                            }}
                        >
                            <Typography>
                                {t('totalPerWeek', { time: formatTime(minutesPerWeek, t) })}
                            </Typography>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button disabled={request.isLoading()} onClick={onClose}>
                        {tCommon('cancel')}
                    </Button>
                    <Button loading={request.isLoading()} onClick={onSave}>
                        {tCommon('save')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

function useTimeEditor(initialMinutes: number) {
    const initialHours = Math.floor(initialMinutes / 60);
    initialMinutes = initialMinutes % 60;

    const [hours, setHours] = useState(`${initialHours}`);
    const [minutes, setMinutes] = useState(`${initialMinutes}`);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const total = 60 * (parseInt(hours) || 0) + (parseInt(minutes) || 0);

    return {
        hours,
        setHours,
        minutes,
        setMinutes,
        errors,
        setErrors,
        total,
    };
}

function useTimePerDay(workGoal: WorkGoalSettings) {
    return [
        useTimeEditor(workGoal.minutesPerDay[0]),
        useTimeEditor(workGoal.minutesPerDay[1]),
        useTimeEditor(workGoal.minutesPerDay[2]),
        useTimeEditor(workGoal.minutesPerDay[3]),
        useTimeEditor(workGoal.minutesPerDay[4]),
        useTimeEditor(workGoal.minutesPerDay[5]),
        useTimeEditor(workGoal.minutesPerDay[6]),
    ];
}

function formatTime(
    timeMinutes: number,
    t: ReturnType<typeof useTranslations<'profile.trainingPlan.workGoal'>>,
): string {
    const hours = Math.floor(timeMinutes / 60);
    const minutes = timeMinutes % 60;

    const hoursStr = t('hoursDisplay', { hours });
    const minutesStr = t('minutesDisplay', { minutes });
    return `${hoursStr} ${minutesStr}`.trim();
}
