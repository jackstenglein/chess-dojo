import { EventType, trackEvent } from '@/analytics/events';
import { RequestSnackbar } from '@/api/Request';
import { AuthStatus, useAuth } from '@/auth/Auth';
import { useRouter } from '@/hooks/useRouter';
import { getSubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { Bolt, Check, Lock } from '@mui/icons-material';
import { Box, Button, Stack, Typography } from '@mui/material';
import { RefObject, Suspense, useEffect, useRef, useState } from 'react';
import { useOnSubscribe } from '../../(scoreboard)/prices/useOnSubscribe';
import { savePendingCheckout, takePendingCheckout } from '../../class/classLead';
import { ClassOfferTier } from '../../class/content';
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
    revealSx,
    Section,
} from '../../class/sections/shared';
import {
    CHECKOUT_HINT,
    COUPON,
    couponReminder,
    firstPaymentLine,
    MEMBERS,
    planForTier,
    PLANS,
    PLANS_SECTION,
    RUSH_PAGE_PATH,
    RushPlan,
} from '../content';
import { CopyCodeButton } from './CopyCode';
import { bodyFontSx } from './parts';

type Interval = 'month' | 'year';
type Subscribe = (tier: ClassOfferTier, interval: Interval) => void;

/**
 * useOnSubscribe reads the search params, which would turn the whole page into a
 * client-only render. Keeping it here, under Suspense, leaves the copy in the HTML.
 * This is the /class checkout path: the same hook and the same pending-checkout keys.
 */
function SubscribeBridge({
    subscribeRef,
    onLoadingTier,
}: {
    subscribeRef: RefObject<Subscribe | null>;
    onLoadingTier: (tier: ClassOfferTier | undefined) => void;
}) {
    const { status } = useAuth();
    const { request, tier, onSubscribe } = useOnSubscribe();
    const resumed = useRef(false);
    const loading = request.isLoading();

    useEffect(() => {
        subscribeRef.current = (selected, interval) =>
            onSubscribe(selected, interval, {
                currency: 'USD',
                value: planForTier(selected).offer.price[interval],
            });
    }, [subscribeRef, onSubscribe]);

    useEffect(() => {
        onLoadingTier(loading ? (tier as ClassOfferTier | undefined) : undefined);
    }, [loading, tier, onLoadingTier]);

    // Picks checkout back up after a logged-out buyer signs up.
    useEffect(() => {
        if (status !== AuthStatus.Authenticated || resumed.current) {
            return;
        }
        resumed.current = true;
        const pending = takePendingCheckout();
        if (pending) {
            onSubscribe(pending.tier, pending.interval, {
                currency: 'USD',
                value: planForTier(pending.tier).offer.price[pending.interval],
            });
        }
    }, [status, onSubscribe]);

    return <RequestSnackbar request={request} />;
}

