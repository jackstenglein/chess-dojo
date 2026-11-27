'use client';

import { RequestSnackbar, useRequest } from '@/api/Request';
import { getAdminStatistics } from '@/api/userApi';
import LoadingPage from '@/loading/LoadingPage';
import {
    AdminStatsMemberGroup,
    AdminStatsMembers,
    GetAdminStatsResponse,
} from '@jackstenglein/chess-dojo-common/src/adminStats/api';
import { Refresh } from '@mui/icons-material';
import {
    Box,
    Button,
    Card,
    CardContent,
    Container,
    Grid,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { BarChart, LineChart } from '@mui/x-charts';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
    convertedCount,
    formatChange,
    formatPercent,
    formatPeriod,
    formatWeek,
    historyByPeriod,
    percent,
    Period,
    SignupRow,
    signupRows,
    snapshotWeekAgo,
    starterRows,
} from './statsFormat';

const RANGES: Record<Period, { value: number; label: string }[]> = {
    week: [
        { value: 8, label: '8 weeks' },
        { value: 13, label: '3 months' },
        { value: 26, label: '6 months' },
        { value: 52, label: '1 year' },
    ],
    month: [
        { value: 6, label: '6 months' },
        { value: 12, label: '12 months' },
        { value: 24, label: '24 months' },
        { value: 0, label: 'All' },
    ],
};

const number = (n: number) => n.toLocaleString('en-US');

