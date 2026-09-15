import { Link } from '@/components/navigation/Link';
import { Event, getDisplayString } from '@/database/event';
import Icon from '@/style/Icon';
import { ProcessedEvent } from '@jackstenglein/react-scheduler/types';
import { Button, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import Field from './Field';
import ParticipantsList from './ParticipantsList';

const maxDisplayParticipants = 4;

interface MeetingViewerProps {
    processedEvent: ProcessedEvent;
}

const MeetingViewer: React.FC<MeetingViewerProps> = ({ processedEvent }) => {
    const t = useTranslations('calendar');
    const labelT = useTranslations('eventLabels');
    const event = processedEvent.event as Event;

    const participantsLength = Object.values(event.participants).length;

    return (
        <Stack sx={{ pt: 2 }} spacing={2}>
            <Field title={t('description')} body={event.description} iconName='notes' />
            <Field
                title={t('location')}
                body={event.location || t('discord')}
                iconName='location'
            />

            {event.bookedType ? (
                <Field
                    title={t('meetingType')}
                    body={getDisplayString(event.bookedType, labelT)}
                    iconName='meet'
                />
            ) : (
                <Field
                    title={t('meetingTypes')}
                    iconName='meet'
                    body={
                        event.types?.map((type) => getDisplayString(type, labelT)).join(', ') || ''
                    }
                />
            )}

            <Stack spacing={0.5}>
                <Typography
                    variant='h6'
                    sx={{
                        color: 'text.secondary',
                    }}
                >
                    <Icon
                        name='participant'
                        color='primary'
                        sx={{ marginRight: '0.5rem', verticalAlign: 'middle' }}
                    />
                    {t('participants')}
                </Typography>
                <ParticipantsList event={event} maxItems={maxDisplayParticipants} />
                {participantsLength > maxDisplayParticipants - 1 && (
                    <Typography>
                        {t('andMore', { count: participantsLength - (maxDisplayParticipants - 1) })}
                    </Typography>
                )}
            </Stack>

            <Button
                component={Link}
                variant='contained'
                href={`/meeting/${event.id}`}
                startIcon={<Icon name='eye' />}
            >
                {t('viewDetails')}
            </Button>
        </Stack>
    );
};

export default MeetingViewer;
