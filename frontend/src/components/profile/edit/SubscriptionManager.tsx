import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { Link } from '@/components/navigation/Link';
import { isFree, User } from '@/database/user';
import {
    getSubscriptionTier,
    PaymentInfo,
    SubscriptionTier,
} from '@jackstenglein/chess-dojo-common/src/database/user';
import { OpenInNew } from '@mui/icons-material';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { Button, Divider, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

interface SubscriptionManagerProps {
    user: User;
}

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ user }) => {
    const request = useRequest();
    const api = useApi();
    const t = useTranslations('profile.subscription');

    const onManageSubscription = () => {
        request.onStart();
        api.subscriptionManage()
            .then((resp) => {
                window.location.href = resp.data.url;
            })
            .catch((err: unknown) => {
                request.onFailure(err);
            });
    };

    const isFreeTier = isFree(user);
    const paymentInfo = user.paymentInfo;

    return (
        <Stack
            spacing={2}
            sx={{
                alignItems: 'start',
            }}
        >
            <RequestSnackbar request={request} />

            <Stack
                id='subscription'
                sx={{
                    width: 1,
                    scrollMarginTop: 'calc(var(--navbar-height) + 8px)',
                }}
            >
                <Typography variant='h5'>
                    <MonetizationOnIcon sx={{ verticalAlign: 'middle', marginRight: '0.1em' }} />{' '}
                    {t('heading')}
                </Typography>
                <Divider />
            </Stack>

            {isFreeTier ? (
                <>
                    <Typography>{t('statusFree')}</Typography>
                    <Button variant='contained' component={Link} href='/prices'>
                        {t('viewPrices')}
                    </Button>
                </>
            ) : (
                <>
                    <Typography>{t('statusSubscribed')}</Typography>
                    <Typography>
                        {t('currentTier', { tier: displaySubscriptionTier(user, t) })}
                    </Typography>

                    {!isWix(paymentInfo) ? (
                        <Button
                            loading={request.isLoading()}
                            onClick={onManageSubscription}
                            variant='contained'
                            endIcon={<OpenInNew />}
                        >
                            {t('manageSubscription')}
                        </Button>
                    ) : (
                        <Button
                            variant='contained'
                            href='https://www.chessdojo.shop/account/my-subscriptions'
                            endIcon={<OpenInNew />}
                        >
                            {t('manageSubscription')}
                        </Button>
                    )}
                </>
            )}
        </Stack>
    );
};

function displaySubscriptionTier(user: User, t: (key: string) => string): string {
    switch (getSubscriptionTier(user)) {
        case SubscriptionTier.Free:
            return t('tierFree');
        case SubscriptionTier.Basic:
            return t('tierCore');
        case SubscriptionTier.Lecture:
            return t('tierLecture');
        case SubscriptionTier.GameReview:
            return t('tierGameReview');
    }
}

function isWix(paymentInfo?: PaymentInfo): boolean {
    if (!paymentInfo) {
        return true;
    }
    return paymentInfo.customerId === '' || paymentInfo.customerId === 'WIX';
}

export default SubscriptionManager;
