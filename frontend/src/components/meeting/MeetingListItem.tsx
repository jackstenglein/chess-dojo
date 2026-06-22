import { useRequiredAuth } from '@/auth/Auth';
import { toDojoDateString, toDojoTimeString } from '@/components/calendar/displayDate';
import { Event, EventStatus, getDisplayString } from '@/database/event';
import Avatar from '@/profile/Avatar';
import {
    Card,
    CardActionArea,
    CardContent,
    CardHeader,
    Chip,
    Stack,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { Link } from '../navigation/Link';

interface MeetingListItemProps {
    meeting: Event;
}

const MeetingListItem: React.FC<MeetingListItemProps> = ({ meeting }) => {
    const t = useTranslations('meeting');
    const { user } = useRequiredAuth();
    const labelT = useTranslations('eventLabels');

    const start = new Date(meeting.bookedStartTime || meeting.startTime);

    const title = meeting.coaching
        ? meeting.title
        : meeting.maxParticipants > 1
          ? t('groupMeeting')
          : getDisplayString(meeting.bookedType, labelT);

    let opponent = Object.values(meeting.participants)[0];
    if (opponent.username === user.username) {
        opponent = {
            username: meeting.owner,
            displayName: meeting.ownerDisplayName,
            cohort: meeting.ownerCohort,
            previousCohort: meeting.ownerPreviousCohort ?? '',
        };
    }

    return (
        <Card variant='outlined' sx={{ width: 1 }}>
            <CardActionArea href={`/meeting/${meeting.id}`}>
                <CardHeader
                    title={title}
                    subheader={`${toDojoDateString(
                        start,
                        user.timezoneOverride,
                    )} • ${toDojoTimeString(start, user.timezoneOverride, user.timeFormat)}`}
                    sx={{ pb: 0 }}
                />
                <CardContent sx={{ pt: 0, mt: 1 }}>
                    {meeting.status === EventStatus.Canceled && (
                        <Chip sx={{ mb: 1 }} color='error' label={t('canceledChip')} />
                    )}

                    {meeting.maxParticipants > 1 ? (
                        <Typography variant='subtitle1' color='text.secondary'>
                            {t('participantsCountFlat', {
                                count: Object.values(meeting.participants).length + 1,
                            })}
                        </Typography>
                    ) : (
                        <Stack direction='row' spacing={1} alignItems='center'>
                            <Avatar
                                username={opponent.username}
                                displayName={opponent.displayName}
                                size={25}
                            />
                            <Link href={`/profile/${opponent.username}`}>
                                <Typography variant='subtitle1'>
                                    {opponent.displayName} ({opponent.cohort})
                                </Typography>
                            </Link>
                        </Stack>
                    )}
                </CardContent>
            </CardActionArea>
        </Card>
    );
};

export default MeetingListItem;
