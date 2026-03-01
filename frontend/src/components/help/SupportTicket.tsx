'use client';

import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { LoadingButton } from '@mui/lab';
import { Grid, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';

const SupportTicket = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const api = useApi();
    const request = useRequest<string>();

    const onSubmit = () => {
        const newErrors: Record<string, string> = {};

        if (name.trim().length === 0) {
            newErrors.name = 'This field is required';
        }
        if (email.trim().length === 0) {
            newErrors.email = 'This field is required';
        }
        if (subject.trim().length === 0) {
            newErrors.subject = 'This field is required';
        }
        if (message.trim().length === 0) {
            newErrors.message = 'This field is required';
        }

        setErrors(newErrors);
        if (Object.values(newErrors).length > 0) {
            return;
        }

        request.onStart();
        api.createSupportTicket({
            name: name.trim(),
            email: email.trim(),
            subject: subject.trim(),
            message: message.trim(),
        })
            .then((resp) => {
                request.onSuccess(resp.data.ticketId);
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    if (request.data) {
        return (
            <Stack id='support-ticket'>
                <Typography variant='h4'>Contact Support</Typography>
                <Typography color='text.secondary' mb={2}>
                    Please note that we are a small team, and it may take a few business days for us
                    to get back to you. Thank you for your patience.
                    <br />
                    <br />
                    Your ticket has been submitted with ID <strong>{request.data}</strong>. You have
                    been CC'd on the support email.
                </Typography>
            </Stack>
        );
    }

    return (
        <Stack id='support-ticket'>
            <Typography variant='h4'>Contact Support</Typography>
            <Typography color='text.secondary' mb={2}>
                Please note that we are a small team, and it may take a few business days for us to
                get back to you. Thank you for your patience.
            </Typography>
            <Grid container rowSpacing={2} columnSpacing={2}>
                <Grid
                    size={{
                        xs: 12,
                        sm: 6,
                    }}
                >
                    <TextField
                        data-testid='support-ticket-name'
                        label='Full Name'
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        error={Boolean(errors.name)}
                        helperText={errors.name}
                        fullWidth
                    />
                </Grid>

                <Grid
                    size={{
                        xs: 12,
                        sm: 6,
                    }}
                >
                    <TextField
                        data-testid='support-ticket-email'
                        label='Email'
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        error={Boolean(errors.email)}
                        helperText={errors.email}
                        fullWidth
                    />
                </Grid>

                <Grid size={12}>
                    <TextField
                        data-testid='support-ticket-subject'
                        label='Subject'
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        error={Boolean(errors.subject)}
                        helperText={errors.subject}
                        fullWidth
                    />
                </Grid>

                <Grid size={12}>
                    <TextField
                        data-testid='support-ticket-message'
                        label='Message'
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        error={Boolean(errors.message)}
                        helperText={errors.message}
                        fullWidth
                        multiline
                        minRows={3}
                        placeholder='Please include as much detail about your issue as possible. Help us help you!'
                    />
                </Grid>

                <Grid display='flex' justifyContent='center' size={12}>
                    <LoadingButton
                        data-testid='support-ticket-submit'
                        variant='contained'
                        loading={request.isLoading()}
                        onClick={onSubmit}
                    >
                        Submit
                    </LoadingButton>
                </Grid>
            </Grid>
            <RequestSnackbar request={request} />
        </Stack>
    );
};

export default SupportTicket;
