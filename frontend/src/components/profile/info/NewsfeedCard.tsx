'use client';

import { useApi } from '@/api/Api';
import { useRequest } from '@/api/Request';
import { ListNewsfeedResponse } from '@/api/newsfeedApi';
import { useAuth } from '@/auth/Auth';
import NewsfeedItem from '@/components/newsfeed/NewsfeedItem';
import { TimelineEntry } from '@/database/timeline';
import { Feed, OpenInNew } from '@mui/icons-material';
import { Button, Card, CardContent, Skeleton, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';

const MAX_ITEMS = 3;
const MAX_COMMENTS = 2;

export function NewsfeedCard() {
    const { user } = useAuth();
    const api = useApi();
    const request = useRequest<ListNewsfeedResponse>();
    const [entries, setEntries] = useState<TimelineEntry[]>([]);

    const handleResponse = useCallback((resp: ListNewsfeedResponse) => {
        setEntries(resp.entries.slice(0, MAX_ITEMS));
    }, []);

    useEffect(() => {
        if (!request.isSent() && user?.dojoCohort) {
            request.onStart();
            api.listNewsfeed(['following', user.dojoCohort])
                .then((resp) => {
                    handleResponse(resp.data);
                    request.onSuccess();
                })
                .catch((err) => {
                    request.onFailure(err);
                });
        }
    }, [request, api, user?.dojoCohort, handleResponse]);

    const onEdit = (entry: TimelineEntry) => {
        const i = entries.findIndex((e) => e.id === entry.id);
        if (i >= 0) {
            setEntries([...entries.slice(0, i), entry, ...entries.slice(i + 1)]);
        }
    };

    return (
        <Card data-testid='newsfeed-card'>
            <CardContent>
                <Stack spacing={2}>
                    <Stack direction='row' justifyContent='space-between' alignItems='center'>
                        <Stack direction='row' spacing={1} alignItems='center'>
                            <Feed fontSize='small' color='primary' />
                            <Typography variant='h6'>Newsfeed</Typography>
                        </Stack>
                        <Button
                            href='/newsfeed'
                            size='small'
                            endIcon={<OpenInNew fontSize='small' />}
                            data-testid='newsfeed-view-all'
                        >
                            View All
                        </Button>
                    </Stack>

                    {request.isLoading() && !entries.length && (
                        <Stack spacing={2}>
                            <Skeleton variant='rounded' height={80} />
                            <Skeleton variant='rounded' height={80} />
                        </Stack>
                    )}

                    {entries.map((entry) => (
                        <NewsfeedItem
                            key={entry.id}
                            entry={entry}
                            onEdit={onEdit}
                            maxComments={MAX_COMMENTS}
                        />
                    ))}

                    {!request.isLoading() && entries.length === 0 && (
                        <Typography variant='body2' color='text.secondary' textAlign='center'>
                            No recent activity from your follows or cohort.
                        </Typography>
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
}
