import { compareCohorts } from '@/database/user';
import CohortIcon from '@/scoreboard/CohortIcon';
import { Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { SectionProps } from './section';

const GraduationSection = ({ review }: SectionProps) => {
    const t = useTranslations('profile.yearReview.graduations');

    if (!review.graduations || review.graduations.length === 0) {
        return null;
    }

    const count = review.graduations.length;

    const sorted = [...new Set(review.graduations)].sort(compareCohorts);

    return (
        <Stack alignItems='center'>
            <Typography
                variant='h6'
                fontWeight='800'
                fontSize='clamp(16px,3vw,32px)'
                textAlign='center'
            >
                {t('headerLine', { period: review.period, count })}
            </Typography>

            <Typography
                variant='h6'
                fontWeight='800'
                fontSize='clamp(14px,2vw,28px)'
                textAlign='center'
            >
                {t('congratulationsBelts', { count })}
            </Typography>

            <Stack
                direction='row'
                spacing={0.5}
                flexWrap='wrap'
                rowGap={1}
                justifyContent='center'
                mt={2}
            >
                {sorted.map((cohort) => (
                    <CohortIcon key={cohort} cohort={cohort} size={75} />
                ))}
            </Stack>
        </Stack>
    );
};

export default GraduationSection;
