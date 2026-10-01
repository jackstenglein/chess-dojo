'use client';

import Board from '@/board/Board';
import { formatTime } from '@/board/pgn/boardTools/underboard/clock/ClockUsage';
import { LoseIcon, WinIcon } from '@/components/games/list/GameListItem';
import { useRouter } from '@/hooks/useRouter';
import {
    PuzzleRushAttempt,
    PuzzleRushEndReason,
    PuzzleRushStats,
} from '@jackstenglein/chess-dojo-common/src/puzzleRush/api';
import {
    Box,
    Fade,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { ReactNode } from 'react';

/**
 * Renders the headline statistics of a puzzle rush run: correct count, percentage,
 * performance rating and peak rating.
 */
export function PuzzleRushStatsGrid({
    stats,
    endReason,
    totalTimeSeconds,
}: {
    stats: PuzzleRushStats;
    endReason?: PuzzleRushEndReason;
    totalTimeSeconds?: number;
}) {
    const t = useTranslations('puzzles.rush');

    return (
        <Stack spacing={2}>
            <Stack
                direction='row'
                sx={{
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    columnGap: 4,
                    rowGap: 2,
                }}
            >
                <Stat
                    label={t('statCorrect')}
                    value={`${stats.correctCount} / ${stats.totalCount}`}
                />
                <Stat label={t('statPercentage')} value={`${stats.percentage}%`} />
                <Stat
                    label={t('statPerformanceRating')}
                    value={stats.performanceRating !== undefined ? stats.performanceRating : '-'}
                    highlight
                />
                <Stat label={t('statPeakRating')} value={stats.peakRating} />
            </Stack>

            {(endReason || totalTimeSeconds !== undefined) && (
                <Typography
                    variant='body2'
                    sx={{
                        color: 'text.secondary',
                        textAlign: 'center',
                    }}
                >
                    {endReason && t(`endReason.${endReason}`)}
                    {endReason && totalTimeSeconds !== undefined && ' • '}
                    {totalTimeSeconds !== undefined &&
                        t('totalTime', { time: formatTime(totalTimeSeconds) })}
                </Typography>
            )}
        </Stack>
    );
}

function Stat({
    label,
    value,
    highlight,
}: {
    label: ReactNode;
    value: string | number;
    highlight?: boolean;
}) {
    return (
        <Stack sx={{ alignItems: 'center', minWidth: 110 }}>
            <Typography
                variant='h4'
                sx={{
                    fontWeight: 'bold',
                    color: highlight ? 'primary.main' : 'text.primary',
                }}
            >
                {value}
            </Typography>
            <Typography
                variant='body2'
                sx={{
                    color: 'text.secondary',
                }}
            >
                {label}
            </Typography>
        </Stack>
    );
}

/**
 * Renders the attempts from a puzzle rush run as a table. Each row shows a preview
 * of the puzzle on hover and, if an href builder is provided, links to the retry page.
 */
export function PuzzleRushAttemptsTable({
    attempts,
    getHref,
}: {
    attempts: PuzzleRushAttempt[];
    /** Returns the href for the given attempt index. If omitted, rows are not clickable. */
    getHref?: (index: number) => string;
}) {
    const t = useTranslations('puzzles.rush');
    const router = useRouter();

    return (
        <Paper elevation={3} sx={{ width: 1, borderRadius: 1, overflow: 'hidden' }}>
            <TableContainer>
                <Table size='small'>
                    <TableHead>
                        <TableRow>
                            <TableCell>#</TableCell>
                            <TableCell>{t('columnPuzzle')}</TableCell>
                            <TableCell align='center'>{t('columnPuzzleRating')}</TableCell>
                            <TableCell align='center'>{t('columnSearchRating')}</TableCell>
                            <TableCell align='center'>{t('columnTime')}</TableCell>
                            <TableCell>{t('columnResult')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {attempts.map((attempt, index) => (
                            <Tooltip
                                key={`${attempt.puzzleId}-${index}`}
                                arrow
                                placement='right'
                                slots={{ transition: Fade }}
                                title={
                                    <Box sx={{ width: 200, height: 200 }}>
                                        <Board
                                            config={{
                                                fen: attempt.fen,
                                                viewOnly: true,
                                                coordinates: false,
                                                orientation:
                                                    attempt.fen.split(' ')[1] === 'w'
                                                        ? 'black'
                                                        : 'white',
                                            }}
                                        />
                                    </Box>
                                }
                            >
                                <TableRow
                                    hover={!!getHref}
                                    sx={{ cursor: getHref ? 'pointer' : undefined }}
                                    onClick={
                                        getHref ? () => router.push(getHref(index)) : undefined
                                    }
                                >
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{attempt.puzzleId}</TableCell>
                                    <TableCell align='center'>{attempt.puzzleRating}</TableCell>
                                    <TableCell align='center'>{attempt.searchRating}</TableCell>
                                    <TableCell align='center'>
                                        {formatTime(attempt.timeSpentSeconds)}
                                    </TableCell>
                                    <TableCell>
                                        <Stack
                                            direction='row'
                                            sx={{
                                                alignItems: 'center',
                                                gap: 1,
                                                color:
                                                    attempt.result === 'win'
                                                        ? 'success.main'
                                                        : 'error.main',
                                            }}
                                        >
                                            {attempt.result === 'win' ? <WinIcon /> : <LoseIcon />}
                                            {attempt.result === 'win'
                                                ? t('resultCorrect')
                                                : t('resultWrong')}
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            </Tooltip>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}

/** Returns the URL of the review page for the run with the given createdAt. */
export function puzzleRushReviewHref(createdAt: string): string {
    return `/puzzles/rush/${encodeURIComponent(createdAt)}`;
}

/** Returns the URL of the retry page for the given attempt of the run with the given createdAt. */
export function puzzleRushRetryHref(createdAt: string, index: number): string {
    return `/puzzles/rush/${encodeURIComponent(createdAt)}/${index}`;
}
