import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { RequestSnackbar, RequestStatus, useRequest } from '@/api/Request';
import { displayPrice } from '@/app/(scoreboard)/courses/(list)/CourseListItem';
import { useAuth } from '@/auth/Auth';
import { toDojoDateString, toDojoTimeString } from '@/components/calendar/displayDate';
import { Link } from '@/components/navigation/Link';
import { Event } from '@/database/event';
import { TimeFormat, dojoCohorts } from '@/database/user';
import Icon from '@/style/Icon';
import { LoadingButton } from '@mui/lab';
import { AppBar, Button, Dialog, DialogContent, Stack, Toolbar, Typography } from '@mui/material';
import Field from '../eventViewer/Field';
import OwnerField from '../eventViewer/OwnerField';
import ParticipantsList from '../eventViewer/ParticipantsList';
import { Transition } from './AvailabilityBooker';

interface CoachingBookerProps {
    event: Event;
}

const CoachingBooker: React.FC<CoachingBookerProps> = ({ event }) => {
    const user = useAuth().user;
    const request = useRequest();
    const api = useApi();

    if (!event.coaching) {
        return null;
    }

    const isParticipant = Boolean(event.participants[user?.username || '']);
    const fullPrice = event.coaching.fullPrice;
    const currentPrice = event.coaching.currentPrice;
    const percentOff =
        currentPrice > 0 ? Math.round(((fullPrice - currentPrice) / fullPrice) * 100) : 0;

    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);

    const timezone = user?.timezoneOverride;
    const timeFormat = user?.timeFormat || TimeFormat.TwelveHour;
    const startDate = toDojoDateString(startTime, timezone);
    const startTimeStr = toDojoTimeString(startTime, timezone, timeFormat);
    const endTimeStr = toDojoTimeString(endTime, timezone, timeFormat);

    const onBook = () => {
        request.onStart();
        api.bookEvent(event.id)
            .then((resp) => {
                trackEvent(EventType.BookCoaching, {
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

    return (
        <Dialog
            data-testid='availability-booker'
            fullScreen
            open={true}
            TransitionComponent={Transition}
        >
            <AppBar sx={{ position: 'relative' }}>
                <Toolbar>
                    <Typography sx={{ ml: 2, flex: 1 }} variant='h6' component='div'>
                        Book Coaching Session
                    </Typography>
                    <Button
                        data-testid='cancel-button'
                        component={Link}
                        color='error'
                        href={'/calendar'}
                        disabled={request.status === RequestStatus.Loading}
                        startIcon={<Icon name='cancel' />}
                    >
                        Cancel
                    </Button>
                    <LoadingButton
                        data-testid='book-button'
                        color='success'
                        disabled={isParticipant}
                        loading={request.status === RequestStatus.Loading}
                        onClick={onBook}
                        startIcon={<Icon name='join' />}
                    >
                        Book
                    </LoadingButton>
                </Toolbar>
            </AppBar>
            <DialogContent>
                <Stack sx={{ pt: 2 }} spacing={3}>
                    <Typography variant='h6'>{event.title}</Typography>

                    <Field
                        iconName='clock'
                        title='Time'
                        body={`${startDate} ${startTimeStr} - ${endTimeStr}`}
                    />

                    <Stack>
                        <Typography variant='subtitle2' color='text.secondary'>
                            Price
                        </Typography>
                        {isParticipant ? (
                            <Typography>Already Booked</Typography>
                        ) : (
                            <>
                                <Stack direction='row' spacing={1} alignItems='baseline'>
                                    <Typography
                                        variant='body1'
                                        sx={{
                                            color: percentOff > 0 ? 'error.main' : undefined,
                                            textDecoration:
                                                percentOff > 0 ? 'line-through' : undefined,
                                        }}
                                    >
                                        ${displayPrice(fullPrice / 100)}
                                    </Typography>

                                    {percentOff > 0 && (
                                        <>
                                            <Typography variant='body1' color='success.main'>
                                                ${displayPrice(currentPrice / 100)}
                                            </Typography>

                                            <Typography variant='body2' color='text.secondary'>
                                                (-{percentOff}%)
                                            </Typography>
                                        </>
                                    )}
                                </Stack>

                                <Typography variant='caption' color='text.secondary'>
                                    Upon booking, you will have 30 minutes to complete payment
                                    before losing your spot. Cancelations must be made more than 24
                                    hours in advance to receive a refund.
                                </Typography>
                            </>
                        )}
                    </Stack>

                    <OwnerField title='Coach' event={event} />
                    <Field title='Description' body={event.description} iconName='notes' />
                    <Field
                        iconName='cohort'
                        title='Cohorts'
                        body={
                            dojoCohorts.length === event.cohorts.length ||
                            event.cohorts.length === 0
                                ? 'All Cohorts'
                                : event.cohorts.join(', ')
                        }
                    />
                    <Stack spacing={0.5}>
                        <Field
                            iconName='participant'
                            showEmptyBody
                            title={`Participants (${Object.values(event.participants).length} / ${
                                event.maxParticipants
                            })`}
                            body={
                                Object.values(event.participants).length === 0
                                    ? 'No Participants Yet'
                                    : event.coaching.hideParticipants && !isParticipant
                                      ? 'Participants hidden until after booking'
                                      : undefined
                            }
                        />
                        {(!event.coaching.hideParticipants || isParticipant) && (
                            <ParticipantsList hideOwner event={event} />
                        )}
                    </Stack>
                </Stack>

                <RequestSnackbar request={request} />
            </DialogContent>
        </Dialog>
    );
};

export default CoachingBooker;
