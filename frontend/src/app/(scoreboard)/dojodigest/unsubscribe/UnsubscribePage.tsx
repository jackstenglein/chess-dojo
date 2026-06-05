'use client';

import { unsubscribeFromDojoDigest } from '@/api/emailApi';
import { RequestSnackbar, RequestStatus, useRequest } from '@/api/Request';
import { AuthStatus, useAuth } from '@/auth/Auth';
import LoadingPage from '@/loading/LoadingPage';
import { Button, Container, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';

const UnsubscribePage = () => {
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
                    <Typography variant='h6'>Unsubscribe from Dojo Digest</Typography>

                    <Typography>
                        {email} has been unsubscribed. Please allow 24 hours for this change to take
                        effect.
                    </Typography>
                </Stack>
            </Container>
        );
    }

    return (
        <Container maxWidth='md' sx={{ py: 4 }}>
            <RequestSnackbar request={request} />

            <Stack spacing={4}>
                <Typography variant='h6'>Unsubscribe from Dojo Digest</Typography>

                <TextField label='Email' value={email} onChange={(e) => setEmail(e.target.value)} />

                <Button variant='contained' loading={request.isLoading()} onClick={onUnsubscribe}>
                    Unsubscribe
                </Button>
            </Stack>
        </Container>
    );
};

export default UnsubscribePage;
