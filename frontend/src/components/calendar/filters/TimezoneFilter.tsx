import { useApi } from '@/api/Api';
import { useAuth } from '@/auth/Auth';
import { TimeFormat } from '@/database/user';
import { MenuItem, Stack, TextField } from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers';
import { Filters, WeekDays } from './CalendarFilters';
import { TimezoneSelector } from './TimezoneSelector';

interface TimezoneFilterProps {
    filters: Filters;
}

const TimezoneFilter: React.FC<TimezoneFilterProps> = ({ filters }) => {
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
                label='Time Format'
                select
                data-testid='time-format-selector'
                value={timeFormat}
                onChange={(e) => onChangeTimeFormat(e.target.value as TimeFormat)}
                size='small'
            >
                <MenuItem value={TimeFormat.TwelveHour}>12 Hour</MenuItem>
                <MenuItem value={TimeFormat.TwentyFourHour}>24 Hour</MenuItem>
            </TextField>

            <TimezoneSelector
                value={timezone}
                onChange={onChangeTimezone}
                textFieldProps={{ size: 'small' }}
            />

            <TextField
                label='Week Start'
                select
                value={weekStartOn}
                onChange={(e) => setWeekStartOn(parseInt(e.target.value) as WeekDays)}
                size='small'
            >
                <MenuItem value={0}>Sunday</MenuItem>
                <MenuItem value={1}>Monday</MenuItem>
                <MenuItem value={2}>Tuesday</MenuItem>
                <MenuItem value={3}>Wednesday</MenuItem>
                <MenuItem value={4}>Thursday</MenuItem>
                <MenuItem value={5}>Friday</MenuItem>
                <MenuItem value={6}>Saturday</MenuItem>
            </TextField>

            <TimePicker
                label='Min Hour'
                views={['hours']}
                ampm={timeFormat === TimeFormat.TwelveHour}
                value={minHour}
                onChange={(v) => setMinHour(v)}
                maxTime={maxHour === null ? undefined : maxHour}
                slotProps={{
                    textField: {
                        size: 'small',
                        helperText:
                            minHourNum >= maxHourNum
                                ? 'Min hour cannot be greater than max hour'
                                : undefined,
                    },
                }}
            />
            <TimePicker
                label='Max Hour'
                views={['hours']}
                ampm={timeFormat === TimeFormat.TwelveHour}
                value={maxHour}
                onChange={(v) => setMaxHour(v)}
                minTime={minHour === null ? undefined : minHour}
                slotProps={{
                    textField: {
                        size: 'small',
                        helperText:
                            maxHourNum <= minHourNum
                                ? 'Max hour cannot be less than min hour'
                                : undefined,
                    },
                }}
            />
        </Stack>
    );
};

export default TimezoneFilter;
