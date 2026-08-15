'use client';

import { useApi } from '@/api/Api';
import { useRequest } from '@/api/Request';
import { AuthStatus, useAuth } from '@/auth/Auth';
import Board from '@/board/Board';
import { formatTime } from '@/board/pgn/boardTools/underboard/clock/ClockUsage';
import { toDojoDateString, toDojoTimeString } from '@/components/calendar/displayDate';
import { DrawIcon, LoseIcon, WinIcon } from '@/components/games/list/GameListItem';
import { User } from '@/database/user';
import { useRouter } from '@/hooks/useRouter';
import LoadingPage from '@/loading/LoadingPage';
import { GetPuzzleHistoryResponse } from '@jackstenglein/chess-dojo-common/src/puzzles/api';
import {
    Box,
    Container,
    Fade,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export function PuzzleHistory() {
    const { user, status } = useAuth();
    if (status === AuthStatus.Loading) {
        return <LoadingPage />;
    }
    if (user) {
        return <UserPuzzleHistory user={user} />;
    }
}

function UserPuzzleHistory({ user }: { user: User }) {
    const t = useTranslations('puzzles.history');
    const api = useApi();
    const request = useRequest<GetPuzzleHistoryResponse>();
    const { user: viewer } = useAuth();
    const router = useRouter();

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    useEffect(() => {
        if (!request.isSent()) {
            request.onStart();
            api.getPuzzleHistory({ username: user.username })
                .then((response) => {
                    request.onSuccess(response.data);
                })
                .catch((err: unknown) => {
                    request.onFailure(err);
                });
        }
    }, [user, request, api]);

    if (!request.isSent() || request.isLoading()) {
        return <LoadingPage />;
    }

    const onClickRow = (id: string) => {
        router.push(`/puzzles/${id}`);
    };

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };

    return (
        <Container maxWidth='md' sx={{ py: 5 }}>
            <Typography variant='h5' sx={{ mb: 3 }}>
                {t('title', { displayName: user.displayName })}
            </Typography>

            <Paper elevation={3} sx={{ width: 1, borderRadius: 1, overflow: 'hidden' }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('columnDate')}</TableCell>
                                <TableCell>{t('columnId')}</TableCell>
                                <TableCell align='center'>{t('columnPuzzleRating')}</TableCell>
                                <TableCell align='center'>{t('columnTimeSpent')}</TableCell>
                                <TableCell>{t('columnResult')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {request.data?.history
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map((h) => (
                                    <Tooltip
                                        key={h.createdAt}
                                        arrow
                                        placement='right'
                                        slots={{ transition: Fade }}
                                        title={
                                            <Box sx={{ width: 200, height: 200 }}>
                                                <Board
                                                    config={{
                                                        fen: h.fen,
                                                        viewOnly: true,
                                                        coordinates: false,
                                                        orientation:
                                                            h.fen.split(' ')[1] === 'w'
                                                                ? 'black'
                                                                : 'white',
                                                    }}
                                                />
                                            </Box>
                                        }
                                    >
                                        <TableRow
                                            hover
                                            sx={{ cursor: 'pointer' }}
                                            onClick={() => onClickRow(h.id)}
                                        >
                                            <TableCell>
                                                {toDojoDateString(
                                                    new Date(h.createdAt),
                                                    viewer?.timezoneOverride,
                                                )}{' '}
                                                •{' '}
                                                {toDojoTimeString(
                                                    new Date(h.createdAt),
                                                    viewer?.timezoneOverride,
                                                    viewer?.timeFormat,
                                                )}
                                            </TableCell>
                                            <TableCell>{h.id}</TableCell>
                                            <TableCell align='center'>{h.puzzleRating}</TableCell>
                                            <TableCell align='center'>
                                                {formatTime(h.timeSpentSeconds)}
                                            </TableCell>
                                            <TableCell
                                                sx={{
                                                    color:
                                                        h.ratingChange > 0
                                                            ? 'success.main'
                                                            : h.ratingChange < 0
                                                              ? 'error.main'
                                                              : 'text.secondary',
                                                }}
                                            >
                                                <Stack
                                                    direction='row'
                                                    sx={{
                                                        alignItems: 'center',
                                                        gap: 1,
                                                    }}
                                                >
                                                    {h.result === 'win' ? (
                                                        <WinIcon />
                                                    ) : h.result === 'draw' ? (
                                                        <DrawIcon />
                                                    ) : (
                                                        <LoseIcon />
                                                    )}{' '}
                                                    {h.rated ? (
                                                        <>
                                                            {h.rating} ({h.ratingChange >= 0 && '+'}
                                                            {h.ratingChange})
                                                        </>
                                                    ) : (
                                                        t('unrated')
                                                    )}
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    </Tooltip>
                                ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[10, 25, 100]}
                    component='div'
                    count={request.data?.history.length ?? 0}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Paper>
        </Container>
    );
}
