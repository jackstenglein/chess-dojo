import { SUPPORTED_LOCALES } from '@/i18n/locales';
import { MenuItem, TextField } from '@mui/material';
import { useTranslations } from 'next-intl';

export const LanguageSelector = ({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) => {
    const t = useTranslations('common');

    return (
        <TextField
            label={t('language')}
            select
            data-testid='language-selector'
            value={value}
            onChange={(e) => onChange(e.target.value)}
        >
            {SUPPORTED_LOCALES.map((locale) => (
                <MenuItem key={locale.code} value={locale.code}>
                    {locale.label}
                </MenuItem>
            ))}
        </TextField>
    );
};
