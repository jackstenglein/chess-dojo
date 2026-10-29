import { Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { HorizontalBarChart, months } from './DojoPointSection';
import Percentiles from './Percentiles';
import { SectionProps } from './section';

const GameSection = ({ review }: SectionProps) => {
    const t = useTranslations('profile.yearReview.games');

    const data = review.total.games;

    const monthData = useMemo(() => {
        return [
            {
                label: t('published'),
                data: Object.entries(months)
                    .sort((lhs, rhs) => lhs[1].localeCompare(rhs[1]))
                    .map((month) => ({
                        primary: month[0],
                        secondary: data.byPeriod?.[month[1]] || 0,
                    })),
            },
            {
                label: t('unpublished'),
                data: Object.entries(months)
                    .sort((lhs, rhs) => lhs[1].localeCompare(rhs[1]))
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
                        primary: t('win'),
                        secondary: data.win?.value || 0,
                        color: 'var(--mui-palette-success-dark)',
                    },
                    {
                        primary: t('draw'),
                        secondary: data.draw?.value || 0,
                        color: 'var(--mui-palette-warning-dark)',
                    },
                    {
                        primary: t('loss'),
                        secondary: data.loss?.value || 0,
                        color: 'var(--mui-palette-error-dark)',
                    },
                    {
                        primary: t('analysis'),
                        secondary: data.analysis?.value || 0,
                        color: 'var(--mui-palette-info-dark)',
                    },
                ],
            },
            {
                label: t('unpublished'),
                data: [
                    {
                        primary: t('win'),
                        secondary: data.winHidden || 0,
                        color: 'var(--mui-palette-success-light)',
                    },
                    {
                        primary: t('draw'),
                        secondary: data.drawHidden || 0,
                        color: 'var(--mui-palette-warning-light)',
                    },
                    {
                        primary: t('loss'),
                        secondary: data.lossHidden || 0,
                        color: 'var(--mui-palette-error-light)',
                    },
                    {
                        primary: t('analysis'),
                        secondary: data.analysisHidden || 0,
                        color: 'var(--mui-palette-info-light)',
                    },
                ],
            },
        ];
    }, [data, t]);

    return (
        <Stack
            sx={{
                width: 1,
                alignItems: 'center',
            }}
        >
            <Typography
                variant='h6'
                sx={{
                    fontWeight: '800',
                    fontSize: 'clamp(16px,3vw,32px)',
                    textAlign: 'center',
                }}
            >
                {t('intro')}
            </Typography>
            <Card variant='outlined' sx={{ width: 1, mt: 4 }}>
                <CardContent>
                    <Grid
                        container
                        rowSpacing={2}
                        sx={{
                            alignItems: 'center',
                        }}
                    >
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
                                <Typography
                                    variant='caption'
                                    sx={{
                                        color: 'text.secondary',
                                    }}
                                >
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
                                <Typography
                                    variant='caption'
                                    sx={{
                                        color: 'text.secondary',
                                    }}
                                >
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

                    <Stack
                        spacing={4}
                        sx={{
                            mt: 4,
                        }}
                    >
                        <Stack
                            spacing={0.5}
                            sx={{
                                alignItems: 'start',
                            }}
                        >
                            <Typography>{t('byResult')}</Typography>
                            <Box sx={{ width: 1, mt: 2 }}>
                                <HorizontalBarChart series={resultData} height={400} stacked />
                            </Box>
                        </Stack>
                    </Stack>

                    <Stack
                        spacing={4}
                        sx={{
                            mt: 4,
                        }}
                    >
                        <Stack
                            spacing={0.5}
                            sx={{
                                alignItems: 'start',
                            }}
                        >
                            <Typography>{t('byMonth')}</Typography>
                            <Box sx={{ width: 1, mt: 2 }}>
                                <HorizontalBarChart series={monthData} height={400} stacked />
                            </Box>
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>
        </Stack>
    );
};

export default GameSection;