export function AdminStats() {
    const request = useRequest<GetAdminStatsResponse>();
    const [period, setPeriod] = useState<Period>('week');
    const [ranges, setRanges] = useState<Record<Period, number>>({ week: 13, month: 12 });
    const range = ranges[period];

    const load = useCallback(() => {
        request.onStart();
        getAdminStatistics()
            .then((resp) => request.onSuccess(resp.data))
            .catch((err: unknown) => request.onFailure(err));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!request.isSent()) {
            load();
        }
    }, [request, load]);

    const stats = request.data;
    const rows = useMemo(
        () => (stats ? signupRows(stats, period, range, new Date(stats.generatedAt)) : []),
        [stats, period, range],
    );
    const starterWeeks = useMemo(
        () =>
            stats?.starterWeeks
                ? starterRows(stats.starterWeeks, ranges.week, new Date(stats.generatedAt))
                : [],
        [stats, ranges.week],
    );
    const history = useMemo(
        () => (stats ? historyByPeriod(stats.history, period) : []),
        [stats, period],
    );

    if (!stats) {
        return (
            <>
                {request.isLoading() || !request.isSent() ? (
                    <LoadingPage />
                ) : (
                    <Container sx={{ py: 5 }}>
                        <Typography>Could not load the stats.</Typography>
                        <Button onClick={load}>Try again</Button>
                    </Container>
                )}
                <RequestSnackbar request={request} />
            </>
        );
    }

    const { totals } = stats;
    const totalPaid = totals.paying + totals.churned;
    const weekAgo = snapshotWeekAgo(stats.history, new Date(stats.generatedAt));
    const unit = period === 'week' ? 'week' : 'month';
    const label = (key: string) => formatPeriod(key, period);

    const rangeToggle = (
        <ToggleButtonGroup
            size='small'
            exclusive
            value={range}
            onChange={(_, value: number | null) =>
                value !== null && setRanges((r) => ({ ...r, [period]: value }))
            }
        >
            {RANGES[period].map((r) => (
                <ToggleButton key={r.value} value={r.value}>
                    {r.label}
                </ToggleButton>
            ))}
        </ToggleButtonGroup>
    );

    return (
        <Container maxWidth='xl' sx={{ py: 5 }} data-testid='admin-stats'>
            <RequestSnackbar request={request} />
            <Stack spacing={4}>
                <Stack direction='row' sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Typography variant='h4' sx={{ fontWeight: 'bold' }}>
                        Site Stats
                    </Typography>
                    <Typography sx={{ color: 'text.secondary' }}>
                        As of {new Date(stats.generatedAt).toLocaleString()}
                    </Typography>
                    <Stack direction='row' sx={{ ml: 'auto', alignItems: 'center', gap: 2 }}>
                        <ToggleButtonGroup
                            size='small'
                            exclusive
                            value={period}
                            onChange={(_, value: Period | null) => value && setPeriod(value)}
                            data-testid='admin-stats-period'
                        >
                            <ToggleButton value='week'>Weekly</ToggleButton>
                            <ToggleButton value='month'>Monthly</ToggleButton>
                        </ToggleButtonGroup>
                        <Button
                            startIcon={<Refresh />}
                            onClick={load}
                            loading={request.isLoading()}
                        >
                            Refresh
                        </Button>
                    </Stack>
                </Stack>

                <Section
                    title='Accounts'
                    subtitle={
                        weekAgo
                            ? `Changes are against ${formatWeek(weekAgo.date, true)}.`
                            : 'Changes against last week appear once a week of nightly snapshots is saved.'
                    }
                >
                    <Grid container spacing={2}>
                        <Tile
                            label='Total accounts'
                            value={number(totals.accounts)}
                            change={formatChange(totals.accounts, weekAgo?.accounts)}
                        />
                        <Tile
                            label='Free'
                            value={number(totals.free)}
                            detail={`${number(totals.notOnboarded)} never picked a cohort`}
                            change={formatChange(totals.free, weekAgo?.free)}
                        />
                        <Tile
                            label='Paying (lifetime)'
                            value={number(totalPaid)}
                            detail={`${formatPercent(percent(totalPaid, totals.accounts))} of accounts · ${number(totals.paying)} subscribed now, ${number(totals.churned)} canceled`}
                            change={formatChange(totalPaid, weekAgo?.paid)}
                        />
                        <Tile
                            label='Subscribed now'
                            value={number(totals.paying)}
                            change={formatChange(totals.paying, weekAgo?.paying)}
                        />
                        <Tile label='Complimentary' value={number(totals.complimentary)} />
                    </Grid>
                </Section>

                <Section
                    title='Activity'
                    subtitle='Accounts whose data changed in the period (logging progress, editing their profile, and so on).'
                >
                    <Grid container spacing={2}>
                        <Tile label='Active today' value={number(totals.active1)} />
                        <Tile
                            label='Active this week'
                            value={number(totals.active7)}
                            change={formatChange(totals.active7, weekAgo?.active7)}
                        />
                        <Tile
                            label='Active in 30 days'
                            value={number(totals.active30)}
                            detail={`${number(totals.freeActive30)} free + ${number(totals.paidActive30)} paying + ${number(totals.complimentaryActive30)} complimentary`}
                            change={formatChange(totals.active30, weekAgo?.active30)}
                        />
                        <Tile
                            label='Free, active in 30 days'
                            value={number(totals.freeActive30)}
                            detail={`${formatPercent(percent(totals.freeActive30, totals.free))} of free`}
                            change={formatChange(totals.freeActive30, weekAgo?.freeActive30)}
                        />
                        <Tile
                            label='Paying (lifetime), active in 30 days'
                            value={number(totals.paidActive30)}
                            detail={`${formatPercent(percent(totals.paidActive30, totalPaid))} of paying`}
                        />
                    </Grid>
                </Section>

                <Section
                    title={`New accounts by ${unit}`}
                    subtitle={`Each ${unit}’s signups, by what those accounts are now. The % above each bar is how many of them have paid.${period === 'week' ? ' Weeks start on Monday (UTC).' : ''}`}
                    action={rangeToggle}
                >
                    <Card variant='outlined'>
                        <CardContent>
                            <BarChart
                                height={320}
                                xAxis={[
                                    {
                                        data: rows.map((r) => r.key),
                                        scaleType: 'band',
                                        valueFormatter: label,
                                    },
                                ]}
                                series={[
                                    {
                                        data: rows.map((r) => r.free),
                                        label: 'Still free',
                                        stack: 'signups',
                                    },
                                    {
                                        data: rows.map((r) => r.complimentary),
                                        label: 'Complimentary',
                                        stack: 'signups',
                                    },
                                    {
                                        data: rows.map(convertedCount),
                                        label: 'Paying (lifetime)',
                                        stack: 'signups',
                                        // On top of the stack, so the label sits above each bar.
                                        barLabelPlacement: 'outside',
                                        barLabel: ({ dataIndex }) => {
                                            const r = rows[dataIndex];
                                            return r.signups > 0
                                                ? formatPercent(
                                                      percent(convertedCount(r), r.signups),
                                                  )
                                                : null;
                                        },
                                    },
                                ]}
                            />
                        </CardContent>
                    </Card>
                </Section>

                <Section
                    title={`Conversion and retention by signup ${unit}`}
                    subtitle={`Paying (lifetime) = ever paid, whether still subscribed or canceled since. Recent ${unit}s have had less time to convert.`}
                    action={rangeToggle}
                >
                    <Card variant='outlined'>
                        <CardContent>
                            <LineChart
                                height={300}
                                xAxis={[
                                    {
                                        data: rows.map((r) => r.key),
                                        scaleType: 'point',
                                        valueFormatter: label,
                                    },
                                ]}
                                yAxis={[{ valueFormatter: (v: number) => `${v}%` }]}
                                series={[
                                    {
                                        data: rows.map((r) =>
                                            percent(convertedCount(r), r.signups),
                                        ),
                                        label: 'Paying (lifetime)',
                                        valueFormatter: formatPercent,
                                        connectNulls: true,
                                    },
                                    {
                                        data: rows.map((r) => percent(r.onboarded, r.signups)),
                                        label: 'Picked a cohort',
                                        valueFormatter: formatPercent,
                                        connectNulls: true,
                                    },
                                    {
                                        data: rows.map((r) => percent(r.starterStarted, r.signups)),
                                        label: 'Started the Starter Plan',
                                        valueFormatter: formatPercent,
                                        connectNulls: true,
                                    },
                                    {
                                        data: rows.map((r) => percent(r.active30, r.signups)),
                                        label: 'Active in last 30 days',
                                        valueFormatter: formatPercent,
                                        connectNulls: true,
                                    },
                                ]}
                            />
                        </CardContent>
                    </Card>
                    <SignupTable rows={[...rows].reverse()} period={period} />
                </Section>

                {stats.members && (
                    <Section
                        title='Free and paying members'
                        subtitle='Paying means subscribed now (not complimentary). The Dojo Starter Plan is shown to members who joined since it launched, and to existing members who chose to start it.'
                    >
                        <MemberTable members={stats.members} />
                    </Section>
                )}

                {stats.starterWeeks && (
                    <Section
                        title='Starter Plan activity by week'
                        subtitle='Members who marked at least one Starter Plan task done that week. Always weekly; paying means subscribed now.'
                        action={
                            <ToggleButtonGroup
                                size='small'
                                exclusive
                                value={ranges.week}
                                onChange={(_, value: number | null) =>
                                    value !== null && setRanges((r) => ({ ...r, week: value }))
                                }
                            >
                                {RANGES.week.map((r) => (
                                    <ToggleButton key={r.value} value={r.value}>
                                        {r.label}
                                    </ToggleButton>
                                ))}
                            </ToggleButtonGroup>
                        }
                    >
                        <Card variant='outlined'>
                            <CardContent>
                                <BarChart
                                    height={280}
                                    xAxis={[
                                        {
                                            data: starterWeeks.map((w) => w.week),
                                            scaleType: 'band',
                                            valueFormatter: (w: string) => formatWeek(w),
                                        },
                                    ]}
                                    series={[
                                        { data: starterWeeks.map((w) => w.free), label: 'Free' },
                                        {
                                            data: starterWeeks.map((w) => w.paying),
                                            label: 'Paying',
                                        },
                                    ]}
                                />
                            </CardContent>
                        </Card>
                    </Section>
                )}

                <Section title='Cohorts' subtitle='Accounts in each cohort now.'>
                    <Card variant='outlined'>
                        <CardContent>
                            <BarChart
                                height={340}
                                xAxis={[
                                    {
                                        data: stats.cohorts.map((c) => c.cohort),
                                        scaleType: 'band',
                                        tickLabelStyle: { angle: -45, textAnchor: 'end' },
                                        height: 60,
                                    },
                                ]}
                                series={[
                                    {
                                        data: stats.cohorts.map((c) => c.free),
                                        label: 'Free',
                                        stack: 'cohort',
                                    },
                                    {
                                        data: stats.cohorts.map((c) => c.paid),
                                        label: 'Paying (lifetime)',
                                        stack: 'cohort',
                                    },
                                    {
                                        data: stats.cohorts.map((c) => c.active30),
                                        label: 'Active in 30 days',
                                    },
                                ]}
                            />
                        </CardContent>
                    </Card>
                </Section>

                <Section
                    title={`History by ${unit}`}
                    subtitle={`Totals saved every night, shown as they were at the end of each ${unit}, so this fills in over time.`}
                >
                    {history.length < 2 ? (
                        <Typography sx={{ color: 'text.secondary' }}>
                            {stats.history.length === 0
                                ? 'No nightly snapshots yet. The first one is saved tonight.'
                                : `Saved since ${formatWeek(stats.history[0].date, true)}. The chart appears once two ${unit}s have snapshots.`}
                        </Typography>
                    ) : (
                        <Card variant='outlined'>
                            <CardContent>
                                <LineChart
                                    height={300}
                                    xAxis={[
                                        {
                                            data: history.map((h) => h.key),
                                            scaleType: 'point',
                                            valueFormatter: label,
                                        },
                                    ]}
                                    series={[
                                        {
                                            // Snapshots from before `paid` was saved fall back to `paying`.
                                            data: history.map((h) => h.paid ?? h.paying),
                                            label: 'Paying (lifetime)',
                                        },
                                        {
                                            data: history.map((h) => h.paying),
                                            label: 'Subscribed now',
                                        },
                                        {
                                            data: history.map((h) => h.active30),
                                            label: 'Active in 30 days',
                                        },
                                        {
                                            data: history.map((h) => h.active7),
                                            label: 'Active this week',
                                        },
                                        {
                                            data: history.map((h) => h.starterStarted ?? null),
                                            label: 'Started the Starter Plan',
                                        },
                                    ]}
                                />
                            </CardContent>
                        </Card>
                    )}
                </Section>
            </Stack>
        </Container>
    );
}

