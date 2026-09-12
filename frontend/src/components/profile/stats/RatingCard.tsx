import { useAuth } from '@/auth/Auth';
import {
    cohortColors,
    dojoCohorts,
    RatingHistory,
    RatingSystem,
    formatRatingSystem,
    getNormalizedRating,
    getRatingBoundary,
    isCustom,
} from '@/database/user';
import CohortIcon from '@/scoreboard/CohortIcon';
import { RatingSystemIcon } from '@/style/RatingSystemIcons';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    IconButton,
    Link,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AxisOptions, Chart } from 'react-charts';

export function getMemberLink(ratingSystem: RatingSystem, username: string): string {
    switch (ratingSystem) {
        case RatingSystem.Chesscom:
            return `https://www.chess.com/member/${username}`;
        case RatingSystem.Lichess:
            return `https://lichess.org/@/${username}`;
        case RatingSystem.Fide:
            return `https://ratings.fide.com/profile/${username}`;
        case RatingSystem.Uscf:
            return `https://ratings.uschess.org/player/${username}`;
        case RatingSystem.Ecf:
            return `https://www.ecfrating.org.uk/v2/new/player.php?ECF_code=${username}`;
        case RatingSystem.Cfc:
            return `https://www.chess.ca/en/ratings/p/?id=${username}`;
        case RatingSystem.Dwz:
            return `https://www.schachbund.de/spieler/${username}.html`;
        case RatingSystem.Acf:
            return `https://sachess.org.au/ratings/player?id=${username}`;
        case RatingSystem.Knsb:
            return `https://ratingviewer.nl/lists/1/players/${username}`;
        case RatingSystem.Custom:
        case RatingSystem.Custom2:
        case RatingSystem.Custom3:
            return '';
    }
}

function everySevenDays(startDate: Date, endDate: Date): Date[] {
    const result: Date[] = [];
    const currentDate = startDate;
    while (currentDate <= endDate) {
        result.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 7);
    }
    return result;
}

function datesAreSameDay(first: Date, second: Date) {
    return (
        first.getUTCFullYear() === second.getUTCFullYear() &&
        first.getUTCMonth() === second.getUTCMonth() &&
        first.getUTCDate() === second.getUTCDate()
    );
}

export function getChartData(
    ratingHistory: RatingHistory[] | undefined,
    currentRating: number,
    label: string,
) {
    if (!ratingHistory) {
        return [];
    }

    // Any 0 rating is probably a data collection error. Strip them out.
    const sanitizedHistory = ratingHistory.filter((r) => r.rating > 0);

    if (sanitizedHistory.length === 0) {
        return [];
    }

    // Map the rating history into the chart data, filling in any missing weeks with the last known rating.
    // NOTE: We never count today as a missing week, since we have today's rating data on-hand
    const dates = everySevenDays(new Date(sanitizedHistory[0].date), new Date());
    let data = [];
    if (dates.length === sanitizedHistory.length) {
        data = sanitizedHistory.map((r) => ({
            date: new Date(r.date),
            rating: r.rating,
        }));
    } else {
        let historyIndex = 0;
        for (const date of dates) {
            if (
                historyIndex < sanitizedHistory.length &&
                date >= new Date(sanitizedHistory[historyIndex].date)
            ) {
                data.push({
                    date,
                    rating: sanitizedHistory[historyIndex].rating,
                });
                historyIndex++;
            } else if (historyIndex > 0 && !datesAreSameDay(date, new Date())) {
                data.push({
                    date,
                    rating: sanitizedHistory[historyIndex - 1].rating,
                });
            }
        }
    }

    // If there isn't already a rating for today, append the current rating to the chart data.
    const now = new Date();
    if (data.length > 0 && !datesAreSameDay(now, data[data.length - 1].date)) {
        data.push({
            date: now,
            rating: currentRating,
        });
    }

    return [{ label, data }];
}

/** Chart time-range options. `months` is undefined for "All". */
const CHART_PERIOD_OPTIONS: { label: string; months?: number }[] = [
    { label: '1M', months: 1 },
    { label: '3M', months: 3 },
    { label: '6M', months: 6 },
    { label: '1Y', months: 12 },
    { label: '2Y', months: 24 },
    { label: '3Y', months: 36 },
    { label: 'All' },
];
const DEFAULT_CHART_PERIOD_MONTHS = 12;

