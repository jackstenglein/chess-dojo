import { formatTime } from '@/database/requirement';
import { Box, Card, CardContent, CardHeader, Grid, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { getCategoryData, getMonthData, getTaskData, HorizontalBarChart } from './DojoPointSection';
import Percentiles from './Percentiles';
import { SectionProps } from './section';

const TimeSection = ({ review }: SectionProps) => {
    const t = useTranslations('profile.yearReview.time');
    const tCommon = useTranslations('common');
    const formatValue = (value: number) => formatTime(value, tCommon);

    const data = review.total.minutesSpent;

    const categoryData = useMemo(() => getCategoryData(t('title'), data, true), [data, t]);
    const monthData = useMemo(() => getMonthData(t('title'), data), [data, t]);
    const taskData = useMemo(() => getTaskData(t('title'), data), [data, t]);

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
                <CardHeader title={t('title')} />
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
                                    {t('totalTime')}
                                </Typography>

                                <Typography
                                    sx={{
                                        fontSize: '2.25rem',
                                        lineHeight: 1,
                                        fontWeight: 'bold',
                                    }}
                                >
                                    {formatTime(data.total.value, tCommon)}
                                </Typography>
                            </Stack>
                        </Grid>

                        <Percentiles
                            description={t('totalTimeDescription')}
                            cohort={review.currentCohort}
                            percentile={data.total.percentile}
                            cohortPercentile={data.total.cohortPercentile}
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
                            <Typography>{t('byCategory')}</Typography>
                            <Box sx={{ width: 1, mt: 2 }}>
                                <HorizontalBarChart
                                    series={categoryData}
                                    height={300}
                                    valueFormatter={formatValue}
                                />
                            </Box>
                        </Stack>

                        <Stack
                            spacing={0.5}
                            sx={{
                                alignItems: 'start',
                            }}
                        >
                            <Typography>{t('byMonth')}</Typography>
                            <Box sx={{ width: 1, mt: 2 }}>
                                <HorizontalBarChart
                                    series={monthData}
                                    height={400}
                                    valueFormatter={formatValue}
                                />
                            </Box>
                        </Stack>

                        {taskData && (
                            <Stack
                                spacing={0.5}
                                sx={{
                                    alignItems: 'start',
                                }}
                            >
                                <Typography>{t('top10Tasks')}</Typography>
                                <Box sx={{ width: 1, mt: 2 }}>
                                    <HorizontalBarChart
                                        series={taskData}
                                        height={400}
                                        valueFormatter={formatValue}
                                    />
                                </Box>
                            </Stack>
                        )}
                    </Stack>
                </CardContent>
            </Card>
        </Stack>
    );
};

export default TimeSection;
