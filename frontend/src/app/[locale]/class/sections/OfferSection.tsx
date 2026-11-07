'use client';

import { RequestSnackbar } from '@/api/Request';
import { AuthStatus, useAuth } from '@/auth/Auth';
import { anton } from '@/components/landing/fonts';
import backgroundImage from '@/components/landing/pricing-background.webp';
import { useRouter } from '@/hooks/useRouter';
import { fontFamily } from '@/style/font';
import { getSubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { Lock } from '@mui/icons-material';
import { Box, Button, Stack, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import Image from 'next/image';
import { RefObject, Suspense, useEffect, useRef, useState } from 'react';
import { useOnSubscribe } from '../../(scoreboard)/prices/useOnSubscribe';
import { savePendingCheckout, takePendingCheckout } from '../classLead';
import {
    MAX_YEARLY_SAVING,
    Offer,
    offerForTier,
    OFFERS,
    VALUE_FOOTNOTE,
    WORKSHOPS_OFFER,
} from '../content';
import {
    Body,
    Condensed,
    EASE_OUT,
    HAIRLINE,
    Heading,
    INK_RAISED,
    MUTED,
    OFFER_ELEMENT_ID,
    ORANGE,
    Section,
} from './shared';

type Interval = 'month' | 'year';
type Subscribe = (offer: Offer, interval: Interval) => void;

const lineIn = keyframes`
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: translateY(0); }
`;

const stampIn = keyframes`
    from { opacity: 0; transform: scale(1.14); }
    to { opacity: 1; transform: scale(1); }
`;

/**
 * useOnSubscribe reads the search params, which would turn the whole page into a
 * client-only render. Keeping it here, under Suspense, leaves the sales copy in the HTML.
 */
function SubscribeBridge({
    subscribeRef,
    onLoadingChange,
}: {
    subscribeRef: RefObject<Subscribe | null>;
    onLoadingChange: (loading: boolean) => void;
}) {
    const { status } = useAuth();
    const { request, onSubscribe } = useOnSubscribe();
    const resumed = useRef(false);
    const loading = request.isLoading();

    useEffect(() => {
        subscribeRef.current = (offer, interval) =>
            onSubscribe(offer.tier, interval, { currency: 'USD', value: offer.price[interval] });
    }, [subscribeRef, onSubscribe]);

    useEffect(() => {
        onLoadingChange(loading);
    }, [loading, onLoadingChange]);

    // Picks checkout back up after a logged-out buyer signs up.
    useEffect(() => {
        if (status !== AuthStatus.Authenticated || resumed.current) {
            return;
        }
        resumed.current = true;
        const pending = takePendingCheckout();
        if (pending) {
            const offer = offerForTier(pending.tier);
            onSubscribe(pending.tier, pending.interval, {
                currency: 'USD',
                value: offer.price[pending.interval],
            });
        }
    }, [status, onSubscribe]);

    return <RequestSnackbar request={request} />;
}

export function OfferSection() {
    const router = useRouter();
    const { status, user } = useAuth();
    const [selected, setSelected] = useState<Offer>(WORKSHOPS_OFFER);
    const [interval, setInterval] = useState<Interval>('year');
    const [loading, setLoading] = useState(false);
    const subscribeRef = useRef<Subscribe>(null);

    const currentTier = getSubscriptionTier(user);
    const isCurrent = currentTier === selected.tier;
    const price = selected.price[interval];
    const [receiptSeen, setReceiptSeen] = useState(false);
    const receiptRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = receiptRef.current;
        if (!element) {
            return;
        }
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setReceiptSeen(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 },
        );
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    const yearlySaving = (selected.price.month - selected.price.year) * 12;

    const onJoin = () => {
        if (status !== AuthStatus.Authenticated) {
            savePendingCheckout(selected.tier, interval);
            router.push(`/signup?redirectUri=${encodeURIComponent('/class')}`);
            return;
        }
        subscribeRef.current?.(selected, interval);
    };

    return (
        <Box
            id={OFFER_ELEMENT_ID}
            sx={{
                position: 'relative',
                overflow: 'hidden',
                isolation: 'isolate',
                scrollMarginTop: 0,
                background: 'linear-gradient(270deg, #141422 0%, #06060B 100%)',
            }}
        >
            <Box aria-hidden sx={{ position: 'absolute', inset: 0, zIndex: -1, opacity: 0.06 }}>
                <Image
                    src={backgroundImage}
                    alt=''
                    fill
                    sizes='100vw'
                    style={{ objectFit: 'cover' }}
                />
            </Box>
            <Suspense fallback={null}>
                <SubscribeBridge subscribeRef={subscribeRef} onLoadingChange={setLoading} />
            </Suspense>

            <Section>
                <Heading
                    center
                    description='Every plan includes the training plan for your rating. Live classes start with Workshops.'
                >
                    Pick how closely you want to train with the senseis
                </Heading>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '0.85fr 1.15fr' },
                        gap: { xs: 3, md: 5 },
                        alignItems: 'start',
                    }}
                >
                    <Stack
                        role='radiogroup'
                        aria-label='Choose a plan'
                        sx={{ gap: 2, position: { md: 'sticky' }, top: '4vh' }}
                    >
                        {OFFERS.map((offer) => {
                            const active = offer.tier === selected.tier;
                            const phoneOrder = offer.tier === WORKSHOPS_OFFER.tier ? -1 : 0;
                            return (
                                <Box
                                    key={offer.tier}
                                    component='button'
                                    type='button'
                                    role='radio'
                                    aria-checked={active}
                                    onClick={() => setSelected(offer)}
                                    sx={{
                                        order: { xs: phoneOrder, md: 0 },
                                        p: { xs: 2.5, md: 3 },
                                        font: 'inherit',
                                        textAlign: 'left',
                                        color: 'common.white',
                                        cursor: 'pointer',
                                        borderRadius: 3,
                                        bgcolor: active
                                            ? 'rgba(255, 255, 255, 0.07)'
                                            : 'transparent',
                                        border: `2px solid ${active ? offer.accent : HAIRLINE}`,
                                        transition: `border-color 300ms ${EASE_OUT}, background-color 300ms ${EASE_OUT}`,
                                    }}
                                >
                                    {offer.badge && (
                                        <Typography
                                            component='span'
                                            variant='caption'
                                            sx={{
                                                display: 'inline-block',
                                                mb: 1,
                                                px: 1,
                                                py: 0.25,
                                                borderRadius: 1,
                                                fontWeight: 700,
                                                letterSpacing: '0.02em',
                                                color: '#0b0b12',
                                                bgcolor: offer.accent,
                                            }}
                                        >
                                            {offer.badge}
                                        </Typography>
                                    )}
                                    <Stack
                                        direction='row'
                                        sx={{
                                            justifyContent: 'space-between',
                                            alignItems: 'baseline',
                                            gap: 2,
                                        }}
                                    >
                                        <Condensed sx={{ fontSize: '1.9rem' }}>
                                            {offer.name}
                                        </Condensed>
                                        <Typography
                                            variant='body2'
                                            sx={{
                                                whiteSpace: 'nowrap',
                                                fontWeight: 600,
                                                fontSize: '1.15rem',
                                            }}
                                        >
                                            ${offer.price[interval]}
                                            <Box
                                                component='span'
                                                sx={{
                                                    color: MUTED,
                                                    fontWeight: 400,
                                                    fontSize: '0.9rem',
                                                }}
                                            >
                                                /mo
                                            </Box>
                                        </Typography>
                                    </Stack>
                                    <Body sx={{ mt: 0.75, fontSize: '1.03rem' }}>
                                        {offer.tagline}
                                    </Body>
                                    {offer.seats && (
                                        <Typography
                                            variant='body2'
                                            sx={{ mt: 1, color: offer.accent, fontWeight: 600 }}
                                        >
                                            {offer.seats}
                                        </Typography>
                                    )}
                                </Box>
                            );
                        })}

                        <Stack
                            role='radiogroup'
                            aria-label='Billing'
                            direction='row'
                            sx={{
                                order: { xs: -2, md: 0 },
                                p: 0.5,
                                gap: 0.5,
                                borderRadius: 2,
                                border: `1px solid ${HAIRLINE}`,
                            }}
                        >
                            {(['year', 'month'] as const).map((option) => (
                                <Box
                                    key={option}
                                    component='button'
                                    type='button'
                                    role='radio'
                                    aria-checked={interval === option}
                                    onClick={() => setInterval(option)}
                                    sx={{
                                        flex: 1,
                                        minHeight: 44,
                                        font: 'inherit',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        border: 0,
                                        borderRadius: 1.5,
                                        color: interval === option ? '#0b0b12' : 'common.white',
                                        bgcolor: interval === option ? ORANGE : 'transparent',
                                        transition: `background-color 250ms ${EASE_OUT}, color 250ms ${EASE_OUT}`,
                                    }}
                                >
                                    {option === 'month'
                                        ? 'Monthly'
                                        : `Yearly, save up to $${MAX_YEARLY_SAVING}`}
                                </Box>
                            ))}
                        </Stack>
                    </Stack>

                    <Box
                        sx={{
                            bgcolor: INK_RAISED,
                            borderRadius: 3,
                            border: `1px solid ${HAIRLINE}`,
                            overflow: 'hidden',
                            boxShadow: '0 40px 90px -30px rgba(0, 0, 0, 0.9)',
                        }}
                    >
                        <Box
                            sx={{
                                height: 5,
                                bgcolor: selected.accent,
                                transition: `background-color 300ms ${EASE_OUT}`,
                            }}
                        />
                        <Box
                            ref={receiptRef}
                            key={selected.tier}
                            sx={{ px: { xs: 2.5, md: 4 }, pt: { xs: 2, md: 3 } }}
                        >
                            {selected.items.map((item, index) => (
                                <Box
                                    key={item.title}
                                    sx={{
                                        py: 2,
                                        borderBottom: `1px solid ${HAIRLINE}`,
                                        animation: receiptSeen
                                            ? `${lineIn} 550ms ${EASE_OUT} ${index * 90}ms both`
                                            : undefined,
                                    }}
                                >
                                    <Stack
                                        direction='row'
                                        sx={{ justifyContent: 'space-between', gap: 2 }}
                                    >
                                        <Condensed component='h3' sx={{ fontSize: '1.35rem' }}>
                                            {item.title}
                                        </Condensed>
                                        <Condensed
                                            sx={{
                                                fontSize: item.value ? '1.1rem' : '1.35rem',
                                                textAlign: 'right',
                                                maxWidth: '45%',
                                                flexShrink: 0,
                                                color: item.value ? 'common.white' : '#7FD66B',
                                            }}
                                        >
                                            {item.value ?? 'Included'}
                                        </Condensed>
                                    </Stack>
                                    <Body sx={{ mt: 0.5, fontSize: '0.98rem', pr: { sm: 8 } }}>
                                        {item.description}
                                    </Body>
                                </Box>
                            ))}
                        </Box>

                        {selected.note && (
                            <Box sx={{ px: { xs: 2.5, md: 4 }, py: 2.5 }}>
                                <Body sx={{ fontSize: '1.02rem', color: 'common.white' }}>
                                    {selected.note}
                                </Body>
                            </Box>
                        )}

                        <Box
                            sx={{
                                px: { xs: 2.5, md: 4 },
                                py: { xs: 3, md: 3.5 },
                                bgcolor: 'rgba(247, 148, 31, 0.1)',
                                borderTop: `1px solid rgba(247, 148, 31, 0.35)`,
                                textAlign: 'center',
                            }}
                        >
                            <Condensed sx={{ fontSize: '1.3rem' }}>You pay</Condensed>
                            <Box
                                key={`${selected.tier}-${interval}`}
                                sx={{ animation: `${stampIn} 500ms ${EASE_OUT} both` }}
                            >
                                <Typography
                                    component='div'
                                    sx={{
                                        fontFamily: (theme) => fontFamily(theme, anton),
                                        fontSize: { xs: '4.5rem', md: '5.5rem' },
                                        lineHeight: 1.1,
                                        color: ORANGE,
                                    }}
                                >
                                    ${price}
                                    <Box
                                        component='span'
                                        sx={{
                                            fontFamily: 'inherit',
                                            fontSize: '1.5rem',
                                            color: 'common.white',
                                            ml: 1,
                                        }}
                                    >
                                        / month
                                    </Box>
                                </Typography>
                            </Box>
                            <Body sx={{ mt: 0.5, fontSize: '1rem' }}>
                                {interval === 'year'
                                    ? `Billed $${(price * 12).toLocaleString('en-US')} once a year. You save $${yearlySaving}.`
                                    : `Billed monthly. Or $${selected.price.year}/month billed yearly, saving $${yearlySaving}.`}
                            </Body>
                            <Button
                                fullWidth
                                variant='contained'
                                color='dojoOrange'
                                size='large'
                                disabled={isCurrent || status === AuthStatus.Loading}
                                loading={loading}
                                onClick={onJoin}
                                sx={{ mt: 2.5, minHeight: 56, fontWeight: 600, fontSize: '1.1rem' }}
                            >
                                {isCurrent ? 'This is your current plan' : selected.cta}
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
                                <Typography variant='body2'>
                                    Secure checkout with Stripe. Cancel anytime from your profile
                                    and keep access until the period ends.
                                </Typography>
                            </Stack>
                        </Box>
                    </Box>
                </Box>

                <Body
                    sx={{
                        mt: 3,
                        fontSize: '0.88rem',
                        textAlign: 'center',
                        maxWidth: '50rem',
                        mx: 'auto',
                    }}
                >
                    {VALUE_FOOTNOTE}
                </Body>
            </Section>
        </Box>
    );
}
