import { EventType, trackEvent } from '@/analytics/events';
import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { getConfig } from '@/config';
import { Event, EventStatus } from '@/database/event';
import { dojoCohorts } from '@/database/user';
import { useRouter } from '@/hooks/useRouter';
import { logger } from '@/logging/logger';
import Icon from '@/style/Icon';
import { ProcessedEvent } from '@jackstenglein/react-scheduler/types';
import { LinkOutlined } from '@mui/icons-material';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import Field from './Field';
import OwnerField from './OwnerField';
import ParticipantsList from './ParticipantsList';
import PriceField from './PriceField';

const baseUrl = getConfig().baseUrl;

interface CoachingViewerProps {
    processedEvent: ProcessedEvent;
}

const CoachingViewer: React.FC<CoachingViewerProps> = ({ processedEvent }) => {
    const t = useTranslations('calendar');
    const api = useApi();
    const request = useRequest();
    const user = useAuth().user;
    const router = useRouter();

    const event = processedEvent.event as Event;
    if (!event.coaching) {
        return null;
    }

    const onBook = () => {
        if (!user) {
            router.push('/signup');
        }

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
            .catch((err: unknown) => {
                request.onFailure(err);
            });
    };

    const onCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(`${baseUrl}/calendar/availability/${event.id}`);
        } catch (err) {
            logger.error?.('Failed to copy event link: ', err);
        }
    };

    const isOwner = processedEvent.isOwner as boolean;
    const isParticipant = Boolean(event.participants[user?.username || '']);

    return (
        <Stack data-testid='coaching-viewer' sx={{ pt: 2 }} spacing={2}>
            <RequestSnackbar request={request} />
            {event.status === EventStatus.Canceled && (isOwner || isParticipant) && (
                <Alert severity='warning' variant='filled'>
                    {isOwner ? t('canceledOwner') : t('canceledParticipant')}
                </Alert>
            )}

            <Typography>{event.title}</Typography>

            <OwnerField title={t('coach')} event={event} />

            <Field title={t('description')} body={event.description} iconName='notes' />

            <Field
                title={t('cohorts')}
                iconName='cohort'
                body={
                    dojoCohorts.length === event.cohorts.length || event.cohorts.length === 0
                        ? t('allCohorts')
                        : event.cohorts.join(', ')
                }
            />

            <PriceField event={event} />

            <Stack spacing={0.5}>
                <Field
                    iconName='participant'
                    showEmptyBody
                    title={t('participantsCount', {
                        count: Object.values(event.participants).length,
                        total: event.maxParticipants,
                    })}
                    body={
                        Object.values(event.participants).length === 0
                            ? t('noParticipantsYet')
                            : event.coaching.hideParticipants && !isParticipant && !isOwner
                              ? t('participantsHidden')
                              : undefined
                    }
                />
                {(!event.coaching.hideParticipants || isParticipant || isOwner) && (
                    <ParticipantsList hideOwner event={event} />
                )}
            </Stack>

            <Button variant='outlined' startIcon={<LinkOutlined />} onClick={onCopyLink}>
                {t('copyLink')}
            </Button>

            {isOwner || isParticipant ? (
                <Button
                    component={Link}
                    variant='contained'
                    href={`/meeting/${event.id}`}
                    color='success'
                    startIcon={<Icon name='eye' />}
                >
                    {t('viewDetails')}
                </Button>
            ) : (
                <Stack spacing={2} pb={1}>
                    <Button
                        data-testid='book-button'
                        variant='contained'
                        loading={request.isLoading()}
                        onClick={onBook}
                        color='success'
                        startIcon={<Icon name='join' />}
                    >
                        {t('book')}
                    </Button>
                    <Typography variant='caption' color='text.secondary' textAlign='center'>
                        {t('bookingPolicy')}
                    </Typography>
                </Stack>
            )}
        </Stack>
    );
};

export default CoachingViewer;
