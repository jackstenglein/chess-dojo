import { Help } from '@mui/icons-material';
import { Grid, Stack, Tooltip, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

interface PercentilesProps {
    cohort: string;
    percentile: number;
    cohortPercentile: number;
    description: string;
}

const Percentiles: React.FC<PercentilesProps> = ({
    cohort,
    percentile,
    cohortPercentile,
    description,
}) => {
    const t = useTranslations('profile.yearReview.percentiles');
    return (
        <>
            <Grid
                size={{
                    xs: 12,
                    sm: 4,
                }}
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                }}
            >
                <Stack
                    sx={{
                        alignItems: 'center',
                    }}
                >
                    <Stack
                        spacing={0.5}
                        direction='row'
                        sx={{
                            alignItems: 'center',
                        }}
                    >
                        <Typography
                            variant='caption'
                            sx={{
                                color: 'text.secondary',
                            }}
                        >
                            {t('percentile')}
                        </Typography>
                        <Tooltip title={t('percentileTooltip', { description })}>
                            <Help
                                fontSize='inherit'
                                sx={{
                                    color: 'text.secondary',
                                }}
                            />
                        </Tooltip>
                    </Stack>

                    <Typography
                        sx={{
                            fontSize: '2.25rem',
                            lineHeight: 1,
                            fontWeight: 'bold',
                        }}
                    >
                        {Math.round(10 * percentile) / 10}%
                    </Typography>
                </Stack>
            </Grid>
            <Grid
                size={{
                    xs: 12,
                    sm: 4,
                }}
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                }}
            >
                <Stack
                    sx={{
                        alignItems: 'center',
                    }}
                >
                    <Stack
                        spacing={0.5}
                        direction='row'
                        sx={{
                            alignItems: 'center',
                        }}
                    >
                        <Typography
                            variant='caption'
                            sx={{
                                color: 'text.secondary',
                            }}
                        >
                            {t('cohortPercentile')}
                        </Typography>
                        <Tooltip title={t('cohortPercentileTooltip', { cohort, description })}>
                            <Help
                                fontSize='inherit'
                                sx={{
                                    color: 'text.secondary',
                                }}
                            />
                        </Tooltip>
                    </Stack>

                    <Typography
                        sx={{
                            fontSize: '2.25rem',
                            lineHeight: 1,
                            fontWeight: 'bold',
                        }}
                    >
                        {Math.round(10 * cohortPercentile) / 10}%
                    </Typography>
                </Stack>
            </Grid>
        </>
    );
};

export default Percentiles;
