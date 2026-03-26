import { useApi } from '@/api/Api';
import { useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { User } from '@/database/user';
import Avatar from '@/profile/Avatar';
import CohortIcon from '@/scoreboard/CohortIcon';
import { ScoreboardRow } from '@/scoreboard/scoreboardData';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import {
    Button,
    Card,
    CardContent,
    CircularProgress,
    Divider,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

/**
 * Type guard to filter the scoreboard API response.
 * Ensures we only rank actual player profiles, not graduation events.
 * @param row - A single data row from the scoreboard API response.
 * @returns True if the row is a valid User profile.
 */
const isUser = (row: ScoreboardRow): row is User => {
    return 'username' in row && 'displayName' in row && 'progress' in row;
};

/**
 * Rounds the user's total dojo score to 2 decimal places.
 * @param user - The user whose score to calculate.
 * @returns The rounded dojo score.
 */
const getScore = (user: User): number => {
    return Math.round((user.totalDojoScore ?? 0) * 100) / 100;
};

/**
 * Gets the user's total training time in minutes.
 * @param user - The user object.
 * @returns Total minutes spent.
 */
const getTime = (user: User): number => {
    if (!user.minutesSpent) return 0;
    return Object.values(user.minutesSpent).reduce((total, mins) => total + mins, 0);
};

/**
 * Formats minutes into a human-readable hours and minutes string.
 * @param minutes - Total minutes to format.
 * @returns Formatted string e.g. "2h 30m".
 */
const formatTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}m`;
};

export function MiniScoreboard({ cohort }: { cohort: string }) {
    const api = useApi();
    const request = useRequest<ScoreboardRow[]>();
    const [metric, setMetric] = useState<'score' | 'time'>('score');

    const { user: currentUser } = useAuth();
    const reset = request.reset;

    useEffect(() => {
        reset();
    }, [cohort, reset]);

    useEffect(() => {
        if (!request.isSent() && cohort) {
            request.onStart();
            api.getScoreboard(cohort)
                .then((data) => request.onSuccess(data))
                .catch((err) => request.onFailure(err));
        }
    }, [cohort, request, api]);

    if (!cohort) {
        return null;
    }

    let allPlayers = (request.data || [])
        .filter(isUser)
        .map((p) => p as User & { isCurrent?: boolean; actualRank?: number });

    if (cohort === currentUser?.dojoCohort) {
        allPlayers = allPlayers.filter((p) => p.username !== currentUser.username);
        allPlayers.push({ ...currentUser, isCurrent: true });
    }

    const sortedPlayers = allPlayers.sort((a, b) => {
        if (metric === 'score') return getScore(b) - getScore(a);
        return getTime(b) - getTime(a);
    });

    const topPlayers = sortedPlayers.slice(0, 5);

    if (cohort === currentUser?.dojoCohort) {
        const actualRank = sortedPlayers.findIndex((p) => p.username === currentUser.username);
        if (actualRank >= 5) {
            topPlayers.push({ ...sortedPlayers[actualRank], actualRank });
        }
    }

    let content;
    if (request.isLoading()) {
        content = (
            <Stack alignItems='center' py={3}>
                <CircularProgress />
            </Stack>
        );
    } else if (request.data === undefined && request.isSent()) {
        content = (
            <Typography variant='body2' color='error' align='center' py={2}>
                Failed to load leaderboard data.
            </Typography>
        );
    } else if (topPlayers.length === 0) {
        content = (
            <Typography variant='body2' color='text.secondary' align='center' py={2}>
                No users currently in this cohort.
            </Typography>
        );
    } else {
        content = (
            <Stack spacing={2}>
                <Stack
                    direction='row'
                    justifyContent='space-between'
                    alignItems='center'
                    sx={{ px: 0.5, mb: -1 }}
                    data-testid='mini-scoreboard-headers'
                >
                    <Typography variant='caption' color='text.secondary' fontWeight='bold'>
                        Name
                    </Typography>
                </Stack>

                {topPlayers.map(
                    (player: User & { isCurrent?: boolean; actualRank?: number }, index) => {
                        const displayScore = getScore(player);
                        const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

                        let rankDisplay: React.ReactNode = `#${index + 1}`;

                        if (player.isCurrent && player.actualRank !== undefined) {
                            rankDisplay = `#${player.actualRank + 1}`;
                        } else if (index < 3) {
                            rankDisplay = (
                                <WorkspacePremiumIcon
                                    sx={{ color: medalColors[index], fontSize: 20 }}
                                />
                            );
                        }

                        return (
                            <Stack key={player.username} spacing={1}>
                                <Stack
                                    direction='row'
                                    alignItems='center'
                                    justifyContent='space-between'
                                >
                                    <Stack direction='row' alignItems='center' spacing={1.5}>
                                        <Typography
                                            variant='body2'
                                            color='text.secondary'
                                            sx={{ width: 20, textAlign: 'center' }}
                                        >
                                            {rankDisplay}
                                        </Typography>
                                        <Avatar
                                            username={player.username}
                                            displayName={player.displayName}
                                            size={32}
                                        />
                                        <Link href={`/profile/${player.username}`}>
                                            <Typography variant='subtitle2'>
                                                {player.displayName}
                                            </Typography>
                                        </Link>
                                    </Stack>
                                    <Typography variant='body2' fontWeight='bold' color='primary'>
                                        {metric === 'score'
                                            ? displayScore
                                            : formatTime(getTime(player))}
                                    </Typography>
                                </Stack>
                            </Stack>
                        );
                    },
                )}
            </Stack>
        );
    }

    return (
        <Stack spacing={2} width={1} mt={4}>
            <Typography variant='h5' fontWeight='bold'>
                Mini Scoreboard
            </Typography>
            <Card variant='outlined' sx={{ width: 1 }}>
                <CardContent>
                    <Stack
                        direction='row'
                        alignItems='center'
                        justifyContent='space-between'
                        mb={2}
                    >
                        <Stack direction='row' alignItems='center' spacing={1.5}>
                            <CohortIcon cohort={cohort} size={32} />
                            <Typography variant='h6' sx={{ mb: 0 }}>
                                {cohort}
                            </Typography>
                        </Stack>
                        <TextField
                            select
                            label='Type'
                            value={metric}
                            onChange={(e) => setMetric(e.target.value as 'score' | 'time')}
                            size='small'
                            sx={{ minWidth: 140 }}
                            data-testid='scoreboard-metric-select'
                        >
                            <MenuItem value='score'>Dojo Score</MenuItem>
                            <MenuItem value='time'>Training Time</MenuItem>
                        </TextField>
                    </Stack>
                    {content}

                    <Divider sx={{ my: 2 }} />

                    <Button
                        component={Link}
                        href={`/scoreboard/${cohort}`}
                        fullWidth
                        variant='text'
                    >
                        View Full Scoreboard
                    </Button>
                </CardContent>
            </Card>
        </Stack>
    );
}