/** Rough size of the custom chart tooltip, used to keep it clear of the chart's edges. */
const TOOLTIP_WIDTH_ESTIMATE = 150;
const TOOLTIP_HEIGHT_ESTIMATE = 70;

function RatingProfileLink({
    usernameHidden,
    username,
    system,
}: {
    usernameHidden: boolean;
    username: string;
    system: RatingSystem;
}) {
    if (usernameHidden || isCustom(system)) {
        return null;
    }
    return (
        <Link
            variant='subtitle2'
            underline='hover'
            target='_blank'
            rel='noopener noreferrer'
            href={getMemberLink(system, username)}
            sx={{
                color: 'text.secondary',
            }}
        >
            {username}
        </Link>
    );
}

interface Datum {
    date: Date;
    rating: number;
}

export const primaryAxis: AxisOptions<Datum> = {
    scaleType: 'time',
    getValue: (datum) => datum.date,
};

export const secondaryAxes: AxisOptions<Datum>[] = [
    {
        scaleType: 'linear',
        getValue: (datum) => datum.rating,
        formatters: {
            scale: (value) => `${value}`,
        },
    },
];

interface RatingCardProps {
    system: RatingSystem;
    cohort: string;
    username: string;
    usernameHidden: boolean;
    currentRating: number;
    startRating: number;
    name?: string;
    isPreferred?: boolean;
    ratingHistory?: RatingHistory[];
    isProvisional?: boolean;
    onRefresh?: () => Promise<void>;
    refreshCooldown?: number;
}

/** A single header stat: uniform-size number, overline label. All stats in the header row share this size. */
function HeaderStat({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <Stack sx={{ alignItems: 'center' }}>
            <Typography
                variant='overline'
                sx={{ color: 'text.secondary', lineHeight: 1.4, whiteSpace: 'nowrap' }}
            >
                {label}
            </Typography>
            {children}
        </Stack>
    );
}

const statNumberSx = {
    fontSize: '1.5rem',
    letterSpacing: '-0.01em',
    lineHeight: 1,
    fontWeight: 'bold',
} as const;

const tooltipDateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

/** Custom tooltip content for the rating history chart, shown next to the cursor on hover. */
function ChartTooltipContent({
    dark,
    date,
    rating,
    graduation,
    nextCohort,
    graduationColor,
    ratingLabel,
}: {
    dark: boolean;
    date: Date;
    rating: number | undefined;
    graduation: number | undefined;
    nextCohort: string | undefined;
    graduationColor: string | undefined;
    ratingLabel: string;
}) {
    return (
        <div
            style={{
                background: dark ? 'rgba(255,255,255,.95)' : 'rgba(0, 26, 39, .95)',
                color: dark ? 'black' : 'white',
                padding: '6px 10px',
                borderRadius: 4,
                fontSize: 12,
                whiteSpace: 'nowrap',
            }}
        >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {tooltipDateFormatter.format(date)}
            </div>
            {graduation !== undefined && nextCohort && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CohortIcon cohort={nextCohort} size={16} tooltip='' />
                    <span
                        style={{
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: 4,
                            backgroundColor: graduationColor ? `${graduationColor}33` : undefined,
                            color: graduationColor,
                        }}
                    >
                        {graduation}
                    </span>
                </div>
            )}
            {rating !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <span>
                        {ratingLabel}:&nbsp;<strong>{rating}</strong>
                    </span>
                </div>
            )}
        </div>
    );
}

