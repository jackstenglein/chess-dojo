import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { useTimelineContext } from '@/components/profile/activity/useTimeline';
import { TimerContext } from '@/components/timer/TimerContext';
import {
    CustomTask,
    formatTime,
    getCurrentCount,
    isRequirement,
    Requirement,
    RequirementProgress,
    ScoreboardDisplay,
} from '@/database/requirement';
import { TimeFormat } from '@/database/user';
import { History, InfoOutlined } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    DialogActions,
    DialogContent,
    FormControlLabel,
    IconButton,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers-pro';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import { use, useState } from 'react';
import { SectionLabel } from './SectionLabel';
import { Stepper } from './Stepper';
import { TaskDialogView } from './TaskDialog';
import { getTaskUnit } from './taskUnit';

/** How much the −/+ buttons change the time by, in minutes. */
const TIME_STEP_MINUTES = 5;
const TIME_WARNING_THRESHOLD_MINS = 60 * 5;
/** The preset times offered under the time stepper, in minutes. */
const QUICK_ADD_MINUTES = [15, 30, 60];
const SECONDS_PER_HOUR = 3600;

interface ProgressUpdaterProps {
    requirement: Requirement | CustomTask;
    progress?: RequirementProgress;
    cohort: string;
    onClose: () => void;
    setView?: (view: TaskDialogView) => void;
    /** Time to prefill when no timer is running for this task, in minutes. */
    initialMinutes?: number;
}

