import { useApi } from '@/api/Api';
import { useAuth } from '@/auth/Auth';
import { TimeFormat } from '@/database/user';
import { MenuItem, Stack, TextField } from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers';
import { useTranslations } from 'next-intl';
import { Filters, WeekDays } from './CalendarFilters';
import { TimezoneSelector } from './TimezoneSelector';

interface TimezoneFilterProps {
    filters: Filters;
}

const TimezoneFilter: React.FC<TimezoneFilterProps> = ({ filters }) => {
    const t = useTranslations('calendar');
    const api = useApi();
    const auth = useAuth();

    const {
        timezone,
        setTimezone,
        timeFormat,
        setTimeFormat,
        weekStartOn,
        setWeekStartOn,
        minHour,
        setMinHour,
        maxHour,
        setMaxHour,
    } = filters;

    const onChangeTimezone = (tz: string) => {
        setTimezone(tz);
        if (auth.user) {
            void api.updateUser({ timezoneOverride: tz });
        }
    };

    const onChangeTimeFormat = (format: TimeFormat) => {
        setTimeFormat(format);
        if (auth.user) {
            void api.updateUser({ timeFormat: format });
        }
    };

    const minHourNum = minHour?.hour || 0;
    const maxHourNum = (maxHour?.hour || 23) + 1;

    return (
        <Stack spacing={2.5}>
            <TextField
                label={t('timeFormat')}
                select
                data-testid='time-format-selector'
                value={timeFormat}
                onChange={(e) => onChangeTimeFormat(e.target.value as TimeFormat)}
                size='small'
            >
                <MenuItem value={TimeFormat.TwelveHour}>{t('twelveHour')}</MenuItem>
                <MenuItem value={TimeFormat.TwentyFourHour}>{t('twentyFourHour')}</MenuItem>
            </TextField>

            <TimezoneSelector
                value={timezone}
                onChange={onChangeTimezone}
                textFieldProps={{ size: 'small' }}
            />

            <TextField
                label={t('weekStart')}
                select
                value={weekStartOn}
                onChange={(e) => setWeekStartOn(parseInt(e.target.value) as WeekDays)}
                size='small'
            >
                <MenuItem value={0}>{t('sunday')}</MenuItem>
                <MenuItem value={1}>{t('monday')}</MenuItem>
                <MenuItem value={2}>{t('tuesday')}</MenuItem>
                <MenuItem value={3}>{t('wednesday')}</MenuItem>
                <MenuItem value={4}>{t('thursday')}</MenuItem>
                <MenuItem value={5}>{t('friday')}</MenuItem>
                <MenuItem value={6}>{t('saturday')}</MenuItem>
            </TextField>

            <TimePicker
                label={t('minHour')}
                views={['hours']}
                ampm={timeFormat === TimeFormat.TwelveHour}
                value={minHour}
                onChange={(v) => setMinHour(v)}
                maxTime={maxHour === null ? undefined : maxHour}
                slotProps={{
                    textField: {
                        size: 'small',
                        helperText: minHourNum >= maxHourNum ? t('minHourError') : undefined,
                    },
                }}
            />
            <TimePicker
                label={t('maxHour')}
                views={['hours']}
                ampm={timeFormat === TimeFormat.TwelveHour}
                value={maxHour}
                onChange={(v) => setMaxHour(v)}
                minTime={minHour === null ? undefined : minHour}
                slotProps={{
                    textField: {
                        size: 'small',
                        helperText: maxHourNum <= minHourNum ? t('maxHourError') : undefined,
                    },
                }}
            />
        </Stack>
    );
};

export default TimezoneFilter;
