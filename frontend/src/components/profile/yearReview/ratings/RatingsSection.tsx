import { useAuth } from '@/auth/Auth';
import { RatingSystem, formatRatingSystem } from '@/database/user';
import { YearReviewRatingData } from '@/database/yearReview';
import { Stack, Typography } from '@mui/material';
import { SectionProps } from '../section';
import RatingCard from './RatingCard';

function getDescription(system: RatingSystem, data: YearReviewRatingData): React.ReactNode {
    const current = data.currentRating.value;

    const preamble = `This year, your ${formatRatingSystem(system)} rating `;

    let main;

    if (data.ratingChange === 0) {
        main = (
            <>
                remained the same, at{' '}
                <Typography component='span' fontWeight='800'>
                    {current}
                </Typography>
                . But next year will see some great growth!
            </>
        );
    } else if (data.ratingChange > 0) {
        main = (
            <>
                increased from{' '}
                <Typography component='span' fontWeight='800'>
                    {data.startRating}
                </Typography>{' '}
                to{' '}
                <Typography component='span' fontWeight='800'>
                    {data.currentRating.value}
                </Typography>
                . That's{' '}
                <Typography component='span' fontWeight='800'>
                    {data.ratingChange}
                </Typography>{' '}
                points! Keep up the great work next year!
            </>
        );
    } else {
        main = (
            <>
                decreased from{' '}
                <Typography component='span' fontWeight='800'>
                    {data.startRating}
                </Typography>{' '}
                to{' '}
                <Typography component='span' fontWeight='800'>
                    {data.currentRating.value}
                </Typography>
                . Don't worry - you'll come back stronger next year!
            </>
        );
    }

    return (
        <>
            {preamble}
            {main}
        </>
    );
}

const RatingsSection = ({ review }: SectionProps) => {
    const viewer = useAuth().user;
    const dark = !viewer?.enableLightMode;

    const preferred = review.ratings
        ? Object.entries(review.ratings).find((data) => data[1].isPreferred)
        : undefined;

    return (
        <Stack alignItems='center'>
            <Typography
                variant='h6'
                fontWeight='800'
                fontSize='clamp(16px,3vw,32px)'
                textAlign='center'
            >
                Let's start with your results...
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
                        Now let's see how your other ratings did...
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
                    Whoops, looks like you don't have any ratings yet. Add a rating system to your
                    profile and play some more games next year!
                </Typography>
            )}
        </Stack>
    );
};

export default RatingsSection;
