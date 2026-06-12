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
import { useTranslations } from 'next-intl';
import { Fragment, useEffect } from 'react';
import { datetime, RRule } from 'rrule';

const CANCELATION_DEADLINE = 24 * 1000 * 60 * 60; // 24 hours

/**
 * Returns the cancel dialog title and content for the given user and meeting.
 * @param user The user canceling the meeting.
 * @param meeting The meeting being canceled.
 * @returns An array containing the cancel dialog button, title and content.
 */
function getCancelDialog(
    t: ReturnType<typeof useTranslations<'meeting'>>,
    user: User,
    meeting: Event,
): [string, string, string] {
    const isOwner = meeting.owner === user.username;
    const isCoaching = meeting.type === EventType.Coaching;

    if (isOwner && isCoaching) {
        return [
            t('cancelCoachingOwnerButton'),
            t('cancelCoachingOwnerTitle'),
            t('cancelCoachingOwnerContent'),
        ];
    } else if (isCoaching) {
        const now = new Date().getTime();
        const cancelationTime =
            new Date(meeting.bookedStartTime || meeting.startTime).getTime() - CANCELATION_DEADLINE;
        if (now >= cancelationTime) {
            return [
                t('leaveCoachingWithin24hButton'),
                t('leaveCoachingWithin24hTitle'),
                t('leaveCoachingWithin24hContent'),
            ];
        }
        return [
            t('leaveCoachingOver24hButton'),
            t('leaveCoachingOver24hTitle'),
            t('leaveCoachingOver24hContent'),
        ];
    }

    const isSolo = meeting.maxParticipants === 1;
    if (isSolo && isOwner) {
        return [t('cancelSoloOwnerButton'), t('cancelSoloOwnerTitle'), t('cancelSoloOwnerContent')];
    } else if (isOwner) {
        return [t('leaveGroupOwnerButton'), t('leaveGroupOwnerTitle'), t('leaveGroupOwnerContent')];
    } else if (isSolo) {
        return [
            t('cancelSoloParticipantButton'),
            t('cancelSoloParticipantTitle'),
            t('cancelSoloParticipantContent'),
        ];
    } else {
        return [
            t('leaveGroupParticipantButton'),
            t('leaveGroupParticipantTitle'),
            t('leaveGroupParticipantContent'),
        ];
    }
}

export function MeetingPage({ meetingId }: { meetingId: string }) {
    const t = useTranslations('meeting');
    const labelT = useTranslations('eventLabels');
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
                <Typography>{t('notBooked')}</Typography>
                <Button component={Link} href='/calendar' variant='contained' sx={{ mt: 2 }}>
                    {t('returnToCalendar')}
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

    const [cancelButton, cancelDialogTitle, cancelDialogContent] = getCancelDialog(
        t,
        user,
        meeting,
    );

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
                            <Button
                                color='inherit'
                                size='small'
                                loading={checkoutRequest.isLoading()}
                                onClick={onCompletePayment}
                            >
                                {t('completePayment')}
                            </Button>
                        }
                    >
                        {t('paymentWarning')}
                    </Alert>
                )}

                {isCoaching && isCanceled && (
                    <Alert severity='warning' variant='filled'>
                        {t('canceledByCoach')}
                    </Alert>
                )}

                <Card variant='outlined'>
                    <CardHeader
                        title={meeting.title || t('meetingDetails')}
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
                                title={t('times')}
                                body={times.map((time, i) => (
                                    <Fragment key={time}>
                                        {time}
                                        {i < times.length - 1 && <br />}
                                    </Fragment>
                                ))}
                            />

                            <Field
                                title={t('description')}
                                slotProps={{ body: { whiteSpace: 'pre-line' } }}
                                body={meeting.description}
                            />
                            <Field title={t('location')} body={meeting.location || t('discord')} />

                            <Field
                                title={t('meetingTypes')}
                                body={
                                    meeting.bookedType
                                        ? getDisplayString(meeting.bookedType, labelT)
                                        : meeting.types
                                              ?.map((type) => getDisplayString(type, labelT))
                                              .join(', ')
                                }
                            />

                            {isLiveClass && (
                                <>
                                    <Field
                                        title={t('recordings')}
                                        body={t.rich('recordingsInfo', {
                                            link: (chunks) => (
                                                <Link href='/learn/live-classes'>{chunks}</Link>
                                            ),
                                        })}
                                    />

                                    <Field
                                        title={t('discord')}
                                        body={t.rich('discordChannel', {
                                            link: (chunks) => (
                                                <Link
                                                    href={`https://discord.com/channels/${getConfig().discord.guildId}/${meeting.gameReviewCohort?.discordChannelId || meeting.discordChannelId}`}
                                                    target='_blank'
                                                >
                                                    {chunks}
                                                </Link>
                                            ),
                                        })}
                                    />
                                </>
                            )}

                            {!isSolo && !isGameReviewTier && (
                                <Field
                                    title={t('cohorts')}
                                    body={
                                        meeting.cohorts.length === dojoCohorts.length
                                            ? t('allCohorts')
                                            : meeting.cohorts.join(', ')
                                    }
                                />
                            )}
                        </Stack>
                    </CardContent>
                </Card>

                {isGameReviewTier && meeting.gameReviewCohort && (
                    <Stack spacing={1}>
                        <Typography variant='h5'>{t('reviewQueue')}</Typography>
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
                                    <Typography variant='h5'>{t('participants')}</Typography>
                                    {isCoaching &&
                                        isOwner &&
                                        Object.values(meeting.participants).some(
                                            (p) => !p.hasPaid,
                                        ) && (
                                            <Tooltip title={t('unpaidWarning')}>
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
