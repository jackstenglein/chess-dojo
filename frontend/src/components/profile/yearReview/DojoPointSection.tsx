import { useAuth } from '@/auth/Auth';
import { ScoreCategories } from '@/components/profile/activity/activity';
import { RequirementCategory } from '@/database/requirement';
import { YearReviewDataSection } from '@/database/yearReview';
import { CategoryColors } from '@/style/ThemeProvider';
import { Box, Card, CardContent, CardHeader, Grid, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { AxisOptions, Chart } from 'react-charts';
import Percentiles from './Percentiles';
import { SectionProps } from './section';

export interface Datum {
    primary: string;
    secondary: number;
}

export const primaryAxis: AxisOptions<Datum> = {
    position: 'left',
    getValue: (datum) => datum.primary,
};

export const secondaryAxes: AxisOptions<Datum>[] = [
    {
        position: 'bottom',
        getValue: (datum) => datum.secondary,
        min: 0,
    },
];

export function getCategoryData(label: string, data: YearReviewDataSection, nonDojo?: boolean) {
    const categories = [RequirementCategory.Welcome, ...ScoreCategories];
    if (nonDojo) {
        categories.push(RequirementCategory.NonDojo);
    }

    return [
        {
            label,
            data: categories.reverse().map((category) => ({
                primary: category,
                secondary: data.byCategory?.[category] || 0,
            })),
        },
    ];
}

export const months: Record<string, string> = {
    Jan: '01',
    Feb: '02',
    Mar: '03',
    Apr: '04',
    May: '05',
    June: '06',
    July: '07',
    Aug: '08',
    Sep: '09',
    Oct: '10',
    Nov: '11',
    Dec: '12',
};

export function getMonthData(label: string, data: YearReviewDataSection) {
    return [
        {
            label,
            data: Object.entries(months)
                .sort((lhs, rhs) => rhs[1].localeCompare(lhs[1]))
                .map((month) => ({
                    primary: month[0],
                    secondary: data.byPeriod?.[month[1]] || 0,
                })),
        },
    ];
}

export function getTaskData(label: string, data: YearReviewDataSection) {
    if (!data.byTask) {
        return undefined;
    }
    return [
        {
            label,
            data: Object.entries(data.byTask)
                .sort((lhs, rhs) => rhs[1] - lhs[1])
                .slice(0, 10)
                .reverse()
                .map((datum) => ({
                    primary: datum[0],
                    secondary: datum[1],
                })),
        },
    ];
}

const DojoPointSection = ({ review }: SectionProps) => {
    const t = useTranslations('profile.yearReview.dojoPoints');
    const viewer = useAuth().user;
    const dark = !viewer?.enableLightMode;

    const data = review.total.dojoPoints;

    const categoryData = useMemo(() => getCategoryData(t('title'), data), [data, t]);
    const monthData = useMemo(() => getMonthData(t('title'), data), [data, t]);
    const taskData = useMemo(() => getTaskData(t('title'), data), [data, t]);

    return (
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
                                {t('totalPoints')}
                            </Typography>

                            <Typography
                                sx={{
                                    fontSize: '2.25rem',
                                    lineHeight: 1,
                                    fontWeight: 'bold',
                                }}
                            >
                                {Math.round(100 * data.total.value) / 100}
                            </Typography>
                        </Stack>
                    </Grid>

                    <Percentiles
                        description={t('percentileDescription')}
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
    );
};

export default DojoPointSection;
