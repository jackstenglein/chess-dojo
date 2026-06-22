import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { Event } from '@/database/event';
import Avatar from '@/profile/Avatar';
import CohortIcon from '@/scoreboard/CohortIcon';
import { Warning } from '@mui/icons-material';
import { Stack, Tooltip, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

interface ParticipantsListProps {
    event: Event;
    maxItems?: number;
    showPaymentWarning?: boolean;
    hideOwner?: boolean;
}

const ParticipantsList: React.FC<ParticipantsListProps> = ({
    event,
    maxItems,
    showPaymentWarning,
    hideOwner,
}) => {
    const t = useTranslations('calendar');
    const user = useAuth().user;

    return (
        <Stack spacing={1}>
            {!hideOwner && (
                <Stack direction='row' spacing={1} alignItems='center'>
                    <Avatar username={event.owner} displayName={event.ownerDisplayName} size={25} />
                    <Link href={`/profile/${event.owner}`}>
                        <Typography variant='body1'>
                            {event.ownerDisplayName} ({event.ownerCohort})
                        </Typography>
                    </Link>
                    <CohortIcon cohort={event.ownerPreviousCohort} size={22} />
                </Stack>
            )}

            {Object.values(event.participants)
                .slice(0, maxItems ? maxItems - 1 : undefined)
                .map((p) => (
                    <Stack key={p.username} direction='row' spacing={1} alignItems='center'>
                        <Avatar username={p.username} displayName={p.displayName} size={25} />
                        <Link href={`/profile/${p.username}`}>
                            <Typography variant='body1'>
                                {p.displayName} ({p.cohort})
                            </Typography>
                        </Link>
                        <CohortIcon cohort={p.previousCohort} size={22} />

                        {showPaymentWarning &&
                            !p.hasPaid &&
                            (user?.username === event.owner || user?.username === p.username) && (
                                <Tooltip
                                    title={
                                        user.username === event.owner
                                            ? t('participantPaymentWarningOther')
                                            : t('participantPaymentWarningSelf')
                                    }
                                >
                                    <Warning color='warning' />
                                </Tooltip>
                            )}
                    </Stack>
                ))}
        </Stack>
    );
};

export default ParticipantsList;
