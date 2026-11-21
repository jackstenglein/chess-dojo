'use client';

import { EventType, trackEvent } from '@/analytics/events';
import { RequestSnackbar } from '@/api/Request';
import { AuthStatus, useAuth } from '@/auth/Auth';
import { useRouter } from '@/hooks/useRouter';
import { getSubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { Lock } from '@mui/icons-material';
import { Box, Button, Stack, Typography } from '@mui/material';
import { RefObject, Suspense, useEffect, useRef, useState } from 'react';
import { useOnSubscribe } from '../../(scoreboard)/prices/useOnSubscribe';
import { savePendingCheckout, takePendingCheckout } from '../../class/classLead';
import {
    Body,
    Condensed,
    EASE_OUT,
    HAIRLINE,
    Heading,
    INK_RAISED,
    MUTED,
    ORANGE,
    Section,
} from '../../class/sections/shared';
import { BlackFridayOffer, OFFER_OPTIONS, OfferPlan, PAGE_PATH } from '../config';
import { OFFER_SECTION } from '../content';

export const OFFER_ELEMENT_ID = 'black-friday';

type Subscribe = (plan: OfferPlan) => void;

function usd(amount: number): string {
    return `$${amount.toLocaleString('en-US')}`;
}

/**
 * Same hand-off as /class: useOnSubscribe reads the search params, so it sits
 * under Suspense, and a buyer who had to sign up first gets their checkout back.
 */
function SubscribeBridge({
    plans,
    subscribeRef,
    onLoadingChange,
}: {
    plans: OfferPlan[];
    subscribeRef: RefObject<Subscribe | null>;
    onLoadingChange: (loading: boolean) => void;
}) {
    const { status } = useAuth();
    const { request, onSubscribe } = useOnSubscribe();
    const resumed = useRef(false);
    const loading = request.isLoading();

    useEffect(() => {
        subscribeRef.current = (plan) =>
            onSubscribe(plan.tier, 'year', { currency: 'USD', value: plan.offerPrice });
    }, [subscribeRef, onSubscribe]);

    useEffect(() => {
        onLoadingChange(loading);
    }, [loading, onLoadingChange]);

    useEffect(() => {
        if (status !== AuthStatus.Authenticated || resumed.current) {
            return;
        }
        resumed.current = true;
        const pending = takePendingCheckout();
        const plan = plans.find((item) => item.tier === pending?.tier);
        if (pending && plan) {
            onSubscribe(plan.tier, pending.interval, { currency: 'USD', value: plan.offerPrice });
        }
    }, [status, onSubscribe, plans]);

    return <RequestSnackbar request={request} />;
}

export function BlackFriday({ offer }: { offer: BlackFridayOffer }) {
    const router = useRouter();
    const { status, user } = useAuth();
    const option = OFFER_OPTIONS[offer.option];
    const [selectedTier, setSelectedTier] = useState(option.plans[1].tier);
    const [loading, setLoading] = useState(false);
    const subscribeRef = useRef<Subscribe>(null);

    const selected = option.plans.find((plan) => plan.tier === selectedTier) ?? option.plans[0];
    const isCurrent = getSubscriptionTier(user) === selected.tier;

    const onChoose = () => {
        trackEvent(EventType.WcOfferClick, { placement: 'offer', tier: selected.tier });
        if (status !== AuthStatus.Authenticated) {
            savePendingCheckout(selected.tier, 'year');
            router.push(`/signup?redirectUri=${encodeURIComponent(PAGE_PATH)}`);
            return;
        }
        subscribeRef.current?.(selected);
    };

    return (
        <Box
            id={OFFER_ELEMENT_ID}
            sx={{ background: 'linear-gradient(270deg, #141422 0%, #06060B 100%)' }}
        >
            <Suspense fallback={null}>
                <SubscribeBridge
                    plans={option.plans}
                    subscribeRef={subscribeRef}
                    onLoadingChange={setLoading}
                />
            </Suspense>

            <Section maxWidth='md'>
                <Condensed
                    sx={{
                        mb: 1.5,
                        color: ORANGE,
                        fontSize: '1.1rem',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                    }}
                >
                    {OFFER_SECTION.eyebrow}
                </Condensed>
                <Heading
                    sx={{ mb: { xs: 3.5, md: 5 } }}
                    description={`${OFFER_SECTION.deadline(offer.endsLabel)} ${option.summary}`}
                >
                    {option.heading}
                </Heading>

                <Stack
                    role='radiogroup'
                    aria-label={OFFER_SECTION.planGroupLabel}
                    sx={{ gap: 1.5 }}
                >
                    {option.plans.map((plan) => {
                        const active = plan.tier === selected.tier;
                        return (
                            <Box
                                key={plan.tier}
                                component='button'
                                type='button'
                                role='radio'
                                aria-checked={active}
                                onClick={() => setSelectedTier(plan.tier)}
                                sx={{
                                    p: { xs: 2.25, md: 2.75 },
                                    font: 'inherit',
                                    textAlign: 'left',
                                    color: 'common.white',
                                    cursor: 'pointer',
                                    borderRadius: 3,
                                    bgcolor: active ? 'rgba(255, 255, 255, 0.07)' : 'transparent',
                                    border: `2px solid ${active ? ORANGE : HAIRLINE}`,
                                    transition: `border-color 300ms ${EASE_OUT}, background-color 300ms ${EASE_OUT}`,
                                }}
                            >
                                <Stack
                                    direction='row'
                                    sx={{
                                        justifyContent: 'space-between',
                                        alignItems: 'baseline',
                                        flexWrap: 'wrap',
                                        columnGap: 2,
                                    }}
                                >
                                    <Condensed sx={{ fontSize: '1.7rem' }}>{plan.name}</Condensed>
                                    <Typography
                                        variant='body2'
                                        sx={{
                                            fontWeight: 600,
                                            fontSize: '1rem',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        <Box component='span' sx={{ fontSize: '1.3rem' }}>
                                            {usd(plan.offerPrice)}
                                        </Box>{' '}
                                        <Box
                                            component='span'
                                            sx={{ color: MUTED, fontWeight: 400 }}
                                        >
                                            {option.priceUnit}
                                        </Box>
                                    </Typography>
                                </Stack>
                                <Body sx={{ mt: 0.5, fontSize: '1.05rem' }}>
                                    {plan.description}
                                </Body>
                                {plan.offerPrice < plan.yearPrice && (
                                    <Typography variant='body2' sx={{ mt: 0.75, color: MUTED }}>
                                        {OFFER_SECTION.normalPrice(usd(plan.yearPrice))}
                                    </Typography>
                                )}
                            </Box>
                        );
                    })}
                </Stack>

                {option.renewalNote && <Body sx={{ mt: 2 }}>{option.renewalNote}</Body>}

                <Box
                    sx={{
                        mt: 3,
                        p: { xs: 2.5, md: 3.5 },
                        borderRadius: 3,
                        bgcolor: INK_RAISED,
                        border: '1px solid rgba(247, 148, 31, 0.4)',
                        textAlign: 'center',
                    }}
                >
                    <Condensed sx={{ fontSize: '1.45rem' }}>
                        {OFFER_SECTION.code(offer.promoCode)}
                    </Condensed>
                    <Button
                        fullWidth
                        variant='contained'
                        color='dojoOrange'
                        size='large'
                        disabled={isCurrent || status === AuthStatus.Loading}
                        loading={loading}
                        onClick={onChoose}
                        sx={{ mt: 2, minHeight: 56, fontWeight: 600, fontSize: '1.1rem' }}
                    >
                        {isCurrent ? OFFER_SECTION.currentPlan : OFFER_SECTION.cta}
                    </Button>
                    <Stack
                        direction='row'
                        sx={{
                            mt: 1.5,
                            gap: 0.75,
                            justifyContent: 'center',
                            alignItems: 'center',
                            color: MUTED,
                        }}
                    >
                        <Lock sx={{ fontSize: 16 }} />
                        <Typography variant='body2'>{OFFER_SECTION.checkoutNote}</Typography>
                    </Stack>
                </Box>
            </Section>
        </Box>
    );
}
