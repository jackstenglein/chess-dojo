import { dojoCohorts } from '@/database/user';
import Icon from '@/style/Icon';
import { Chip } from '@mui/material';

/**
 * Renders a chip displaying the minimum round robin time control
 * for the given cohort.
 * @param cohort The cohort of the round robin tournament.
 */
export function TimeControlChip({ cohort }: { cohort: string }) {
    const timeControl = getTimeControl(cohort);
    if (!timeControl) {
        return null;
    }

    return (
        <Chip
            label={`${timeControl} min time control`}
            icon={<Icon name='Classical' />}
            color='secondary'
        />
    );
}

export function getTimeControl(cohort: string): string {
    const cohortIdx = dojoCohorts.indexOf(cohort);
    if (cohortIdx < 0) {
        return '';
    }

    if (cohortIdx < dojoCohorts.indexOf('800-900')) {
        return '30+0';
    }
    if (cohortIdx < dojoCohorts.indexOf('1200-1300')) {
        return '30+30';
    }
    if (cohortIdx < dojoCohorts.indexOf('1600-1700')) {
        return '45+30';
    }
    if (cohortIdx < dojoCohorts.indexOf('2000-2100')) {
        return '60+30';
    }
    return '90+30';
}
