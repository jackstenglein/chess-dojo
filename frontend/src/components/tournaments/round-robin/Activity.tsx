import { Link } from '@/components/navigation/Link';
import {
    RoundRobin,
    RoundRobinPlayerStatuses,
} from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import { CalendarMonth } from '@mui/icons-material';
import {
    Box,
    Card,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { countTotalGames } from './Stats';

export interface GameActivity {
    white: string;
    black: string;
    result: string;
    url: string;
    round: number;
    submittedAt: string;
    date: Date | null;
    active: boolean;
}

/**
 * Returns the completed games in the tournament ordered by submission date.
 * Games without submission timestamps are included and sorted after dated games.
 * @param tournament The tournament to collect activity for.
 */
export function getActivities(tournament: RoundRobin): GameActivity[] {
    const activities: GameActivity[] = [];

    for (let round = 0; round < tournament.pairings.length; round++) {
        for (const p of tournament.pairings[round]) {
            if (p.url && p.white && p.black && p.result) {
                activities.push({
                    white: p.white,
                    black: p.black,
                    result: p.result,
                    url: p.url,
                    round: round + 1,
                    submittedAt: p.submittedAt ?? '',
                    date: p.submittedAt ? new Date(p.submittedAt) : null,
                    active:
                        tournament.players[p.white].status !== RoundRobinPlayerStatuses.WITHDRAWN &&
                        tournament.players[p.black].status !== RoundRobinPlayerStatuses.WITHDRAWN,
                });
            }
        }
    }

    activities.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.getTime() - a.date.getTime();
    });

    return activities;
}

export interface ActivitySummary {
    activities: GameActivity[];
    mostRecentDate: Date | null;
    daysSinceLastGame: number | null;
    totalPairings: number;
    completedGames: number;
    completionRate: number;
}

/**
 * Computes the rendered summary for the activity view.
 * @param tournament The tournament to summarize.
 * @param now The current time used for relative date calculations.
 */
export function getActivitySummary(
    tournament: RoundRobin,
    now: Date = new Date(),
): ActivitySummary {
    const activities = getActivities(tournament);
    const mostRecentDate = activities.find((a) => a.date)?.date ?? null;
    const daysSinceLastGame = mostRecentDate
        ? Math.floor((now.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const totalPairings = countTotalGames(tournament);
    const completedGames = activities.filter((a) => a.active).length;
    const completionRate =
        totalPairings > 0 ? Math.round((completedGames / totalPairings) * 100) : 0;

    return {
        activities,
        mostRecentDate,
        daysSinceLastGame,
        totalPairings,
        completedGames,
        completionRate,
    };
}

/**
 * Renders an activity view of games played in the Round Robin tournament.
 * @param tournament The tournament to render the activities list for.
 */
export function Activity({ tournament }: { tournament: RoundRobin }) {
    const now = new Date();
    const {
        activities,
        mostRecentDate,
        daysSinceLastGame,
        totalPairings,
        completedGames,
        completionRate,
    } = getActivitySummary(tournament, now);

    if (activities.length === 0) {
        return (
            <Stack alignItems='center' spacing={2} py={4}>
                <CalendarMonth sx={{ fontSize: 60, color: 'text.secondary' }} />
                <Typography textAlign='center' color='text.secondary'>
                    No games submitted yet
                </Typography>
            </Stack>
        );
    }

    return (
        <Stack spacing={3}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Card sx={{ flex: 1, p: 2 }}>
                    <Typography variant='body2' color='text.secondary'>
                        Games Completed
                    </Typography>
                    <Typography variant='h4'>
                        {completedGames} / {totalPairings}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                        {completionRate}% complete
                    </Typography>
                </Card>

                {mostRecentDate && (
                    <Card sx={{ flex: 1, p: 2 }}>
                        <Typography variant='body2' color='text.secondary'>
                            Last Game Submitted
                        </Typography>
                        <Typography variant='h4'>
                            {daysSinceLastGame === 0
                                ? 'Today'
                                : daysSinceLastGame === 1
                                  ? '1 day ago'
                                  : `${daysSinceLastGame} days ago`}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                            {mostRecentDate.toLocaleDateString()}
                        </Typography>
                    </Card>
                )}
            </Stack>

            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                <Typography fontWeight='bold'>Date</Typography>
                            </TableCell>
                            <TableCell align='center'>
                                <Typography fontWeight='bold'>Round</Typography>
                            </TableCell>
                            <TableCell>
                                <Typography fontWeight='bold'>White</Typography>
                            </TableCell>
                            <TableCell>
                                <Typography fontWeight='bold'>Black</Typography>
                            </TableCell>
                            <TableCell align='center'>
                                <Typography fontWeight='bold'>Result</Typography>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {activities.map((activity, index) => {
                            const prevDateStr = activities[index - 1]?.date?.toDateString() ?? null;
                            const curDateStr = activity.date?.toDateString() ?? null;
                            const showDateHeader = index === 0 || prevDateStr !== curDateStr;

                            const isWithinWeek = activity.date
                                ? (now.getTime() - activity.date.getTime()) /
                                      (1000 * 60 * 60 * 24) <=
                                  7
                                : false;

                            return (
                                <TableRow
                                    key={[
                                        activity.round,
                                        activity.white,
                                        activity.black,
                                        activity.url,
                                        activity.submittedAt || 'no-date',
                                    ].join('-')}
                                    sx={{
                                        backgroundColor: isWithinWeek ? 'action.hover' : 'inherit',
                                    }}
                                >
                                    <TableCell>
                                        <Stack>
                                            {showDateHeader && activity.date && (
                                                <Typography fontWeight='bold'>
                                                    {activity.date.toLocaleDateString(undefined, {
                                                        weekday: 'short',
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                </Typography>
                                            )}
                                            {activity.date && (
                                                <Typography variant='body2' color='text.secondary'>
                                                    {activity.date.toLocaleTimeString(undefined, {
                                                        hour: 'numeric',
                                                        minute: '2-digit',
                                                    })}
                                                </Typography>
                                            )}
                                        </Stack>
                                    </TableCell>
                                    <TableCell align='center'>
                                        <Typography>{activity.round}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Link href={`/profile/${activity.white}`}>
                                            {tournament.players[activity.white].displayName}
                                        </Link>
                                        {tournament.players[activity.white].status ===
                                            RoundRobinPlayerStatuses.WITHDRAWN && (
                                            <Typography
                                                variant='caption'
                                                color='text.secondary'
                                                sx={{ ml: 1 }}
                                            >
                                                (Withdrawn)
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Link href={`/profile/${activity.black}`}>
                                            {tournament.players[activity.black].displayName}
                                        </Link>
                                        {tournament.players[activity.black].status ===
                                            RoundRobinPlayerStatuses.WITHDRAWN && (
                                            <Typography
                                                variant='caption'
                                                color='text.secondary'
                                                sx={{ ml: 1 }}
                                            >
                                                (Withdrawn)
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell align='center'>
                                        <Link href={activity.url}>{activity.result}</Link>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            {daysSinceLastGame !== null && daysSinceLastGame > 14 && completionRate < 100 && (
                <Box
                    sx={{
                        p: 2,
                        backgroundColor: 'warning.light',
                        borderRadius: 1,
                        textAlign: 'center',
                    }}
                >
                    <Typography variant='body2' fontWeight='bold'>
                        ⚠️ Tournament may have stalled - No games submitted in {daysSinceLastGame}{' '}
                        days
                    </Typography>
                </Box>
            )}
        </Stack>
    );
}
