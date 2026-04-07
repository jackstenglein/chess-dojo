import { useAuth } from '@/auth/Auth';
import { Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Chart } from 'react-charts';
import { months, primaryAxis, secondaryAxes } from './DojoPointSection';
import Percentiles from './Percentiles';
import { SectionProps } from './section';

const GameSection = ({ review }: SectionProps) => {
    const t = useTranslations('profile.yearReview.games');
    const viewer = useAuth().user;
    const dark = !viewer?.enableLightMode;

    const data = review.total.games;

    const monthData = useMemo(() => {
        return [
            {
                label: t('published'),
                data: Object.entries(months)
                    .sort((lhs, rhs) => rhs[1].localeCompare(lhs[1]))
                    .map((month) => ({
                        primary: month[0],
                        secondary: data.byPeriod?.[month[1]] || 0,
                    })),
            },
            {
                label: t('unpublished'),
                data: Object.entries(months)
                    .sort((lhs, rhs) => rhs[1].localeCompare(lhs[1]))
                    .map((month) => ({
                        primary: month[0],
                        secondary: data.byPeriod?.[`${month[1]}-hidden`] || 0,
                    })),
            },
        ];
    }, [data, t]);

    const resultData = useMemo(() => {
        return [
            {
                label: t('published'),
                data: [
                    {
                        primary: t('analysis'),
                        secondary: data.analysis?.value || 0,
                        style: { fill: 'var(--mui-palette-info-dark)' },
                    },
                    {
                        primary: t('loss'),
                        secondary: data.loss?.value || 0,
                        style: { fill: 'var(--mui-palette-error-dark' },
                    },
                    {
                        primary: t('draw'),
                        secondary: data.draw?.value || 0,
                        style: { fill: 'var(--mui-palette-warning-dark)' },
                    },
                    {
                        primary: t('win'),
                        secondary: data.win?.value || 0,
                        style: { fill: 'var(--mui-palette-success-dark)' },
                    },
                ],
            },
            {
                label: t('unpublished'),
                data: [
                    {
                        primary: t('analysis'),
                        secondary: data.analysisHidden || 0,
                        style: { fill: 'var(--mui-palette-info-light)' },
                    },
                    {
                        primary: t('loss'),
                        secondary: data.lossHidden || 0,
                        style: { fill: 'var(--mui-palette-error-light' },
                    },
                    {
                        primary: t('draw'),
                        secondary: data.drawHidden || 0,
                        style: { fill: 'var(--mui-palette-warning-light)' },
                    },
                    {
                        primary: t('win'),
                        secondary: data.winHidden || 0,
                        style: { fill: 'var(--mui-palette-success-light)' },
                    },
                ],
            },
        ];
    }, [data, t]);

    return (
        <Stack width={1} alignItems='center'>
            <Typography
                variant='h6'
                fontWeight='800'
                fontSize='clamp(16px,3vw,32px)'
                textAlign='center'
            >
                {t('intro')}
            </Typography>
            <Card variant='outlined' sx={{ width: 1, mt: 4 }}>
                <CardContent>
                    <Grid container alignItems='center' rowSpacing={2}>
                        <Grid
                            display='flex'
                            justifyContent='center'
                            size={{
                                xs: 12,
                                sm: 4,
                            }}
                        >
                            <Stack alignItems='center'>
                                <Typography variant='caption' color='text.secondary'>
                                    {t('totalGames')}
                                </Typography>

                                <Typography
                                    sx={{
                                        fontSize: '2.25rem',
                                        lineHeight: 1,
                                        fontWeight: 'bold',
                                    }}
                                >
                                    {data.total.value}
                                </Typography>
                            </Stack>
                        </Grid>

                        <Percentiles
                            description={t('totalGamesDescription')}
                            cohort={review.currentCohort}
                            percentile={data.total.percentile}
                            cohortPercentile={data.total.cohortPercentile}
                        />

                        <Grid
                            display='flex'
                            justifyContent='center'
                            size={{
                                xs: 12,
                                sm: 4,
                            }}
                        >
                            <Stack alignItems='center'>
                                <Typography variant='caption' color='text.secondary'>
                                    {t('publishedGames')}
                                </Typography>

                                <Typography
                                    sx={{
                                        fontSize: '2.25rem',
                                        lineHeight: 1,
                                        fontWeight: 'bold',
                                    }}
                                >
                                    {data.published.value}
                                </Typography>
                            </Stack>
                        </Grid>

                        <Percentiles
                            description={t('publishedGamesDescription')}
                            cohort={review.currentCohort}
                            percentile={data.published.percentile}
                            cohortPercentile={data.published.cohortPercentile}
                        />
                    </Grid>

                    <Stack mt={4} spacing={4}>
                        <Stack alignItems='start' spacing={0.5}>
                            <Typography>{t('byResult')}</Typography>
                            <Box width={1} height={400} mt={2}>
                                <Chart
                                    options={{
                                        data: resultData,
                                        primaryAxis,
                                        secondaryAxes: [
                                            {
                                                ...secondaryAxes[0],
                                                stacked: true,
                                            },
                                        ],
                                        dark,
                                        getDatumStyle(datum) {
                                            return datum.originalDatum.style;
                                        },
                                    }}
                                />
                            </Box>
                        </Stack>
                    </Stack>

                    <Stack mt={4} spacing={4}>
                        <Stack alignItems='start' spacing={0.5}>
                            <Typography>{t('byMonth')}</Typography>
                            <Box width={1} height={400} mt={2}>
                                <Chart
                                    options={{
                                        data: monthData,
                                        primaryAxis,
                                        secondaryAxes: [
                                            {
                                                ...secondaryAxes[0],
                                                stacked: true,
                                            },
                                        ],
                                        dark,
                                    }}
                                />
                            </Box>
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>
        </Stack>
    );
};

export default GameSection;
