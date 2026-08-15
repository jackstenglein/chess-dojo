import { useAuth } from '@/auth/Auth';
import { TimeFormat } from '@/database/user';
import {
    FormControl,
    FormControlLabel,
    FormHelperText,
    FormLabel,
    Input,
    InputAdornment,
    MenuItem,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { DatePicker, DateTimePicker } from '@mui/x-date-pickers-pro';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import { Frequency, RRule } from 'rrule';
import { DefaultTimezone } from '../../filters/TimezoneSelector';
import { getDefaultRRuleCount, RRuleEnds, RRuleOptions } from '../useEventEditor';

interface TimesFormSectionProps {
    start: DateTime | null;
    setStart: (value: DateTime | null) => void;
    startError?: string;

    end: DateTime | null;
    setEnd: (value: DateTime | null) => void;
    endError?: string;

    minEnd: DateTime | null;

    enableRecurrence?: boolean;
    rruleOptions: RRuleOptions;
    setRRuleOptions: (value: RRuleOptions) => void;
    countError?: string;
}

const TimesFormSection: React.FC<TimesFormSectionProps> = ({
    start,
    setStart,
    startError,
    end,
    setEnd,
    endError,
    minEnd,
    enableRecurrence,
    rruleOptions,
    setRRuleOptions,
    countError,
}) => {
    const { user } = useAuth();
    const t = useTranslations('calendar');
    const timeFormat = user?.timeFormat || TimeFormat.TwelveHour;
    let timezone = user?.timezoneOverride;
    if (!timezone || timezone === DefaultTimezone) {
        const timezoneOffset = new Date().getTimezoneOffset() / 60;
        timezone = timezoneOffset > 0 ? `UTC-${timezoneOffset}` : `UTC+${Math.abs(timezoneOffset)}`;
    }

    const onChangeFreq = (value: string | Frequency) => {
        if (value === 'never') {
            setRRuleOptions({ ...rruleOptions, freq: undefined });
        } else if (typeof value !== 'string') {
            setRRuleOptions({ ...rruleOptions, freq: value });
        }
    };

    const onChangeEnds = (value: RRuleEnds) => {
        setRRuleOptions({ ...rruleOptions, ends: value });
    };

    const onChangeCount = (value: string) => {
        let count = value === '' ? 0 : parseInt(value);
        if (isNaN(count) || count < 0) {
            count = 0;
        }
        setRRuleOptions({ ...rruleOptions, count });
    };

    return (
        <Stack>
            <Stack
                direction='row'
                sx={{
                    alignItems: 'baseline',
                }}
            >
                <DateTimePicker
                    value={start}
                    onChange={(value) => setStart(value)}
                    slotProps={{
                        textField: {
                            id: 'start-time',
                            fullWidth: true,
                            error: Boolean(startError),
                            helperText: startError,
                        },
                    }}
                    ampm={timeFormat === TimeFormat.TwelveHour}
                />

                <Typography sx={{ mx: 1 }}>{t('to')}</Typography>

                <DateTimePicker
                    value={end}
                    onChange={(value) => setEnd(value)}
                    slotProps={{
                        textField: {
                            id: 'end-time',
                            fullWidth: true,
                            error: Boolean(endError),
                            helperText: endError,
                        },
                    }}
                    minDateTime={minEnd === null ? undefined : minEnd}
                    ampm={timeFormat === TimeFormat.TwelveHour}
                />

                <Typography sx={{ ml: 1 }}>{timezone}</Typography>
            </Stack>

            {enableRecurrence && (
                <>
                    <TextField
                        select
                        value={rruleOptions.freq ?? 'never'}
                        onChange={(event) => onChangeFreq(event.target.value)}
                        sx={{ mt: 3 }}
                    >
                        <MenuItem value='never'>{t('doesNotRepeat')}</MenuItem>
                        <MenuItem value={RRule.DAILY}>{t('daily')}</MenuItem>
                        <MenuItem value={RRule.WEEKLY}>{t('weekly')}</MenuItem>
                        <MenuItem value={RRule.MONTHLY}>{t('monthly')}</MenuItem>
                    </TextField>

                    {rruleOptions.freq && (
                        <FormControl sx={{ mt: 3 }}>
                            <FormLabel>{t('ends')}</FormLabel>
                            <RadioGroup
                                value={rruleOptions.ends}
                                onChange={(e) => onChangeEnds(e.target.value as RRuleEnds)}
                                sx={{ rowGap: 1.5 }}
                            >
                                <FormControlLabel
                                    value={RRuleEnds.Never}
                                    control={<Radio />}
                                    label={t('never')}
                                />

                                <Stack
                                    direction='row'
                                    sx={{
                                        columnGap: 1.5,
                                        alignItems: 'center',
                                        ml: -1.375,
                                    }}
                                >
                                    <FormControlLabel
                                        value={RRuleEnds.Until}
                                        control={<Radio />}
                                        label={t('on')}
                                        sx={{ m: 0 }}
                                    />

                                    <DatePicker
                                        disabled={rruleOptions.ends !== RRuleEnds.Until}
                                        value={
                                            rruleOptions.until || start?.plus({ months: 1 }) || null
                                        }
                                        onChange={(value) =>
                                            setRRuleOptions({
                                                ...rruleOptions,
                                                until: value,
                                            })
                                        }
                                        slotProps={{
                                            textField: {
                                                variant: 'standard',
                                                sx: { maxWidth: '130px' },
                                            },
                                        }}
                                        minDate={minEnd === null ? undefined : minEnd}
                                    />
                                </Stack>

                                <Stack
                                    direction='row'
                                    sx={{
                                        columnGap: 1.5,
                                        alignItems: 'center',
                                        ml: -1.375,
                                    }}
                                >
                                    <FormControlLabel
                                        value={RRuleEnds.Count}
                                        control={<Radio />}
                                        label={t('after')}
                                        sx={{ m: 0 }}
                                    />

                                    <FormControl
                                        disabled={rruleOptions.ends !== RRuleEnds.Count}
                                        error={!!countError}
                                    >
                                        <Input
                                            id='input-slider'
                                            value={
                                                rruleOptions.count ??
                                                getDefaultRRuleCount(rruleOptions.freq)
                                            }
                                            size='small'
                                            onChange={(e) => onChangeCount(e.target.value)}
                                            endAdornment={
                                                <InputAdornment position='end'>
                                                    {t('occurrences')}
                                                </InputAdornment>
                                            }
                                            sx={{ maxWidth: '130px' }}
                                        />
                                        {countError && (
                                            <FormHelperText>{countError}</FormHelperText>
                                        )}
                                    </FormControl>
                                </Stack>
                            </RadioGroup>
                        </FormControl>
                    )}
                </>
            )}
        </Stack>
    );
};

export default TimesFormSection;