/** What members get, and the three plans. */
export function Plans({ unlocked }: { unlocked: boolean }) {
    const router = useRouter();
    const { status, user } = useAuth();
    const [interval, setInterval] = useState<Interval>('year');
    const [loadingTier, setLoadingTier] = useState<ClassOfferTier>();
    const subscribeRef = useRef<Subscribe>(null);
    const currentTier = getSubscriptionTier(user);
    const reminder = unlocked ? couponReminder() : undefined;
    const discounted = unlocked && COUPON.confirmed;

    const onJoin = (plan: RushPlan) => {
        trackEvent(EventType.RushDemoOfferClick, {
            placement: 'plans',
            tier: plan.offer.tier,
            interval,
        });
        if (status !== AuthStatus.Authenticated) {
            savePendingCheckout(plan.offer.tier, interval);
            router.push(`/signup?redirectUri=${encodeURIComponent(RUSH_PAGE_PATH)}`);
            return;
        }
        subscribeRef.current?.(plan.offer.tier, interval);
    };

    return (
        <Box
            id={OFFER_ELEMENT_ID}
            sx={{
                scrollMarginTop: 0,
                background: 'linear-gradient(270deg, #141422 0%, #06060B 100%)',
                borderTop: `1px solid ${HAIRLINE}`,
            }}
        >
            <Suspense fallback={null}>
                <SubscribeBridge subscribeRef={subscribeRef} onLoadingTier={setLoadingTier} />
            </Suspense>

            <Section>
                <Heading description={PLANS_SECTION.body} sx={{ mb: { xs: 4, md: 5 } }}>
                    {PLANS_SECTION.heading}
                </Heading>

                {unlocked && (
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        sx={{
                            mb: 3,
                            px: 2.5,
                            py: 2,
                            gap: { xs: 1.5, sm: 2.5 },
                            alignItems: { sm: 'center' },
                            justifyContent: 'space-between',
                            borderRadius: 2,
                            border: `1px solid rgba(247, 148, 31, 0.5)`,
                            bgcolor: 'rgba(247, 148, 31, 0.1)',
                        }}
                    >
                        {reminder ? (
                            <>
                                <Box>
                                    <Box role='note'>
                                        <Condensed sx={{ fontSize: '1.4rem' }}>
                                            {reminder}
                                        </Condensed>
                                    </Box>
                                    <Typography
                                        variant='body2'
                                        sx={{ mt: 0.25, color: 'rgba(255, 255, 255, 0.82)' }}
                                    >
                                        {CHECKOUT_HINT}
                                    </Typography>
                                </Box>
                                <CopyCodeButton placement='plans' />
                            </>
                        ) : (
                            <Body sx={{ color: 'common.white' }}>
                                <span role='note'>
                                    Your {COUPON.percentOff}% code comes by email. Enter it on the
                                    Stripe checkout page under “Add promotion code”.
                                </span>
                            </Body>
                        )}
                    </Stack>
                )}

                <Stack
                    role='radiogroup'
                    aria-label='Billing'
                    direction='row'
                    sx={{
                        position: 'relative',
                        mb: 3,
                        p: 0.5,
                        maxWidth: '24rem',
                        borderRadius: 2,
                        border: `1px solid ${HAIRLINE}`,
                    }}
                >
                    {/* One thumb that slides, so the choice reads as a move and not as two repaints. */}
                    <Box
                        aria-hidden
                        sx={{
                            position: 'absolute',
                            top: 4,
                            bottom: 4,
                            left: 4,
                            width: 'calc(50% - 4px)',
                            borderRadius: 1.5,
                            bgcolor: ORANGE,
                            transform: interval === 'year' ? 'translateX(0)' : 'translateX(100%)',
                            transition: `transform 240ms ${EASE_OUT}`,
                        }}
                    />
                    {(['year', 'month'] as const).map((option) => (
                        <Box
                            key={option}
                            component='button'
                            type='button'
                            role='radio'
                            aria-checked={interval === option}
                            onClick={() => setInterval(option)}
                            sx={{
                                position: 'relative',
                                flex: 1,
                                minHeight: 44,
                                font: 'inherit',
                                fontWeight: 600,
                                cursor: 'pointer',
                                border: 0,
                                borderRadius: 1.5,
                                bgcolor: 'transparent',
                                color: interval === option ? '#0b0b12' : 'common.white',
                                transition: 'color 180ms ease',
                            }}
                        >
                            {option === 'month' ? 'Billed monthly' : 'Billed yearly'}
                        </Box>
                    ))}
                </Stack>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                        gap: 2.5,
                        alignItems: 'stretch',
                    }}
                >
                    {PLANS.map((plan) => {
                        const { offer } = plan;
                        const price = offer.price[interval];
                        const isCurrent = currentTier === offer.tier;
                        return (
                            <Stack
                                key={offer.tier}
                                sx={{
                                    ...revealSx,
                                    p: { xs: 2.5, md: 3 },
                                    bgcolor: INK_RAISED,
                                    borderRadius: 3,
                                    border: `1px solid ${HAIRLINE}`,
                                    borderTop: `4px solid ${offer.accent}`,
                                }}
                            >
                                <Condensed component='h3' sx={{ fontSize: '1.9rem' }}>
                                    {plan.name}
                                </Condensed>
                                <Body sx={{ mt: 0.5, fontSize: '1.03rem' }}>{plan.tagline}</Body>

                                <Stack
                                    direction='row'
                                    sx={{ mt: 2, alignItems: 'baseline', gap: 0.75 }}
                                >
                                    <Condensed sx={{ fontSize: '2.8rem', lineHeight: 1 }}>
                                        ${price}
                                    </Condensed>
                                    <Typography sx={{ ...bodyFontSx, color: MUTED }}>
                                        / month
                                    </Typography>
                                </Stack>
                                <Typography variant='body2' sx={{ mt: 0.5, color: MUTED }}>
                                    {interval === 'year'
                                        ? `Billed $${(price * 12).toLocaleString('en-US')} once a year.`
                                        : `Billed monthly. $${offer.price.year} a month if you pay yearly.`}
                                </Typography>
                                {discounted && (
                                    <Typography
                                        variant='body2'
                                        sx={{ mt: 0.75, color: ORANGE, fontWeight: 600 }}
                                    >
                                        {firstPaymentLine(plan, interval)}
                                    </Typography>
                                )}

                                <Stack component='ul' sx={{ m: 0, mt: 2, p: 0, gap: 1 }}>
                                    {plan.points.map((point) => (
                                        <Stack
                                            key={point}
                                            component='li'
                                            direction='row'
                                            sx={{ gap: 1, listStyle: 'none' }}
                                        >
                                            {point.includes('Dojo Rush') ? (
                                                <Bolt
                                                    sx={{
                                                        mt: '2px',
                                                        fontSize: '1.2rem',
                                                        color: ORANGE,
                                                    }}
                                                />
                                            ) : (
                                                <Check
                                                    sx={{
                                                        mt: '3px',
                                                        fontSize: '1.1rem',
                                                        color: offer.accent,
                                                    }}
                                                />
                                            )}
                                            <Typography sx={{ ...bodyFontSx, fontSize: '1.03rem' }}>
                                                {point}
                                            </Typography>
                                        </Stack>
                                    ))}
                                </Stack>

                                <Box sx={{ flexGrow: 1, minHeight: 20 }} />
                                <Button
                                    fullWidth
                                    variant='contained'
                                    color='dojoOrange'
                                    size='large'
                                    disabled={isCurrent || status === AuthStatus.Loading}
                                    loading={loadingTier === offer.tier}
                                    onClick={() => onJoin(plan)}
                                    sx={{ minHeight: 52, fontWeight: 600, fontSize: '1.1rem' }}
                                >
                                    {isCurrent ? 'This is your current plan' : `Join ${plan.name}`}
                                </Button>
                            </Stack>
                        );
                    })}
                </Box>

                <Stack
                    direction='row'
                    sx={{ mt: 3, gap: 0.75, alignItems: 'flex-start', color: MUTED }}
                >
                    <Lock sx={{ fontSize: 16, mt: '2px' }} />
                    <Typography variant='body2'>
                        {MEMBERS.checkoutNote} {MEMBERS.footnote}
                    </Typography>
                </Stack>
            </Section>
        </Box>
    );
}
