import { formatTime } from '@/database/requirement';
import { Alert, Button, Stack } from '@mui/material';
import { useTranslations } from 'next-intl';
import { use } from 'react';
import { getOverallocation, trimPinnedMinutes } from './pinSchedule';
import { useShortDayNames } from './PinTaskDialog';
import { TrainingPlanContext } from './TrainingPlanTab';

/**
 * Warns that the pinned tasks on a day need more time than the user planned for it,
 * and offers to raise the day's planned time or trim the tasks to fit. Renders
 * nothing when the day fits.
 */
export function OverbookedDayAlert({ dayIndex }: { dayIndex: number }) {
    const t = useTranslations('profile.trainingPlan.pin');
    const tTime = useTranslations('common');
    const dayNames = useShortDayNames();
    const { user, isCurrentUser, saveDayGoal, savePinnedTaskMinutes } = use(TrainingPlanContext);

    const overallocation = getOverallocation(user, dayIndex);
    if (!overallocation || !isCurrentUser) {
        return null;
    }
    const { allocated, goal } = overallocation;
    const day = dayNames[dayIndex];

    const onTrim = () => {
        savePinnedTaskMinutes(
            trimPinnedMinutes(user.pinnedTasks ?? [], user.pinnedTaskMinutes ?? {}, dayIndex, goal),
        );
    };

    return (
        <Alert
            severity='warning'
            sx={{ width: 1, alignItems: 'center' }}
            data-testid={`overbooked-day-${dayIndex}`}
        >
            <Stack spacing={1}>
                <span>
                    {t('overbookedDay', {
                        day,
                        allocated: formatTime(allocated, tTime),
                        goal: formatTime(goal, tTime),
                    })}
                </span>
                <Stack direction='row' sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <Button
                        size='small'
                        variant='outlined'
                        color='warning'
                        onClick={() => saveDayGoal(dayIndex, allocated)}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        {t('raiseGoal', { day, time: formatTime(allocated, tTime) })}
                    </Button>
                    <Button
                        size='small'
                        color='warning'
                        onClick={onTrim}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        {t('trimTasks', { time: formatTime(goal, tTime) })}
                    </Button>
                </Stack>
            </Stack>
        </Alert>
    );
}