export const ProgressUpdater = ({
    requirement,
    progress,
    cohort,
    onClose,
    setView,
    initialMinutes,
}: ProgressUpdaterProps) => {
    const t = useTranslations('profile.trainingPlan.progressUpdater');
    const tCommon = useTranslations('profile.trainingPlan.common');
    const tTime = useTranslations('common');
    const tSlider = useTranslations('profile.trainingPlan.inputSlider');
    const { user } = useAuth();
    const api = useApi();
    const { entries, onNewEntry } = useTimelineContext();

    const totalCount = requirement.counts[cohort] || 0;
    const currentCount = getCurrentCount({ cohort, requirement, progress, timeline: entries });

    // Counts are edited as units done past the task's start, matching the card:
    // a task starting at puzzle #307 shows 0 until puzzle #307 is solved.
    const startCount = requirement.startCount || 0;
    const [value, setValue] = useState<number>(Math.max(currentCount - startCount, 0));
    const maxValue = Math.max(totalCount - startCount, 0);
    const unit = getTaskUnit(requirement);
    const [markComplete, setMarkComplete] = useState(true);
    const [date, setDate] = useState<DateTime | null>(
        // Rounded down to the hour, a tidier default than the current minute.
        DateTime.now().startOf('hour'),
    );

    const { task: timerTask, onClear: onClearTimer, timerSeconds } = use(TimerContext);
    let timerHours = Math.floor(timerSeconds / SECONDS_PER_HOUR);
    let timerMinutes = Math.floor((timerSeconds % SECONDS_PER_HOUR) / 60);
    if (timerTask && timerTask.id !== requirement.id) {
        timerHours = 0;
        timerMinutes = 0;
    }
    if (!timerHours && !timerMinutes && initialMinutes) {
        timerHours = Math.floor(initialMinutes / 60);
        timerMinutes = initialMinutes % 60;
    }
    // The time being logged, in minutes. Below zero removes time from the task.
    const [addedTime, setAddedTime] = useState(60 * timerHours + timerMinutes);
    const [notes, setNotes] = useState('');
    const request = useRequest();

    const isCheckbox =
        requirement.scoreboardDisplay === ScoreboardDisplay.Hidden ||
        requirement.scoreboardDisplay === ScoreboardDisplay.Checkbox;
    const isSlider =
        requirement.scoreboardDisplay === ScoreboardDisplay.ProgressBar ||
        requirement.scoreboardDisplay === ScoreboardDisplay.Unspecified ||
        requirement.scoreboardDisplay === ScoreboardDisplay.Yearly;
    const isNonDojo = requirement.scoreboardDisplay === ScoreboardDisplay.NonDojo;
    const isMinutes = requirement.scoreboardDisplay === ScoreboardDisplay.Minutes;
    const useTwelveHourClock = user?.timeFormat !== TimeFormat.TwentyFourHour;

    const previousTime = progress?.minutesSpent[cohort] ?? 0;
    const subtract = addedTime < 0;
    const enteredTime = Math.abs(addedTime);
    const totalTime = previousTime + addedTime;

    /**
     * Changes the time being logged by the given number of minutes. Going below zero
     * removes time from the task instead, down to what has already been logged.
     */
    const onQuickAdd = (change: number) => onSetTime(addedTime + change);

    /** Sets the time being logged. Removing time can't take the task's total below zero. */
    const onSetTime = (minutes: number) => setAddedTime(Math.max(minutes, -previousTime));

    const onSubmit = () => {
        let newCount = value + startCount;
        if (isMinutes) {
            newCount = totalTime;
        } else if (isNonDojo) {
            newCount = 0;
        } else if (isCheckbox) {
            if (markComplete) {
                newCount = totalCount;
            } else {
                newCount = 0;
            }
        }

        request.onStart();
        api.updateUserProgress({
            cohort,
            requirementId: requirement.id,
            previousCount: currentCount,
            newCount: newCount,
            incrementalMinutesSpent: addedTime,
            date,
            notes,
        })
            .then((resp) => {
                trackEvent(EventType.UpdateProgress, {
                    requirement_id: requirement.id,
                    requirement_name: requirement.name,
                    is_custom_requirement: !isRequirement(requirement),
                    dojo_cohort: cohort,
                    previous_count: currentCount,
                    new_count: newCount,
                    incremental_minutes: addedTime,
                });
                onNewEntry(resp.data.timelineEntry);
                onClose();
                setAddedTime(0);
                request.reset();
                // Only clear the timer when it was tracking this task or not specific to a task.
                if (!timerTask || timerTask.id === requirement.id) {
                    onClearTimer();
                }
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return (
        <>
            <DialogContent sx={{ pt: '4px !important' }}>
                <Stack spacing={2.5}>
                    {isSlider && (
                        <Section label={unit || tSlider('progressCount')}>
                            <Stepper
                                value={`${value}`}
                                onChange={(text) =>
                                    // Kept between 0 and the goal; a typed "-1" becomes 0.
                                    setValue(
                                        Math.min(
                                            Math.max(
                                                parseInt(text.replace(/[^0-9-]/g, '')) || 0,
                                                0,
                                            ),
                                            maxValue,
                                        ),
                                    )
                                }
                                onDecrement={() => setValue((v) => Math.max(v - 1, 0))}
                                onIncrement={() => setValue((v) => Math.min(v + 1, maxValue))}
                                decrementDisabled={value <= 0}
                                incrementDisabled={value >= maxValue}
                                unit={`/ ${maxValue}`}
                                label={unit || tSlider('count')}
                                decrementLabel={tSlider('decrement')}
                                incrementLabel={tSlider('increment')}
                                primary
                                data-testid='task-updater-count'
                            />
                        </Section>
                    )}

                    {isCheckbox && (
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={markComplete}
                                    onChange={(event) => setMarkComplete(event.target.checked)}
                                />
                            }
                            label={t('markComplete')}
                        />
                    )}

                    <Section
                        label={t('timeSpent')}
                        aside={
                            <Box
                                component='span'
                                sx={{ color: subtract ? 'warning.main' : undefined }}
                                data-testid='task-updater-total-time'
                            >
                                {t('totalTimeChange', {
                                    before: formatTime(previousTime, tTime),
                                    after: formatTime(totalTime, tTime),
                                })}
                            </Box>
                        }
                    >
                        <Stack spacing={1}>
                            <Stepper
                                value={`${addedTime}`}
                                onChange={(text) =>
                                    onSetTime(parseInt(text.replace(/[^0-9-]/g, '')) || 0)
                                }
                                onDecrement={() => onQuickAdd(-TIME_STEP_MINUTES)}
                                onIncrement={() => onQuickAdd(TIME_STEP_MINUTES)}
                                decrementDisabled={addedTime <= -previousTime}
                                unit={t('minutesShort')}
                                label={tCommon('minutes')}
                                decrementLabel={t('removeTime')}
                                incrementLabel={t('addTime')}
                                warning={subtract}
                                data-testid='task-updater-minutes'
                            />
                            <ToggleButtonGroup
                                exclusive
                                fullWidth
                                size='small'
                                value={addedTime}
                                onChange={(_, minutes: number | null) =>
                                    minutes !== null && onSetTime(minutes)
                                }
                                sx={{
                                    '& .MuiToggleButton-root': {
                                        textTransform: 'none',
                                        py: 0.5,
                                        color: 'text.secondary',
                                        borderColor: 'divider',
                                    },
                                    '& .Mui-selected': { color: 'text.primary !important' },
                                }}
                            >
                                {QUICK_ADD_MINUTES.map((quickMinutes) => (
                                    <ToggleButton
                                        key={quickMinutes}
                                        value={quickMinutes}
                                        data-testid={`task-updater-quick-add-${quickMinutes}`}
                                    >
                                        {formatTime(quickMinutes, tTime)}
                                    </ToggleButton>
                                ))}
                            </ToggleButtonGroup>
                        </Stack>
                    </Section>

                    {enteredTime > TIME_WARNING_THRESHOLD_MINS && (
                        <Alert severity='warning'>{t('largeTimeWarning')}</Alert>
                    )}

                    <Section label={tCommon('date')}>
                        <DateTimePicker
                            disableFuture
                            value={date}
                            onChange={setDate}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    size: 'small',
                                    'aria-label': tCommon('date'),
                                },
                            }}
                            ampm={useTwelveHourClock}
                        />
                    </Section>

                    <Section label={tCommon('comments')}>
                        <TextField
                            placeholder={tCommon('commentsPlaceholder')}
                            multiline
                            size='small'
                            minRows={2}
                            maxRows={4}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            slotProps={{ htmlInput: { 'aria-label': tCommon('comments') } }}
                        />
                    </Section>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
                {setView && (
                    <Stack direction='row' sx={{ mr: 'auto', ml: -1 }}>
                        <Tooltip title={tCommon('taskDetails')}>
                            <IconButton
                                aria-label={tCommon('taskDetails')}
                                onClick={() => setView(TaskDialogView.Details)}
                                disabled={request.isLoading()}
                                sx={{ color: 'text.secondary' }}
                            >
                                <InfoOutlined fontSize='small' />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={tCommon('showHistory')}>
                            <IconButton
                                aria-label={tCommon('showHistory')}
                                onClick={() => setView(TaskDialogView.History)}
                                disabled={request.isLoading()}
                                sx={{ color: 'text.secondary' }}
                                data-testid='task-updater-show-history-button'
                            >
                                <History fontSize='small' />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                )}
                <Button
                    color='inherit'
                    onClick={onClose}
                    disabled={request.isLoading()}
                    sx={{ textTransform: 'none', ml: setView ? 0 : 'auto' }}
                >
                    {tCommon('cancel')}
                </Button>
                <Button
                    variant='contained'
                    disableElevation
                    data-testid='task-updater-save-button'
                    loading={request.isLoading()}
                    onClick={onSubmit}
                    sx={{ borderRadius: 1.5, px: 2.5, textTransform: 'none', fontWeight: 600 }}
                >
                    {tCommon('update')}
                </Button>
            </DialogActions>

            <RequestSnackbar request={request} />
        </>
    );
};

/**
 * One section of the form: a small label (and, on its right, an optional aside such
 * as a running total) above its control.
 */
function Section({
    label,
    aside,
    children,
}: {
    label: string;
    aside?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <Stack spacing={0.75}>
            <Stack
                direction='row'
                sx={{ alignItems: 'baseline', justifyContent: 'space-between', gap: 2 }}
            >
                <SectionLabel>{label}</SectionLabel>
                {aside && (
                    <Typography
                        variant='caption'
                        sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
                    >
                        {aside}
                    </Typography>
                )}
            </Stack>
            {children}
        </Stack>
    );
}
