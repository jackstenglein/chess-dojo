'use client';

import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useNotifications } from '@/api/cache/Cache';
import { NotificationListItem } from '@/components/notifications/NotificationListItem';
import LoadingPage from '@/loading/LoadingPage';
import { Button, CircularProgress, Container, Stack, Typography } from '@mui/material';

export function NotificationsPage() {
    const { notifications, request, clearNotifications } = useNotifications();
    const api = useApi();
    const clearRequest = useRequest();

    const onClearAll = () => {
        clearRequest.onStart();
        api.deleteAllNotifications()
            .then(() => {
                clearNotifications();
                clearRequest.onSuccess();
            })
            .catch((err) => {
                clearRequest.onFailure(err);
            });
    };

    if (!request.isSent() || request.isLoading()) {
        return <LoadingPage />;
    }

    return (
        <Container sx={{ py: 4 }}>
            <RequestSnackbar request={clearRequest} />

            <Stack direction='row' justifyContent='space-between' alignItems='center'>
                <Typography variant='h4'>Notifications</Typography>

                {notifications.length > 0 &&
                    (clearRequest.isLoading() ? (
                        <CircularProgress size={24} />
                    ) : (
                        <Button
                            data-testid='clear-all-notifications'
                            variant='outlined'
                            onClick={onClearAll}
                        >
                            Clear All
                        </Button>
                    ))}
            </Stack>

            <Stack pt={3} spacing={2}>
                {notifications.map((n) => (
                    <NotificationListItem key={n.id} notification={n} />
                ))}
                {notifications.length === 0 && <Typography>No notifications</Typography>}
            </Stack>
        </Container>
    );
}
