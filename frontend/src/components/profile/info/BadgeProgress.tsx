import { Box, LinearProgress, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

interface BadgeProgressProps {
    total: number;
    earned: number;
}

export function BadgeProgress({ total, earned }: BadgeProgressProps) {
    const t = useTranslations('profile.info.badge');
    const progress = total > 0 ? (earned / total) * 100 : 0;
    return (
        <Box sx={{ mb: 2, width: '100%' }}>
            <Typography variant='body2' fontWeight='bold' textAlign='center' gutterBottom>
                {t('badgeProgress', {
                    earned,
                    total,
                    percent: Math.round((earned / total) * 100),
                })}
            </Typography>
            <LinearProgress
                variant='determinate'
                color='success'
                value={progress}
                sx={{ height: 10, borderRadius: 5 }}
            />
        </Box>
    );
}
