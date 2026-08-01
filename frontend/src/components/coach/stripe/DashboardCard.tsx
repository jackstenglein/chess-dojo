import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { StripeAccount } from '@/database/payment';
import { OpenInNew } from '@mui/icons-material';
import { Button, Card, CardContent, CardHeader, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

const DashboardCard = ({ account }: { account?: StripeAccount }) => {
    const t = useTranslations('coach.stripe.dashboard');
    const api = useApi();
    const request = useRequest();

    if (!account?.details_submitted) {
        return null;
    }

    const onDashboard = () => {
        request.onStart();

        api.paymentAccountLogin()
            .then((response) => {
                window.location.href = response.data.url;
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return (
        <Card variant='outlined'>
            <RequestSnackbar request={request} />

            <CardHeader title={t('title')} />
            <CardContent>
                <Stack
                    spacing={2}
                    sx={{
                        alignItems: 'start',
                    }}
                >
                    <Typography>{t('body')}</Typography>

                    <Button
                        variant='contained'
                        loading={request.isLoading()}
                        onClick={onDashboard}
                        endIcon={<OpenInNew />}
                    >
                        {t('button')}
                    </Button>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default DashboardCard;
