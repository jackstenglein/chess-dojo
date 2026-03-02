'use client';

import NotFoundPage from '@/NotFoundPage';
import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useCache } from '@/api/cache/Cache';
import { useAuth } from '@/auth/Auth';
import { toDojoDateString, toDojoTimeString } from '@/components/calendar/displayDate';
import Field from '@/components/calendar/eventViewer/Field';
import ParticipantsList from '@/components/calendar/eventViewer/ParticipantsList';
import { Link } from '@/components/navigation/Link';
import { GameReviewCohortQueue } from '@/components/profile/liveClasses/GameReviewCohortQueue';
import { getConfig } from '@/config';
import { Event, EventStatus, EventType, getDisplayString } from '@/database/event';
import { dojoCohorts, User } from '@/database/user';
import { useRouter } from '@/hooks/useRouter';
import LoadingPage from '@/loading/LoadingPage';
import { logger } from '@/logging/logger';
import CancelMeetingButton from '@/meeting/CancelMeetingButton';
import MeetingMessages from '@/meeting/MeetingMessages';
import { GameReviewCohort } from '@jackstenglein/chess-dojo-common/src/liveClasses/api';
import { Warning } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import {
    Alert,
    Button,
    Card,
    CardContent,
    CardHeader,
    Container,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { Fragment, useEffect } from 'react';
import { datetime, RRule } from 'rrule';

const CANCELATION_DEADLINE = 24 * 1000 * 60 * 60; // 24 hours

/**
 * Returns the cancel dialog title and content for the given user and meeting.
 * @param user The user canceling the meeting.
 * @param meeting The meeting being canceled.
 * @returns An array containing the cancel dialog button, title and content.
 */
function getCancelDialog(user: User, meeting: Event): [string, string, string] {
    const isOwner = meeting.owner === user.username;
    const isCoaching = meeting.type === EventType.Coaching;

    if (isOwner && isCoaching) {
        return [
            'Cancel Meeting',
            'Cancel this meeting?',
            'Canceling this meeting will refund all participants.',
        ];
    } else if (isCoaching) {
        const now = new Date().getTime();
        const cancelationTime =
            new Date(meeting.bookedStartTime || meeting.startTime).getTime() - CANCELATION_DEADLINE;
        if (now >= cancelationTime) {
            return [
                'Leave Meeting',
                'Leave this meeting?',
                'It is within 24 hours of the start of the meeting, so you will not receive a refund.',
            ];
        }
        return [
            'Leave Meeting',
            'Leave this meeting?',
            'It is greater than 24 hours before the start of the meeting, so you will receive a full refund.',
        ];
    }

    const isSolo = meeting.maxParticipants === 1;
    if (isSolo && isOwner) {
        return [
            'Cancel Meeting',
            'Cancel this meeting?',
            'Ownership of this meeting will be transferred to your opponent and other users will be able to book the meeting.',
        ];
    } else if (isOwner) {
        return [
            'Leave Meeting',
            'Leave this meeting?',
            'Ownership of this meeting will be transferred to one of the participants, and you may not be able to re-join it later if other users book it.',
        ];
    } else if (isSolo) {
        return [
            'Cancel Meeting',
            'Cancel this meeting?',
            'This will allow the meeting to be booked by other users and you may not be able to re-book it.',
        ];
    } else {
        return [
            'Leave Meeting',
            'Leave this meeting?',
            'This will allow the meeting to be booked by other users and you may not be able to re-book it.',
        ];
    }
}

export function MeetingPage({ meetingId }: { meetingId: string }) {
    const cache = useCache();
    const { user } = useAuth();
    const checkoutRequest = useRequest();
    const api = useApi();
    const router = useRouter();

    const putEvent = cache.events.put;
    useEffect(() => {
        void api.getEvent(meetingId).then((resp) => {
            putEvent(resp.data);
        });
    }, [api, meetingId, putEvent]);

    if (!user) {
        return <LoadingPage />;
    }

    const meeting = cache.events.get(meetingId || '');
    if (!meeting) {
        if (cache.isLoading) {
            return <LoadingPage />;
        }
        return <NotFoundPage />;
    }

    const isLiveClass =
        meeting.type === EventType.GameReviewTier || meeting.type === EventType.LectureTier;
    const isGameReviewTier = meeting.type === EventType.GameReviewTier;

    if (
        !isLiveClass &&
        meeting.owner !== user.username &&
        !Object.keys(meeting.participants).includes(user.username)
    ) {
        return <NotFoundPage />;
    }

    const onCancel = (event: Event) => {
        cache.events.put(event);
        router.push('/calendar');
    };

    if (!isLiveClass && Object.values(meeting.participants).length === 0) {
        return (
            <Container maxWidth='md' sx={{ py: 4 }}>
                <Typography>This meeting has not been booked yet.</Typography>
                <Button component={Link} href='/calendar' variant='contained' sx={{ mt: 2 }}>
                    Return to Calendar
                </Button>
            </Container>
        );
    }

    let dates: Date[] = [];
    if (meeting.rrule) {
        const options = RRule.parseString(meeting.rrule);
        const rrule = new RRule(options);
        if (!options.count && !options.until) {
            dates = rrule.between(new Date(), datetime(2050, 0, 1), true, (_, i: number) => i < 4);
        } else {
            dates = rrule.all();
        }
    } else {
        dates.push(new Date(meeting.bookedStartTime || meeting.startTime));
    }

    const startTime = toDojoTimeString(
        new Date(meeting.startTime),
        user.timezoneOverride,
        user.timeFormat,
    );
    const endTime = toDojoTimeString(
        new Date(meeting.endTime),
        user.timezoneOverride,
        user.timeFormat,
    );
    const times = dates.map((d) => {
        const startDate = toDojoDateString(d, user.timezoneOverride);
        return `${startDate} ${startTime} — ${endTime}`;
    });

    const isOwner = meeting.owner === user.username;
    const isCoaching = meeting.type === EventType.Coaching;
    const isSolo = meeting.maxParticipants === 1;
    const isCanceled = meeting.status === EventStatus.Canceled;
    const participant = meeting.participants[user.username];

    const [cancelButton, cancelDialogTitle, cancelDialogContent] = getCancelDialog(user, meeting);

    const onCompletePayment = () => {
        if (!meetingId) {
            return;
        }

        checkoutRequest.onStart();
        api.getEventCheckout(meetingId)
            .then((resp) => {
                window.location.href = resp.data.url;
            })
            .catch((err: unknown) => {
                checkoutRequest.onFailure(err);
            });
    };

    const onUpdateGameReviewCohort = (grc: GameReviewCohort) => {
        cache.events.put({ ...meeting, gameReviewCohort: grc });
    };

    logger.debug?.('Meeting: ', meeting);

    return (
        <Container maxWidth='lg' sx={{ py: 4 }}>
            <RequestSnackbar request={checkoutRequest} />

            <Stack spacing={4}>
                {isCoaching && !isOwner && !participant.hasPaid && !isCanceled && (
                    <Alert
                        severity='warning'
                        variant='filled'
                        action={
                            <LoadingButton
                                color='inherit'
                                size='small'
                                loading={checkoutRequest.isLoading()}
                                onClick={onCompletePayment}
                            >
                                Complete Payment
                            </LoadingButton>
                        }
                    >
                        You have not completed payment for this coaching session and will lose your
                        booking soon.
                    </Alert>
                )}

                {isCoaching && isCanceled && (
                    <Alert severity='warning' variant='filled'>
                        This meeting has been canceled by the coach. If you have already completed
                        payment, you will receive a full refund.
                    </Alert>
                )}

                <Card variant='outlined'>
                    <CardHeader
                        title={meeting.title || 'Meeting Details'}
                        action={
                            !isCanceled &&
                            !isLiveClass && (
                                <CancelMeetingButton
                                    meetingId={meeting.id}
                                    dialogTitle={cancelDialogTitle}
                                    dialogContent={cancelDialogContent}
                                    onSuccess={onCancel}
                                >
                                    {cancelButton}
                                </CancelMeetingButton>
                            )
                        }
                    />
                    <CardContent>
                        <Stack spacing={3}>
                            <Field
                                title='Times'
                                body={times.map((t, i) => (
                                    <Fragment key={t}>
                                        {t}
                                        {i < times.length - 1 && <br />}
                                    </Fragment>
                                ))}
                            />

                            <Field
                                title='Description'
                                slotProps={{ body: { whiteSpace: 'pre-line' } }}
                                body={meeting.description}
                            />
                            <Field title='Location' body={meeting.location || 'Discord'} />

                            <Field
                                title='Meeting Type(s)'
                                body={
                                    meeting.bookedType
                                        ? getDisplayString(meeting.bookedType)
                                        : meeting.types?.map((t) => getDisplayString(t)).join(', ')
                                }
                            />

                            {isLiveClass && (
                                <>
                                    <Field
                                        title='Recordings'
                                        body={
                                            <>
                                                Recordings will be available{' '}
                                                <Link href='/learn/live-classes'>here</Link> a few
                                                hours after the class.
                                            </>
                                        }
                                    />

                                    <Field
                                        title='Discord'
                                        body={
                                            <>
                                                Communicate with other members of the class in{' '}
                                                <Link
                                                    href={`https://discord.com/channels/${getConfig().discord.guildId}/${meeting.gameReviewCohort?.discordChannelId || meeting.discordChannelId}`}
                                                    target='_blank'
                                                >
                                                    this Discord channel
                                                </Link>
                                                .
                                            </>
                                        }
                                    />
                                </>
                            )}

                            {!isSolo && !isGameReviewTier && (
                                <Field
                                    title='Cohorts'
                                    body={
                                        meeting.cohorts.length === dojoCohorts.length
                                            ? 'All Cohorts'
                                            : meeting.cohorts.join(', ')
                                    }
                                />
                            )}
                        </Stack>
                    </CardContent>
                </Card>

                {isGameReviewTier && meeting.gameReviewCohort && (
                    <Stack spacing={1}>
                        <Typography variant='h5'>Review Queue</Typography>
                        <GameReviewCohortQueue
                            gameReviewCohort={meeting.gameReviewCohort}
                            setGameReviewCohort={onUpdateGameReviewCohort}
                        />
                    </Stack>
                )}

                {!isLiveClass && (
                    <Card variant='outlined'>
                        <CardHeader
                            title={
                                <Stack direction='row' spacing={2} alignItems='center'>
                                    <Typography variant='h5'>Participants</Typography>
                                    {isCoaching &&
                                        isOwner &&
                                        Object.values(meeting.participants).some(
                                            (p) => !p.hasPaid,
                                        ) && (
                                            <Tooltip title='Some users have not paid and will lose their booking in ~30 min'>
                                                <Warning color='warning' />
                                            </Tooltip>
                                        )}
                                </Stack>
                            }
                        />
                        <CardContent>
                            <ParticipantsList event={meeting} showPaymentWarning={isCoaching} />
                        </CardContent>
                    </Card>
                )}

                {!isLiveClass && <MeetingMessages meetingId={meetingId} />}
            </Stack>
        </Container>
    );
}
