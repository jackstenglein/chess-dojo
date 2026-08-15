'use client';

import { unsubscribeFromDojoDigest } from '@/api/emailApi';
import { RequestSnackbar, RequestStatus, useRequest } from '@/api/Request';
import { AuthStatus, useAuth } from '@/auth/Auth';
import LoadingPage from '@/loading/LoadingPage';
import { Button, Container, Stack, TextField, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

const UnsubscribePage = () => {
    const t = useTranslations('dojoDigest');
    const [email, setEmail] = useState('');
    const request = useRequest();
    const auth = useAuth();

    const onUnsubscribe = () => {
        if (email.trim().length === 0) {
            return;
        }

        request.onStart();
        unsubscribeFromDojoDigest(email)
            .then(() => {
                request.onSuccess();
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    if (auth.status === AuthStatus.Loading) {
        return <LoadingPage />;
    }

    if (request.status === RequestStatus.Success) {
        return (
            <Container maxWidth='md' sx={{ py: 4 }}>
                <Stack spacing={4}>
                    <Typography variant='h6'>{t('unsubscribeTitle')}</Typography>

                    <Typography>{t('unsubscribeSuccess', { email })}</Typography>
                </Stack>
            </Container>
        );
    }

    return (
        <Container maxWidth='md' sx={{ py: 4 }}>
            <RequestSnackbar request={request} />

            <Stack spacing={4}>
                <Typography variant='h6'>{t('unsubscribeTitle')}</Typography>

                <TextField
                    label={t('emailLabel')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <Button variant='contained' loading={request.isLoading()} onClick={onUnsubscribe}>
                    {t('unsubscribeButton')}
                </Button>
            </Stack>
        </Container>
    );
};

export default UnsubscribePage;
