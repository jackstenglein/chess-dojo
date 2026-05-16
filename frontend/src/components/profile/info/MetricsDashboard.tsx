import { useRequirements } from '@/api/cache/requirements';
import {
    ALL_COHORTS,
    RatingSystem,
    User,
    formatRatingSystem,
    getSystemCurrentRating,
} from '@/database/user';
import { calculateTacticsRating } from '@/exams/view/exam';
import { Help } from '@mui/icons-material';
import { Card, CardContent, Grid, Stack, SxProps, Tooltip, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

interface MetricsDashboardProps {
    user: User;
    sx?: SxProps;
}

const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ user, sx }) => {
    const { requirements } = useRequirements(ALL_COHORTS, true);
    const t = useTranslations('profile.info');
    const tRating = useTranslations('enums.ratingSystem');

    return (
        <Card variant='outlined' sx={sx}>
            <CardContent>
                <Typography variant='h6' sx={{ mb: 2 }}>
                    {t('metrics')}
                </Typography>

                <Grid container justifyContent='center' rowGap={1} columnGap={1}>
                    <Grid
                        display='flex'
                        justifyContent='center'
                        size={{
                            xs: 12,
                            sm: 4,
                            md: 3,
                        }}
                    >
                        <Stack direction='row' alignItems='center'>
                            <Typography>{t('tacticsRating')}</Typography>

                            <Tooltip title={t('tacticsRatingTooltip')}>
                                <Help fontSize='small' sx={{ color: 'text.secondary' }} />
                            </Tooltip>
                            <Typography ml={1} fontWeight='bold'>
                                {Math.round(
                                    10 * calculateTacticsRating(user, requirements).overall,
                                ) / 10}
                            </Typography>
                        </Stack>
                    </Grid>

                    {Object.values(RatingSystem).map((rs) => {
                        const currentRating = getSystemCurrentRating(user, rs);

                        if (currentRating <= 0) {
                            return null;
                        }

                        return (
                            <Grid
                                key={rs}
                                display='flex'
                                justifyContent='center'
                                size={{
                                    xs: 12,
                                    sm: 4,
                                    md: 3,
                                }}
                            >
                                <Stack direction='row' alignItems='center'>
                                    <Typography>{formatRatingSystem(rs, tRating)}</Typography>

                                    <Typography ml={1} fontWeight='bold'>
                                        {currentRating}
                                    </Typography>
                                </Stack>
                            </Grid>
                        );
                    })}
                </Grid>
            </CardContent>
        </Card>
    );
};

export default MetricsDashboard;
