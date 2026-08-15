import { useAuth } from '@/auth/Auth';
import { formatTime } from '@/database/requirement';
import { CategoryColors } from '@/style/ThemeProvider';
import { Box, Card, CardContent, CardHeader, Grid, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { AxisOptions, Chart } from 'react-charts';
import { Datum, getCategoryData, getMonthData, getTaskData, primaryAxis } from './DojoPointSection';
import Percentiles from './Percentiles';
import { SectionProps } from './section';

function getSecondaryAxes(
    tCommon: (key: string, values?: Record<string, string | number>) => string,
): AxisOptions<Datum>[] {
    return [
        {
            position: 'bottom',
            getValue: (datum) => datum.secondary,
            formatters: {
                scale: (value: number) => formatTime(value, tCommon),
            },
        },
    ];
}

const TimeSection = ({ review }: SectionProps) => {
    const t = useTranslations('profile.yearReview.time');
    const tCommon = useTranslations('common');
    const secondaryAxes = useMemo(() => getSecondaryAxes(tCommon), [tCommon]);
    const viewer = useAuth().user;
    const dark = !viewer?.enableLightMode;

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
                            <Box
                                sx={{
                                    width: 1,
                                    height: 300,
                                    mt: 2,
                                }}
                            >
                                <Chart
                                    options={{
                                        data: categoryData,
                                        primaryAxis,
                                        secondaryAxes,
                                        dark,
                                        getDatumStyle: (datum) => ({
                                            color: CategoryColors[datum.originalDatum.primary],
                                        }),
                                    }}
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
                            <Box
                                sx={{
                                    width: 1,
                                    height: 400,
                                    mt: 2,
                                }}
                            >
                                <Chart
                                    options={{
                                        data: monthData,
                                        primaryAxis,
                                        secondaryAxes,
                                        dark,
                                    }}
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
                                <Box
                                    sx={{
                                        width: 1,
                                        height: 400,
                                        mt: 2,
                                    }}
                                >
                                    <Chart
                                        options={{
                                            data: taskData,
                                            primaryAxis,
                                            secondaryAxes,
                                            dark,
                                        }}
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
