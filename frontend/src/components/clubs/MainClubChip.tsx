import { Star } from '@mui/icons-material';
import { Chip } from '@mui/material';
import { useTranslations } from 'next-intl';

export const MainClubChip = () => {
    const t = useTranslations('clubs.chips');
    return <Chip color='primary' icon={<Star sx={{ pl: '4px' }} />} label={t('mainClub')} />;
};
