import { User, isActive } from '@/database/user';
import { Chip, Tooltip } from '@mui/material';
import { useTranslations } from 'next-intl';

interface InactiveChipProps {
    user: User;
}

const InactiveChip: React.FC<InactiveChipProps> = ({ user }) => {
    const t = useTranslations('profile.info.chip');
    const isUserActive = isActive(user);
    if (isUserActive) {
        return null;
    }

    return (
        <Tooltip title={t('inactiveTooltip')}>
            <Chip label={t('inactive')} color='error' variant='outlined' size='small' />
        </Tooltip>
    );
};

export default InactiveChip;
