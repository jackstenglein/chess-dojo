'use client';

import {
    DashboardAttempt,
    DashboardAttemptsResponse,
    MAX_DASHBOARD_ATTEMPTS,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/runs';
import { ArrowBack, Download } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    MenuItem,
    Paper,
    Select,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TableSortLabel,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import { BarChart } from '@mui/x-charts';
import Link from 'next/link';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { formatDay, formatDuration, formatPercent } from '../../stats/statsView';
import { downloadText } from '../downloadFile';
import { PuzzlebaseClient } from '../puzzlebaseClient';
import { errorMessage } from '../puzzlebaseErrors';
import { PuzzlebaseGate } from '../PuzzlebaseGate';
import {
    afterFirstMoveMs,
    attemptsCsv,
    overview,
    PuzzleRow,
    puzzleRows,
    rangeFor,
    RANGES,
    RangeValue,
    solverName,
    systemLabel,
} from './dashboardStats';

type View = 'overview' | 'attempts' | 'puzzles';

const overline = { color: 'text.secondary', lineHeight: 1.4, display: 'block' } as const;
const num = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } as const;

const RESULT_COLOR = { clean: 'success', solved: 'warning', abandoned: 'default' } as const;
const RESULT_LABEL = { clean: 'Clean', solved: 'Solved', abandoned: 'Left' } as const;

const scoreText = (score: number | undefined) =>
    score === undefined ? '–' : String(Math.round(score * 100));

/**
 * How members solve PuzzleBase puzzles: everyone's attempts in a stretch of time, as an overview,
 * a list of every attempt, and a summary per puzzle. For Puzzle Contributors and admins.
 */
export function SolveStatsPage() {
    return <PuzzlebaseGate>{({ client }) => <SolveStats client={client} />}</PuzzlebaseGate>;
}

