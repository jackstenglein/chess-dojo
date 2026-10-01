'use client';

import { listPuzzleRushSessions } from '@/api/puzzleApi';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { AuthStatus, useAuth } from '@/auth/Auth';
import { formatTime } from '@/board/pgn/boardTools/underboard/clock/ClockUsage';
import { toDojoDateString, toDojoTimeString } from '@/components/calendar/displayDate';
import { Link } from '@/components/navigation/Link';
import { useRouter } from '@/hooks/useRouter';
import LoadingPage from '@/loading/LoadingPage';
import NotFoundPage from '@/NotFoundPage';
import { PuzzleRushSession } from '@jackstenglein/chess-dojo-common/src/puzzles/rush/api';
import {
    Button,
    Container,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { puzzleRushReviewHref } from './PuzzleRushSummary';

/** Renders a paginated list of the current user's puzzle rush runs. */
export function PuzzleRushHistory() {
    const { user, status } = useAuth();
    if (status === AuthStatus.Loading) {
        return <LoadingPage />;
    }
    if (!user) {
        return <NotFoundPage />;
    }
    return <PuzzleRushHistoryTable />;
}

interface HistoryData {
    sessions: PuzzleRushSession[];
    lastEvaluatedKey?: string;
}

function PuzzleRushHistoryTable() {
    const t = useTranslations('puzzles.rush');
    const { user } = useAuth();
    const router = useRouter();
    const request = useRequest<HistoryData>();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    useEffect(() => {
        if (!request.isSent()) {
            request.onStart();
            listPuzzleRushSessions()
                .then((response) => request.onSuccess(response.data))
                .catch((err: unknown) => request.onFailure(err));
        }
    }, [request]);

    const loadMore = () => {
        const startKey = request.data?.lastEvaluatedKey;
        if (!startKey) {
            return;
        }
        listPuzzleRushSessions({ startKey })
            .then((response) =>
                request.onSuccess({
                    sessions: [...(request.data?.sessions ?? []), ...response.data.sessions],
                    lastEvaluatedKey: response.data.lastEvaluatedKey,
                }),
            )
            .catch((err: unknown) => request.onFailure(err));
    };

    if (!request.isSent() || request.isLoading()) {
        return <LoadingPage />;
    }

    const sessions = request.data?.sessions ?? [];

    return (
        <Container maxWidth='md' sx={{ py: 5 }}>
            <Stack
                direction='row'
                sx={{
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3,
                    flexWrap: 'wrap',
                    gap: 2,
                }}
            >
                <Typography variant='h5'>{t('historyTitle')}</Typography>
                <Button variant='contained' component={Link} href='/puzzles/rush'>
                    {t('newRun')}
                </Button>
            </Stack>

            {sessions.length === 0 ? (
                <Typography
                    sx={{
                        color: 'text.secondary',
                    }}
                >
                    {t('historyEmpty')}
                </Typography>
            ) : (
                <Paper elevation={3} sx={{ width: 1, borderRadius: 1, overflow: 'hidden' }}>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t('columnDate')}</TableCell>
                                    <TableCell align='center'>{t('statCorrect')}</TableCell>
                                    <TableCell align='center'>{t('statPercentage')}</TableCell>
                                    <TableCell align='center'>
                                        {t('statPerformanceRating')}
                                    </TableCell>
                                    <TableCell align='center'>{t('statPeakRating')}</TableCell>
                                    <TableCell align='center'>{t('columnTime')}</TableCell>
                                    <TableCell>{t('columnEndReason')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sessions
                                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                    .map((session) => (
                                        <TableRow
                                            key={session.createdAt}
                                            hover
                                            sx={{ cursor: 'pointer' }}
                                            onClick={() =>
                                                router.push(puzzleRushReviewHref(session.createdAt))
                                            }
                                        >
                                            <TableCell>
                                                {toDojoDateString(
                                                    new Date(session.createdAt),
                                                    user?.timezoneOverride,
                                                )}{' '}
                                                •{' '}
                                                {toDojoTimeString(
                                                    new Date(session.createdAt),
                                                    user?.timezoneOverride,
                                                    user?.timeFormat,
                                                )}
                                            </TableCell>
                                            <TableCell align='center'>
                                                {session.correctCount} / {session.totalCount}
                                            </TableCell>
                                            <TableCell align='center'>
                                                {session.percentage}%
                                            </TableCell>
                                            <TableCell align='center'>
                                                {session.performanceRating ?? '-'}
                                            </TableCell>
                                            <TableCell align='center'>
                                                {session.peakRating}
                                            </TableCell>
                                            <TableCell align='center'>
                                                {formatTime(session.totalTimeSeconds)}
                                            </TableCell>
                                            <TableCell>
                                                {t(`endReason.${session.endReason}`)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Stack
                        direction='row'
                        sx={{
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                        }}
                    >
                        {request.data?.lastEvaluatedKey ? (
                            <Button onClick={loadMore} sx={{ ml: 2 }}>
                                {t('loadMore')}
                            </Button>
                        ) : (
                            <span />
                        )}
                        <TablePagination
                            rowsPerPageOptions={[10, 25, 100]}
                            component='div'
                            count={sessions.length}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={(_event, newPage) => setPage(newPage)}
                            onRowsPerPageChange={(event) => {
                                setRowsPerPage(+event.target.value);
                                setPage(0);
                            }}
                        />
                    </Stack>
                </Paper>
            )}
            <RequestSnackbar request={request} />
        </Container>
    );
}
