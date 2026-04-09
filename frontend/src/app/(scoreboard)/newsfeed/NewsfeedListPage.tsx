'use client';

import { useClubs } from '@/api/cache/clubs';
import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import NewsfeedList from '@/components/newsfeed/NewsfeedList';
import LoadingPage from '@/loading/LoadingPage';
import CohortIcon from '@/scoreboard/CohortIcon';
import Icon from '@/style/Icon';
import { Container, Divider, Grid, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

export function NewsfeedListPage() {
    const t = useTranslations('newsfeed');
    const { user } = useAuth();
    const { clubs, request: clubRequest } = useClubs(user?.clubs || []);

    const [newsfeedIds, newsfeedIdOptions] = useMemo(() => {
        let newsfeedIds = ['following', user?.dojoCohort || ''];
        newsfeedIds = newsfeedIds.concat(clubs.map((c) => c.id));

        const newsfeedIdOptions = [
            {
                value: 'following',
                label: t('followers'),
                icon: <Icon name='followers' color='primary' />,
            },
            {
                value: user?.dojoCohort || '',
                label: t('myCohort'),
                icon: <CohortIcon cohort={user?.dojoCohort} size={25} tooltip='' />,
            },
        ].concat(
            clubs.map((club) => ({
                value: club.id,
                label: club.name,
                icon: <Icon name='clubs' color='primary' />,
            })),
        );

        return [newsfeedIds, newsfeedIdOptions];
    }, [clubs, user?.dojoCohort, t]);

    return (
        <Container maxWidth='xl' sx={{ pt: 6, pb: 4 }}>
            <Grid container columnSpacing={8}>
                <Grid
                    size={{
                        xs: 12,
                        md: 7,
                    }}
                >
                    <Stack spacing={3}>
                        <Typography variant='h6'>{t('title')}</Typography>

                        {user?.clubs?.length &&
                        (clubRequest.isLoading() || !clubRequest.isSent()) ? (
                            <LoadingPage />
                        ) : (
                            <NewsfeedList
                                initialNewsfeedIds={newsfeedIds}
                                newsfeedIdOptions={newsfeedIdOptions}
                                showAdditionalFilters={true}
                            />
                        )}
                    </Stack>
                </Grid>

                <Grid
                    display={{ xs: 'none', md: 'initial' }}
                    size={{
                        md: 5,
                    }}
                >
                    <Stack direction='row' height={1}>
                        <Divider orientation='vertical' flexItem sx={{ mr: 8 }} />
                        <Stack spacing={3} width={1}>
                            <Stack
                                direction='row'
                                flexWrap='wrap'
                                justifyContent='space-between'
                                alignItems='center'
                            >
                                <Typography variant='h6'>{t('graduations')}</Typography>

                                <Link href='/recent'>{t('viewAll')}</Link>
                            </Stack>

                            <NewsfeedList initialNewsfeedIds={['GRADUATIONS']} />
                        </Stack>
                    </Stack>
                </Grid>
            </Grid>
        </Container>
    );
}
