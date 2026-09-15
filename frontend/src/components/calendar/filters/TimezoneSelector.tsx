import { MenuItem, TextField, TextFieldProps } from '@mui/material';
import { useTranslations } from 'next-intl';

export const DefaultTimezone = 'DEFAULT';

function getTimezoneOptions() {
    const options = [];
    for (let i = -12; i <= 14; i++) {
        const displayLabel = i < 0 ? `UTC${i}` : `UTC+${i}`;
        const value = i <= 0 ? `Etc/GMT+${Math.abs(i)}` : `Etc/GMT-${i}`;
        options.push(
            <MenuItem key={i} value={value}>
                {displayLabel}
            </MenuItem>,
        );
    }
    return options;
}

export const TimezoneSelector = ({
    label,
    value,
    onChange,
    textFieldProps,
}: {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    textFieldProps?: TextFieldProps;
}) => {
    const t = useTranslations('common');
    const timezoneOffset = new Date().getTimezoneOffset() / 60;
    const browserDefaultLabel =
        timezoneOffset > 0 ? `UTC-${timezoneOffset}` : `UTC+${Math.abs(timezoneOffset)}`;

    return (
        <TextField
            label={label ?? t('timezone')}
            select
            data-testid='timezone-selector'
            value={value}
            onChange={(e) => onChange(e.target.value)}
            {...textFieldProps}
        >
            <MenuItem value={DefaultTimezone}>
                {t('browserDefault', { offset: browserDefaultLabel })}
            </MenuItem>
            {getTimezoneOptions()}
        </TextField>
    );
};
