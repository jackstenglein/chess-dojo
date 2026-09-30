'use client';

import { useApi } from '@/api/Api';
import { useRequest } from '@/api/Request';
import { ListNewsfeedResponse } from '@/api/newsfeedApi';
import { useAuth } from '@/auth/Auth';
import { CompactNewsfeedItem } from '@/components/newsfeed/CompactNewsfeedItem';
import { isNegativeEntry, isRestDayEntry } from '@/components/newsfeed/NewsfeedItem';
import { TimelineEntry } from '@/database/timeline';
import { Feed, OpenInNew } from '@mui/icons-material';
import { Button, Card, CardContent, Skeleton, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { CardTitle } from './CardTitle';

const MAX_ITEMS = 3;
const MAX_COMMENTS = 2;

export function NewsfeedCard() {
    const t = useTranslations('profile.info.newsfeedCard');
    const { user } = useAuth();
    const api = useApi();
    const request = useRequest<ListNewsfeedResponse>();
    const [entries, setEntries] = useState<TimelineEntry[]>([]);

    const handleResponse = useCallback((resp: ListNewsfeedResponse) => {
        // Most recently logged first, so the latest activity is at the top.
        setEntries(
            resp.entries
                .filter((entry) => !isRestDayEntry(entry) && !isNegativeEntry(entry))
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .slice(0, MAX_ITEMS),
        );
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
        <Card variant='outlined' data-testid='newsfeed-card'>
            <CardContent>
                <Stack spacing={2}>
                    <Stack
                        direction='row'
                        sx={{
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <CardTitle icon={<Feed color='primary' aria-hidden />}>
                            {t('newsfeed')}
                        </CardTitle>
                        <Button
                            href='/newsfeed'
                            size='small'
                            endIcon={<OpenInNew fontSize='small' />}
                            sx={{ textTransform: 'none', color: 'text.secondary' }}
                            data-testid='newsfeed-view-all'
                        >
                            {t('viewAll')}
                        </Button>
                    </Stack>

                    {request.isLoading() && !entries.length && (
                        <Stack spacing={2}>
                            <Skeleton variant='rounded' height={80} />
                            <Skeleton variant='rounded' height={80} />
                        </Stack>
                    )}

                    <Stack spacing={1.5}>
                        {entries.map((entry) => (
                            <Card key={entry.id} variant='outlined'>
                                <CardContent sx={{ p: 2, '&:last-child': { pb: 1 } }}>
                                    <CompactNewsfeedItem
                                        entry={entry}
                                        onEdit={onEdit}
                                        maxComments={MAX_COMMENTS}
                                        simple
                                    />
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>

                    {!request.isLoading() && entries.length === 0 && (
                        <Typography
                            variant='body2'
                            sx={{
                                color: 'text.secondary',
                                textAlign: 'center',
                            }}
                        >
                            {t('noActivity')}
                        </Typography>
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
}
