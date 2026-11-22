'use client';

import { RequestSnackbar } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { dojoCohorts } from '@/database/user';
import CohortIcon from '@/scoreboard/CohortIcon';
import { GetPuzzleRushLeaderboardResponse } from '@jackstenglein/chess-dojo-common/src/puzzles/rush/api';
import { rankPuzzleRushLeaderboard } from '@jackstenglein/chess-dojo-common/src/puzzles/rush/leaderboard';
import { AllInclusive } from '@mui/icons-material';
import {
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { usePuzzleRushLeaderboard } from './usePuzzleRushLeaderboard';

type LeaderboardWindow = 'allTime' | 'month';

/** Renders the Dojo puzzle rush leaderboard for the idle screen. */
export function PuzzleRushLeaderboard() {
    const request = usePuzzleRushLeaderboard();
    const { user } = useAuth();

    return (
        <>
            <PuzzleRushLeaderboardView
                leaderboard={request.data}
                loading={!request.isSent() || request.isLoading()}
                currentUsername={user?.username}
            />
            <RequestSnackbar request={request} />
        </>
    );
}

/** Renders one window of the leaderboard: overall or a single cohort. */
export function PuzzleRushLeaderboardView({
    leaderboard,
    loading,
    currentUsername,
}: {
    leaderboard?: GetPuzzleRushLeaderboardResponse;
    loading: boolean;
    currentUsername?: string;
}) {
    const t = useTranslations('puzzles.rush');
    const locale = useLocale();
    const [period, setPeriod] = useState<LeaderboardWindow>('allTime');
    const [cohort, setCohort] = useState('overall');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const ranked = useMemo(() => {
        const source = period === 'allTime' ? leaderboard?.allTime : leaderboard?.monthly;
        const rows = source ?? [];
        const filtered = cohort === 'overall' ? rows : rows.filter((row) => row.cohort === cohort);
        return rankPuzzleRushLeaderboard(filtered);
    }, [leaderboard, period, cohort]);

    const monthLabel = leaderboard ? formatLeaderboardMonth(leaderboard.month, locale) : '';
    const showCohort = cohort === 'overall';

    return (
        <Stack spacing={2} data-testid='puzzle-rush-leaderboard'>
            <Typography variant='h5' sx={{ fontWeight: 'bold' }}>
                {t('leaderboardTitle')}
            </Typography>

            {leaderboard ? (
                <>
                    <Stack
                        direction='row'
                        sx={{
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 2,
                        }}
                    >
                        <ToggleButtonGroup
                            exclusive
                            size='small'
                            value={period}
                            aria-label={t('leaderboardTitle')}
                            onChange={(_event, value: LeaderboardWindow | null) => {
                                if (value) {
                                    setPeriod(value);
                                    setPage(0);
                                }
                            }}
                        >
                            <ToggleButton value='allTime'>{t('leaderboardAllTime')}</ToggleButton>
                            <ToggleButton value='month'>{t('leaderboardMonth')}</ToggleButton>
                        </ToggleButtonGroup>

                        <FormControl size='small' sx={{ minWidth: 180 }}>
                            <InputLabel id='puzzle-rush-leaderboard-cohort'>
                                {t('leaderboardCohort')}
                            </InputLabel>
                            <Select
                                labelId='puzzle-rush-leaderboard-cohort'
                                label={t('leaderboardCohort')}
                                value={cohort}
                                onChange={(event) => {
                                    setCohort(event.target.value);
                                    setPage(0);
                                }}
                            >
                                <MenuItem value='overall'>
                                    <AllInclusive
                                        color='primary'
                                        sx={{ marginRight: '0.6rem', verticalAlign: 'middle' }}
                                    />{' '}
                                    {t('leaderboardOverall')}
                                </MenuItem>
                                {dojoCohorts.map((id) => (
                                    <MenuItem key={id} value={id}>
                                        <CohortIcon
                                            cohort={id}
                                            sx={{ marginRight: '0.6rem', verticalAlign: 'middle' }}
                                            tooltip=''
                                        />{' '}
                                        {id}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>

                    {period === 'month' && (
                        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                            {t('leaderboardMonthCaption', { month: monthLabel })}
                        </Typography>
                    )}
                    {!leaderboard.complete && (
                        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                            {t('leaderboardPartial')}
                        </Typography>
                    )}

                    {ranked.length === 0 ? (
                        <Typography sx={{ color: 'text.secondary' }}>
                            {t('leaderboardEmpty')}
                        </Typography>
                    ) : (
                        <Paper elevation={3} sx={{ width: 1, borderRadius: 1, overflow: 'hidden' }}>
                            <TableContainer>
                                <Table size='small'>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell align='center'>{t('columnRank')}</TableCell>
                                            <TableCell>{t('columnPlayer')}</TableCell>
                                            {showCohort && (
                                                <TableCell>{t('leaderboardCohort')}</TableCell>
                                            )}
                                            <TableCell align='center'>{t('columnScore')}</TableCell>
                                            <TableCell align='center'>{t('columnRuns')}</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {ranked
                                            .slice(
                                                page * rowsPerPage,
                                                page * rowsPerPage + rowsPerPage,
                                            )
                                            .map((row) => (
                                                <TableRow
                                                    key={row.username}
                                                    hover
                                                    selected={row.username === currentUsername}
                                                >
                                                    <TableCell align='center'>{row.rank}</TableCell>
                                                    <TableCell>
                                                        <Link href={`/profile/${row.username}`}>
                                                            {row.displayName}
                                                        </Link>
                                                    </TableCell>
                                                    {showCohort && (
                                                        <TableCell>{row.cohort ?? '—'}</TableCell>
                                                    )}
                                                    <TableCell align='center'>
                                                        {row.score}
                                                    </TableCell>
                                                    <TableCell align='center'>{row.runs}</TableCell>
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            {ranked.length > rowsPerPage && (
                                <TablePagination
                                    component='div'
                                    count={ranked.length}
                                    page={page}
                                    rowsPerPage={rowsPerPage}
                                    rowsPerPageOptions={[10, 25, 100]}
                                    onPageChange={(_event, nextPage) => setPage(nextPage)}
                                    onRowsPerPageChange={(event) => {
                                        setRowsPerPage(Number(event.target.value));
                                        setPage(0);
                                    }}
                                />
                            )}
                        </Paper>
                    )}
                </>
            ) : (
                loading && <CircularProgress size={28} sx={{ alignSelf: 'center' }} />
            )}
        </Stack>
    );
}

/**
 * Formats a `YYYY-MM` month in `locale` using UTC, so the label matches the board.
 * @param month The UTC month key.
 * @param locale The locale used to spell the month.
 * @returns The month and year, or the raw key when it cannot be parsed.
 */
function formatLeaderboardMonth(month: string, locale: string): string {
    const year = Number(month.slice(0, 4));
    const monthIndex = Number(month.slice(5, 7)) - 1;
    if (!Number.isInteger(year) || monthIndex < 0 || monthIndex > 11) {
        return month;
    }
    return new Intl.DateTimeFormat(locale, {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, monthIndex, 1)));
}
