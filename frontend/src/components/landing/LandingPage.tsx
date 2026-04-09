'use client';

import { AuthStatus, useAuth } from '@/auth/Auth';
import background3 from '@/components/landing/background3.webp';
import { BackgroundImageContainer } from '@/components/landing/BackgroundImage';
import { Community } from '@/components/landing/Community';
import { Features } from '@/components/landing/Features';
import { barlowCondensed } from '@/components/landing/fonts';
import { Footer } from '@/components/landing/Footer';
import { JoinDojoButton } from '@/components/landing/JoinDojoButton';
import { MainLanding } from '@/components/landing/MainLanding';
import { Pricing } from '@/components/landing/Pricing';
import { Senseis } from '@/components/landing/Senseis';
import { TestimonialSection } from '@/components/landing/Testimonial';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import { useRouter } from '@/hooks/useRouter';
import LoadingPage from '@/loading/LoadingPage';
import { fontFamily } from '@/style/font';
import { Box, Stack, Typography } from '@mui/material';
import { Hub } from 'aws-amplify/utils';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

export const LandingPage = () => {
    const { searchParams } = useNextSearchParams();
    const auth = useAuth();
    const router = useRouter();
    const t = useTranslations('landing');

    useEffect(() => {
        return Hub.listen('auth', (data) => {
            switch (data?.payload?.event) {
                case 'customOAuthState':
                    if (data.payload.data) {
                        router.push(data.payload.data);
                    }
            }
        });
    }, [router]);

    if (searchParams.get('code') && auth.status === AuthStatus.Loading) {
        return <LoadingPage />;
    }

    if (auth.status === AuthStatus.Authenticated) {
        router.replace('/profile');
        return <LoadingPage />;
    }

    return (
        <Box sx={{ '--stats-height': '100px' }}>
            <MainLanding />
            <Features />
            <TestimonialSection />
            <Community />
            <Pricing />
            <Senseis />

            <BackgroundImageContainer
                src={background3}
                background='linear-gradient(270deg, #141422 0%, #06060B 100%)'
            >
                <Stack alignItems='center'>
                    <Typography
                        sx={{
                            fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                            fontWeight: '400',
                            fontSize: '3rem',
                            lineHeight: '3.5rem',
                            letterSpacing: 0,
                            textAlign: 'center',
                        }}
                    >
                        {t('joinCommunity')}
                    </Typography>

                    <JoinDojoButton sx={{ mt: '1.875rem' }}>{t('signUp')}</JoinDojoButton>

                    {/* <Button
                            variant='contained'
                            component={Link}
                            href='/signup'
                            sx={{
                                fontSize: '1rem',
                                fontWeight: '600',
                                py: 1.5,
                                px: 2.5,
                                mt: '1.875rem',
                            }}
                            color='dojoOrange'
                        >
                            Sign Up
                        </Button> */}
                </Stack>
            </BackgroundImageContainer>

            <Footer />
        </Box>
    );
};
