import { useAuth } from '@/auth/Auth';
import { RatingSystem, formatRatingSystem } from '@/database/user';
import { YearReviewRatingData } from '@/database/yearReview';
import { Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { ReactNode } from 'react';
import { SectionProps } from '../section';
import RatingCard from './RatingCard';

const RatingsSection = ({ review }: SectionProps) => {
    const t = useTranslations('profile.yearReview.ratings');
    const tRating = useTranslations('enums.ratingSystem');
    const viewer = useAuth().user;
    const dark = !viewer?.enableLightMode;

    const preferred = review.ratings
        ? Object.entries(review.ratings).find((data) => data[1].isPreferred)
        : undefined;

    const bold = (chunks: ReactNode) => (
        <Typography component='span' fontWeight='800'>
            {chunks}
        </Typography>
    );

    function getDescription(system: RatingSystem, data: YearReviewRatingData): React.ReactNode {
        if (data.ratingChange === 0) {
            return t.rich('descriptionSame', {
                system: formatRatingSystem(system, tRating),
                current: data.currentRating.value,
                bold,
            });
        } else if (data.ratingChange > 0) {
            return t.rich('descriptionUp', {
                system: formatRatingSystem(system, tRating),
                startRating: data.startRating,
                currentRating: data.currentRating.value,
                ratingChange: data.ratingChange,
                bold,
            });
        } else {
            return t.rich('descriptionDown', {
                system: formatRatingSystem(system, tRating),
                startRating: data.startRating,
                currentRating: data.currentRating.value,
                bold,
            });
        }
    }

    return (
        <Stack alignItems='center'>
            <Typography
                variant='h6'
                fontWeight='800'
                fontSize='clamp(16px,3vw,32px)'
                textAlign='center'
            >
                {t('intro')}
            </Typography>

            {preferred ? (
                <>
                    <Typography my={5} fontSize='clamp(16px,18px,30px)' textAlign='center'>
                        {getDescription(preferred[0] as RatingSystem, preferred[1])}
                    </Typography>

                    <RatingCard
                        cohort={review.currentCohort}
                        system={preferred[0] as RatingSystem}
                        data={preferred[1]}
                        dark={dark}
                        period={review.period}
                    />

                    <Typography my={5} fontSize='clamp(16px,18px,30px)' textAlign='center'>
                        {t('otherRatingsIntro')}
                    </Typography>

                    <Stack width={1} spacing={5}>
                        {Object.entries(review.ratings || {}).map(([system, data]) => {
                            if (system === preferred[0]) {
                                return null;
                            }
                            return (
                                <RatingCard
                                    key={system}
                                    cohort={review.currentCohort}
                                    system={system as RatingSystem}
                                    data={data}
                                    dark={dark}
                                    period={review.period}
                                />
                            );
                        })}
                    </Stack>
                </>
            ) : (
                <Typography my={5} fontSize='clamp(16px,18px,30px)' textAlign='center'>
                    {t('noRatings')}
                </Typography>
            )}
        </Stack>
    );
};

export default RatingsSection;
