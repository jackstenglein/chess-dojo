import { User } from '@/database/user';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { Chip, Tooltip } from '@mui/material';
import { useTranslations } from 'next-intl';

interface CoachChipProps {
    user?: User;
}

const CoachChip: React.FC<CoachChipProps> = ({ user }) => {
    const t = useTranslations('profile.info.chip');

    if (!user?.isCoach) {
        return null;
    }

    return (
        <Tooltip title={t('coachTooltip')}>
            <Chip
                icon={<RocketLaunchIcon fontSize='small' />}
                label={t('coach')}
                variant='outlined'
                color='success'
                size='small'
            />
        </Tooltip>
    );
};

export default CoachChip;