const RatingCard: React.FC<RatingCardProps> = ({
    system,
    cohort,
    username,
    usernameHidden,
    currentRating,
    startRating,
    name,
    isPreferred,
    ratingHistory,
    isProvisional,
    onRefresh,
    refreshCooldown,
}) => {
    const t = useTranslations('profile.stats.ratingCard');
    const tRating = useTranslations('enums.ratingSystem');
    const { user } = useAuth();
    const dark = !user?.enableLightMode;
    const theme = useTheme();
    const [refreshing, setRefreshing] = useState(false);
    const [chartPeriodMonths, setChartPeriodMonths] = useState<number | undefined>(
        DEFAULT_CHART_PERIOD_MONTHS,
    );
    // Drives the custom cursor-following tooltip: the hovered date (from the chart's own
    // crosshair, so it always snaps to the nearest real datum) and the raw mouse position
    // (for placing the tooltip right next to the cursor instead of anchored to the line).
    const [hoverDate, setHoverDate] = useState<Date | null>(null);
    const [mousePos, setMousePos] = useState<
        { x: number; y: number; containerWidth: number; containerHeight: number } | undefined
    >(undefined);
    const ratingChange = currentRating - startRating;
    const chartColor = theme.palette.success.main;
    const graduation = getRatingBoundary(cohort, system);
    const nextCohort = dojoCohorts[dojoCohorts.indexOf(cohort) + 1];
    const graduationColor = nextCohort ? cohortColors[nextCohort] : undefined;
    // Graduation helpers (line, badge, next-cohort stat) only ever show on
    // the preferred rating card.
    const showProgress = !!isPreferred && !!graduation && graduation > 0 && currentRating > 0;

    const historyData = useMemo(() => {
        return getChartData(ratingHistory, currentRating, t('ratingChartLabel'));
    }, [ratingHistory, currentRating, t]);

    const displayedHistoryData = useMemo(() => {
        if (chartPeriodMonths === undefined) {
            return historyData;
        }
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - chartPeriodMonths);
        return historyData.map((series) => ({
            ...series,
            data: series.data.filter((d) => d.date >= cutoff),
        }));
    }, [historyData, chartPeriodMonths]);

    const graduationLabel = t('graduationLegend');

    // The exact date domain to plot, padded slightly so lines always reach both edges.
    const chartDateDomain = useMemo(() => {
        const allDates = displayedHistoryData.flatMap((series) => series.data.map((d) => d.date));
        if (allDates.length === 0) {
            return undefined;
        }
        const spanMs = Math.max(...allDates.map((d) => d.getTime())) - Math.min(...allDates.map((d) => d.getTime()));
        const paddingMs = Math.max(1000 * 60 * 60 * 24, spanMs * 0.02);
        const firstDate = new Date(Math.min(...allDates.map((d) => d.getTime())) - paddingMs);
        const lastDate = new Date(Math.max(...allDates.map((d) => d.getTime())) + paddingMs);
        return { firstDate, lastDate };
    }, [displayedHistoryData]);

    // Every series is explicitly bound to the same primary/secondary axis IDs below —
    // without this, react-charts silently creates a second x-axis for any series that
    // doesn't share an axis with the others, rendering duplicate (and misaligned) axis
    // labels and tooltips.
    const chartData = useMemo(() => {
        const mainSeries = displayedHistoryData.map((series) => ({
            ...series,
            primaryAxisId: 'primary',
            secondaryAxisId: 'secondary',
        }));
        if (!showProgress || !graduation || !chartDateDomain) {
            return mainSeries;
        }
        // Mirror every real rating date onto the graduation line (not just its two endpoints) so
        // there's always a nearby graduation datum to group into the tooltip alongside the rating
        // datum — otherwise react-charts only has the two endpoint dates to match against, and the
        // graduation row silently disappears from the tooltip everywhere else along the line.
        const historyDates = mainSeries.flatMap((series) => series.data.map((d) => d.date));
        const graduationDates = [
            chartDateDomain.firstDate,
            ...historyDates,
            chartDateDomain.lastDate,
        ].sort((a, b) => a.getTime() - b.getTime());
        return [
            ...mainSeries,
            {
                label: graduationLabel,
                primaryAxisId: 'primary',
                secondaryAxisId: 'secondary',
                data: graduationDates.map((date) => ({ date, rating: graduation })),
            },
        ];
    }, [displayedHistoryData, showProgress, graduation, graduationLabel, chartDateDomain]);

    // Pin the time domain explicitly (rather than relying on react-chart's own auto-padding)
    // so the graduation line always touches both edges of the plotted area.
    const chartPrimaryAxis = useMemo<AxisOptions<Datum>>(
        () => ({
            id: 'primary',
            scaleType: 'time',
            getValue: (datum) => datum.date,
            ...(chartDateDomain
                ? { min: chartDateDomain.firstDate, max: chartDateDomain.lastDate }
                : {}),
        }),
        [chartDateDomain],
    );

    // Include the graduation line's value in the axis domain (with padding) so it's
    // always visible, even if the actual rating history is flat and narrow.
    // Based on the *actual rating history* alone — the graduation line is a future target, often
    // well above anything the player has actually hit, and padding proportionally to the combined
    // range (history + graduation) stretches the whole scale out just to fit it. That strands
    // unrelated ticks up near the graduation line and compresses the ticks that actually cover
    // the real data. Instead, size the domain off the history's own spread, and only extend it
    // past that for graduation if needed, with modest fixed-feeling headroom instead of another
    // 8% of the (now inflated) total range.
    const chartYDomain = useMemo(() => {
        const ratingValues = displayedHistoryData.flatMap((series) => series.data.map((d) => d.rating));
        if (ratingValues.length === 0) {
            return undefined;
        }
        const ratingMin = Math.min(...ratingValues);
        const ratingMax = Math.max(...ratingValues);
        const spread = ratingMax - ratingMin;
        const padding = Math.max(10, spread * 0.08);
        const min = ratingMin - padding;
        const naturalMax = ratingMax + padding;
        const max =
            showProgress && graduation
                ? Math.max(naturalMax, graduation + Math.max(10, spread * 0.03))
                : naturalMax;
        return { min, max };
    }, [displayedHistoryData, showProgress, graduation]);

    const chartSecondaryAxes = useMemo<AxisOptions<Datum>[]>(() => {
        // The badge sits on the graduation value in the y-axis gutter,
        // so blank the native tick directly underneath it.
        const hideUnderBadge =
            showProgress && graduation
                ? (value: number) => {
                      const range = chartYDomain ? chartYDomain.max - chartYDomain.min : 0;
                      return range > 0 && Math.abs(value - graduation) < range * 0.04
                          ? ''
                          : `${value}`;
                  }
                : (value: number) => `${value}`;
        if (!chartYDomain) {
            return [
                {
                    id: 'secondary',
                    scaleType: 'linear',
                    getValue: (datum) => datum.rating,
                    formatters: { scale: hideUnderBadge },
                },
            ];
        }
        return [
            {
                id: 'secondary',
                scaleType: 'linear',
                getValue: (datum) => datum.rating,
                min: chartYDomain.min,
                max: chartYDomain.max,
                formatters: { scale: hideUnderBadge },
            },
        ];
    }, [chartYDomain, showProgress, graduation]);

    // The rating datum matching the hovered date, looked up by exact time equality — the
    // graduation series mirrors every real rating date, so this works regardless of which
    // series the chart's internal "closest" hover logic actually snapped to.
    const hoveredRating = useMemo(() => {
        if (!hoverDate) {
            return undefined;
        }
        const hoverTime = hoverDate.getTime();
        return displayedHistoryData[0]?.data.find((d) => d.date.getTime() === hoverTime)?.rating;
    }, [hoverDate, displayedHistoryData]);

    // Anchor box of the graduation badge: vertically on the graduation line,
    // right edge a few px left of the plot edge (in the y-axis gutter, where
    // the native tick used to be). All measured directly off rendered SVG
    // elements: the line center from the graduation path itself (the only
    // white path in the chart), the plot edge from the x-axis domain line.
    // The chart animates/settles for a beat after mount, so the position is
    // re-measured every animation frame until it stabilizes — the badge
    // rides the line instead of starting off-center and snapping later.
    const chartContainerRef = useRef<HTMLDivElement | null>(null);
    const [gradAnchor, setGradAnchor] = useState<
        { top: number; plotLeft: number; containerWidth: number } | undefined
    >(undefined);
    useEffect(() => {
        const container = chartContainerRef.current;
        if (!container || !showProgress || !graduation) {
            setGradAnchor(undefined);
            return;
        }
        let raf = 0;
        let stopped = false;
        let lastKey = '';
        let stableCount = 0;
        let frames = 0;
        const MAX_FRAMES = 300;
        const STABLE_FRAMES = 10;
        const readPos = () => {
            const svg = container.querySelector('svg');
            const line = svg
                ? Array.from(svg.querySelectorAll<SVGPathElement>('path')).find((p) =>
                      (p.getAttribute('style') || '').includes('255, 255, 255'),
                  )
                : undefined;
            // The x-axis renders two copies internally (an invisible one used
            // only to measure rotated-label overflow) — only the "inner" one
            // is the real, visible plot edge.
            const xAxisDomainLine =
                svg?.querySelector<SVGLineElement>('.Axis-Group.inner line.domain');
            if (!svg || !line || !xAxisDomainLine) {
                return undefined;
            }
            const containerBox = container.getBoundingClientRect();
            const lineRect = line.getBoundingClientRect();
            const domainRect = xAxisDomainLine.getBoundingClientRect();
            const top = lineRect.top - containerBox.top + lineRect.height / 2;
            hideOrphanedTicks();
            return {
                top,
                plotLeft: domainRect.left - containerBox.left,
                containerWidth: containerBox.width,
            };
        };
        // The native tick under the badge is label-less (see
        // chartSecondaryAxes), so its tick mark and gridline are orphaned
        // notches behind the pill. They sit at the *tick's* height, which
        // can be a few px off the line itself — so find ticks with empty
        // labels and hide their lines, rather than matching the line height.
        // (Month labels on the x-axis are never empty, so this only ever
        // matches our blanked y-tick.) Runs on every chart mutation too,
        // since re-rendered ticks come back unhidden.
        const hideOrphanedTicks = () => {
            const svg = container.querySelector('svg');
            if (!svg) {
                return;
            }
            svg.querySelectorAll<SVGLineElement>('.Axis-Group.inner line').forEach((l) => {
                if (l.classList.contains('domain')) {
                    return;
                }
                if (l.style.display === 'none') {
                    l.style.display = '';
                }
            });
            svg.querySelectorAll<SVGGElement>('.Axis-Group.inner .Axis g.tick').forEach((tick) => {
                if ((tick.querySelector('text.tickLabel')?.textContent ?? '') !== '') {
                    return;
                }
                tick.querySelectorAll<SVGLineElement>('line').forEach((l) => {
                    l.style.display = 'none';
                });
                const tickRect = tick.getBoundingClientRect();
                const tickCenterY = tickRect.top + tickRect.height / 2;
                svg.querySelectorAll<SVGLineElement>('.Axis-Group.inner .grid g.tick line').forEach(
                    (gridLine) => {
                        const rect = gridLine.getBoundingClientRect();
                        if (Math.abs(rect.top + rect.height / 2 - tickCenterY) < 2) {
                            gridLine.style.display = 'none';
                        }
                    },
                );
            });
        };
        const tick = () => {
            if (stopped) {
                return;
            }
            frames++;
            const pos = readPos();
            const key = pos
                ? `${pos.top.toFixed(1)}|${pos.plotLeft.toFixed(1)}|${pos.containerWidth.toFixed(1)}`
                : 'missing';
            if (key !== lastKey) {
                lastKey = key;
                stableCount = 0;
                setGradAnchor(pos);
            } else {
                stableCount++;
            }
            if (stableCount < STABLE_FRAMES && frames < MAX_FRAMES) {
                raf = requestAnimationFrame(tick);
            }
        };
        const restart = () => {
            if (stopped) {
                return;
            }
            stableCount = 0;
            frames = 0;
            lastKey = '';
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        const resizeObserver = new ResizeObserver(restart);
        resizeObserver.observe(container);
        let cancelled = false;
        void document.fonts?.ready.then(() => {
            if (!cancelled) {
                restart();
            }
        });
        return () => {
            stopped = true;
            cancelled = true;
            cancelAnimationFrame(raf);
            resizeObserver.disconnect();
        };
    }, [showProgress, graduation, chartData]);

    if (!system || (!currentRating && !startRating)) {
        return null;
    }

    return (
        <Card
            variant='outlined'
            sx={{
                borderRadius: 3,
                overflow: 'hidden',
                boxShadow: 1,
            }}
        >
            <Box sx={{ height: 4, bgcolor: chartColor }} />
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack spacing={2.5}>
                    <Stack
                        direction='row'
                        sx={{
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            rowGap: 1.5,
                        }}
                    >
                        <Stack
                            direction='row'
                            spacing={1.5}
                            sx={{
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                rowGap: 0.5,
                                flexShrink: 0,
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 44,
                                    height: 44,
                                    borderRadius: '50%',
                                    bgcolor: 'action.hover',
                                    flexShrink: 0,
                                }}
                            >
                                <RatingSystemIcon system={system} />
                            </Box>

                            <Stack direction='row' spacing={0.5} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
                                <Typography variant='h6' sx={{ fontWeight: 600, mr: 0.5 }}>
                                    {formatRatingSystem(system, tRating)}
                                    {isCustom(system) && name && t('customRatingDisplayName', { name })}
                                </Typography>

                                <RatingProfileLink
                                    usernameHidden={usernameHidden}
                                    username={username}
                                    system={system}
                                />

                                {onRefresh && (
                                    <Tooltip
                                        title={
                                            refreshCooldown
                                                ? t('tryAgainSeconds', { seconds: refreshCooldown })
                                                : t('refreshRating')
                                        }
                                    >
                                        <span>
                                            <IconButton
                                                size='small'
                                                disabled={refreshing || !!refreshCooldown}
                                                onClick={async () => {
                                                    setRefreshing(true);
                                                    try {
                                                        await onRefresh();
                                                    } finally {
                                                        setRefreshing(false);
                                                    }
                                                }}
                                            >
                                                {refreshing ? (
                                                    <CircularProgress size={14} />
                                                ) : (
                                                    <RefreshIcon
                                                        sx={{
                                                            fontSize: '1.1rem',
                                                            color: 'text.secondary',
                                                        }}
                                                    />
                                                )}
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                )}
                            </Stack>
                        </Stack>

                        <Stack
                            direction='row'
                            spacing={4}
                            sx={{
                                alignItems: 'center',
                                justifyContent: 'space-evenly',
                                flexWrap: 'wrap',
                                rowGap: 2,
                                flexGrow: 1,
                                maxWidth: { md: '70%' },
                                mx: { xs: 0, md: 3 },
                                px: { xs: 2, md: 3 },
                                py: 1.5,
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: 'action.hover',
                            }}
                        >
                            <HeaderStat label={t('start')}>
                                <Typography sx={statNumberSx}>{startRating}</Typography>
                            </HeaderStat>

                            <Tooltip title={!onRefresh ? t('ratingsUpdatedTooltip') : ''}>
                                <span>
                                    <HeaderStat label={t('current')}>
                                        <Typography sx={statNumberSx}>
                                            {currentRating}
                                            {/* Lichess classical stays provisional for a long time,
                                                so its `?` is permanent noise — hide it there. */}
                                            {isProvisional && system !== RatingSystem.Lichess && '?'}
                                        </Typography>
                                    </HeaderStat>
                                </span>
                            </Tooltip>

                            <HeaderStat label={t('change')}>
                                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                                    <Typography
                                        sx={{
                                            ...statNumberSx,
                                            color: ratingChange >= 0 ? 'success.main' : 'error.main',
                                        }}
                                    >
                                        {Math.abs(ratingChange)}
                                    </Typography>
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            left: '100%',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            ml: '3px',
                                            display: 'flex',
                                        }}
                                    >
                                        {ratingChange >= 0 ? (
                                            <ArrowUpwardIcon sx={{ fontSize: '0.9rem' }} color='success' />
                                        ) : (
                                            <ArrowDownwardIcon sx={{ fontSize: '0.9rem' }} color='error' />
                                        )}
                                    </Box>
                                </Box>
                            </HeaderStat>

                            {!isCustom(system) && (
                                <Tooltip title={t('normalizedTooltip')}>
                                    <span>
                                        <HeaderStat label={t('normalized')}>
                                            <Typography sx={statNumberSx}>
                                                {Math.round(getNormalizedRating(currentRating, system))}
                                            </Typography>
                                        </HeaderStat>
                                    </span>
                                </Tooltip>
                            )}

                            {isPreferred && (
                                <HeaderStat label={t('nextGraduation')}>
                                    <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
                                        <Typography sx={statNumberSx}>
                                            {graduation || t('naLabel')}
                                        </Typography>
                                        {!!graduation && graduation > 0 && nextCohort && (
                                            <CohortIcon
                                                cohort={nextCohort}
                                                size={20}
                                                tooltip={nextCohort}
                                            />
                                        )}
                                    </Stack>
                                </HeaderStat>
                            )}
                        </Stack>

                        {isPreferred && (
                            <Chip
                                label={t('preferred')}
                                size='small'
                                color='success'
                                sx={{ fontWeight: 600, flexShrink: 0 }}
                            />
                        )}
                    </Stack>

                    {historyData.length > 0 && (
                        <Box
                            sx={{
                                bgcolor: 'action.hover',
                                borderRadius: 2,
                                p: { xs: 1.5, sm: 2 },
                            }}
                        >
                            <Stack spacing={1.5}>
                                <Typography variant='overline' sx={{ color: 'text.secondary' }}>
                                    {t('ratingHistory')}
                                </Typography>
                                <Box
                                    ref={chartContainerRef}
                                    sx={{
                                        position: 'relative',
                                        height: 300,
                                        bgcolor: 'background.paper',
                                        borderRadius: 1.5,
                                        overflow: 'hidden',
                                        p: 1,
                                    }}
                                    onMouseMove={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setMousePos({
                                            x: e.clientX - rect.left,
                                            y: e.clientY - rect.top,
                                            containerWidth: rect.width,
                                            containerHeight: rect.height,
                                        });
                                    }}
                                    onMouseLeave={() => {
                                        setHoverDate(null);
                                        setMousePos(undefined);
                                    }}
                                >
                                    <Chart
                                        options={{
                                            data: chartData,
                                            primaryAxis: chartPrimaryAxis,
                                            secondaryAxes: chartSecondaryAxes,
                                            dark,
                                            // Bottom room for x-axis month labels, plus top/right
                                            // room so the graduation line's glow doesn't bleed past
                                            // the rounded panel edge. Extra left room for the
                                            // graduation badge gutter.
                                            padding: {
                                                bottom: 24,
                                                top: 12,
                                                right: 14,
                                                ...(showProgress && graduation ? { left: 24 } : {}),
                                            },
                                            // 'primary' groups every series at the hovered x-value into one,
                                            // so the crosshair always snaps to a real datum on the rating line.
                                            interactionMode: 'primary',
                                            // The built-in tooltip anchors to the datum's own element (i.e. next
                                            // to the line), not the cursor. We render our own tooltip instead,
                                            // positioned from raw mouse coordinates tracked above.
                                            tooltip: false,
                                            // Keep the crosshair, but hide its axis-edge value label since our
                                            // own tooltip already shows the date/value; capture the snapped date
                                            // so we know which datum the crosshair (and our tooltip) is on.
                                            primaryCursor: {
                                                showLabel: false,
                                                onChange: (value) =>
                                                    setHoverDate(value instanceof Date ? value : null),
                                            },
                                            secondaryCursor: { showLabel: false },
                                            getSeriesStyle: (series) =>
                                                series.originalSeries.label === graduationLabel
                                                    ? {
                                                          line: {
                                                              stroke: '#ffffff',
                                                              strokeWidth: '3.5px',
                                                              // Butt caps so the line ends flush at the
                                                              // plot edges instead of spilling over the
                                                              // y-axis (round caps overshoot by ~2px).
                                                              strokeLinecap: 'butt',
                                                              strokeLinejoin: 'round',
                                                              filter: graduationColor
                                                                  ? `drop-shadow(0 0 1px rgba(255, 255, 255, 0.9)) drop-shadow(0 0 3px ${graduationColor}) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5))`
                                                                  : `drop-shadow(0 0 1px rgba(255, 255, 255, 0.9)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5))`,
                                                          },
                                                          circle: { r: 0 },
                                                      }
                                                    : {
                                                          line: { stroke: chartColor, strokeWidth: '2px' },
                                                          circle: { r: 0 },
                                                      },
                                            // Highlight the exact point on the rating line the user is
                                            // hovering, with the same translucent stroke color as the
                                            // chart's own crosshair line, so the two read as one unit.
                                            getDatumStyle: (datum, status) =>
                                                status === 'none' || datum.originalSeries.label === graduationLabel
                                                    ? {}
                                                    : {
                                                          circle: {
                                                              r: 5,
                                                              fill: chartColor,
                                                              stroke: dark
                                                                  ? 'rgba(255,255,255,.5)'
                                                                  : 'rgba(0, 26, 39, .5)',
                                                              strokeWidth: 2,
                                                          },
                                                      },
                                        }}
                                    />
                                    {gradAnchor !== undefined &&
                                        showProgress &&
                                        graduation &&
                                        nextCohort && (
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    right:
                                                        gradAnchor.containerWidth -
                                                        gradAnchor.plotLeft +
                                                        4,
                                                    top: gradAnchor.top,
                                                    transform: 'translateY(-50%)',
                                                    zIndex: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    pointerEvents: 'none',
                                                }}
                                            >
                                                <CohortIcon
                                                    cohort={nextCohort}
                                                    size={14}
                                                    tooltip=''
                                                />
                                                <Box
                                                    sx={{
                                                        px: '6px',
                                                        py: '1px',
                                                        borderRadius: '4px',
                                                        bgcolor: graduationColor
                                                            ? `${graduationColor}55`
                                                            : 'action.hover',
                                                        border: '1px solid',
                                                        borderColor: graduationColor ?? 'divider',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    <Typography
                                                        sx={{
                                                            fontSize: '11px',
                                                            fontWeight: 800,
                                                            lineHeight: '14px',
                                                            color: 'rgba(255,255,255,0.95)',
                                                        }}
                                                    >
                                                        {graduation}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        )}
                                    {hoverDate && mousePos && (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                // Flip to the cursor's left once there isn't enough room on the
                                                // right, so the tooltip never overflows the chart's edge.
                                                left:
                                                    mousePos.x + 14 + TOOLTIP_WIDTH_ESTIMATE >
                                                    mousePos.containerWidth
                                                        ? Math.max(mousePos.x - 14 - TOOLTIP_WIDTH_ESTIMATE, 0)
                                                        : mousePos.x + 14,
                                                top: Math.min(
                                                    Math.max(mousePos.y - 10, 0),
                                                    mousePos.containerHeight - TOOLTIP_HEIGHT_ESTIMATE,
                                                ),
                                                pointerEvents: 'none',
                                                zIndex: 1,
                                            }}
                                        >
                                            <ChartTooltipContent
                                                dark={dark}
                                                date={hoverDate}
                                                rating={hoveredRating}
                                                graduation={showProgress ? graduation : undefined}
                                                nextCohort={nextCohort}
                                                graduationColor={graduationColor}
                                                ratingLabel={t('ratingChartLabel')}
                                            />
                                        </Box>
                                    )}
                                </Box>
                                <Stack
                                    direction='row'
                                    sx={{
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        rowGap: 1,
                                        ml: 0.5,
                                    }}
                                >
                                    <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                                        {t('graphsUpdatedNote')}
                                    </Typography>
                                    <ToggleButtonGroup
                                        exclusive
                                        size='small'
                                        value={chartPeriodMonths ?? 'all'}
                                        onChange={(_, value: number | 'all' | null) =>
                                            value !== null &&
                                            setChartPeriodMonths(value === 'all' ? undefined : value)
                                        }
                                        sx={{ ml: 'auto' }}
                                    >
                                        {CHART_PERIOD_OPTIONS.map(({ label, months }) => (
                                            <ToggleButton key={label} value={months ?? 'all'}>
                                                {label}
                                            </ToggleButton>
                                        ))}
                                    </ToggleButtonGroup>
                                </Stack>
                            </Stack>
                        </Box>
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
};

export default RatingCard;
