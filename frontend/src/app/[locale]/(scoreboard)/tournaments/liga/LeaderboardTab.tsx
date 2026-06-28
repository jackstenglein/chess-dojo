'use client';

import { RequestSnackbar, useRequest } from '@/api/Request';
import { getDojoLigaLeaderboard } from '@/api/tournamentApi';
import { useAuth } from '@/auth/Auth';
import { toDojoDateString } from '@/components/calendar/displayDate';
import { User } from '@/database/user';
import LoadingPage from '@/loading/LoadingPage';
import { Leaderboard, Player } from '@jackstenglein/chess-dojo-common/src/dojoLiga/dojoLiga';
import { Paper, Stack, Table, TableBody, TableCell, TableContainer, TableRow } from '@mui/material';
import { DataGridPro, GridColDef, GridRowModel, GridRowParams } from '@mui/x-data-grid-pro';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import MonthDateButton from './MonthDateButton';

interface LeaderboardRow extends Player {
    rank: number;
}

const LeaderboardTab = () => {
    const { user } = useAuth();
    const request = useRequest<Leaderboard>();
    const t = useTranslations('tournaments.liga.leaderboard');

    const [selectedDate, setSelectedDate] = useState<DateTime>(DateTime.now());

    const columns = useMemo<GridColDef<LeaderboardRow>[]>(
        () => [
            {
                field: 'rank',
                headerName: t('columnRank'),
            },
            {
                field: 'lichess',
                headerName: t('columnUsername'),
                minWidth: 250,
                flex: 1,
            },
            {
                field: 'score',
                headerName: t('columnScore'),
                minWidth: 100,
                flex: 1,
            },
            {
                field: 'events',
                valueGetter: (_, row) => {
                    return row.tournaments.length;
                },
                headerName: t('columnEvents'),
                minWidth: 100,
                flex: 1,
            },
        ],
        [t],
    );

    const players = useMemo(() => {
        if (!request.data?.players) {
            return [];
        }
        return Object.values(request.data.players)
            .sort((a, b) => {
                if (b.score - a.score !== 0) {
                    return b.score - a.score;
                }
                return b.dojoLigaScore - a.dojoLigaScore;
            })
            .map((player, idx) => ({ ...player, rank: idx + 1 }));
    }, [request.data?.players]);

    useEffect(() => {
        if (!request.isSent()) {
            request.onStart();
            getDojoLigaLeaderboard(selectedDate.toFormat('yyyy-MM'))
                .then((resp) => {
                    request.onSuccess(resp.data);
                })
                .catch((err) => {
                    request.onFailure(err);
                });
        }
    }, [request, selectedDate]);

    const reset = request.reset;
    useEffect(() => {
        reset();
    }, [reset, selectedDate]);

    const isLoading = !request.isSent() || request.isLoading();

    return (
        <Stack spacing={2}>
            <RequestSnackbar request={request} />

            <MonthDateButton selectedDate={selectedDate} onChange={setSelectedDate} />

            {isLoading ? (
                <LoadingPage />
            ) : (
                <DataGridPro
                    autoHeight
                    columns={columns}
                    rows={players}
                    loading={request.isLoading()}
                    getRowId={(row: GridRowModel<LeaderboardRow>) => row.lichess}
                    getDetailPanelContent={getDetailPanelContent(request.data, user)}
                    getDetailPanelHeight={() => 'auto'}
                    pageSizeOptions={[10, 25, 50]}
                    initialState={{
                        sorting: {
                            sortModel: [{ field: 'score', sort: 'desc' }],
                        },
                        pagination: {
                            paginationModel: { page: 0, pageSize: 10 },
                        },
                    }}
                    slotProps={{
                        root: {
                            'data-testid': 'leaderboard',
                        },
                    }}
                    pagination
                />
            )}
        </Stack>
    );
};

export default LeaderboardTab;

function getDetailPanelContent(leaderboard?: Leaderboard, user?: User) {
    if (!leaderboard) {
        return undefined;
    }

    const DetailPanelContent = (params: GridRowParams<LeaderboardRow>) => {
        const tournaments = params.row.tournaments.sort(
            (a, b) =>
                leaderboard.tournaments[a.id]?.date.localeCompare(
                    leaderboard.tournaments[b.id].date,
                ) ?? 0,
        );
        return (
            <TableContainer component={Paper} sx={{ width: '90%', m: 'auto', my: 1 }}>
                <Table>
                    <TableBody>
                        {tournaments.map((t) => {
                            const tournament = leaderboard.tournaments[t.id];
                            if (!tournament) {
                                return null;
                            }
                            return (
                                <TableRow key={t.id}>
                                    <TableCell sx={{ color: 'text.secondary' }}>
                                        {tournament.name}
                                    </TableCell>
                                    <TableCell sx={{ color: 'text.secondary' }}>
                                        {toDojoDateString(
                                            new Date(tournament.date),
                                            user?.timezoneOverride,
                                        )}
                                    </TableCell>
                                    <TableCell sx={{ color: 'text.secondary' }}>
                                        Place: {t.rank}
                                    </TableCell>
                                    <TableCell sx={{ color: 'text.secondary' }}>
                                        Pts:{' '}
                                        <span
                                            style={{
                                                fontWeight: 'bold',
                                                color: 'var(--mui-palette-text-primary)',
                                            }}
                                        >
                                            {t.points}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    return DetailPanelContent;
}
