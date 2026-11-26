'use client';

import { AuthStatus, useAuth } from '@/auth/Auth';
import { Community } from '@/components/landing/Community';
import { Features } from '@/components/landing/Features';
import { barlowCondensed } from '@/components/landing/fonts';
import { Footer } from '@/components/landing/Footer';
import { JoinDojoButton } from '@/components/landing/JoinDojoButton';
import { LiveClasses } from '@/components/landing/LiveClasses';
import { MainLanding } from '@/components/landing/MainLanding';
import { Pricing } from '@/components/landing/Pricing';
import { Senseis } from '@/components/landing/Senseis';
import { TestimonialSection } from '@/components/landing/Testimonial';
import { Link } from '@/components/navigation/Link';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import { useRouter } from '@/hooks/useRouter';
import LoadingPage from '@/loading/LoadingPage';
import { fontFamily } from '@/style/font';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
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
            <LiveClasses />
            <TestimonialSection />
            <Community />
            <Pricing />
            <Senseis />

            <Box
                sx={{
                    background:
                        'linear-gradient(90deg, var(--mui-palette-darkBlue-main) 0%, var(--mui-palette-darkBlue-light) 100%)',
                    py: '1.5rem',
                }}
            >
                <Container maxWidth='lg'>
                    <Stack
                        sx={{
                            alignItems: 'center',
                            gap: 3,
                        }}
                    >
                        <Typography
                            sx={{
                                fontFamily: (theme) => fontFamily(theme, barlowCondensed),
                                fontWeight: '400',
                                fontSize: { xs: '1.75rem', md: '2.25rem' },
                                lineHeight: 1.3,
                                letterSpacing: 0,
                                textAlign: 'center',
                                maxWidth: '40rem',
                            }}
                        >
                            {t('joinCommunity')}
                        </Typography>

                        <Stack
                            direction='row'
                            sx={{
                                gap: 2,
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <JoinDojoButton />
                            <Button
                                variant='outlined'
                                component={Link}
                                href='/signup'
                                color='inherit'
                                sx={{
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    py: '0.75rem',
                                    px: '1.25rem',
                                    borderColor: 'rgba(255, 255, 255, 0.7)',
                                    color: 'white',
                                    '&:hover': {
                                        borderColor: 'white',
                                        backgroundColor: 'transparent',
                                    },
                                }}
                            >
                                {t('pricing.signUpFree')}
                            </Button>
                        </Stack>
                    </Stack>
                </Container>
            </Box>

            <Footer />
        </Box>
    );
};
