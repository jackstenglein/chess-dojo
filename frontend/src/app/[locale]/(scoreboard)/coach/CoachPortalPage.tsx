'use client';

import NotFoundPage from '@/NotFoundPage';
import { AuthStatus, useAuth } from '@/auth/Auth';
import ConnectStripeAccount from '@/components/coach/stripe/ConnectStripeAccount';
import StripeInfo from '@/components/coach/stripe/StripeInfo';
import LoadingPage from '@/loading/LoadingPage';
import { Container, Divider, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

const CoachPortalPage = () => {
    const t = useTranslations('coach.portal');
    const { user, status } = useAuth();

    if (status === AuthStatus.Loading) {
        return <LoadingPage />;
    }

    if (!user?.isCoach) {
        return <NotFoundPage />;
    }

    return (
        <Container sx={{ py: 4 }}>
            <Stack spacing={3}>
                <Stack>
                    <Typography variant='h4'>{t('title')}</Typography>
                    <Divider />
                </Stack>

                {user.coachInfo?.stripeId ? (
                    <>
                        <StripeInfo />
                    </>
                ) : (
                    <ConnectStripeAccount />
                )}
            </Stack>
        </Container>
    );
};

export default CoachPortalPage;
