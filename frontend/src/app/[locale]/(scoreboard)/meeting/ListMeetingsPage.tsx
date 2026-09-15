'use client';

import { RequestSnackbar } from '@/api/Request';
import { useEvents } from '@/api/cache/Cache';
import { useAuth } from '@/auth/Auth';
import MeetingListItem from '@/components/meeting/MeetingListItem';
import { Link } from '@/components/navigation/Link';
import { Event, getEventEnd, getEventStart } from '@/database/event';
import LoadingPage from '@/loading/LoadingPage';
import { Button, CircularProgress, Container, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

const ONE_HOUR = 3600000;

export const ListMeetingsPage = () => {
    const t = useTranslations('meeting');
    const { user } = useAuth();
    const { events, request } = useEvents();

    if (!user) {
        return <LoadingPage />;
    }

    const filterTime = new Date(new Date().getTime() - ONE_HOUR).toISOString();

    const meetingFilter = (e: Event) => {
        if (Object.values(e.participants).length === 0) {
            return false;
        }
        if (e.owner !== user.username && !e.participants[user.username]) {
            return false;
        }
        return getEventEnd(e).toISOString() >= filterTime;
    };

    const meetings: Event[] = events.filter(meetingFilter);
    meetings.sort((lhs, rhs) =>
        (lhs.bookedStartTime || getEventStart(lhs).toISOString()).localeCompare(
            rhs.bookedStartTime || getEventStart(rhs).toISOString(),
        ),
    );

    const requestLoading = request.isLoading() || !request.isSent();

    return (
        <Container maxWidth='md' sx={{ py: 5 }}>
            <RequestSnackbar request={request} />

            <Stack
                spacing={2}
                sx={{
                    alignItems: 'start',
                }}
            >
                <Typography variant='h4'>{t('title')}</Typography>

                {requestLoading && meetings.length === 0 && <CircularProgress />}

                {!requestLoading && meetings.length === 0 && (
                    <>
                        <Typography variant='body1'>{t('emptyMessage')}</Typography>
                        <Button variant='contained' component={Link} href='/calendar'>
                            {t('goToCalendar')}
                        </Button>
                    </>
                )}

                {meetings.map((e) => (
                    <MeetingListItem key={e.id} meeting={e} />
                ))}
            </Stack>
        </Container>
    );
};
