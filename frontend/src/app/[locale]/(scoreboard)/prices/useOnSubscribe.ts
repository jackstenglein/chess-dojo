import { EventType, trackEvent } from '@/analytics/events';
import { metaInitiateCheckout } from '@/analytics/meta';
import { subscriptionCheckout, subscriptionManage } from '@/api/paymentApi';
import { useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { getConfig } from '@/config';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import { useRouter } from '@/hooks/useRouter';
import { onSubscribeFunc } from '@/upsell/PriceMatrix';
import {
    getSubscriptionTier,
    PaymentInfo,
    SubscriptionTier,
} from '@jackstenglein/chess-dojo-common/src/database/user';
import { useState } from 'react';

const config = getConfig();

export function useOnSubscribe() {
    const { user } = useAuth();
    const router = useRouter();
    const [tier, setTier] = useState<SubscriptionTier>();
    const request = useRequest();
    const { searchParams } = useNextSearchParams();
    const redirect = searchParams.get('redirect') || '';

    const onSubscribe: onSubscribeFunc = (tier, interval, price) => {
        if (!user) {
            router.push('/signup');
        }

        setTier(tier);
        request.onStart();

        const itemId = config.stripe.tiers[tier][interval];
        metaInitiateCheckout([itemId], price.currency, price.value);
        trackEvent(EventType.BeginCheckout, {
            currency: price.currency,
            value: price.value,
            items: [{ item_id: itemId, item_name: `Subscription - ${tier}` }],
        });

        if (
            isValidStripe(user?.paymentInfo) &&
            getSubscriptionTier(user) !== SubscriptionTier.Free
        ) {
            subscriptionManage(/*idToken=*/ '', tier, interval)
                .then((resp) => {
                    window.location.href = resp.data.url;
                })
                .catch((err: unknown) => {
                    request.onFailure(err);
                });
        } else {
            subscriptionCheckout(/*idToken=*/ '', {
                tier,
                interval,
                successUrl: redirect,
                cancelUrl: redirect,
            })
                .then((resp) => {
                    window.location.href = resp.data.url;
                })
                .catch((err: unknown) => {
                    request.onFailure(err);
                });
        }
    };

    return { tier, request, onSubscribe };
}

function isValidStripe(paymentInfo?: PaymentInfo): boolean {
    const customerId = paymentInfo?.customerId ?? '';
    return customerId !== '' && customerId !== 'WIX' && customerId !== 'OVERRIDE';
}
