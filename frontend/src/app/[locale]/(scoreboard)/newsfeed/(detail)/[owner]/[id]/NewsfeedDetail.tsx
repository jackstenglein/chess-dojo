'use client';

import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import NewsfeedItem from '@/components/newsfeed/NewsfeedItem';
import { TimelineEntry } from '@/database/timeline';
import LoadingPage from '@/loading/LoadingPage';
import NotFoundPage from '@/NotFoundPage';
import { Container } from '@mui/material';
import { useEffect } from 'react';

export function NewsfeedDetail({ owner, id }: { owner: string; id: string }) {
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

    const reset = request.reset;
    useEffect(() => {
        reset();
    }, [reset, owner, id]);

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
