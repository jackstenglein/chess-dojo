'use client';

import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import NewsfeedItem from '@/components/newsfeed/NewsfeedItem';
import { TimelineEntry } from '@/database/timeline';
import LoadingPage from '@/loading/LoadingPage';
import NotFoundPage from '@/NotFoundPage';
import { Alert, Container } from '@mui/material';
import { isAxiosError } from 'axios';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

export function NewsfeedDetail({ owner, id }: { owner: string; id: string }) {
    const { user } = useAuth();
    return (
        <NewsfeedDetailContent
            key={`${user?.username ?? 'public'}:${owner}:${id}`}
            owner={owner}
            id={id}
        />
    );
}

function NewsfeedDetailContent({ owner, id }: { owner: string; id: string }) {
    const tPrivacy = useTranslations('trainingPrivacy');
    const api = useApi();
    const request = useRequest<TimelineEntry>();

    useEffect(() => {
        if (!request.isSent() && owner && id) {
            request.onStart();
            api.getNewsfeedItem(owner, id)
                .then((resp) => {
                    request.onSuccess(resp.data);
                })
                .catch((err) => {
                    request.onFailure(err);
                });
        }
    }, [api, request, owner, id]);

    if (isAxiosError(request.error) && request.error.response?.status === 403) {
        return <Alert severity='info'>{tPrivacy('denied')}</Alert>;
    }

    if (!request.isSent() || request.isLoading()) {
        return <LoadingPage />;
    }

    if (!request.data) {
        return <NotFoundPage />;
    }

    return (
        <Container maxWidth='md' sx={{ pt: 6, pb: 4 }}>
            <RequestSnackbar request={request} />

            <NewsfeedItem entry={request.data} onEdit={request.onSuccess} />
        </Container>
    );
}
