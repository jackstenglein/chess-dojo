'use client';

import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { Button, Grid, Stack, TextField, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

const SupportTicket = () => {
    const t = useTranslations('help.support');
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
            newErrors.name = t('fieldRequired');
        }
        if (email.trim().length === 0) {
            newErrors.email = t('fieldRequired');
        }
        if (subject.trim().length === 0) {
            newErrors.subject = t('fieldRequired');
        }
        if (message.trim().length === 0) {
            newErrors.message = t('fieldRequired');
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
                <Typography variant='h4'>{t('title')}</Typography>
                <Typography color='text.secondary' mb={2}>
                    {t('patience')}
                    <br />
                    <br />
                    {t.rich('ticketSubmitted', {
                        strong: (chunks) => <strong>{chunks}</strong>,
                        ticketId: request.data,
                    })}
                </Typography>
            </Stack>
        );
    }

    return (
        <Stack id='support-ticket'>
            <Typography variant='h4'>{t('title')}</Typography>
            <Typography color='text.secondary' mb={2}>
                {t('patience')}
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
                        label={t('fullName')}
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
                        label={t('email')}
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
                        label={t('subject')}
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
                        label={t('message')}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        error={Boolean(errors.message)}
                        helperText={errors.message}
                        fullWidth
                        multiline
                        minRows={3}
                        placeholder={t('messagePlaceholder')}
                    />
                </Grid>

                <Grid display='flex' justifyContent='center' size={12}>
                    <Button
                        data-testid='support-ticket-submit'
                        variant='contained'
                        loading={request.isLoading()}
                        onClick={onSubmit}
                    >
                        {t('submit')}
                    </Button>
                </Grid>
            </Grid>
            <RequestSnackbar request={request} />
        </Stack>
    );
};

export default SupportTicket;
