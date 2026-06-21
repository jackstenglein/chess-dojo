import { Groups } from '@mui/icons-material';
import { Chip } from '@mui/material';
import { useTranslations } from 'next-intl';

interface MemberCountChipProps {
    count: number;
}

export const MemberCountChip: React.FC<MemberCountChipProps> = ({ count }) => {
    const t = useTranslations('clubs.chips');
    return (
        <Chip
            color='secondary'
            icon={<Groups sx={{ pl: '4px' }} />}
            label={t('memberCount', { count })}
        />
    );
};
