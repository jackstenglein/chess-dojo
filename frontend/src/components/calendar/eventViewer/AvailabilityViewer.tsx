import { Link } from '@/components/navigation/Link';
import { AvailabilityType, Event, getDisplayString } from '@/database/event';
import { dojoCohorts } from '@/database/user';
import { useRouter } from '@/hooks/useRouter';
import Avatar from '@/profile/Avatar';
import Icon from '@/style/Icon';
import { ProcessedEvent } from '@jackstenglein/react-scheduler/types';
import { Button, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import React from 'react';
import Field from './Field';
import OwnerField from './OwnerField';

interface AvailabilityViewerProps {
    processedEvent: ProcessedEvent;
}

const AvailabilityViewer: React.FC<AvailabilityViewerProps> = ({ processedEvent }) => {
    const t = useTranslations('calendar');
    const labelT = useTranslations('eventLabels');
    const router = useRouter();

    const event = processedEvent.event as Event;
    const isOwner = processedEvent.isOwner as boolean;

    const startBooking = () => {
        router.push(`/calendar/availability/${event.id}`);
    };

    return (
        <Stack data-testid='availability-viewer' sx={{ pt: 2 }} spacing={2}>
            {!isOwner && <OwnerField title={t('owner')} event={event} />}

            {event.maxParticipants > 1 && (
                <Field
                    iconName='participant'
                    title={t('numberOfParticipants')}
                    body={t('participantsRatio', {
                        count: Object.values(event.participants).length,
                        total: event.maxParticipants,
                    })}
                />
            )}

            <Field
                iconName='meet'
                title={t('availableTypes')}
                body={event.types
                    ?.map((type: AvailabilityType) => getDisplayString(type, labelT))
                    .join(', ')}
            />

            {event.description.length > 0 && (
                <Field title={t('description')} body={event.description} iconName='notes' />
            )}

            {Boolean(event.invited?.length) && isOwner && (
                <Stack>
                    <Typography
                        variant='h6'
                        sx={{
                            color: 'text.secondary',
                        }}
                    >
                        <Icon
                            name='cohort'
                            color='primary'
                            sx={{ marginRight: '0.3rem', verticalAlign: 'middle' }}
                            fontSize='small'
                        />
                        {t('invited')}
                    </Typography>
                    {event.invited?.map((invitee) => (
                        <Stack
                            key={invitee.username}
                            direction='row'
                            sx={{
                                alignItems: 'center',
                                gap: 1,
                            }}
                        >
                            <Avatar
                                username={invitee.username}
                                displayName={invitee.displayName}
                                size={24}
                            />
                            <Link href={`/profile/${invitee.username}`}>{invitee.displayName}</Link>
                        </Stack>
                    ))}
                </Stack>
            )}

            {!event.inviteOnly && (
                <Field
                    iconName='cohort'
                    title={t('cohorts')}
                    body={
                        dojoCohorts.length === event.cohorts.length
                            ? t('allCohorts')
                            : event.cohorts.join(', ')
                    }
                />
            )}

            {!isOwner && (
                <Button
                    data-testid='book-button'
                    variant='contained'
                    color='success'
                    onClick={startBooking}
                    startIcon={<Icon name='join' />}
                >
                    {t('book')}
                </Button>
            )}
        </Stack>
    );
};

export default AvailabilityViewer;
