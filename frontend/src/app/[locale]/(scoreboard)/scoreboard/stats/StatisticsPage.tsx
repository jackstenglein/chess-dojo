'use client';

import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import ScoreboardViewSelector from '@/components/scoreboard/ScoreboardViewSelector';
import { formatTime } from '@/database/requirement';
import { UserStatistics } from '@/database/statistics';
import { RatingSystem, dojoCohorts, formatRatingSystem } from '@/database/user';
import LoadingPage from '@/loading/LoadingPage';
import Chart, { Datum, Series } from '@/scoreboard/statistics/Chart';
import { Container, Stack } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo } from 'react';
import { AxisOptions } from 'react-charts';

const primaryAxis: AxisOptions<Datum> = {
    getValue: (datum) => datum.cohort,
};
const participantsSecondaryAxes: AxisOptions<Datum>[] = [
    {
        scaleType: 'linear',
        getValue: (datum) => datum.value,
        stacked: true,
        formatters: {
            scale: (value) => (value % 1 === 0 ? `${value}` : ''),
        },
    },
];
const ratingSystemsSecondaryAxes: AxisOptions<Datum>[] = [
    {
        scaleType: 'linear',
        getValue: (datum) => datum.value,
        formatters: {
            scale: (value) => (value % 1 === 0 ? `${value}` : ''),
        },
    },
];
const decimalSecondaryAxes: AxisOptions<Datum>[] = [
    {
        scaleType: 'linear',
        getValue: (datum) => datum.value,
    },
];

function getTimeSecondaryAxes(
    t: (key: string, values?: Record<string, string | number>) => string,
): AxisOptions<Datum>[] {
    return [
        {
            scaleType: 'linear',
            getValue: (datum) => datum.value,
            formatters: {
                scale: (value: number) => formatTime(value, t),
            },
        },
    ];
}

function getSeries(
    label: string,
    data: UserStatistics | undefined,
    getValue: (d: UserStatistics, c: string) => number,
): Series[] {
    if (!data) {
        return [];
    }

    return [
        {
            label: label,
            data: dojoCohorts.map((c) => {
                const result = getValue(data, c);
                return {
                    cohort: c,
                    value: isFinite(result) ? result : 0,
                };
            }),
        },
    ];
}

function getAdminParticipantsSeries(
    data: UserStatistics | undefined,
    t: (key: string) => string,
): Series[] {
    if (!data) {
        return [];
    }

    return [
        {
            label: t('active'),
            data: dojoCohorts.map((c) => {
                const result = data.cohorts[c].activeParticipants || 0;
                return {
                    cohort: c,
                    value: isFinite(result) ? result : 0,
                };
            }),
        },
        {
            label: t('inactive'),
            data: dojoCohorts.map((c) => {
                const result = data.cohorts[c].inactiveParticipants || 0;
                return {
                    cohort: c,
                    value: isFinite(result) ? result : 0,
                };
            }),
        },
        {
            label: t('freeActive'),
            data: dojoCohorts.map((c) => {
                const result = data.cohorts[c].freeActiveParticipants || 0;
                return {
                    cohort: c,
                    value: isFinite(result) ? result : 0,
                };
            }),
        },
        {
            label: t('freeInactive'),
            data: dojoCohorts.map((c) => {
                const result = data.cohorts[c].freeInactiveParticipants || 0;
                return {
                    cohort: c,
                    value: isFinite(result) ? result : 0,
                };
            }),
        },
    ];
}

