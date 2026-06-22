import { Link } from '@/components/navigation/Link';
import {
    calculatePlayerStats,
    PlayerStats,
    RoundRobin,
    RoundRobinPlayerStatuses,
} from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import {
    Box,
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
import { BarChart } from '@mui/x-charts';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

type StatsT = (key: string, values?: Record<string, string | number>) => string;

/**
 * Renders the stats for the given Round Robin tournament.
 * @param tournament The tournament to render the stats for.
 */
export function Stats({ tournament }: { tournament: RoundRobin }) {
    const [viewMode, setViewMode] = useState<'count' | 'percentage'>('count');
    const [displayMode, setDisplayMode] = useState<'graph' | 'list'>('graph');
    const t = useTranslations('tournaments.roundRobin.stats');

    return (
        <Stack spacing={3}>
            <Stack>
                <Typography variant='subtitle1'>
                    {t('timeElapsed', { value: calculateElapsedTime(t, tournament.startDate) })}
                </Typography>
                <Typography variant='subtitle1'>
                    {t('timeRemaining', { value: calculateRemainingTime(t, tournament.endDate) })}
                </Typography>
                <Typography variant='subtitle1'>
                    {t('gamesCompleted', {
                        completed: countCompletedGames(tournament),
                        total: countTotalGames(tournament),
                    })}
                </Typography>
            </Stack>

            <Stack direction='row' gap={2}>
                <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(_e, newViewMode: 'count' | 'percentage' | null) =>
                        newViewMode && setViewMode(newViewMode)
                    }
                    size='small'
                    aria-label={t('viewModeAriaLabel')}
                >
                    <ToggleButton value='count'>{t('viewCount')}</ToggleButton>
                    <ToggleButton value='percentage'>{t('viewPercentage')}</ToggleButton>
                </ToggleButtonGroup>

                <ToggleButtonGroup
                    value={displayMode}
                    exclusive
                    size='small'
                    onChange={(_e, newDisplayMode: 'graph' | 'list' | null) =>
                        newDisplayMode && setDisplayMode(newDisplayMode)
                    }
                    aria-label={t('displayModeAriaLabel')}
                >
                    <ToggleButton value='graph'>{t('displayGraph')}</ToggleButton>
                    <ToggleButton value='list'>{t('displayList')}</ToggleButton>
                </ToggleButtonGroup>
            </Stack>

            <Box>
                {displayMode === 'graph' ? (
                    <GraphView tournament={tournament} viewMode={viewMode} />
                ) : (
                    <ListView tournament={tournament} viewMode={viewMode} />
                )}
            </Box>
        </Stack>
    );
}

/**
 * Returns a string representation of the time elapsed since the given date.
 * @param t Translation function.
 * @param start The date to start from.
 */
function calculateElapsedTime(t: StatsT, start: string) {
    const elapsed = new Date().getTime() - new Date(start).getTime();
    return formatTime(t, elapsed);
}

/**
 * Returns a string representation of the time remaining until the given date.
 * @param t Translation function.
 * @param end The date to end at.
 */
function calculateRemainingTime(t: StatsT, end: string) {
    return formatTime(t, new Date(end).getTime() - new Date().getTime());
}

/**
 * Returns a string representation of the given number of milliseconds.
 * If the value is greater than an hour, only hours and days are included in the output.
 * @param t Translation function.
 * @param milliseconds The number of milliseconds to convert.
 * @returns A string representation of milliseconds.
 */
function formatTime(t: StatsT, milliseconds: number): string {
    let value = '';

    if (milliseconds > 8.64e7) {
        const days = Math.floor(milliseconds / 8.64e7);
        milliseconds = milliseconds % 8.64e7;
        value += t('daysUnit', { days }) + ', ';
    }

    if (milliseconds > 3.6e6) {
        const hours = Math.floor(milliseconds / 3.6e6);
        milliseconds = milliseconds % 3.6e6;
        value += t('hoursUnit', { hours });
    }

    if (value.length === 0 && milliseconds > 60000) {
        const minutes = Math.floor(milliseconds / 60000);
        value += t('minutesUnit', { minutes });
    }

    if (value.length === 0) {
        return t('lessThanMinute');
    }

    return value.replace(/, $/, '');
}

/**
 * Returns the number of games completed in the tournament. Games
 * where a player has withdrawn are not counted.
 * @param tournament The tournament to count the completed games for.
 */
export function countCompletedGames(tournament: RoundRobin): number {
    let count = 0;

    for (const round of tournament.pairings) {
        for (const pairing of round) {
            if (
                pairing.result &&
                pairing.white &&
                pairing.black &&
                tournament.players[pairing.white].status !== RoundRobinPlayerStatuses.WITHDRAWN &&
                tournament.players[pairing.black].status !== RoundRobinPlayerStatuses.WITHDRAWN
            ) {
                count++;
            }
        }
    }

    return count;
}

/**
 * Returns the total number of games in the tournament. Games where a player
 * has withdrawn are not counted.
 * @param tournament The tournament to count the total number of games for.
 */
export function countTotalGames(tournament: RoundRobin): number {
    let count = 0;

    for (const round of tournament.pairings) {
        for (const pairing of round) {
            if (
                pairing.white &&
                pairing.black &&
                tournament.players[pairing.white].status !== RoundRobinPlayerStatuses.WITHDRAWN &&
                tournament.players[pairing.black].status !== RoundRobinPlayerStatuses.WITHDRAWN
            ) {
                count++;
            }
        }
    }

    return count;
}

/**
 * Returns the number of active players in the tournament.
 * @param tournament The tournament to count the active players for.
 */
