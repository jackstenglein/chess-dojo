import { Link } from '@/components/navigation/Link';
import { AvailabilityType, Event, getDisplayString } from '@/database/event';
import { dojoCohorts } from '@/database/user';
import { useRouter } from '@/hooks/useRouter';
import Avatar from '@/profile/Avatar';
import Icon from '@/style/Icon';
import { ProcessedEvent } from '@jackstenglein/react-scheduler/types';
import { Button, Stack, Typography } from '@mui/material';
import React from 'react';
import Field from './Field';
import OwnerField from './OwnerField';

interface AvailabilityViewerProps {
    processedEvent: ProcessedEvent;
}

const AvailabilityViewer: React.FC<AvailabilityViewerProps> = ({ processedEvent }) => {
    const router = useRouter();

    const event = processedEvent.event as Event;
    const isOwner = processedEvent.isOwner as boolean;

    const startBooking = () => {
        router.push(`/calendar/availability/${event.id}`);
    };

    return (
        <Stack data-testid='availability-viewer' sx={{ pt: 2 }} spacing={2}>
            {!isOwner && <OwnerField title='Owner' event={event} />}

            {event.maxParticipants > 1 && (
                <Field
                    iconName='participant'
                    title='Number of Participants'
                    body={`${Object.values(event.participants).length} / ${event.maxParticipants}`}
                />
            )}

            <Field
                iconName='meet'
                title='Available Types'
                body={event.types?.map((t: AvailabilityType) => getDisplayString(t)).join(', ')}
            />

            {event.description.length > 0 && (
                <Field title='Description' body={event.description} iconName='notes' />
            )}

            {Boolean(event.invited?.length) && isOwner && (
                <Stack>
                    <Typography variant='h6' color='text.secondary'>
                        <Icon
                            name='cohort'
                            color='primary'
                            sx={{ marginRight: '0.3rem', verticalAlign: 'middle' }}
                            fontSize='small'
                        />
                        Invited
                    </Typography>
                    {event.invited?.map((invitee) => (
                        <Stack key={invitee.username} direction='row' alignItems='center' gap={1}>
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
                    title='Cohorts'
                    body={
                        dojoCohorts.length === event.cohorts.length
                            ? 'All Cohorts'
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
                    Book
                </Button>
            )}
        </Stack>
    );
};

export default AvailabilityViewer;
