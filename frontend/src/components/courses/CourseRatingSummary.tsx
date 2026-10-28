'use client';

import { getCourseReviews } from '@/api/courseReviewApi';
import { getDemoCourseReviews, isCourseReviewDemo } from '@/api/courseReviewDemo';
import { Rating, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

/** Public rating summary shared by every course card, including workshops. */
export default function CourseRatingSummary({ type, id }: { type: string; id: string }) {
    const [summary, setSummary] = useState<{ average: number; count: number }>();

    useEffect(() => {
        let active = true;
        setSummary(undefined);
        const load = isCourseReviewDemo ? getDemoCourseReviews : getCourseReviews;
        load('', type, id)
            .then(({ reviews }) => {
                if (!active) return;
                setSummary({
                    average: reviews.length
                        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
                        : 0,
                    count: reviews.length,
                });
            })
            .catch(() => {
                if (active) setSummary(undefined);
            });
        return () => {
            active = false;
        };
    }, [type, id]);

    if (!summary?.count) return null;

    return (
        <Stack
            direction='row'
            spacing={1}
            useFlexGap
            sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 1.5 }}
        >
            <Rating
                value={summary.average}
                precision={0.1}
                readOnly
                size='small'
                aria-label={`${summary.average.toFixed(1)} out of 5 stars`}
            />
            <Typography variant='body2' color='text.secondary'>
                {`${summary.average.toFixed(1)} / 5 · ${summary.count} ${summary.count === 1 ? 'rating' : 'ratings'}`}
            </Typography>
        </Stack>
    );
}
