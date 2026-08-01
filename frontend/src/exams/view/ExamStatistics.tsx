import MultipleSelectChip from '@/components/ui/MultipleSelectChip';
import { useLightMode } from '@/style/useLightMode';
import { getCohortRangeInt } from '@jackstenglein/chess-dojo-common/src/database/cohort';
import { Exam } from '@jackstenglein/chess-dojo-common/src/database/exam';
import {
    getExamMaxScore,
    getRegression,
    predictExamRating,
} from '@jackstenglein/chess-dojo-common/src/exam/scores';
import { Speed } from '@mui/icons-material';
import { CardContent, Stack, Typography } from '@mui/material';
import {
    ChartsClipPath,
    ChartsContainer,
    ChartsDataProvider,
    ChartsGrid,
    ChartsLegend,
    ChartsTooltip,
    ChartsXAxis,
    ChartsYAxis,
    LinePlot,
    LineSeriesType,
    ScatterPlot,
    ScatterSeriesType,
    ScatterValueType,
    axisClasses,
    legendClasses,
    lineClasses,
} from '@mui/x-charts';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../auth/Auth';
import {
    ALL_COHORTS,
    cohortColors,
    compareCohorts,
    isCohortInRange,
    normalizedRatingToCohort,
} from '../../database/user';
import CohortIcon from '../../scoreboard/CohortIcon';
import { getBestFitCohortRange } from './exam';

export const BEST_FIT_RANGE = 'BEST_FIT_COHORTS';

interface ExamStatisticsProps {
    /** The exam to display statistics for. */
    exam: Exam;
}

/**
 * Renders a scatter plot of the scores on the exam, along with the linear regression for the exam.
 * @param param0 The exam to display statistics for.
 */
