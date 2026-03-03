import { EventType as AnalyticsEventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { Request, RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { toDojoDateString, toDojoTimeString } from '@/components/calendar/displayDate';
import Field from '@/components/calendar/eventViewer/Field';
import OwnerField from '@/components/calendar/eventViewer/OwnerField';
import PriceField from '@/components/calendar/eventViewer/PriceField';
import { Link } from '@/components/navigation/Link';
import { Event, EventStatus, EventType } from '@/database/event';
import { User, dojoCohorts, isFree } from '@/database/user';
import { useRouter } from '@/hooks/useRouter';
import LoadingPage from '@/loading/LoadingPage';
import { LoadingButton } from '@mui/lab';
import { Button, Card, CardContent, CardHeader, Stack, Typography } from '@mui/material';

export function displayEvent(event: Event, viewer?: User): boolean {
    if (event.type !== EventType.Coaching) {
        return false;
    }

    if (event.startTime <= new Date().toISOString()) {
        return false;
    }

    const isOwner = event.owner === viewer?.username;
    if (
        viewer &&
        !isOwner &&
        !viewer.isAdmin &&
        !viewer.isCalendarAdmin &&
        event.cohorts &&
        event.cohorts.length > 0 &&
        event.cohorts.every((c) => c !== viewer.dojoCohort)
    ) {
        return false;
    }

    const isFreeTier = isFree(viewer);
    if (!isOwner && isFreeTier && !event.coaching?.bookableByFreeUsers) {
        return false;
    }

    const isParticipant = viewer && Boolean(event.participants[viewer.username]);
    if (event.status !== EventStatus.Scheduled && !isOwner && !isParticipant) {
        return false;
    }

    if (event.status === EventStatus.Canceled) {
        return false;
    }

    return true;
}

interface CoachingListProps {
    events: Event[];
    request: Request;
}

const CoachingList: React.FC<CoachingListProps> = ({ events, request }) => {
    if (!request.isSent() || request.isLoading()) {
        return <LoadingPage />;
    }

    if (events.length === 0) {
        return (
            <Stack alignItems='center'>
                <Typography>No available sessions found for your cohort</Typography>
            </Stack>
        );
    }

    return (
        <Stack spacing={2}>
            {events.map((e) => (
                <CoachingListItem key={e.id} event={e} />
            ))}
        </Stack>
    );
};

const CoachingListItem: React.FC<{ event: Event }> = ({ event }) => {
    const viewer = useAuth().user;
    const api = useApi();
    const request = useRequest();
    const router = useRouter();

    if (!displayEvent(event, viewer)) {
        return null;
    }

    const isOwner = event.owner === viewer?.username;
    const isParticipant = viewer && Boolean(event.participants[viewer.username]);

    const onBook = () => {
        if (!viewer) {
            router.push('/signup');
            return;
        }

        request.onStart();
        api.bookEvent(event.id)
            .then((resp) => {
                trackEvent(AnalyticsEventType.BookCoaching, {
                    event_id: event.id,
                    coach_id: event.owner,
                    coach_name: event.ownerDisplayName,
                });
                window.location.href = resp.data.checkoutUrl;
            })
            .catch((err) => {
                request.onFailure(err);
            });
    };

    const start = new Date(event.startTime);

    return (
        <Card variant='outlined'>
            <CardHeader
                title={event.title}
                subheader={`${toDojoDateString(
                    start,
                    viewer?.timezoneOverride,
                )} • ${toDojoTimeString(start, viewer?.timezoneOverride, viewer?.timeFormat)}`}
                sx={{ pb: 0 }}
                action={
                    isOwner || isParticipant ? (
                        <Button variant='contained' component={Link} href={`/meeting/${event.id}`}>
                            View Details
                        </Button>
                    ) : (
                        <LoadingButton
                            data-testid='book-button'
                            variant='contained'
                            loading={request.isLoading()}
                            onClick={onBook}
                        >
                            Book
                        </LoadingButton>
                    )
                }
            />
            <CardContent>
                <Stack spacing={2}>
                    <OwnerField title='Coach' event={event} />

                    <PriceField event={event} />

                    <Field title='Description' body={event.description} />

                    <Field
                        title='Number of Participants'
                        body={`${Object.values(event.participants).length} / ${
                            event.maxParticipants
                        }`}
                    />

                    <Field
                        title='Cohorts'
                        body={
                            dojoCohorts.length === event.cohorts.length ||
                            event.cohorts.length === 0
                                ? 'All Cohorts'
                                : event.cohorts.join(', ')
                        }
                    />
                </Stack>
            </CardContent>

            <RequestSnackbar request={request} />
        </Card>
    );
};

export default CoachingList;