export function StatisticsPage() {
    const t = useTranslations('scoreboard.stats');
    const tCommon = useTranslations('common');
    const tRating = useTranslations('enums.ratingSystem');
    const timeSecondaryAxes = useMemo(() => getTimeSecondaryAxes(tCommon), [tCommon]);
    const api = useApi();
    const request = useRequest<UserStatistics>();
    const { user } = useAuth();

    useEffect(() => {
        if (!request.isSent()) {
            request.onStart();
            api.getUserStatistics()
                .then((response) => {
                    request.onSuccess(response.data);
                })
                .catch((err) => {
                    request.onFailure(err);
                });
        }
    }, [request, api]);

    const totalRatingChangeData: Series[] = useMemo(() => {
        return getSeries(
            t('ratingChange'),
            request.data,
            (d, c) => d.cohorts[c].activeRatingChanges + d.cohorts[c].inactiveRatingChanges,
        );
    }, [request.data, t]);

    const avgRatingChangeData: Series[] = useMemo(() => {
        return getSeries(
            t('avgRatingChange'),
            request.data,
            (d, c) =>
                (d.cohorts[c].activeRatingChanges + d.cohorts[c].inactiveRatingChanges) /
                (d.cohorts[c].activeParticipants + d.cohorts[c].inactiveParticipants),
        );
    }, [request.data, t]);

    const totalTimeData: Series[] = useMemo(() => {
        return getSeries(
            t('totalTime'),
            request.data,
            (d, c) => d.cohorts[c].activeMinutesSpent + d.cohorts[c].inactiveMinutesSpent,
        );
    }, [request.data, t]);

    const avgTimeData: Series[] = useMemo(() => {
        return getSeries(
            t('avgTime'),
            request.data,
            (d, c) =>
                (d.cohorts[c].activeMinutesSpent + d.cohorts[c].inactiveMinutesSpent) /
                (d.cohorts[c].activeParticipants + d.cohorts[c].inactiveParticipants),
        );
    }, [request.data, t]);

    const avgRatingChangePerHourData: Series[] = useMemo(() => {
        return getSeries(
            t('avgRatingChangePerHour'),
            request.data,
            (d, c) =>
                (d.cohorts[c].activeRatingChangePerHour +
                    d.cohorts[c].inactiveRatingChangePerHour) /
                (d.cohorts[c].activeParticipants + d.cohorts[c].inactiveParticipants),
        );
    }, [request.data, t]);

    const numGraduationsData: Series[] = useMemo(() => {
        return getSeries(t('graduations'), request.data, (d, c) => d.cohorts[c].numGraduations);
    }, [request.data, t]);

    const graduationTimeData: Series[] = useMemo(() => {
        return getSeries(
            t('avgTimeToGraduate'),
            request.data,
            (d, c) => d.cohorts[c].graduationMinutes / d.cohorts[c].numGraduations,
        );
    }, [request.data, t]);

    const totalDojoScoreData: Series[] = useMemo(() => {
        return getSeries(
            t('totalDojoScore'),
            request.data,
            (d, c) => d.cohorts[c].activeDojoScores + d.cohorts[c].inactiveDojoScores,
        );
    }, [request.data, t]);

    const avgDojoScoreData: Series[] = useMemo(() => {
        return getSeries(
            t('avgDojoScore'),
            request.data,
            (d, c) =>
                (d.cohorts[c].activeDojoScores + d.cohorts[c].inactiveDojoScores) /
                (d.cohorts[c].activeParticipants + d.cohorts[c].inactiveParticipants),
        );
    }, [request.data, t]);

    const avgRatingChangePerDojoScoreData: Series[] = useMemo(() => {
        return getSeries(
            t('avgRatingChangePerDojoPoint'),
            request.data,
            (d, c) => d.cohorts[c].avgRatingChangePerDojoPoint,
        );
    }, [request.data, t]);

    const participantsData: Series[] = useMemo(() => {
        return user?.isAdmin
            ? getAdminParticipantsSeries(request.data, t)
            : getSeries(
                  t('participants'),
                  request.data,
                  (d, c) =>
                      d.cohorts[c].activeParticipants +
                      d.cohorts[c].inactiveParticipants +
                      d.cohorts[c].freeActiveParticipants +
                      d.cohorts[c].freeInactiveParticipants,
              );
    }, [request.data, user?.isAdmin, t]);

    const ratingSystemsData: Series[] = useMemo(() => {
        const data = request.data;
        if (!data) {
            return [];
        }
        const { Custom, Custom2, Custom3, ...others } = RatingSystem;
        const series = Object.values(others).map((rs) => ({
            label: formatRatingSystem(rs, tRating),
            data: dojoCohorts.map((c) => ({
                cohort: c,
                value:
                    (data.cohorts[c].activeRatingSystems[rs] ?? 0) +
                    (data.cohorts[c].inactiveRatingSystems[rs] ?? 0),
            })),
        }));
        series.push({
            label: formatRatingSystem(Custom, tRating),
            data: dojoCohorts.map((c) => ({
                cohort: c,
                value:
                    (data.cohorts[c].activeRatingSystems[Custom] ?? 0) +
                    (data.cohorts[c].inactiveRatingSystems[Custom] ?? 0) +
                    (data.cohorts[c].activeRatingSystems[Custom2] ?? 0) +
                    (data.cohorts[c].inactiveRatingSystems[Custom2] ?? 0) +
                    (data.cohorts[c].activeRatingSystems[Custom3] ?? 0) +
                    (data.cohorts[c].inactiveRatingSystems[Custom3] ?? 0),
            })),
        });
        return series;
    }, [request.data]);

    const subscriptionChangesData: Series[] = useMemo(() => {
        if (!request.data || !user?.isAdmin) {
            return [];
        }
        return [
            {
                label: t('freeToSubscribed'),
                data: dojoCohorts.map((c) => {
                    const result = request.data?.cohorts[c].freeTierConversions || 0;
                    return {
                        cohort: c,
                        value: isFinite(result) ? result : 0,
                    };
                }),
            },
            {
                label: t('subscribedToFree'),
                data: dojoCohorts.map((c) => {
                    const result = request.data?.cohorts[c].subscriptionCancelations || 0;
                    return {
                        cohort: c,
                        value: isFinite(result) ? result : 0,
                    };
                }),
            },
        ];
    }, [request.data, user?.isAdmin, t]);

    if (request.isLoading() && request.data === undefined) {
        return <LoadingPage />;
    }

    if (!request.data) {
        return <Container></Container>;
    }

    const totalRatingChange = totalRatingChangeData[0]?.data.reduce((sum, d) => sum + d.value, 0);
    const totalDojoPoints = totalDojoScoreData[0]?.data.reduce((sum, d) => sum + d.value, 0);

    return (
        <Container maxWidth='xl' sx={{ pt: 4, pb: 4 }}>
            <RequestSnackbar request={request} />

            <ScoreboardViewSelector value='stats' />

            <Stack spacing={3}>
                <Chart
                    title={t('totalRatingChange')}
                    series={totalRatingChangeData}
                    primaryAxis={primaryAxis}
                    secondaryAxes={decimalSecondaryAxes}
                />
                <Chart
                    title={t('avgRatingChange')}
                    series={avgRatingChangeData}
                    primaryAxis={primaryAxis}
                    secondaryAxes={decimalSecondaryAxes}
                    hideSums
                />

                <Chart
                    title={t('totalTimeSpent')}
                    series={totalTimeData}
                    primaryAxis={primaryAxis}
                    secondaryAxes={timeSecondaryAxes}
                    sumFormatter={(v) => formatTime(v, tCommon)}
                />
                <Chart
                    title={t('avgTimeSpent')}
                    series={avgTimeData}
                    primaryAxis={primaryAxis}
                    secondaryAxes={timeSecondaryAxes}
                    hideSums
                />

                <Chart
                    title={t('avgRatingChangePerHour')}
                    series={avgRatingChangePerHourData}
                    primaryAxis={primaryAxis}
                    secondaryAxes={decimalSecondaryAxes}
                    hideSums
                />

                <Chart
                    title={t('numberOfGraduations')}
                    series={numGraduationsData}
                    primaryAxis={primaryAxis}
                    secondaryAxes={participantsSecondaryAxes}
                />

                <Chart
                    title={t('avgTimeToGraduate')}
                    series={graduationTimeData}
                    primaryAxis={primaryAxis}
                    secondaryAxes={timeSecondaryAxes}
                    hideSums
                />

                <Chart
                    title={t('totalDojoScore')}
                    series={totalDojoScoreData}
                    primaryAxis={primaryAxis}
                    secondaryAxes={decimalSecondaryAxes}
                    sumFormatter={(sum) => `${Math.round(sum)}`}
                />
                <Chart
                    title={t('avgDojoScore')}
                    series={avgDojoScoreData}
                    primaryAxis={primaryAxis}
                    secondaryAxes={decimalSecondaryAxes}
                    hideSums
                />

                <Chart
                    title={t('avgRatingChangePerDojoPointTitle')}
                    series={avgRatingChangePerDojoScoreData}
                    primaryAxis={primaryAxis}
                    secondaryAxes={decimalSecondaryAxes}
                    sumFormatter={() =>
                        `${Math.round((100 * totalRatingChange) / totalDojoPoints) / 100}`
                    }
                />

                <Chart
                    title={t('participants')}
                    series={participantsData}
                    primaryAxis={primaryAxis}
                    secondaryAxes={participantsSecondaryAxes}
                />

                {user?.isAdmin && (
                    <Chart
                        title={t('subscriptionChanges')}
                        series={subscriptionChangesData}
                        primaryAxis={primaryAxis}
                        secondaryAxes={participantsSecondaryAxes}
                    />
                )}

                <Chart
                    title={t('ratingSystems')}
                    series={ratingSystemsData}
                    primaryAxis={primaryAxis}
                    secondaryAxes={ratingSystemsSecondaryAxes}
                />
            </Stack>
        </Container>
    );
}
