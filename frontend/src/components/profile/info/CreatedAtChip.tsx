import { useAuth } from '@/auth/Auth';
import { toDojoDateString } from '@/components/calendar/displayDate';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { Chip, Tooltip } from '@mui/material';
import { useTranslations } from 'next-intl';

interface CreatedAtChipProps {
    createdAt?: string;
}

const CreatedAtChip: React.FC<CreatedAtChipProps> = ({ createdAt }) => {
    const user = useAuth().user;
    const t = useTranslations('profile.info.chip');

    if (!createdAt) {
        return (
            <Tooltip title={t('dojoMember10Tooltip')}>
                <Chip
                    icon={<CalendarMonthIcon fontSize='small' />}
                    label={t('dojoMember10Label')}
                    variant='outlined'
                    color='secondary'
                />
            </Tooltip>
        );
    }

    const date = toDojoDateString(new Date(createdAt), user?.timezoneOverride);
    return (
        <Tooltip title={t('dojoMemberSinceTooltip', { date })}>
            <Chip
                icon={<CalendarMonthIcon fontSize='small' />}
                label={date}
                variant='outlined'
                color='secondary'
                size='small'
            />
        </Tooltip>
    );
};

export default CreatedAtChip;
