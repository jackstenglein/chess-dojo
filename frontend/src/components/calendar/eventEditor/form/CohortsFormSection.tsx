import MultipleSelectChip from '@/components/ui/MultipleSelectChip';
import { ALL_COHORTS, dojoCohorts } from '@/database/user';
import CohortIcon from '@/scoreboard/CohortIcon';

interface CohortsFormSectionProps {
    placeholder: string;
    allCohorts: boolean;
    setAllCohorts: (value: boolean) => void;
    cohorts: Record<string, boolean>;
    setCohort: (cohort: string, value: boolean) => void;
    error?: string;
    helperText?: string;
}

const CohortsFormSection: React.FC<CohortsFormSectionProps> = ({
    placeholder,
    helperText,
    allCohorts,
    setAllCohorts,
    cohorts,
    setCohort,
    error,
}) => {
    const selectedCohorts = allCohorts
        ? [ALL_COHORTS]
        : Object.keys(cohorts).filter((c) => cohorts[c]);

    const onChangeCohort = (newCohorts: string[]) => {
        const addedCohorts = newCohorts.filter((c) => !selectedCohorts.includes(c));
        if (addedCohorts.includes(ALL_COHORTS)) {
            setAllCohorts(true);
            dojoCohorts.forEach((c) => setCohort(c, false));
        } else {
            setAllCohorts(false);
            dojoCohorts.forEach((c) => setCohort(c, false));
            newCohorts.forEach((c) => {
                if (c !== ALL_COHORTS) {
                    setCohort(c, true);
                }
            });
        }
    };

    return (
        <MultipleSelectChip
            selected={selectedCohorts}
            setSelected={onChangeCohort}
            options={[ALL_COHORTS, ...dojoCohorts].map((opt) => ({
                value: opt,
                label: opt === ALL_COHORTS ? 'All Cohorts' : opt,
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
            sx={{ width: 1 }}
            error={Boolean(error)}
            helperText={error || helperText}
            data-testid='cohort-selector'
            displayEmpty={placeholder}
        />
    );
};

export default CohortsFormSection;
