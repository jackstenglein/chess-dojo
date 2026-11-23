'use client';

import {
    Alert,
    Box,
    Button,
    Collapse,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { Fragment, useEffect, useState } from 'react';
import { getGuessStats, GuessStats } from './wcLiveApi';

function formatLead(seconds?: number): string {
    if (seconds === undefined) {
        return '–';
    }
    if (seconds < 0) {
        return `${Math.abs(seconds).toFixed(1)}s after`;
    }
    if (seconds < 60) {
        return `${seconds.toFixed(1)}s`;
    }
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

function moveLabel(ply: number): string {
    const n = Math.ceil(ply / 2);
    return ply % 2 === 1 ? `${n}.` : `${n}...`;
}

/**
 * Admins only: how long before each move people made their right guesses, to
 * spot anyone guessing from a faster feed. The most suspicious come first.
 */
export function GuessStatsPanel({ roundId, autoLoad }: { roundId?: string; autoLoad?: boolean }) {
    const [stats, setStats] = useState<GuessStats>();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [open, setOpen] = useState<string>();

    const load = async () => {
        if (!roundId) {
            return;
        }
        setLoading(true);
        setError('');
        try {
            setStats(await getGuessStats(roundId));
        } catch {
            setError('Could not load the stats.');
        } finally {
            setLoading(false);
        }
    };

    // In the Admin tab the stats load as soon as a game is picked.
    useEffect(() => {
        if (autoLoad) {
            void load();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- once per game.
    }, [autoLoad, roundId]);

    const shown = stats?.roundId === roundId ? stats : undefined;

    return (
        <Paper variant='outlined' sx={{ p: 2 }} data-testid='guess-stats'>
            <Stack direction='row' sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                    <Typography variant='subtitle1' sx={{ fontWeight: 800 }}>
                        Guess timing
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                        Admins only
                    </Typography>
                </Box>
                <Button
                    size='small'
                    variant='outlined'
                    onClick={() => void load()}
                    disabled={loading}
                >
                    {loading ? 'Loading…' : shown ? 'Refresh' : 'Load'}
                </Button>
            </Stack>
            {error && (
                <Alert severity='error' sx={{ mt: 1 }}>
                    {error}
                </Alert>
            )}
            {shown && (
                <>
                    <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ display: 'block', mt: 1 }}
                    >
                        {shown.guessCount} guesses logged. A close call is a right guess made less
                        than {shown.closeCallSeconds}s before the move came in. Click a row for each
                        guess.
                    </Typography>
                    {shown.rows.length === 0 ? (
                        <Typography variant='body2' sx={{ mt: 1 }}>
                            No guesses on played moves yet.
                        </Typography>
                    ) : (
                        <Box sx={{ maxHeight: 360, overflowY: 'auto', mt: 1 }}>
                            <Table size='small' stickyHeader sx={{ '& td, & th': { px: 0.75 } }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Username</TableCell>
                                        <TableCell align='right'>Right</TableCell>
                                        <TableCell
                                            align='right'
                                            title='Right guesses made just before the move came in'
                                        >
                                            Close
                                        </TableCell>
                                        <TableCell
                                            align='right'
                                            title='Median time from guess to move'
                                        >
                                            Lead
                                        </TableCell>
                                        <TableCell align='right'>Changes</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {shown.rows.map((r) => (
                                        <Fragment key={r.username}>
                                            <TableRow
                                                hover
                                                onClick={() =>
                                                    setOpen((o) =>
                                                        o === r.username ? undefined : r.username,
                                                    )
                                                }
                                                sx={{ cursor: 'pointer' }}
                                            >
                                                <TableCell>{r.username}</TableCell>
                                                <TableCell align='right'>{r.correct}</TableCell>
                                                <TableCell
                                                    align='right'
                                                    sx={{
                                                        fontWeight: 800,
                                                        color: r.closeCalls
                                                            ? 'error.main'
                                                            : undefined,
                                                    }}
                                                >
                                                    {r.closeCalls}
                                                </TableCell>
                                                <TableCell align='right'>
                                                    {formatLead(r.medianLeadSeconds)}
                                                </TableCell>
                                                <TableCell align='right'>{r.changes}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell
                                                    colSpan={5}
                                                    sx={{ py: 0, borderBottom: 0 }}
                                                >
                                                    <Collapse
                                                        in={open === r.username}
                                                        unmountOnExit
                                                    >
                                                        <Box sx={{ py: 1 }}>
                                                            {r.details.map((d) => (
                                                                <Typography
                                                                    key={d.ply}
                                                                    variant='caption'
                                                                    sx={{
                                                                        display: 'block',
                                                                        color:
                                                                            d.leadSeconds !==
                                                                                undefined &&
                                                                            d.leadSeconds <
                                                                                shown.closeCallSeconds
                                                                                ? 'error.main'
                                                                                : 'text.secondary',
                                                                    }}
                                                                >
                                                                    {moveLabel(d.ply)} {d.uci}:
                                                                    guessed{' '}
                                                                    {formatLead(d.leadSeconds)}{' '}
                                                                    before
                                                                    {d.guessedAt
                                                                        ? ` (at ${new Date(d.guessedAt).toLocaleTimeString()})`
                                                                        : ''}
                                                                </Typography>
                                                            ))}
                                                        </Box>
                                                    </Collapse>
                                                </TableCell>
                                            </TableRow>
                                        </Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    )}
                </>
            )}
        </Paper>
    );
}
