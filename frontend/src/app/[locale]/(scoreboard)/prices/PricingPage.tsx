'use client';

import { RequestSnackbar } from '@/api/Request';
import { AuthStatus, useAuth } from '@/auth/Auth';
import LoadingPage from '@/loading/LoadingPage';
import PriceMatrix from '@/upsell/PriceMatrix';
import {
    getSubscriptionTier,
    SubscriptionTier,
} from '@jackstenglein/chess-dojo-common/src/database/user';
import { Container, Grid, Tab, Tabs, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useOnSubscribe } from './useOnSubscribe';

interface PricingPageProps {
    tiers?: SubscriptionTier[];
    onFreeTier?: () => void;
    hideInterval?: boolean;
}

function PricingPage({ tiers, onFreeTier, hideInterval }: PricingPageProps) {
    const t = useTranslations('upsell.pricingPage');
    const { status, user } = useAuth();
    const [interval, setInterval] = useState<'month' | 'year'>(hideInterval ? 'month' : 'year');
    const { tier, request, onSubscribe } = useOnSubscribe();

    if (status === AuthStatus.Loading) {
        return <LoadingPage />;
    }

    return (
        <Container maxWidth='xl' sx={{ py: 5 }}>
            <RequestSnackbar request={request} />
            <Grid
                container
                spacing={3}
                sx={{
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                }}
            >
                {!hideInterval && (
                    <Grid
                        size={12}
                        sx={{
                            color: 'text.secondary',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            order: -1,
                        }}
                    >
                        <Tabs
                            value={interval}
                            onChange={(_, v: 'month' | 'year') => setInterval(v)}
                            textColor='inherit'
                            sx={{
                                '& .MuiTabs-indicator': {
                                    backgroundColor: 'var(--mui-palette-text-secondary)',
                                },
                            }}
                        >
                            <Tab label={t('tabMonthly')} value='month' />
                            <Tab label={t('tabYearly')} value='year' />
                        </Tabs>
                    </Grid>
                )}

                <Grid
                    size={12}
                    container
                    spacing={3}
                    sx={{
                        justifyContent: 'center',
                        flexWrap: { xs: 'wrap-reverse', md: 'wrap' },
                    }}
                >
                    <PriceMatrix
                        onSubscribe={onSubscribe}
                        request={request}
                        interval={interval}
                        selectedTier={tier}
                        onFreeTier={onFreeTier}
                        currentTier={getSubscriptionTier(user)}
                        tiers={tiers}
                    />
                </Grid>

                <Grid
                    size={12}
                    sx={{
                        textAlign: 'center',
                    }}
                >
                    <Typography
                        variant='body2'
                        sx={{
                            color: 'text.secondary',
                        }}
                    >
                        {t('autoRenewNotice')}
                    </Typography>

                    {interval === 'year' && (
                        <Typography
                            variant='body2'
                            sx={{
                                color: 'text.secondary',
                                mt: 2,
                            }}
                        >
                            {t('annualBillingFootnote')}
                        </Typography>
                    )}
                </Grid>
            </Grid>
        </Container>
    );
}

export default PricingPage;
