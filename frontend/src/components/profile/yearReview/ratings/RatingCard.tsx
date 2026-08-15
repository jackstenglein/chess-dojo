import {
    getChartData,
    getMemberLink,
    primaryAxis,
    secondaryAxes,
} from '@/components/profile/stats/RatingCard';
import { RatingSystem, formatRatingSystem, getNormalizedRating, isCustom } from '@/database/user';
import { YearReviewRatingData } from '@/database/yearReview';
import { ArrowDownward, ArrowUpward, Help, OpenInNew } from '@mui/icons-material';
import {
    Box,
    Card,
    CardContent,
    Chip,
    Grid,
    Link,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Chart } from 'react-charts';

interface RatingCardProps {
    cohort: string;
    system: RatingSystem;
    data: YearReviewRatingData;
    dark: boolean;
    period: string;
}

const RatingCard: React.FC<RatingCardProps> = ({ cohort, system, data, dark, period }) => {
    const t = useTranslations('profile.yearReview.ratingCard');
    const tRating = useTranslations('enums.ratingSystem');
    const endDateByPeriod = useMemo<Record<string, string>>(
        () => ({
            '2025': t('endDate2025'),
            '2024': t('endDate2024'),
            '2023': t('endDate2023'),
        }),
        [t],
    );
    const historyData = useMemo(() => {
        const historyData = getChartData(
            data.history,
            data.currentRating.value,
            t('ratingChartLabel'),
        );
        const year = parseInt(period);
        const endDate = `${year + 1}-01-07`;

        let startIdx =
            historyData[0]?.data.findIndex((v) => v.date.toISOString() >= `${period}-01-01`) - 1;
        if (startIdx < 0) {
            startIdx = 0;
        }

        let lastIdx: number | undefined = historyData[0]?.data.findIndex(
            (v) => v.date.toISOString() >= endDate,
        );
        if (lastIdx < 0) {
            lastIdx = undefined;
        }

        historyData[0].data = historyData[0].data.slice(startIdx, lastIdx);
        return historyData;
    }, [data, period, t]);

    return (
        <Card variant='outlined' sx={{ width: 1 }}>
            <CardContent>
                <Stack
                    direction='row'
                    sx={{
                        justifyContent: 'space-between',
                    }}
                >
                    <Stack>
                        <Typography variant='h6'>{formatRatingSystem(system, tRating)}</Typography>
                        <Stack
                            direction='row'
                            sx={{
                                alignItems: 'center',
                                mb: 2,
                            }}
                        >
                            {Boolean(data.username) && (
                                <>
                                    <Typography
                                        variant='subtitle1'
                                        sx={{
                                            color: 'text.secondary',
                                        }}
                                    >
                                        {data.username}
                                    </Typography>
                                    <Link
                                        target='_blank'
                                        rel='noopener noreferrer'
                                        href={getMemberLink(system, data.username)}
                                    >
                                        <OpenInNew
                                            color='primary'
                                            sx={{
                                                fontSize: '1rem',
                                                ml: '3px',
                                                mt: '4px',
                                            }}
                                        />
                                    </Link>
                                </>
                            )}
                        </Stack>
                    </Stack>

                    {data.isPreferred && (
                        <Chip label={t('preferred')} variant='outlined' color='success' />
                    )}
                </Stack>

                <Grid
                    container
                    rowSpacing={2}
                    sx={{
                        alignItems: 'center',
                    }}
                >
                    <Grid
                        size={{
                            xs: 6,
                            sm: 4,
                            md: 'grow',
                        }}
                        sx={{
                            display: 'flex',
                            justifyContent: { xs: 'start', sm: 'center' },
                        }}
                    >
                        <Stack
                            sx={{
                                alignItems: { xs: 'start', sm: 'center' },
                            }}
                        >
                            <Typography
                                variant='caption'
                                sx={{
                                    color: 'text.secondary',
                                }}
                            >
                                {t('jan1', { period })}
                            </Typography>

                            <Typography
                                sx={{
                                    fontSize: '2.25rem',
                                    lineHeight: 1,
                                    fontWeight: 'bold',
                                }}
                            >
                                {data.startRating}
                            </Typography>
                        </Stack>
                    </Grid>

                    <Grid
                        size={{
                            xs: 6,
                            sm: 4,
                            md: 'grow',
                        }}
                        sx={{
                            display: 'flex',
                            justifyContent: { xs: 'end', sm: 'center' },
                        }}
                    >
                        <Stack
                            sx={{
                                alignItems: { xs: 'end', sm: 'center' },
                            }}
                        >
                            <Typography
                                variant='caption'
                                sx={{
                                    color: 'text.secondary',
                                }}
                            >
                                {endDateByPeriod[period]}
                            </Typography>
                            <Typography
                                sx={{
                                    fontSize: '2.25rem',
                                    lineHeight: 1,
                                    fontWeight: 'bold',
                                }}
                            >
                                {data.currentRating.value}
                            </Typography>
                        </Stack>
                    </Grid>

                    <Grid
                        size={{
                            xs: 6,
                            sm: 4,
                            md: 'grow',
                        }}
                        sx={{
                            display: 'flex',
                            justifyContent: { xs: 'start', sm: 'center' },
                        }}
                    >
                        <Stack
                            sx={{
                                alignItems: { xs: 'start', sm: 'center' },
                            }}
                        >
                            <Typography
                                variant='caption'
                                sx={{
                                    color: 'text.secondary',
                                }}
                            >
                                {t('change')}
                            </Typography>

                            <Stack
                                direction='row'
                                sx={{
                                    alignItems: 'start',
                                }}
                            >
                                {data.ratingChange >= 0 ? (
                                    <ArrowUpward
                                        sx={{
                                            fontSize: '2.25rem',
                                            fontWeight: 'bold',
                                            mt: '-3px',
                                        }}
                                        color='success'
                                    />
                                ) : (
                                    <ArrowDownward
                                        sx={{
                                            fontSize: '2.25rem',
                                            fontWeight: 'bold',
                                            mt: '-3px',
                                        }}
                                        color='error'
                                    />
                                )}

                                <Typography
                                    sx={{
                                        fontSize: '2.25rem',
                                        lineHeight: 1,
                                        fontWeight: 'bold',
                                    }}
                                    color={data.ratingChange >= 0 ? 'success.main' : 'error.main'}
                                >
                                    {Math.abs(data.ratingChange)}
                                </Typography>
                            </Stack>
                        </Stack>
                    </Grid>

                    {!isCustom(system) && (
                        <>
                            <Grid
                                size={{
                                    xs: 6,
                                    sm: 4,
                                    md: 'grow',
                                }}
                                sx={{
                                    display: 'flex',
                                    justifyContent: { xs: 'end', sm: 'center' },
                                }}
                            >
                                <Stack
                                    sx={{
                                        alignItems: { xs: 'end', sm: 'center' },
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
                                            {t('normalized')}
                                        </Typography>
                                        <Tooltip title={t('normalizedTooltip')}>
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
                                        {Math.round(
                                            getNormalizedRating(data.currentRating.value, system),
                                        )}
                                    </Typography>
                                </Stack>
                            </Grid>

                            <Grid
                                size={{
                                    xs: 6,
                                    sm: 4,
                                    md: 'grow',
                                }}
                                sx={{
                                    display: 'flex',
                                    justifyContent: { xs: 'start', sm: 'center' },
                                }}
                            >
                                <Stack
                                    sx={{
                                        alignItems: { xs: 'start', sm: 'center' },
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
                                        <Tooltip
                                            title={
                                                data.isPreferred
                                                    ? t('percentileTooltipPreferred')
                                                    : t('percentileTooltipNonPreferred', {
                                                          system: formatRatingSystem(
                                                              system,
                                                              tRating,
                                                          ),
                                                      })
                                            }
                                        >
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
                                        {Math.round(10 * data.currentRating.percentile) / 10}%
                                    </Typography>
                                </Stack>
                            </Grid>

                            <Grid
                                size={{
                                    xs: 6,
                                    sm: 4,
                                    md: 'grow',
                                }}
                                sx={{
                                    display: 'flex',
                                    justifyContent: { xs: 'end', sm: 'center' },
                                }}
                            >
                                <Stack
                                    sx={{
                                        alignItems: { xs: 'end', sm: 'center' },
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
                                        <Tooltip
                                            title={
                                                data.isPreferred
                                                    ? t('cohortPercentileTooltipPreferred', {
                                                          cohort,
                                                      })
                                                    : t('cohortPercentileTooltipNonPreferred', {
                                                          cohort,
                                                          system: formatRatingSystem(
                                                              system,
                                                              tRating,
                                                          ),
                                                      })
                                            }
                                        >
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
                                        {Math.round(10 * data.currentRating.cohortPercentile) / 10}%
                                    </Typography>
                                </Stack>
                            </Grid>
                        </>
                    )}
                </Grid>

                <Stack>
                    <Box
                        sx={{
                            height: 300,
                            mt: 2,
                        }}
                    >
                        <Chart
                            options={{
                                data: historyData,
                                primaryAxis,
                                secondaryAxes,
                                interactionMode: 'closest',
                                tooltip: false,
                                dark,
                            }}
                        />
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default RatingCard;
