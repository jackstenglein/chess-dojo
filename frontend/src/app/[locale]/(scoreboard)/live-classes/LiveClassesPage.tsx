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
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useEffect, useSyncExternalStore } from 'react';
import { getLiveClassesFaq } from '../help/liveClasses';
import { LiveClassesList } from '../learn/live-classes/LiveClassesList';
import { compareLiveClasses } from '../learn/live-classes/liveClassUtils';
import PricingPage from '../prices/PricingPage';
import { useOnSubscribe } from '../prices/useOnSubscribe';
import gameReviewImage from './game_review.webp';

const SAMPLE_CLASSES: LiveClass[] = [
    {
        name: 'Calculation 1000+',
        type: SubscriptionTier.Lecture,
        cohortRange: '1000+',
        description: `IM Kostya Kavutskiy's weekly class focusing on various techniques and skills within calculation.`,
        imageUrl: 'https://i.ytimg.com/vi/5MynOIPEi4w/maxresdefault.jpg',
        recordings: [{ date: '2026-03-15', s3Key: SAMPLE_LIVE_CLASS_S3_KEY }],
    },
    {
        name: 'Starting Out in the Najdorf',
        type: SubscriptionTier.GameReview,
        cohortRange: '1000-1500',
        description: `GM Jesse Kraai reviews a Dojo member's first game in the Najdorf.`,
        imageUrl:
            'https://chess-dojo-images.s3.us-east-1.amazonaws.com/live-classes/team_steinitz-1.webp',
        recordings: [
            {
                date: '2026-04-22',
                url: 'https://www.youtube.com/embed/p98XXb2d8i4?autoplay=1',
                s3Key: '',
            },
        ],
    },
];

export default function LiveClassesPage() {
    const tPage = useTranslations('liveClasses');
    const t = useTranslations('help');
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

    return (
        <Container sx={{ py: 5 }}>
            <Typography variant='h3' fontWeight='bold' mx='auto' textAlign='center'>
                {tPage('pageTitle')}
            </Typography>

            {!isGameReviewUser && (
                <PricingPage
                    tiers={[SubscriptionTier.Lecture, SubscriptionTier.GameReview]}
                    hideInterval
                />
            )}

            {!isLiveClassUser && (
                <>
                    <Typography variant='h5' mt={4} fontWeight='bold'>
                        Free Samples
                    </Typography>

                    <LiveClassesList
                        classes={SAMPLE_CLASSES}
                        onTagClick={() => null}
                        selectedTags={[]}
                        variant='grid'
                    />
                </>
            )}

            <Typography variant='h5' mt={4} fontWeight='bold'>
                {tPage('lectureTierHeading')}
            </Typography>
            <Typography variant='h6' mt={2}>
                {tPage('lectureTierDescription')} {!isLiveClassUser && tPage('freeSamplePrompt')}
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
                {isLectureUser ? tPage('alreadySubscribed') : tPage('joinLectureTier')}
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
                {tPage('gameReviewHeading')}
            </Typography>

            <Grid
                container
                rowSpacing={2}
                columnSpacing={4}
                justifyContent={{ xs: 'center', sm: 'flex-start' }}
            >
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant='h6' mt={2}>
                        {tPage('gameReviewDescription')}
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
                        {isGameReviewUser ? tPage('viewGameReviewTeam') : tPage('joinGameReview')}
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
                {tPage('recordingsHeading')}
            </Typography>
            <Typography variant='h6' mt={2}>
                {isLiveClassUser
                    ? tPage.rich('recordingsLink', {
                          link: (chunks) => <Link href='/learn/live-classes'>{chunks}</Link>,
                      })
                    : tPage('recordingsAvailable')}
            </Typography>

            <Typography variant='h4' mt={8}>
                {tPage('faqsHeading')}
            </Typography>
            {getLiveClassesFaq(t).items.map((item) => (
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
