import { ALL_COHORTS, compareCohorts, dojoCohorts } from '@/database/user';
import CohortIcon from '@/scoreboard/CohortIcon';
import { MenuItem, TextField, TextFieldProps } from '@mui/material';
import { useTranslations } from 'next-intl';
import MultipleSelectChip, { MultipleSelectChipProps } from './MultipleSelectChip';

interface MultipleCohortSelectProps extends Omit<MultipleSelectChipProps, 'options'> {
    multiple: true;
}

type SingleCohortSelectProps = Omit<TextFieldProps, 'select'> & {
    multiple: false;
};

type CohortSelectProps = SingleCohortSelectProps | MultipleCohortSelectProps;

export function CohortSelect(props: CohortSelectProps) {
    const t = useTranslations('ui.cohortSelect');
    if (props.multiple) {
        const onChangeCohort = (newCohorts: string[]) => {
            const addedCohorts = newCohorts.filter((c) => !props.selected.includes(c));
            let finalCohorts = [];
            if (addedCohorts.includes(ALL_COHORTS)) {
                finalCohorts = [ALL_COHORTS];
            } else {
                finalCohorts = newCohorts.filter((c) => c !== ALL_COHORTS).sort(compareCohorts);
            }

            props.setSelected(finalCohorts);
        };

        return (
            <MultipleSelectChip
                options={[ALL_COHORTS, ...dojoCohorts].map((opt) => ({
                    value: opt,
                    label: opt === ALL_COHORTS ? t('allCohorts') : opt,
                    icon: (
                        <CohortIcon
                            cohort={opt}
                            size={25}
                            sx={{ marginRight: '0.6rem' }}
                            tooltip=''
                            color='primary'
                        />
                    ),
                }))}
                {...props}
                setSelected={onChangeCohort}
            />
        );
    }

    return (
        <TextField select {...props}>
            {dojoCohorts.map((option) => (
                <MenuItem key={option} value={option}>
                    <CohortIcon
                        cohort={option}
                        sx={{ marginRight: '0.6rem', verticalAlign: 'middle' }}
                        tooltip=''
                    />{' '}
                    {option}
                </MenuItem>
            ))}
        </TextField>
    );
}
