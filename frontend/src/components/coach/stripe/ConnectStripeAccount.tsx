import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { OpenInNew } from '@mui/icons-material';
import { Button, Card, CardContent, CardHeader, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

const ConnectStripeAccount = () => {
    const t = useTranslations('coach.stripe.connect');
    const api = useApi();
    const request = useRequest();

    const onSetup = () => {
        request.onStart();

        api.createPaymentAccount()
            .then((response) => {
                window.location.href = response.data.url;
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    return (
        <Stack spacing={5}>
            <RequestSnackbar request={request} />

            <Card variant='outlined'>
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
                            onClick={onSetup}
                            endIcon={<OpenInNew />}
                        >
                            {t('button')}
                        </Button>
                    </Stack>
                </CardContent>
            </Card>
        </Stack>
    );
};

export default ConnectStripeAccount;
