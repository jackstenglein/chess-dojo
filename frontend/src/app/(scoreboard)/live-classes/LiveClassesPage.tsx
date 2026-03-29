'use client';

import { listRecordings } from '@/api/liveClassesApi';
import { useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { getCurrency } from '@/upsell/locales';
import { priceDataByCurrency } from '@/upsell/PriceMatrix';
import {
    getSubscriptionTier,
    SubscriptionTier,
} from '@jackstenglein/chess-dojo-common/src/database/user';
import {
    LiveClass,
    SAMPLE_LIVE_CLASS_S3_KEY,
} from '@jackstenglein/chess-dojo-common/src/liveClasses/api';
import { Box, Button, Container, Grid, Stack, Typography } from '@mui/material';
import Image from 'next/image';
import { useEffect, useSyncExternalStore } from 'react';
import { liveClassesFaq } from '../help/liveClasses';
import { LiveClassesList } from '../learn/live-classes/LiveClassesList';
import { compareLiveClasses } from '../learn/live-classes/liveClassUtils';
import PricingPage from '../prices/PricingPage';
import { useOnSubscribe } from '../prices/useOnSubscribe';
import gameReviewImage from './game_review.webp';

const SAMPLE_LIVE_CLASS: LiveClass = {
    name: 'Free Sample — Calculation 1000+',
    type: SubscriptionTier.Lecture,
    cohortRange: '1000+',
    tags: ['Tactics'],
    description: `A weekly class focusing on various techniques and skills within calculation. Students will be given weekly homework to work on before the next class, and encouraged to form study groups to solve the material together. One week's class is provided as a free sample.`,
    imageUrl: 'https://i.ytimg.com/vi/5MynOIPEi4w/maxresdefault.jpg',
    recordings: [{ date: '2026-03-15', s3Key: SAMPLE_LIVE_CLASS_S3_KEY }],
};

export default function LiveClassesPage() {
    const { user } = useAuth();
    const subscriptionTier = getSubscriptionTier(user);
    const isGameReviewUser = subscriptionTier === SubscriptionTier.GameReview;
    const isLectureUser = subscriptionTier === SubscriptionTier.Lecture;
    const isLiveClassUser = isGameReviewUser || subscriptionTier === SubscriptionTier.Lecture;

    const { request, tier, onSubscribe } = useOnSubscribe();
    const currency = useSyncExternalStore(
        () => () => null,
        () => getCurrency(navigator.languages[0]),
        () => 'USD',
    );

    const recordingsRequest = useRequest<LiveClass[]>();
    useEffect(() => {
        if (!recordingsRequest.isSent()) {
            recordingsRequest.onStart();
            listRecordings()
                .then((resp) => {
                    recordingsRequest.onSuccess(resp.data.classes ?? []);
                })
                .catch((err: unknown) => {
                    recordingsRequest.onFailure(err);
                });
        }
    }, [recordingsRequest]);

    const lectureClasses =
        recordingsRequest.data
            ?.filter((c) => c.type === SubscriptionTier.Lecture)
            .sort(compareLiveClasses) ?? [];

    if (!isLiveClassUser) {
        lectureClasses.unshift(SAMPLE_LIVE_CLASS);
    }

    return (
        <Container sx={{ py: 5 }}>
            <Typography variant='h3' fontWeight='bold' mx='auto' textAlign='center'>
                ChessDojo Live Classes
            </Typography>

            {!isGameReviewUser && (
                <PricingPage
                    tiers={[SubscriptionTier.Lecture, SubscriptionTier.GameReview]}
                    hideInterval
                />
            )}

            <Typography variant='h5' mt={4} fontWeight='bold'>
                Lecture Tier
            </Typography>
            <Typography variant='h6' mt={2}>
                The Lecture Tier provides access to larger lecture-style classes on various topics
                like endgames, calculation, and openings. For $75/month, you get access to all
                lecture classes and recordings, as well as full access to the rest of the ChessDojo
                website.{' '}
                {!isLiveClassUser &&
                    `Not sure if these classes are for you? Watch a free sample of Kostya's calculation course below.`}
            </Typography>

            <Button
                onClick={() =>
                    onSubscribe(SubscriptionTier.Lecture, 'month', {
                        currency,
                        value: priceDataByCurrency[currency][SubscriptionTier.Lecture].month,
                    })
                }
                variant='contained'
                sx={{ mt: 2 }}
                disabled={isLectureUser}
                color='subscribe'
                loading={request.isLoading() && tier === SubscriptionTier.Lecture}
            >
                {isLectureUser ? 'Already Subscribed' : 'Join Lecture Tier'}
            </Button>

            <Box mt={4}>
                <LiveClassesList
                    classes={lectureClasses}
                    onTagClick={() => null}
                    selectedTags={[]}
                    variant='grid'
                />
            </Box>

            <Typography variant='h5' mt={8} fontWeight='bold'>
                Game & Profile Review
            </Typography>

            <Grid
                container
                rowSpacing={2}
                columnSpacing={4}
                justifyContent={{ xs: 'center', sm: 'flex-start' }}
            >
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant='h6' mt={2}>
                        The Game & Profile Review tier provides access to smaller seminar-style
                        classes. In these classes, the sensei reviews one player's game and profile
                        each week. The highlighted player rotates each week. For $200/month, you get
                        placed with a team of similarly rated players and access to weekly peer
                        review and sensei review sessions with your team. You also get access to all
                        lecture classes, as well as recordings from all lecture classes and the peer
                        review and sensei review sessions of all game review teams.
                    </Typography>
                    <Button
                        href={isGameReviewUser ? '/profile?view=classes' : undefined}
                        component={isGameReviewUser ? Link : 'button'}
                        onClick={
                            isGameReviewUser
                                ? undefined
                                : () =>
                                      onSubscribe(SubscriptionTier.GameReview, 'month', {
                                          currency,
                                          value: priceDataByCurrency[currency][
                                              SubscriptionTier.GameReview
                                          ].month,
                                      })
                        }
                        variant='contained'
                        sx={{ mt: 2 }}
                        color='subscribe'
                        loading={request.isLoading() && tier === SubscriptionTier.GameReview}
                    >
                        {isGameReviewUser ? 'View Game Review Team' : 'Join Game & Profile Review'}
                    </Button>
                </Grid>
                <Grid
                    size={{ xs: 12, md: 6 }}
                    sx={{
                        maxWidth: '400px',
                        borderRadius: 2,
                        overflow: 'hidden',
                        aspectRatio: 0.8,
                        position: 'relative',
                    }}
                >
                    <Image src={gameReviewImage} alt='' fill objectFit='contain' />
                </Grid>
            </Grid>

            <Typography variant='h5' mt={8} fontWeight='bold'>
                Recordings
            </Typography>
            <Typography variant='h6' mt={2}>
                {isLiveClassUser ? (
                    <>
                        All recordings can be found <Link href='/learn/live-classes'>here</Link>.
                    </>
                ) : (
                    <>All classes are recorded and available for viewing on demand.</>
                )}
            </Typography>

            <Typography variant='h4' mt={8}>
                FAQs
            </Typography>
            {liveClassesFaq.items.map((item) => (
                <Stack key={item.title} mt={3}>
                    <Typography variant='h5' fontWeight='bold'>
                        {item.title}
                    </Typography>
                    <Typography variant='h6'>{item.content}</Typography>
                </Stack>
            ))}
        </Container>
    );
}
