'use client';

import { RequestSnackbar, useRequest } from '@/api/Request';
import { getAdminStatistics } from '@/api/userApi';
import LoadingPage from '@/loading/LoadingPage';
import {
    AdminStatsMonth,
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
import { convertedCount, formatMonth, formatPercent, lastMonths, percent } from './statsFormat';

const RANGES = [
    { value: 6, label: '6 months' },
    { value: 12, label: '12 months' },
    { value: 24, label: '24 months' },
    { value: 0, label: 'All' },
];

const number = (n: number) => n.toLocaleString('en-US');

export function AdminStats() {
    const request = useRequest<GetAdminStatsResponse>();
    const [range, setRange] = useState(12);

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
    const months = useMemo(
        () => (stats ? lastMonths(stats.months, range, new Date(stats.generatedAt)) : []),
        [stats, range],
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

    const { totals, freePlan } = stats;
    const totalPaid = totals.paying + totals.churned;

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
                    <Button
                        startIcon={<Refresh />}
                        onClick={load}
                        loading={request.isLoading()}
                        sx={{ ml: 'auto' }}
                    >
                        Refresh
                    </Button>
                </Stack>

                <Section title='Accounts'>
                    <Grid container spacing={2}>
                        <Tile label='Total accounts' value={number(totals.accounts)} />
                        <Tile
                            label='Free'
                            value={number(totals.free)}
                            detail={`${number(totals.notOnboarded)} never picked a cohort`}
                        />
                        <Tile
                            label='Paying (lifetime)'
                            value={number(totalPaid)}
                            detail={`${formatPercent(percent(totalPaid, totals.accounts))} of accounts · ${number(totals.paying)} subscribed now, ${number(totals.churned)} canceled`}
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
                        <Tile label='Active this week' value={number(totals.active7)} />
                        <Tile
                            label='Active in 30 days'
                            value={number(totals.active30)}
                            detail={`${number(totals.freeActive30)} free + ${number(totals.paidActive30)} paying + ${number(totals.complimentaryActive30)} complimentary`}
                        />
                        <Tile
                            label='Free, active in 30 days'
                            value={number(totals.freeActive30)}
                            detail={`${formatPercent(percent(totals.freeActive30, totals.free))} of free`}
                        />
                        <Tile
                            label='Paying (lifetime), active in 30 days'
                            value={number(totals.paidActive30)}
                            detail={`${formatPercent(percent(totals.paidActive30, totalPaid))} of paying`}
                        />
                    </Grid>
                </Section>

                <Section
                    title='New accounts by month'
                    subtitle='Each month’s signups, by what those accounts are now. The % above each bar is how many of them have paid.'
                    action={
                        <ToggleButtonGroup
                            size='small'
                            exclusive
                            value={range}
                            onChange={(_, value: number | null) =>
                                value !== null && setRange(value)
                            }
                        >
                            {RANGES.map((r) => (
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
                                height={320}
                                xAxis={[
                                    {
                                        data: months.map((m) => m.month),
                                        scaleType: 'band',
                                        valueFormatter: formatMonth,
                                    },
                                ]}
                                series={[
                                    {
                                        data: months.map((m) => m.free),
                                        label: 'Still free',
                                        stack: 'signups',
                                    },
                                    {
                                        data: months.map((m) => m.complimentary),
                                        label: 'Complimentary',
                                        stack: 'signups',
                                    },
                                    {
                                        data: months.map(convertedCount),
                                        label: 'Paying (lifetime)',
                                        stack: 'signups',
                                        // On top of the stack, so the label sits above each bar.
                                        barLabelPlacement: 'outside',
                                        barLabel: ({ dataIndex }) => {
                                            const m = months[dataIndex];
                                            return m.signups > 0
                                                ? formatPercent(
                                                      percent(convertedCount(m), m.signups),
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
                    title='Conversion and retention by signup month'
                    subtitle='Paying (lifetime) = ever paid, whether still subscribed or canceled since. Recent months have had less time to convert.'
                >
                    <Card variant='outlined'>
                        <CardContent>
                            <LineChart
                                height={300}
                                xAxis={[
                                    {
                                        data: months.map((m) => m.month),
                                        scaleType: 'point',
                                        valueFormatter: formatMonth,
                                    },
                                ]}
                                yAxis={[{ valueFormatter: (v: number) => `${v}%` }]}
                                series={[
                                    {
                                        data: months.map((m) =>
                                            percent(convertedCount(m), m.signups),
                                        ),
                                        label: 'Paying (lifetime)',
                                        valueFormatter: formatPercent,
                                        connectNulls: true,
                                    },
                                    {
                                        data: months.map((m) => percent(m.onboarded, m.signups)),
                                        label: 'Picked a cohort',
                                        valueFormatter: formatPercent,
                                        connectNulls: true,
                                    },
                                    {
                                        data: months.map((m) => percent(m.active30, m.signups)),
                                        label: 'Active in last 30 days',
                                        valueFormatter: formatPercent,
                                        connectNulls: true,
                                    },
                                ]}
                            />
                        </CardContent>
                    </Card>
                    <MonthTable months={[...months].reverse()} />
                </Section>

                <Section
                    title='Free members and the training plan'
                    subtitle='Free accounts that picked a cohort.'
                >
                    <Grid container spacing={2}>
                        <Tile label='Free, with a cohort' value={number(freePlan.freeOnboarded)} />
                        <Tile
                            label='Finished the Dojo Starter Plan'
                            value={number(freePlan.starterFinished)}
                            detail={formatPercent(
                                percent(freePlan.starterFinished, freePlan.freeOnboarded),
                            )}
                        />
                        <Tile
                            label='Made a custom plan'
                            value={number(freePlan.customPlan)}
                            detail={formatPercent(
                                percent(freePlan.customPlan, freePlan.freeOnboarded),
                            )}
                        />
                    </Grid>
                </Section>

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
                    title='History'
                    subtitle='Totals saved every night, so this fills in over time.'
                >
                    {stats.history.length < 2 ? (
                        <Typography sx={{ color: 'text.secondary' }}>
                            {stats.history.length === 0
                                ? 'No nightly snapshots yet. The first one is saved tonight.'
                                : 'One snapshot so far. The chart appears after the second night.'}
                        </Typography>
                    ) : (
                        <Card variant='outlined'>
                            <CardContent>
                                <LineChart
                                    height={300}
                                    xAxis={[
                                        {
                                            data: stats.history.map((h) => h.date),
                                            scaleType: 'point',
                                        },
                                    ]}
                                    series={[
                                        {
                                            // Snapshots from before `paid` was saved fall back to `paying`.
                                            data: stats.history.map((h) => h.paid ?? h.paying),
                                            label: 'Paying (lifetime)',
                                        },
                                        {
                                            data: stats.history.map((h) => h.active30),
                                            label: 'Active in 30 days',
                                        },
                                        {
                                            data: stats.history.map((h) => h.active7),
                                            label: 'Active this week',
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

function Tile({ label, value, detail }: { label: string; value: string; detail?: string }) {
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

function MonthTable({ months }: { months: AdminStatsMonth[] }) {
    return (
        <TableContainer component={Card} variant='outlined'>
            <Table size='small'>
                <TableHead>
                    <TableRow>
                        <TableCell>Signup month</TableCell>
                        <TableCell align='right'>New accounts</TableCell>
                        <TableCell align='right'>Picked a cohort</TableCell>
                        <TableCell align='right'>Still free</TableCell>
                        <TableCell align='right'>Paying (lifetime)</TableCell>
                        <TableCell align='right'>Subscribed now</TableCell>
                        <TableCell align='right'>Canceled</TableCell>
                        <TableCell align='right'>Complimentary</TableCell>
                        <TableCell align='right'>Active in 30 days</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {months.map((m) => (
                        <TableRow key={m.month} hover>
                            <TableCell>{formatMonth(m.month)}</TableCell>
                            <TableCell align='right'>{number(m.signups)}</TableCell>
                            <TableCell align='right'>{number(m.onboarded)}</TableCell>
                            <TableCell align='right'>{number(m.free)}</TableCell>
                            <TableCell align='right'>
                                {number(convertedCount(m))} (
                                {formatPercent(percent(convertedCount(m), m.signups))})
                            </TableCell>
                            <TableCell align='right'>{number(m.paying)}</TableCell>
                            <TableCell align='right'>{number(m.churned)}</TableCell>
                            <TableCell align='right'>{number(m.complimentary)}</TableCell>
                            <TableCell align='right'>
                                {number(m.active30)} (
                                {formatPercent(percent(m.active30, m.signups))})
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
