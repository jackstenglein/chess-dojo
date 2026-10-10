import { dojoCohorts } from '@/database/user';
import { FormControl, InputLabel, MenuItem, Select, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

export interface CohortSwitchProps {
    cohorts: string[];
    value: string;
    /** The member's own cohort. Any other value is browsing. */
    own: string;
    onChange: (cohort: string) => void;
}

/** Picks the cohort the plan block shows. The state lives in the page, so it resets on every visit. */
export function CohortSwitch({ cohorts, value, own, onChange }: CohortSwitchProps) {
    const t = useTranslations('study.overview');
    // Always list the member's own cohort, even without a study, so they can switch back.
    const listed = dojoCohorts.filter((c) => c === own || c === value || cohorts.includes(c));
    const options = listed.includes(value) ? listed : [value, ...listed];
    return (
        <Stack direction='row' sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {value !== own && (
                <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                    data-testid='reader-viewing-other'
                >
                    {t('viewingOther', { cohort: value })}
                </Typography>
            )}
            <FormControl size='small' sx={{ minWidth: 160 }}>
                <InputLabel id='reader-cohort-switch-label'>{t('cohortSwitch')}</InputLabel>
                <Select
                    labelId='reader-cohort-switch-label'
                    label={t('cohortSwitch')}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    inputProps={{ 'data-testid': 'reader-cohort-switch' }}
                >
                    {options.map((cohort) => (
                        <MenuItem key={cohort} value={cohort}>
                            {cohort === own ? t('ownCohort', { cohort }) : cohort}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Stack>
    );
}
