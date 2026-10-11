'use client';

import { bucketColorDeep, tagChipSx, themeOutline } from '@/components/puzzles/base/bucketStyle';
import { getPuzzlebaseClient } from '@/components/puzzles/base/puzzlebaseClient';
import { formatDelta } from '@/components/puzzles/base/ScoreSummary';
import {
    PuzzleAttempt,
    PuzzleRunsResponse,
    PuzzleStatsResponse,
    StatCounters,
    averageMs,
    cleanRate,
    firstTryRate,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/runs';
import { MemberRating } from '@jackstenglein/chess-dojo-common/src/puzzlebase/scoring';
import { ExpandMore } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Collapse,
    IconButton,
    Paper,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import Link from 'next/link';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import {
    DayView,
    TagRow,
    TagSort,
    formatDay,
    formatDuration,
    formatPercent,
    formatTime,
    groupByDay,
    tagRows,
    withAllBuckets,
} from './statsView';

const DAY_MS = 24 * 60 * 60 * 1000;
/** How much history one load brings in, in days. */
const WINDOW_DAYS = 30;

const overline = { color: 'text.secondary', lineHeight: 1.4, display: 'block' } as const;

/** Merges newly loaded runs into what is already shown, without repeating any. */
function mergeRuns(a: PuzzleRunsResponse, b: PuzzleRunsResponse): PuzzleRunsResponse {
    const sessions = new Map(a.sessions.map((s) => [s.startedAt, s]));
    b.sessions.forEach((s) => sessions.set(s.startedAt, s));
    const attempts = new Map(a.attempts.map((x) => [x.finishedAt + x.puzzleId, x]));
    b.attempts.forEach((x) => attempts.set(x.finishedAt + x.puzzleId, x));
    return { sessions: [...sessions.values()], attempts: [...attempts.values()] };
}

/** The Puzzle Stats tab of a profile: totals, per-tag performance, and every session and attempt. */
export function PuzzleStatsTab({ username }: { username: string }) {
    const client = getPuzzlebaseClient();
    const [stats, setStats] = useState<PuzzleStatsResponse>();
    const [runs, setRuns] = useState<PuzzleRunsResponse>({ sessions: [], attempts: [] });
    const [loadedDays, setLoadedDays] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [error, setError] = useState(false);
    const [sort, setSort] = useState<TagSort>('played');

    useEffect(() => {
        let cancelled = false;
        const from = new Date(Date.now() - WINDOW_DAYS * DAY_MS).toISOString();
        Promise.all([client.getPuzzleStats(username), client.getPuzzleRuns(username, { from })])
            .then(([s, r]) => {
                if (cancelled) return;
                setStats(s);
                setRuns(r);
                setLoadedDays(WINDOW_DAYS);
            })
            .catch(() => !cancelled && setError(true))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [client, username]);

    const loadOlder = useCallback(async () => {
        setLoadingOlder(true);
        try {
            const to = new Date(Date.now() - loadedDays * DAY_MS).toISOString();
            const from = new Date(Date.now() - (loadedDays + WINDOW_DAYS) * DAY_MS).toISOString();
            const older = await client.getPuzzleRuns(username, { from, to });
            setRuns((current) => mergeRuns(current, older));
            setLoadedDays((d) => d + WINDOW_DAYS);
        } catch {
            setError(true);
        } finally {
            setLoadingOlder(false);
        }
    }, [client, username, loadedDays]);

    if (loading) {
        return (
            <Stack sx={{ alignItems: 'center', py: 6 }}>
                <CircularProgress />
            </Stack>
        );
    }
    if (error || !stats) {
        return <Alert severity='error'>Could not load puzzle stats. Try again later.</Alert>;
    }
    if (stats.total.attempts === 0) {
        return (
            <Paper variant='outlined' sx={{ p: 4, textAlign: 'center' }}>
                <Typography sx={{ fontWeight: 'bold', mb: 0.5 }}>No puzzles solved yet</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                    Every puzzle solved in the trainer is recorded here, wrong moves included.
                </Typography>
                <Button component={Link} href='/puzzles/train' variant='contained'>
                    Start training
                </Button>
            </Paper>
        );
    }

    const days = groupByDay(runs.sessions, runs.attempts);

    return (
        <Stack sx={{ gap: 3 }}>
            <Summary
                total={stats.total}
                rating={stats.rating}
                sessionCount={runs.sessions.length}
            />

            <Stack sx={{ gap: 1.5 }}>
                <Stack
                    direction='row'
                    sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                >
                    <Typography variant='overline' sx={overline}>
                        By tag
                    </Typography>
                    <ToggleButtonGroup
                        size='small'
                        exclusive
                        value={sort}
                        onChange={(_, v: TagSort | null) => v && setSort(v)}
                        aria-label='Sort tags'
                    >
                        <ToggleButton value='played'>Most played</ToggleButton>
                        <ToggleButton value='weakest'>Weakest</ToggleButton>
                        <ToggleButton value='name'>A–Z</ToggleButton>
                    </ToggleButtonGroup>
                </Stack>
                <TagTable
                    title='Buckets'
                    byTag={withAllBuckets(stats.buckets)}
                    sort={sort}
                    bucket
                />
                <TagTable title='Themes' byTag={stats.themes} sort={sort} />
            </Stack>

            <Stack sx={{ gap: 1.5 }}>
                <Typography variant='overline' sx={overline}>
                    Sessions
                </Typography>
                {days.length === 0 && (
                    <Typography variant='body2' color='text.secondary'>
                        Nothing in the last {loadedDays} days.
                    </Typography>
                )}
                {days.map((day) => (
                    <Day key={day.key} day={day} />
                ))}
                <Button onClick={loadOlder} disabled={loadingOlder} sx={{ alignSelf: 'center' }}>
                    {loadingOlder ? 'Loading…' : 'Load older'}
                </Button>
            </Stack>
        </Stack>
    );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
    return (
        <Box sx={{ minWidth: 110 }}>
            <Typography variant='overline' sx={overline}>
                {label}
            </Typography>
            <Typography
                variant='h5'
                sx={{ fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}
            >
                {value}
            </Typography>
        </Box>
    );
}

function Summary({
    total,
    rating,
    sessionCount,
}: {
    total: StatCounters;
    rating?: MemberRating;
    sessionCount: number;
}) {
    return (
        <Paper variant='outlined' sx={{ p: 2 }}>
            <Stack direction='row' sx={{ flexWrap: 'wrap', gap: 3 }}>
                {rating && <Metric label='Tactics rating' value={Math.round(rating.rating)} />}
                <Metric label='Puzzles' value={total.attempts} />
                <Metric label='First try' value={formatPercent(firstTryRate(total))} />
                <Metric label='Clean' value={formatPercent(cleanRate(total))} />
                <Metric label='Wrong moves' value={total.mistakes} />
                <Metric label='Avg time' value={formatDuration(averageMs(total))} />
                <Metric label='Recent sessions' value={sessionCount} />
            </Stack>
        </Paper>
    );
}

const cellSx = { fontVariantNumeric: 'tabular-nums', textAlign: 'right' } as const;
const GRID = 'minmax(120px, 1.5fr) repeat(4, minmax(56px, 1fr))';

function TagTable({
    title,
    byTag,
    sort,
    bucket,
}: {
    title: string;
    byTag: Record<string, StatCounters>;
    sort: TagSort;
    bucket?: boolean;
}) {
    const rows = tagRows(byTag, sort);
    if (rows.length === 0) return null;

    return (
        <Paper variant='outlined' aria-label={title} role='table' sx={{ overflowX: 'auto' }}>
            <Box
                role='row'
                sx={{
                    display: 'grid',
                    gridTemplateColumns: GRID,
                    gap: 1,
                    px: 2,
                    py: 1,
                    minWidth: 420,
                    borderBottom: 1,
                    borderColor: 'divider',
                }}
            >
                <Typography variant='overline' sx={overline} role='columnheader'>
                    {title}
                </Typography>
                {['Puzzles', 'First try', 'Clean', 'Avg time'].map((h) => (
                    <Typography
                        key={h}
                        variant='overline'
                        sx={{ ...overline, textAlign: 'right' }}
                        role='columnheader'
                    >
                        {h}
                    </Typography>
                ))}
            </Box>
            {rows.map((row) => (
                <TagRowView key={row.name} row={row} bucket={bucket} />
            ))}
        </Paper>
    );
}

function TagRowView({ row, bucket }: { row: TagRow; bucket?: boolean }) {
    return (
        <Box
            role='row'
            sx={{
                display: 'grid',
                gridTemplateColumns: GRID,
                gap: 1,
                px: 2,
                py: 0.75,
                minWidth: 420,
                alignItems: 'center',
                '&:not(:last-child)': { borderBottom: 1, borderColor: 'divider' },
            }}
        >
            <Box role='cell'>
                <Chip
                    size='small'
                    label={row.name}
                    variant={bucket ? 'filled' : 'outlined'}
                    sx={{
                        ...tagChipSx,
                        ...(bucket
                            ? { bgcolor: bucketColorDeep(row.name), color: '#fff', fontWeight: 600 }
                            : { borderColor: themeOutline }),
                    }}
                />
            </Box>
            <Typography variant='body2' sx={cellSx} role='cell'>
                {row.counters.attempts}
            </Typography>
            <Typography variant='body2' sx={cellSx} role='cell'>
                {formatPercent(row.firstTryRate)}
            </Typography>
            <Typography variant='body2' sx={cellSx} role='cell'>
                {formatPercent(row.cleanRate)}
            </Typography>
            <Typography variant='body2' sx={cellSx} role='cell'>
                {formatDuration(row.averageMs)}
            </Typography>
        </Box>
    );
}

function Day({ day }: { day: DayView }) {
    return (
        <Paper variant='outlined'>
            <Stack
                direction='row'
                sx={{
                    px: 2,
                    py: 1,
                    justifyContent: 'space-between',
                    borderBottom: 1,
                    borderColor: 'divider',
                }}
            >
                <Typography sx={{ fontWeight: 'bold' }}>{formatDay(day.key)}</Typography>
                <Typography variant='body2' color='text.secondary'>
                    {day.totals.attempts} puzzles · {formatPercent(firstTryRate(day.totals))} first
                    try
                </Typography>
            </Stack>
            {day.sessions.map(({ session, attempts }) => (
                <SessionRow
                    key={session.startedAt}
                    startedAt={session.startedAt}
                    counters={session}
                    attempts={attempts}
                />
            ))}
        </Paper>
    );
}

function SessionRow({
    startedAt,
    counters,
    attempts,
}: {
    startedAt: string;
    counters: StatCounters;
    attempts: PuzzleAttempt[];
}) {
    const [open, setOpen] = useState(false);
    const duration = attempts.length
        ? Date.parse(attempts[attempts.length - 1].finishedAt) - Date.parse(startedAt)
        : undefined;

    return (
        <Box sx={{ '&:not(:last-child)': { borderBottom: 1, borderColor: 'divider' } }}>
            <Stack
                direction='row'
                sx={{ alignItems: 'center', px: 2, py: 0.75, gap: 1, cursor: 'pointer' }}
                onClick={() => setOpen((o) => !o)}
            >
                <IconButton
                    size='small'
                    aria-label={open ? 'Hide puzzles' : 'Show puzzles'}
                    aria-expanded={open}
                    sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.15s' }}
                >
                    <ExpandMore fontSize='small' />
                </IconButton>
                <Typography variant='body2' sx={{ fontWeight: 600, minWidth: 80 }}>
                    {formatTime(startedAt)}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                    {counters.attempts} puzzles · {formatPercent(firstTryRate(counters))} first try
                    · {counters.mistakes} wrong · {formatDuration(duration)}
                </Typography>
            </Stack>
            <Collapse in={open} unmountOnExit>
                <Stack sx={{ pl: 6, pr: 2, pb: 1, gap: 0.5 }}>
                    {attempts.map((a) => (
                        <AttemptRow key={a.finishedAt + a.puzzleId} attempt={a} />
                    ))}
                </Stack>
            </Collapse>
        </Box>
    );
}

const RESULT_COLOR = { clean: 'success', solved: 'warning', abandoned: 'default' } as const;
const RESULT_LABEL = { clean: 'Clean', solved: 'Solved', abandoned: 'Left' } as const;

function AttemptRow({ attempt }: { attempt: PuzzleAttempt }) {
    const [open, setOpen] = useState(false);
    const { summary } = attempt;

    return (
        <Box>
            <Stack
                direction='row'
                sx={{
                    alignItems: 'center',
                    gap: 1.5,
                    py: 0.5,
                    cursor: 'pointer',
                    flexWrap: 'wrap',
                }}
                onClick={() => setOpen((o) => !o)}
                role='button'
                aria-expanded={open}
                aria-label={`Puzzle ${attempt.puzzleId} details`}
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpen((o) => !o)}
            >
                <Typography
                    component={Link}
                    href={`/puzzles/base/${attempt.puzzleId}`}
                    onClick={(e) => e.stopPropagation()}
                    variant='body2'
                    sx={{ fontWeight: 'bold', color: 'inherit' }}
                >
                    #{attempt.puzzleId}
                </Typography>
                <Chip
                    size='small'
                    color={RESULT_COLOR[summary.result]}
                    label={RESULT_LABEL[summary.result]}
                    sx={tagChipSx}
                />
                <Typography variant='body2' color='text.secondary'>
                    {attempt.puzzleRating} · {summary.mistakes} wrong ·{' '}
                    {formatDuration(summary.totalMs)}
                </Typography>
                {attempt.scoring?.counted && attempt.scoring.delta !== undefined && (
                    <Typography
                        variant='body2'
                        sx={{
                            fontWeight: 'bold',
                            fontVariantNumeric: 'tabular-nums',
                            color: attempt.scoring.delta >= 0 ? 'success.main' : 'error.main',
                        }}
                    >
                        {formatDelta(attempt.scoring.delta)}
                    </Typography>
                )}
            </Stack>
            <Collapse in={open} unmountOnExit>
                <MoveDetail attempt={attempt} />
            </Collapse>
        </Box>
    );
}

/** Every turn of an attempt: what was wanted, what was tried, and how long each took. */
function MoveDetail({ attempt }: { attempt: PuzzleAttempt }) {
    return (
        <Stack sx={{ pl: 2, pb: 1, gap: 0.5 }} aria-label='Moves'>
            {attempt.moves.map((move, i) => (
                <Stack
                    key={i}
                    direction='row'
                    sx={{ gap: 1.5, alignItems: 'baseline', flexWrap: 'wrap' }}
                >
                    <Typography variant='body2' sx={{ fontWeight: 600, minWidth: 56 }}>
                        {move.expected}
                    </Typography>
                    {move.tries.map((t, j) => (
                        <Typography
                            key={j}
                            variant='body2'
                            sx={{
                                color: t.correct
                                    ? 'success.main'
                                    : t.alt
                                      ? 'warning.main'
                                      : 'error.main',
                                textDecoration: t.correct || t.alt ? 'none' : 'line-through',
                            }}
                        >
                            {t.move}
                            {t.revealed && ' (shown)'}
                            {t.alt === 'alt' && ' (alternate)'}
                            {t.alt === 'alt2' && ' (good, not best)'}{' '}
                            <Typography component='span' variant='caption' color='text.secondary'>
                                {formatDuration(t.ms)}
                            </Typography>
                        </Typography>
                    ))}
                </Stack>
            ))}
        </Stack>
    );
}
