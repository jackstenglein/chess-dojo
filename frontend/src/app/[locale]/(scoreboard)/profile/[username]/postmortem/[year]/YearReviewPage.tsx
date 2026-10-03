'use client';

import NotFoundPage from '@/NotFoundPage';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { getYearReview } from '@/api/yearReviewApi';
import { useAuth } from '@/auth/Auth';
import DojoPointSection from '@/components/profile/yearReview/DojoPointSection';
import GameSection from '@/components/profile/yearReview/GameSection';
import GraduationSection from '@/components/profile/yearReview/GraduationSection';
import { HeatmapSection } from '@/components/profile/yearReview/HeatmapSection';
import TimeSection from '@/components/profile/yearReview/TimeSection';
import RatingsSection from '@/components/profile/yearReview/ratings/RatingsSection';
import { YearReview } from '@/database/yearReview';
import LoadingPage from '@/loading/LoadingPage';
import Avatar from '@/profile/Avatar';
import { ExpandMore } from '@mui/icons-material';
import { Alert, Box, Container, Stack, Typography } from '@mui/material';
import { isAxiosError } from 'axios';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

const YearReviewPage = ({ username, year }: { username: string; year: string }) => {
    const { user } = useAuth();
    return (
        <YearReviewContent
            key={`${user?.username ?? 'public'}:${username}:${year}`}
            username={username}
            year={year}
        />
    );
};

const YearReviewContent = ({ username, year }: { username: string; year: string }) => {
    const t = useTranslations('profile.yearReview');
    const tPrivacy = useTranslations('trainingPrivacy');
    const request = useRequest<YearReview>();

    useEffect(() => {
        if (username && year && !request.isSent()) {
            request.onStart();
            getYearReview(username, year)
                .then((resp) => {
                    request.onSuccess(resp.data);
                })
                .catch((err: unknown) => {
                    request.onFailure(err);
                });
        }
    });

    if (isAxiosError(request.error) && request.error.response?.status === 403) {
        return <Alert severity='info'>{tPrivacy('denied')}</Alert>;
    }

    if (!request.isSent() || request.isLoading()) {
        return <LoadingPage />;
    }

    const review = request.data;
    if (!review) {
        return (
            <>
                <NotFoundPage />
                <RequestSnackbar request={request} />
            </>
        );
    }

    return (
        <Stack>
            <Container maxWidth='xl'>
                <Stack
                    sx={{
                        justifyContent: 'space-between',
                        height: 'calc(100vh - var(--navbar-height))',
                        py: 4,
                    }}
                >
                    <Stack>
                        <Stack
                            direction='row'
                            spacing={{
                                xs: 2,
                                md: 4,
                            }}
                            sx={{
                                mb: 3,

                                justifyContent: {
                                    xs: 'center',
                                    md: 'start',
                                },

                                alignItems: 'center',

                                fontSize: {
                                    xs: '15vw',
                                    sm: 'clamp(30px,7vw,8em)',
                                },
                            }}
                        >
                            <Avatar
                                username={username}
                                displayName={review.displayName}
                                size={{
                                    xs: 'clamp(48px,7vw,96px)',
                                }}
                            />
                            <Stack
                                spacing={0.5}
                                sx={{
                                    alignItems: 'start',
                                }}
                            >
                                <Typography
                                    variant='h2'
                                    sx={{
                                        fontWeight: '800',
                                        color: 'dojoOrange.main',
                                        fontSize: '0.55em',
                                    }}
                                >
                                    {review.displayName}
                                </Typography>
                                <Typography
                                    variant='h3'
                                    sx={{
                                        fontWeight: '800',
                                        color: 'text.secondary',
                                        fontSize: '0.3em',
                                    }}
                                >
                                    {review.currentCohort}
                                </Typography>
                            </Stack>
                        </Stack>

                        <Typography
                            variant='h1'
                            sx={{
                                fontWeight: 800,
                                fontSize: {
                                    xs: '11vw',
                                    sm: 'clamp(30px,7vw,8em)',
                                },
                                lineHeight: {
                                    xs: '1em',
                                    sm: 'clamp(36px,7.3vw,.9em)',
                                },
                                textAlign: 'center',
                            }}
                        >
                            {t.rich('postmortemHeader', {
                                period: review.period,
                                br: () => <br />,
                                accent: (chunks) => (
                                    <Box component='span' sx={{ color: 'dojoOrange.main' }}>
                                        {chunks}
                                    </Box>
                                ),
                            })}
                        </Typography>
                    </Stack>

                    <Stack
                        sx={{
                            alignItems: 'center',
                            mt: 5,
                        }}
                    >
                        <Typography
                            variant='h6'
                            sx={{
                                fontWeight: '800',
                                fontSize: 'clamp(24px,3vw,40px)',
                                textAlign: 'center',
                            }}
                        >
                            {t('progressIntro')}
                        </Typography>
                    </Stack>

                    <ExpandMore
                        sx={{
                            alignSelf: 'center',
                            fontSize: 'clamp(30px,6vw,7em)',
                        }}
                    />
                </Stack>

                <Stack
                    spacing={7}
                    sx={{
                        maxWidth: 'md',
                        pb: 4,
                        margin: 'auto',
                    }}
                >
                    <RatingsSection review={review} />
                    <GraduationSection review={review} />

                    <Typography
                        variant='h6'
                        sx={{
                            fontWeight: '800',
                            fontSize: 'clamp(16px,3vw,32px)',
                            textAlign: 'center',
                            pt: 5,
                        }}
                    >
                        {t('sweatWork')}
                    </Typography>
                </Stack>
            </Container>

            <Box sx={{ pt: 4, pb: 7, px: 4, margin: 'auto', maxWidth: 1 }}>
                <HeatmapSection review={review} />
            </Box>

            <Container maxWidth='xl'>
                <Stack
                    spacing={7}
                    sx={{
                        maxWidth: 'md',
                        pb: 4,
                        margin: 'auto',
                    }}
                >
                    <DojoPointSection review={review} />
                    <TimeSection review={review} />
                    <GameSection review={review} />

                    <Typography
                        variant='h6'
                        sx={{
                            fontWeight: '800',
                            fontSize: 'clamp(16px,3vw,32px)',
                            textAlign: 'center',
                        }}
                    >
                        {t('thankYou', { nextYear: parseInt(year) + 1 })}
                    </Typography>
                </Stack>
            </Container>
        </Stack>
    );
};

export default YearReviewPage;
