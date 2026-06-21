'use client';

import { useApi } from '@/api/Api';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { TimeControl, TimePeriod } from '@/api/tournamentApi';
import { AvailabilityType, TimeControlType } from '@/database/event';
import {
    Leaderboard,
    LeaderboardPlayer,
    LeaderboardSite,
    TournamentType,
} from '@/database/tournament';
import LoadingPage from '@/loading/LoadingPage';
import Icon from '@/style/Icon';
import { Button, MenuItem, Stack, TextField } from '@mui/material';
import { DataGridPro, GridColDef, GridRowModel } from '@mui/x-data-grid-pro';
import { DateTime } from 'luxon';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { SiChessdotcom, SiLichess } from 'react-icons/si';
import MonthDateButton from './MonthDateButton';
import { getColor } from './TournamentCalendarFilters';
import YearDateButton from './YearDateButton';

const LeaderboardTab = () => {
    const api = useApi();
    const request = useRequest<Leaderboard>();
    const t = useTranslations('tournaments.liga.leaderboard');

    const [site, setSite] = useState<LeaderboardSite>(LeaderboardSite.Lichess);
    const [tournamentType, setTournamentType] = useState(TournamentType.Arena);
    const [timeControl, setTimeControl] = useState<TimeControl>('blitz');
    const [selectedDate, setSelectedDate] = useState(DateTime.now());
    const [timePeriod, setTimePeriod] = useState<TimePeriod>('monthly');

    const columns = useMemo<GridColDef<LeaderboardPlayer>[]>(
        () => [
            {
                field: 'rank',
                headerName: t('columnRank'),
            },
            {
                field: 'username',
                headerName: t('columnUsername'),
                minWidth: 250,
                flex: 1,
            },
            {
                field: 'rating',
                headerName: t('columnRating'),
                minWidth: 100,
                flex: 1,
            },
            {
                field: 'score',
                headerName: t('columnScore'),
                minWidth: 100,
                flex: 1,
            },
        ],
        [t],
    );

    useEffect(() => {
        if (!request.isSent()) {
            request.onStart();
            api.getLeaderboard(
                site,
                timePeriod,
                tournamentType,
                timeControl,
                selectedDate.toUTC().toISO(),
            )
                .then((resp) => {
                    resp.data.players =
                        resp.data.players?.map((p, idx) => ({
                            ...p,
                            rank: idx + 1,
                        })) || [];
                    request.onSuccess(resp.data);
                })
                .catch((err) => {
                    request.onFailure(err);
                });
        }
    }, [request, api, site, timePeriod, tournamentType, timeControl, selectedDate]);

    const reset = request.reset;
    useEffect(() => {
        reset();
    }, [reset, site, tournamentType, timeControl, timePeriod, selectedDate]);

    if (!request.isSent() || request.isLoading()) {
        return <LoadingPage />;
    }

    return (
        <Stack spacing={2}>
            <RequestSnackbar request={request} />

            <Stack
                direction='row'
                spacing={2}
                flexWrap='wrap'
                rowGap={2}
                justifyContent='space-between'
            >
                <Stack direction='row' spacing={2}>
                    <TextField
                        data-testid='site-control-selector'
                        select
                        label={t('labelSite')}
                        value={site}
                        onChange={(e) => setSite(e.target.value as LeaderboardSite)}
                    >
                        <MenuItem value={LeaderboardSite.Lichess}>
                            <SiLichess
                                fontSize={25}
                                style={{ verticalAlign: 'middle', marginRight: 6 }}
                            />{' '}
                            Lichess
                        </MenuItem>
                        <MenuItem value={LeaderboardSite.Chesscom}>
                            <SiChessdotcom
                                fontSize={25}
                                style={{
                                    color: '#81b64c',
                                    verticalAlign: 'middle',
                                    marginRight: 1,
                                }}
                            />{' '}
                            Chess.com
                        </MenuItem>
                    </TextField>

                    <TextField
                        data-testid='time-control-selector'
                        sx={{ minWidth: 130 }}
                        select
                        label={t('labelTimeControl')}
                        value={timeControl}
                        onChange={(e) => setTimeControl(e.target.value as TimeControl)}
                    >
                        <MenuItem value='blitz'>
                            <Icon
                                name={TimeControlType.Blitz}
                                sx={{ verticalAlign: 'middle', marginRight: 1 }}
                                color={getColor(TimeControlType.Blitz)}
                            />{' '}
                            {t('optionBlitz')}
                        </MenuItem>
                        <MenuItem value='rapid'>
                            <Icon
                                name={TimeControlType.Rapid}
                                sx={{ verticalAlign: 'middle', marginRight: 1 }}
                                color={getColor(TimeControlType.Rapid)}
                            />
                            {t('optionRapid')}
                        </MenuItem>
                        <MenuItem value='classical'>
                            <Icon
                                name={TimeControlType.Classical}
                                sx={{ verticalAlign: 'middle', marginRight: 1 }}
                                color={getColor(TimeControlType.Classical)}
                            />
                            {t('optionClassical')}
                        </MenuItem>
                    </TextField>

                    <TextField
                        data-testid='tournament-type-selector'
                        sx={{ minWidth: 130 }}
                        select
                        label={t('labelTournamentType')}
                        value={tournamentType}
                        onChange={(e) => setTournamentType(e.target.value as TournamentType)}
                    >
                        <MenuItem value={TournamentType.Arena}>
                            {' '}
                            <Icon
                                name={'Arena'}
                                sx={{ verticalAlign: 'middle', marginRight: 1 }}
                                color={'secondary'}
                            />
                            {t('optionArena')}
                        </MenuItem>
                        <MenuItem value={TournamentType.Swiss}>
                            <Icon
                                name={'Swiss'}
                                sx={{ verticalAlign: 'middle', marginRight: 1 }}
                                color={'secondary'}
                            />
                            {t('optionSwiss')}
                        </MenuItem>
                        <MenuItem value={TournamentType.GrandPrix}>
                            <Icon
                                name={'liga'}
                                sx={{ verticalAlign: 'middle', marginRight: 1 }}
                                color={'secondary'}
                            />
                            {t('optionGrandPrix')}
                        </MenuItem>
                        <MenuItem value={TournamentType.MiddlegameSparring}>
                            <Icon
                                name={AvailabilityType.MiddlegameSparring}
                                sx={{ verticalAlign: 'middle', marginRight: 1 }}
                                color={'secondary'}
                            />
                            {t('optionMiddlegameSparring')}
                        </MenuItem>
                        <MenuItem value={TournamentType.EndgameSparring}>
                            <Icon
                                name={AvailabilityType.EndgameSparring}
                                sx={{ verticalAlign: 'middle', marginRight: 1 }}
                                color={'secondary'}
                            />
                            {t('optionEndgameSparring')}
                        </MenuItem>
                    </TextField>
                </Stack>

                <Stack direction='row' alignItems='center'>
                    {timePeriod === 'monthly' && (
                        <MonthDateButton selectedDate={selectedDate} onChange={setSelectedDate} />
                    )}
                    {timePeriod === 'yearly' && (
                        <YearDateButton selectedDate={selectedDate} onChange={setSelectedDate} />
                    )}

                    <Button
                        color={timePeriod === 'monthly' ? 'primary' : 'inherit'}
                        onClick={() => setTimePeriod('monthly')}
                    >
                        {t('monthly')}
                    </Button>
                    <Button
                        color={timePeriod === 'yearly' ? 'primary' : 'inherit'}
                        onClick={() => setTimePeriod('yearly')}
                    >
                        {t('yearly')}
                    </Button>
                </Stack>
            </Stack>

            <DataGridPro
                autoHeight
                columns={columns}
                rows={request.data?.players || []}
                loading={request.isLoading()}
                getRowId={(row: GridRowModel<LeaderboardPlayer>) => row.username}
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
        </Stack>
    );
};

export default LeaderboardTab;