function Section({
    title,
    subtitle,
    action,
    children,
}: {
    title: string;
    subtitle?: string;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <Stack spacing={1.5}>
            <Stack direction='row' sx={{ alignItems: 'end', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant='h6' sx={{ fontWeight: 'bold' }}>
                        {title}
                    </Typography>
                    {subtitle && (
                        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                            {subtitle}
                        </Typography>
                    )}
                </Box>
                {action && <Box sx={{ ml: 'auto' }}>{action}</Box>}
            </Stack>
            {children}
        </Stack>
    );
}

function Tile({
    label,
    value,
    detail,
    change,
}: {
    label: string;
    value: string;
    detail?: string;
    /** The change against last week, e.g. "+12 vs last week". */
    change?: string;
}) {
    return (
        <Grid size={{ xs: 6, sm: 4, md: 'grow' }}>
            <Card variant='outlined' sx={{ height: 1 }}>
                <CardContent>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                        {label}
                    </Typography>
                    <Typography variant='h5' sx={{ fontWeight: 'bold' }}>
                        {value}
                    </Typography>
                    {change && (
                        <Typography
                            variant='caption'
                            component='div'
                            sx={{
                                fontWeight: 'bold',
                                color: change.startsWith('+')
                                    ? 'success.main'
                                    : change.startsWith('-')
                                      ? 'error.main'
                                      : 'text.secondary',
                            }}
                        >
                            {change}
                        </Typography>
                    )}
                    {detail && (
                        <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                            {detail}
                        </Typography>
                    )}
                </CardContent>
            </Card>
        </Grid>
    );
}

function SignupTable({ rows, period }: { rows: SignupRow[]; period: Period }) {
    const withPercent = (count: number, signups: number) =>
        `${number(count)} (${formatPercent(percent(count, signups))})`;
    return (
        <TableContainer component={Card} variant='outlined'>
            <Table size='small'>
                <TableHead>
                    <TableRow>
                        <TableCell>{period === 'week' ? 'Signup week' : 'Signup month'}</TableCell>
                        <TableCell align='right'>New accounts</TableCell>
                        <TableCell align='right'>Picked a cohort</TableCell>
                        <TableCell align='right'>Still free</TableCell>
                        <TableCell align='right'>Paying (lifetime)</TableCell>
                        <TableCell align='right'>Subscribed now</TableCell>
                        <TableCell align='right'>Canceled</TableCell>
                        <TableCell align='right'>Complimentary</TableCell>
                        <TableCell align='right'>Started Starter Plan</TableCell>
                        <TableCell align='right'>Finished or skipped it</TableCell>
                        <TableCell align='right'>Active in 30 days</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((r) => (
                        <TableRow key={r.key} hover>
                            <TableCell>
                                {period === 'week' ? 'Week of ' : ''}
                                {formatPeriod(r.key, period, true)}
                            </TableCell>
                            <TableCell align='right'>{number(r.signups)}</TableCell>
                            <TableCell align='right'>
                                {withPercent(r.onboarded, r.signups)}
                            </TableCell>
                            <TableCell align='right'>{number(r.free)}</TableCell>
                            <TableCell align='right'>
                                {withPercent(convertedCount(r), r.signups)}
                            </TableCell>
                            <TableCell align='right'>{number(r.paying)}</TableCell>
                            <TableCell align='right'>{number(r.churned)}</TableCell>
                            <TableCell align='right'>{number(r.complimentary)}</TableCell>
                            <TableCell align='right'>
                                {withPercent(r.starterStarted, r.signups)}
                            </TableCell>
                            <TableCell align='right'>{number(r.starterFinished)}</TableCell>
                            <TableCell align='right'>
                                {withPercent(r.active30, r.signups)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

/** The rows of the member table: a count and what its percentage is of. */
const MEMBER_ROWS: {
    label: string;
    value: (g: AdminStatsMemberGroup) => number;
    of?: (g: AdminStatsMemberGroup) => number;
    ofLabel?: string;
}[] = [
    { label: 'Members', value: (g) => g.accounts },
    { label: 'Picked a cohort', value: (g) => g.onboarded, of: (g) => g.accounts },
    { label: 'Active today', value: (g) => g.active1, of: (g) => g.accounts },
    { label: 'Active this week', value: (g) => g.active7, of: (g) => g.accounts },
    { label: 'Active in 30 days', value: (g) => g.active30, of: (g) => g.accounts },
    {
        label: 'Started the Starter Plan',
        value: (g) => g.starterStarted,
        of: (g) => g.onboarded,
        ofLabel: 'of those with a cohort',
    },
    {
        label: 'Finished or skipped it',
        value: (g) => g.starterFinished,
        of: (g) => g.starterStarted,
        ofLabel: 'of those who started',
    },
    {
        label: 'Still on it',
        value: (g) => g.starterStarted - g.starterFinished,
        of: (g) => g.starterStarted,
        ofLabel: 'of those who started',
    },
    {
        label: 'Made a custom plan',
        value: (g) => g.customPlan,
        of: (g) => g.onboarded,
        ofLabel: 'of those with a cohort',
    },
];

function MemberTable({ members }: { members: AdminStatsMembers }) {
    const groups = [members.free, members.paying];
    return (
        <TableContainer component={Card} variant='outlined'>
            <Table size='small'>
                <TableHead>
                    <TableRow>
                        <TableCell />
                        <TableCell align='right'>Free</TableCell>
                        <TableCell align='right'>Paying</TableCell>
                        <TableCell />
                    </TableRow>
                </TableHead>
                <TableBody>
                    {MEMBER_ROWS.map((row) => (
                        <TableRow key={row.label} hover>
                            <TableCell>{row.label}</TableCell>
                            {groups.map((g, i) => (
                                <TableCell key={i} align='right'>
                                    {number(row.value(g))}
                                    {row.of &&
                                        ` (${formatPercent(percent(row.value(g), row.of(g)))})`}
                                </TableCell>
                            ))}
                            <TableCell sx={{ color: 'text.secondary' }}>
                                {row.of && (row.ofLabel ?? 'of members')}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