const ExamStatistics: React.FC<ExamStatisticsProps> = ({ exam }) => {
    const t = useTranslations('exams.statistics');
    const bestFitCohortRange = getBestFitCohortRange(exam.cohortRange);
    const [cohorts, setCohorts] = useState([bestFitCohortRange]);
    const { user } = useAuth();
    const isLight = useLightMode();
    const ref = useRef<HTMLDivElement>(null);
    const [legendMargin, setLegendMargin] = useState(100);

    const cohortToSeries = useMemo(() => {
        const cohortToSeries: Record<string, ScatterSeriesType & { data: ScatterValueType[] }> = {};

        Object.entries(exam.answers).forEach(([username, answer]) => {
            if (answer.rating <= 0 || username === user?.username) {
                return;
            }

            const cohort = normalizedRatingToCohort(answer.rating);
            if (!cohort) {
                return;
            }

            const series = cohortToSeries[cohort] || {
                type: 'scatter',
                label: cohort.replaceAll('00', ''),
                data: [],
                highlightScope: {
                    highlighted: 'item',
                    faded: 'global',
                },
                valueFormatter: (value) =>
                    t('tooltipScoreRating', { x: value?.x ?? '', y: value?.y ?? '' }),
                color: cohortColors[cohort],
            };
            series.data?.push({ x: answer.score, y: answer.rating, id: username });
            cohortToSeries[cohort] = series;
        });

        return cohortToSeries;
    }, [exam, user, t]);

    const series = useMemo(() => {
        if (cohorts[0] === ALL_COHORTS) {
            return Object.entries(cohortToSeries)
                .sort((lhs, rhs) => compareCohorts(lhs[0], rhs[0]))
                .map((v) => v[1]);
        }

        return Object.entries(cohortToSeries)
            .filter(([cohort]) => cohorts.some((c) => isCohortInRange(cohort, c)))
            .sort((lhs, rhs) => compareCohorts(lhs[0], rhs[0]))
            .map((v) => v[1]);
    }, [cohortToSeries, cohorts]);

    const totalScore = useMemo(() => getExamMaxScore(exam), [exam]);

    const lineSeries = useMemo(() => {
        const regression = getRegression(exam);
        if (!regression) {
            return [];
        }

        return [
            {
                id: 'best-fit',
                type: 'line',
                label: '',
                data: Array.from(Array(totalScore + 1)).map((_, i) =>
                    predictExamRating(regression, i),
                ),
                color: isLight ? '#000' : '#fff',
            },
            {
                id: 'best-fit-scatter',
                type: 'scatter',
                label: t('seriesTestRating'),
                color: isLight ? '#000' : '#fff',
                data: Array.from(Array(totalScore + 1)).map((_, i) => ({
                    x: i,
                    y: Math.round(predictExamRating(regression, i)),
                    id: i,
                })),
                markerSize: 0,
                valueFormatter: (value) =>
                    t('tooltipScoreRating', { x: value?.x ?? '', y: value?.y ?? '' }),
            },
        ] as [LineSeriesType, ScatterSeriesType];
    }, [exam, totalScore, isLight, t]);

    useEffect(() => {
        if (!ref.current) {
            return;
        }

        const observer = new ResizeObserver(() => {
            const newLegendMargin = getLegendMargin(
                series.length,
                ref.current?.getBoundingClientRect().width || 0,
            );
            setLegendMargin(newLegendMargin);
        });
        observer.observe(ref.current);

        return () => observer.disconnect();
    }, [ref, series, setLegendMargin]);

    const onChangeCohort = (newCohorts: string[]) => {
        const addedCohorts = newCohorts.filter((c) => !cohorts.includes(c));
        let finalCohorts = [];
        if (addedCohorts.includes(ALL_COHORTS)) {
            finalCohorts = [ALL_COHORTS];
        } else {
            finalCohorts = newCohorts.filter((c) => c !== ALL_COHORTS);
        }

        setCohorts(finalCohorts);
    };

    const yourScoreSeries: ScatterSeriesType[] =
        user && exam.answers[user.username]
            ? [
                  {
                      type: 'scatter',
                      label: t('seriesYourScore'),
                      data: [
                          {
                              x: exam.answers[user.username].score,
                              y: exam.answers[user.username].rating,
                              id: user.username,
                          },
                      ],
                      highlightScope: {
                          highlight: 'item',
                          fade: 'global',
                      },
                      valueFormatter: (value) =>
                          t('tooltipScoreRatingNewline', { x: value?.x ?? '', y: value?.y ?? '' }),
                      color: isLight ? '#000' : '#fff',
                  },
              ]
            : [];

    let userCount = series.reduce((sum, s) => sum + s.data.length, 0);
    if (cohorts[0] === ALL_COHORTS || cohorts.includes(user?.dojoCohort || '')) {
        userCount += 1;
    }

    const avgScore =
        series.reduce((sum, s) => sum + s.data.reduce((ds, d) => ds + d.x, 0), 0) / userCount;

    let [minCohort, maxCohort] = getCohortRangeInt(exam.cohortRange);
    minCohort = Math.max(minCohort - 100, 0);
    maxCohort += 100;

    return (
        <CardContent sx={{ height: 1 }}>
            <Stack
                ref={ref}
                sx={{
                    height: 1,
                }}
            >
                <MultipleSelectChip
                    label={t('cohortsLabel')}
                    selected={cohorts}
                    setSelected={onChangeCohort}
                    options={[
                        bestFitCohortRange,
                        ALL_COHORTS,
                        ...Object.keys(cohortToSeries).sort(compareCohorts),
                    ].map((opt) => ({
                        value: opt,
                        label:
                            opt === ALL_COHORTS
                                ? t('allCohorts')
                                : opt === bestFitCohortRange
                                  ? t('bestFitCohortRange', { range: bestFitCohortRange })
                                  : opt,
                        icon:
                            opt === bestFitCohortRange ? (
                                <Speed sx={{ marginRight: '0.6rem' }} color='primary' />
                            ) : (
                                <CohortIcon
                                    cohort={opt}
                                    size={25}
                                    sx={{ marginRight: '0.6rem' }}
                                    tooltip=''
                                    color='secondary'
                                />
                            ),
                    }))}
                    error={cohorts.length === 0}
                />

                <Stack
                    spacing={0.5}
                    sx={{
                        alignItems: 'center',
                        mt: 1,
                        mb: 1,
                    }}
                >
                    <Stack
                        direction='row'
                        spacing={2}
                        sx={{
                            justifyContent: 'center',
                        }}
                    >
                        <Typography variant='body2'>
                            {t.rich('usersLine', {
                                count: userCount,
                                dim: (chunks) => (
                                    <Typography
                                        variant='body2'
                                        component='span'
                                        sx={{
                                            color: 'text.secondary',
                                        }}
                                    >
                                        {chunks}
                                    </Typography>
                                ),
                            })}
                        </Typography>
                        <Typography variant='body2'>
                            {t.rich('avgScoreLine', {
                                score: Math.round(10 * avgScore) / 10,
                                dim: (chunks) => (
                                    <Typography
                                        variant='body2'
                                        component='span'
                                        sx={{
                                            color: 'text.secondary',
                                        }}
                                    >
                                        {chunks}
                                    </Typography>
                                ),
                            })}
                        </Typography>
                    </Stack>
                    <Typography
                        variant='caption'
                        sx={{
                            color: 'text.secondary',
                            textAlign: 'center',
                        }}
                    >
                        {maxCohort === Infinity
                            ? t('regressionCaptionPlus', { min: minCohort })
                            : t('regressionCaptionRange', { min: minCohort, max: maxCohort })}
                    </Typography>
                </Stack>

                <ChartsDataProvider>
                    <ChartsLegend
                        slotProps={{
                            legend: {
                                sx: {
                                    fontSize: 13,
                                    padding: 0,
                                    [`.${legendClasses.mark}`]: {
                                        height: 15,
                                        width: 15,
                                    },
                                },
                            },
                        }}
                    />
                    <ChartsContainer
                        disableAxisListener
                        xAxis={[
                            {
                                label: t('xAxisLabel'),
                                data: Array.from(Array(totalScore + 2)).map((_, i) => i),
                                min: 0,
                            },
                        ]}
                        yAxis={[
                            {
                                label: t('yAxisLabel'),
                                valueFormatter: (value: number) => `${value}`,
                                min: 0,
                            },
                        ]}
                        series={[...series, ...yourScoreSeries, ...lineSeries]}
                        margin={{ left: 60, right: 8, top: legendMargin }}
                        sx={{
                            [`& .${axisClasses.left} .${axisClasses.label}`]: {
                                transform: 'translateX(-20px)',
                            },
                            [`.${lineClasses.line}`]: {
                                strokeWidth: 1,
                            },
                            '.MuiLineElement-series-best-fit': {
                                strokeDasharray: '5 5',
                            },

                            [`& .${legendClasses.series}`]: {
                                '&:last-of-type': {
                                    display: 'none',
                                },
                                [`:nth-last-child(2) .${legendClasses.mark}`]: {
                                    height: '3px',
                                    transform: 'translateY(3px)',
                                },
                            },
                        }}
                    >
                        <ChartsGrid vertical horizontal />

                        <ChartsYAxis />
                        <ChartsXAxis />

                        <g clipPath='url(#clip-path)'>
                            <LinePlot />
                        </g>
                        <ScatterPlot />
                        <ChartsTooltip trigger='item' />
                        <ChartsClipPath id='clip-path' />
                    </ChartsContainer>
                </ChartsDataProvider>
            </Stack>
        </CardContent>
    );
};

export default ExamStatistics;

const legendPadding = 11.5;
const cohortLegendWidth = 60;
const legendLineHeight = 14;
const yourScoreWidth = 90;
const bestFitWidth = 62;

function getLegendMargin(numCohorts: number, parentWidth: number): number {
    if (parentWidth <= 0) {
        return 100;
    }

    const cohortsPerLine = Math.floor(parentWidth / cohortLegendWidth);
    const numCohortLines = Math.ceil(numCohorts / cohortsPerLine);

    const leftoverWidth =
        parentWidth -
        yourScoreWidth -
        bestFitWidth -
        cohortLegendWidth * (numCohorts - cohortsPerLine * (numCohortLines - 1));
    const numLines = leftoverWidth < 0 ? numCohortLines + 1 : numCohortLines;

    return 2 * legendPadding + numLines * legendLineHeight + 9 * (numLines - 1);
}