export function countActivePlayers(tournament: RoundRobin): number {
    return Object.values(tournament.players).filter(
        (p) => p.status === RoundRobinPlayerStatuses.ACTIVE,
    ).length;
}

/**
 * Renders the player's W/D/L counts as a bar graph.
 * @param tournament The tournament to display.
 * @param viewMode Whether to display counts or percentages.
 */
function GraphView({
    tournament,
    viewMode,
}: {
    tournament: RoundRobin;
    viewMode: 'count' | 'percentage';
}) {
    const t = useTranslations('tournaments.roundRobin.stats');
    const playerStats = calculatePlayerStatsList(tournament);
    const playerNames = playerStats.map((stat) => stat.player);

    const wins =
        viewMode === 'count'
            ? playerStats.map((stat) => stat.wins)
            : playerStats.map((stat) =>
                  stat.played === 0 ? 0 : +((stat.wins / stat.played) * 100).toFixed(2),
              );
    const losses =
        viewMode === 'count'
            ? playerStats.map((stat) => stat.losses)
            : playerStats.map((stat) =>
                  stat.played === 0 ? 0 : +((stat.losses / stat.played) * 100).toFixed(2),
              );
    const draws =
        viewMode === 'count'
            ? playerStats.map((stat) => stat.draws)
            : playerStats.map((stat) =>
                  stat.played === 0 ? 0 : +((stat.draws / stat.played) * 100).toFixed(2),
              );

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: 400,
            }}
        >
            <BarChart
                xAxis={[{ data: playerNames, scaleType: 'band' }]}
                series={[
                    {
                        data: wins,
                        label: viewMode === 'count' ? t('seriesWins') : t('seriesWinsPct'),
                    },
                    {
                        data: draws,
                        label: viewMode === 'count' ? t('seriesDraws') : t('seriesDrawsPct'),
                    },
                    {
                        data: losses,
                        label: viewMode === 'count' ? t('seriesLosses') : t('seriesLossesPct'),
                    },
                ]}
                height={400}
            />
        </Box>
    );
}

/**
 * Renders the players' W/D/L counts as a table.
 * @param tournament The tournament to display.
 * @param viewMode Whether to display counts or percentages.
 */
function ListView({
    tournament,
    viewMode,
}: {
    tournament: RoundRobin;
    viewMode: 'count' | 'percentage';
}) {
    const t = useTranslations('tournaments.roundRobin.stats');
    const playerStats = calculatePlayerStatsList(tournament);

    return (
        <TableContainer>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>
                            <Typography fontWeight='bold'>{t('columnPlayer')}</Typography>
                        </TableCell>
                        <TableCell align='center'>
                            <Typography fontWeight='bold'>
                                {viewMode === 'count' ? t('columnTotalScore') : t('columnTotalPct')}
                            </Typography>
                        </TableCell>
                        <TableCell align='center'>
                            <Typography fontWeight='bold'>
                                {viewMode === 'count' ? t('columnWins') : t('columnWinsPct')}
                            </Typography>
                        </TableCell>
                        <TableCell align='center'>
                            <Typography fontWeight='bold'>
                                {viewMode === 'count' ? t('columnDraws') : t('columnDrawsPct')}
                            </Typography>
                        </TableCell>
                        <TableCell align='center'>
                            <Typography fontWeight='bold'>
                                {viewMode === 'count' ? t('columnLosses') : t('columnLossesPct')}
                            </Typography>
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {playerStats.map((stat, idx) => (
                        <TableRow key={idx}>
                            <TableCell>
                                <Typography>
                                    <Link href={`/profile/${stat.username}`}>{stat.player}</Link>
                                </Typography>
                            </TableCell>
                            <TableCell align='center'>
                                <Typography>
                                    {viewMode === 'count'
                                        ? stat.score
                                        : stat.played === 0
                                          ? 0
                                          : ((stat.score / stat.played) * 100).toFixed(2)}
                                </Typography>
                            </TableCell>
                            <TableCell align='center'>
                                <Typography>
                                    {viewMode === 'count'
                                        ? stat.wins
                                        : stat.played === 0
                                          ? 0
                                          : ((stat.wins / stat.played) * 100).toFixed(2)}
                                </Typography>
                            </TableCell>
                            <TableCell align='center'>
                                <Typography>
                                    {viewMode === 'count'
                                        ? stat.draws
                                        : stat.played === 0
                                          ? 0
                                          : ((stat.draws / stat.played) * 100).toFixed(2)}
                                </Typography>
                            </TableCell>
                            <TableCell align='center'>
                                <Typography>
                                    {viewMode === 'count'
                                        ? stat.losses
                                        : stat.played === 0
                                          ? 0
                                          : ((stat.losses / stat.played) * 100).toFixed(2)}
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

/**
 * Calculates the W/D/L counts for the given tournament. Only active players
 * are included.
 * @param tournament The tournament to calculate the counts for.
 * @returns A list of W/D/L counts for each player.
 */
function calculatePlayerStatsList(tournament: RoundRobin) {
    const results = calculatePlayerStats(tournament);

    const resultList: (PlayerStats & {
        username: string;
        player: string;
    })[] = [];

    for (const username of tournament.playerOrder) {
        if (tournament.players[username].status === RoundRobinPlayerStatuses.WITHDRAWN) {
            continue;
        }

        resultList.push({
            username,
            player: tournament.players[username].displayName,
            ...(results[username] || {
                score: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                played: 0,
            }),
        });
    }

    resultList.sort((lhs, rhs) => rhs.score - lhs.score || rhs.tiebreakScore - lhs.tiebreakScore);
    return resultList;
}