function SolveStats({ client }: { client: PuzzlebaseClient }) {
    const [view, setView] = useState<View>('overview');
    const [rangeValue, setRangeValue] = useState<RangeValue>('30d');
    // What came back for a range, kept with the range it was for. While the range picked differs,
    // the page shows it is loading.
    const [loaded, setLoaded] = useState<
        { rangeValue: RangeValue; range: { from: string; to: string } } & (
            DashboardAttemptsResponse | { error: string }
        )
    >();

    useEffect(() => {
        let cancelled = false;
        const range = rangeFor(rangeValue);
        client
            .getDashboardAttempts(range)
            .then((response) => !cancelled && setLoaded({ rangeValue, range, ...response }))
            .catch(
                (err: unknown) =>
                    !cancelled && setLoaded({ rangeValue, range, error: errorMessage(err) }),
            );
        return () => {
            cancelled = true;
        };
    }, [client, rangeValue]);

    const current = loaded?.rangeValue === rangeValue ? loaded : undefined;
    const error = current && 'error' in current ? current.error : undefined;
    const data = current && !('error' in current) ? current : undefined;

    const exportCsv = () => {
        if (!data) return;
        downloadText(
            `puzzlebase-attempts-${new Date().toISOString().slice(0, 10)}.csv`,
            attemptsCsv(data.attempts),
        );
    };

    return (
        <Container maxWidth='xl' sx={{ py: 3 }}>
            <Stack sx={{ gap: 2.5 }}>
                <Button
                    component={Link}
                    href='/puzzles/base'
                    color='inherit'
                    startIcon={<ArrowBack />}
                    sx={{ alignSelf: 'flex-start' }}
                >
                    Dojo PuzzleBase
                </Button>
                <Stack
                    direction='row'
                    sx={{
                        gap: 2,
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <Typography variant='h4' sx={{ fontWeight: 'bold' }}>
                        Solve stats
                    </Typography>
                    <Stack direction='row' sx={{ gap: 1.5, alignItems: 'center' }}>
                        <Select
                            size='small'
                            value={rangeValue}
                            onChange={(e) => setRangeValue(e.target.value)}
                            inputProps={{ 'aria-label': 'Time range' }}
                        >
                            {RANGES.map((r) => (
                                <MenuItem key={r.value} value={r.value}>
                                    {r.label}
                                </MenuItem>
                            ))}
                        </Select>
                        <Button
                            variant='outlined'
                            startIcon={<Download />}
                            onClick={exportCsv}
                            disabled={!data || data.attempts.length === 0}
                        >
                            Export CSV
                        </Button>
                    </Stack>
                </Stack>

                <Tabs
                    value={view}
                    onChange={(_, value: View) => setView(value)}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab value='overview' label='Overview' />
                    <Tab value='attempts' label='Every attempt' />
                    <Tab value='puzzles' label='By puzzle' />
                </Tabs>

                {error && <Alert severity='error'>{error}</Alert>}
                {!data && !error && (
                    <Stack sx={{ alignItems: 'center', py: 6 }} role='status' aria-label='Loading'>
                        <CircularProgress />
                    </Stack>
                )}
                {data?.truncated && (
                    <Alert severity='info'>
                        Showing the newest {MAX_DASHBOARD_ATTEMPTS.toLocaleString()} attempts. Pick
                        a shorter range to see the rest.
                    </Alert>
                )}
                {data?.attempts.length === 0 && (
                    <Typography color='text.secondary'>
                        No puzzles were played in this range.
                    </Typography>
                )}
                {data && data.attempts.length > 0 && view === 'overview' && (
                    <OverviewView attempts={data.attempts} range={data.range} />
                )}
                {data && data.attempts.length > 0 && view === 'attempts' && (
                    <AttemptsView attempts={data.attempts} />
                )}
                {data && data.attempts.length > 0 && view === 'puzzles' && (
                    <PuzzlesView attempts={data.attempts} />
                )}
            </Stack>
        </Container>
    );
}

function Tile({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
    return (
        <Paper variant='outlined' sx={{ p: 2, minWidth: 150, flex: '1 1 150px' }}>
            <Typography variant='overline' sx={overline}>
                {label}
            </Typography>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 'bold', ...num }}>{value}</Typography>
            {note && (
                <Typography variant='caption' color='text.secondary'>
                    {note}
                </Typography>
            )}
        </Paper>
    );
}

function OverviewView({
    attempts,
    range,
}: {
    attempts: DashboardAttempt[];
    range: { from: string; to: string };
}) {
    const stats = useMemo(() => overview(attempts, range), [attempts, range]);
    return (
        <Stack sx={{ gap: 2.5 }}>
            <Stack direction='row' sx={{ gap: 1.5, flexWrap: 'wrap' }}>
                <Tile label='Attempts' value={stats.attempts.toLocaleString()} />
                <Tile label='Solvers' value={stats.solvers} />
                <Tile label='Puzzles played' value={stats.puzzles} />
                <Tile
                    label='Clean'
                    value={formatPercent(stats.cleanRate)}
                    note={`${stats.clean} clean · ${stats.solved} with mistakes · ${stats.abandoned} left`}
                />
                <Tile
                    label='Right first try'
                    value={formatPercent(stats.firstTryRate)}
                    note='of moves'
                />
                <Tile label='Average time' value={formatDuration(stats.averageMs)} />
                <Tile label='After 1st move' value={formatDuration(stats.averageAfterFirstMs)} />
                <Tile label='Average score' value={scoreText(stats.averageScore)} />
            </Stack>
            <Paper variant='outlined' sx={{ p: 2 }}>
                <Typography variant='overline' sx={overline}>
                    Attempts per day
                </Typography>
                <BarChart
                    height={280}
                    xAxis={[
                        {
                            data: stats.days.map((d) => d.day),
                            scaleType: 'band',
                            valueFormatter: (day: string) => formatDay(day),
                        },
                    ]}
                    series={[
                        { data: stats.days.map((d) => d.attempts), label: 'Attempts' },
                        { data: stats.days.map((d) => d.solvers), label: 'Solvers' },
                    ]}
                />
            </Paper>
        </Stack>
    );
}

const PAGE_SIZE = 50;

function AttemptsView({ attempts }: { attempts: DashboardAttempt[] }) {
    const [search, setSearch] = useState('');
    const [result, setResult] = useState<'all' | 'clean' | 'solved' | 'abandoned'>('all');
    const [page, setPage] = useState(0);

    const shown = useMemo(() => {
        const query = search.trim().toLowerCase().replace(/^#/, '');
        return attempts.filter(
            (a) =>
                (result === 'all' || a.summary.result === result) &&
                (!query ||
                    a.puzzleId.toLowerCase() === query ||
                    a.username.toLowerCase().includes(query) ||
                    solverName(a).toLowerCase().includes(query) ||
                    (a.solver?.cohort ?? '').includes(query)),
        );
    }, [attempts, search, result]);

    return (
        <Stack sx={{ gap: 1.5 }}>
            <Stack direction='row' sx={{ gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField
                    size='small'
                    label='Member, cohort or puzzle #'
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(0);
                    }}
                    sx={{ minWidth: 260 }}
                />
                <Select
                    size='small'
                    value={result}
                    onChange={(e) => {
                        setResult(e.target.value);
                        setPage(0);
                    }}
                    inputProps={{ 'aria-label': 'Result' }}
                >
                    <MenuItem value='all'>Every result</MenuItem>
                    <MenuItem value='clean'>Clean</MenuItem>
                    <MenuItem value='solved'>Solved with mistakes</MenuItem>
                    <MenuItem value='abandoned'>Left</MenuItem>
                </Select>
                <Typography variant='body2' color='text.secondary'>
                    {shown.length.toLocaleString()} attempts
                </Typography>
            </Stack>
            <Paper variant='outlined'>
                <TableContainer>
                    <Table size='small'>
                        <TableHead>
                            <TableRow>
                                <TableCell>When</TableCell>
                                <TableCell>Member</TableCell>
                                <TableCell>Puzzle</TableCell>
                                <TableCell>Result</TableCell>
                                <TableCell align='right'>Time</TableCell>
                                <TableCell align='right'>After 1st move</TableCell>
                                <TableCell align='right'>Moves right</TableCell>
                                <TableCell align='right'>Score</TableCell>
                                <TableCell align='right'>PuzzleBase rating</TableCell>
                                <TableCell align='right'>Dojo rating</TableCell>
                                <TableCell>Ratings</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {shown.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((a) => (
                                <AttemptRow
                                    key={`${a.username}|${a.finishedAt}|${a.puzzleId}`}
                                    attempt={a}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component='div'
                    count={shown.length}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    rowsPerPage={PAGE_SIZE}
                    rowsPerPageOptions={[PAGE_SIZE]}
                />
            </Paper>
        </Stack>
    );
}

function AttemptRow({ attempt: a }: { attempt: DashboardAttempt }) {
    const scoring = a.scoring;
    const ratings = Object.entries(a.solver?.ratings ?? {});
    return (
        <TableRow hover>
            <TableCell sx={num}>{new Date(a.finishedAt).toLocaleString()}</TableCell>
            <TableCell>
                <Link href={`/profile/${a.username}`}>{solverName(a)}</Link>
                {a.solver?.cohort && (
                    <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                        {a.solver.cohort}
                    </Typography>
                )}
            </TableCell>
            <TableCell sx={num}>
                <Link href={`/puzzles/base/${a.puzzleId}`}>#{a.puzzleId}</Link>
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                    {a.puzzleRating}
                </Typography>
            </TableCell>
            <TableCell>
                <Chip
                    size='small'
                    variant='outlined'
                    color={RESULT_COLOR[a.summary.result]}
                    label={RESULT_LABEL[a.summary.result]}
                />
            </TableCell>
            <TableCell align='right' sx={num}>
                {formatDuration(a.summary.totalMs)}
            </TableCell>
            <TableCell align='right' sx={num}>
                {formatDuration(afterFirstMoveMs(a))}
            </TableCell>
            <TableCell align='right' sx={num}>
                {a.summary.movesFirstTry}/{a.summary.moves}
                {a.summary.mistakes > 0 && (
                    <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                        {a.summary.mistakes} {a.summary.mistakes === 1 ? 'mistake' : 'mistakes'}
                    </Typography>
                )}
            </TableCell>
            <TableCell align='right' sx={num}>
                {scoreText(scoring?.score)}
            </TableCell>
            <TableCell align='right' sx={num}>
                {scoring?.ratingAfter !== undefined ? (
                    <>
                        {scoring.ratingAfter}
                        {scoring.counted && scoring.delta !== undefined && (
                            <Typography
                                component='span'
                                variant='caption'
                                sx={{
                                    ml: 0.75,
                                    color:
                                        scoring.delta > 0
                                            ? 'success.main'
                                            : scoring.delta < 0
                                              ? 'error.main'
                                              : 'text.secondary',
                                }}
                            >
                                {scoring.delta > 0 ? '+' : ''}
                                {scoring.delta}
                            </Typography>
                        )}
                        {!scoring.counted && (
                            <Typography
                                variant='caption'
                                color='text.secondary'
                                sx={{ display: 'block' }}
                            >
                                repeat
                            </Typography>
                        )}
                    </>
                ) : (
                    '–'
                )}
            </TableCell>
            <TableCell align='right' sx={num}>
                {a.solver?.normalizedRating ?? '–'}
            </TableCell>
            <TableCell>
                {ratings.length === 0 ? (
                    <Typography variant='body2' color='text.secondary'>
                        {a.solver ? 'None set' : 'Not recorded'}
                    </Typography>
                ) : (
                    <Typography variant='body2' sx={{ whiteSpace: 'nowrap' }}>
                        {ratings
                            .map(([system, rating]) => `${systemLabel(system)} ${rating}`)
                            .join(' · ')}
                    </Typography>
                )}
            </TableCell>
        </TableRow>
    );
}

type PuzzleSort = keyof Pick<
    PuzzleRow,
    | 'puzzleId'
    | 'puzzleRating'
    | 'attempts'
    | 'solvers'
    | 'cleanRate'
    | 'firstTryRate'
    | 'averageMs'
    | 'averageAfterFirstMs'
    | 'averageScore'
    | 'averageSolverRating'
    | 'averageDelta'
>;

const PUZZLE_COLUMNS: { key: PuzzleSort; label: string; format: (row: PuzzleRow) => ReactNode }[] =
    [
        { key: 'puzzleRating', label: 'Rating', format: (r) => r.puzzleRating },
        { key: 'attempts', label: 'Attempts', format: (r) => r.attempts },
        { key: 'solvers', label: 'Solvers', format: (r) => r.solvers },
        { key: 'cleanRate', label: 'Clean', format: (r) => formatPercent(r.cleanRate) },
        {
            key: 'firstTryRate',
            label: 'Right first try',
            format: (r) => formatPercent(r.firstTryRate),
        },
        { key: 'averageMs', label: 'Avg time', format: (r) => formatDuration(r.averageMs) },
        {
            key: 'averageAfterFirstMs',
            label: 'After 1st move',
            format: (r) => formatDuration(r.averageAfterFirstMs),
        },
        { key: 'averageScore', label: 'Avg score', format: (r) => scoreText(r.averageScore) },
        {
            key: 'averageSolverRating',
            label: 'Avg solver Dojo rating',
            format: (r) =>
                r.averageSolverRating === undefined ? '–' : Math.round(r.averageSolverRating),
        },
        {
            key: 'averageDelta',
            label: 'Avg rating change',
            format: (r) =>
                r.averageDelta === undefined
                    ? '–'
                    : `${r.averageDelta > 0 ? '+' : ''}${Math.round(r.averageDelta * 10) / 10}`,
        },
    ];

function PuzzlesView({ attempts }: { attempts: DashboardAttempt[] }) {
    const [sort, setSort] = useState<{ key: PuzzleSort; desc: boolean }>({
        key: 'attempts',
        desc: true,
    });
    const rows = useMemo(() => {
        const list = puzzleRows(attempts);
        const value = (r: PuzzleRow) => r[sort.key];
        return list.sort((a, b) => {
            const x = value(a);
            const y = value(b);
            // Puzzles without a value for the column always go last.
            if (x === undefined) return y === undefined ? 0 : 1;
            if (y === undefined) return -1;
            const order = typeof x === 'string' ? x.localeCompare(String(y)) : x - (y as number);
            return sort.desc ? -order : order;
        });
    }, [attempts, sort]);

    const header = (key: PuzzleSort, label: string, align?: 'right') => (
        <TableCell
            key={key}
            align={align}
            sortDirection={sort.key === key ? (sort.desc ? 'desc' : 'asc') : false}
        >
            <TableSortLabel
                active={sort.key === key}
                direction={sort.key === key && !sort.desc ? 'asc' : 'desc'}
                onClick={() =>
                    setSort((s) => ({ key, desc: s.key === key ? !s.desc : key !== 'puzzleId' }))
                }
            >
                {label}
            </TableSortLabel>
        </TableCell>
    );

    return (
        <Paper variant='outlined'>
            <TableContainer>
                <Table size='small'>
                    <TableHead>
                        <TableRow>
                            {header('puzzleId', 'Puzzle')}
                            {PUZZLE_COLUMNS.map((c) => header(c.key, c.label, 'right'))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={row.puzzleId} hover>
                                <TableCell sx={num}>
                                    <Link href={`/puzzles/base/${row.puzzleId}`}>
                                        #{row.puzzleId}
                                    </Link>
                                </TableCell>
                                {PUZZLE_COLUMNS.map((c) => (
                                    <TableCell key={c.key} align='right' sx={num}>
                                        {c.format(row)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <Box sx={{ px: 2, py: 1 }}>
                <Typography variant='caption' color='text.secondary'>
                    Dojo rating is each solver's main rating on the Dojo's common scale, when they
                    played. Rating change only counts first attempts.
                </Typography>
            </Box>
        </Paper>
    );
}
