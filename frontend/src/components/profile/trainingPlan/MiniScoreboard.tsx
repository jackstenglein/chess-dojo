import { useApi } from '@/api/Api';
import { useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { User } from '@/database/user';
import Avatar from '@/profile/Avatar';
import CohortIcon from '@/scoreboard/CohortIcon';
import { ScoreboardRow } from '@/scoreboard/scoreboardData';
import { ArrowForward } from '@mui/icons-material';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import {
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Divider,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
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
    const t = useTranslations('profile.trainingPlan.miniScoreboard');
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
            <Stack
                sx={{
                    alignItems: 'center',
                    py: 3,
                }}
            >
                <CircularProgress />
            </Stack>
        );
    } else if (request.data === undefined && request.isSent()) {
        content = (
            <Typography
                variant='body2'
                color='error'
                align='center'
                sx={{
                    py: 2,
                }}
            >
                {t('loadError')}
            </Typography>
        );
    } else if (topPlayers.length === 0) {
        content = (
            <Typography
                variant='body2'
                align='center'
                sx={{
                    color: 'text.secondary',
                    py: 2,
                }}
            >
                {t('empty')}
            </Typography>
        );
    } else {
        content = (
            <Stack spacing={0.5} data-testid='mini-scoreboard-rows'>
                {topPlayers.map(
                    (player: User & { isCurrent?: boolean; actualRank?: number }, index) => {
                        const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
                        const rank =
                            player.isCurrent && player.actualRank !== undefined
                                ? player.actualRank
                                : index;

                        return (
                            <Stack
                                key={player.username}
                                direction='row'
                                sx={{
                                    alignItems: 'center',
                                    gap: 1.5,
                                    px: 1,
                                    py: 0.75,
                                    borderRadius: 2,
                                    // The viewer's own row stands out a little.
                                    backgroundColor: player.isCurrent
                                        ? 'action.selected'
                                        : 'transparent',
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 24,
                                        display: 'flex',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}
                                >
                                    {rank < 3 ? (
                                        <WorkspacePremiumIcon
                                            sx={{ color: medalColors[rank], fontSize: 20 }}
                                        />
                                    ) : (
                                        <Typography
                                            variant='body2'
                                            sx={{
                                                color: 'text.secondary',
                                                fontVariantNumeric: 'tabular-nums',
                                            }}
                                        >
                                            {rank + 1}
                                        </Typography>
                                    )}
                                </Box>
                                <Avatar
                                    username={player.username}
                                    displayName={player.displayName}
                                    size={28}
                                />
                                <Typography
                                    variant='body2'
                                    noWrap
                                    sx={{ fontWeight: 600, flexGrow: 1, minWidth: 0 }}
                                >
                                    <Link
                                        href={`/profile/${player.username}`}
                                        sx={{ color: 'inherit' }}
                                    >
                                        {player.displayName}
                                    </Link>
                                </Typography>
                                <Typography
                                    variant='body2'
                                    sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                                >
                                    {metric === 'score'
                                        ? getScore(player)
                                        : formatTime(getTime(player))}
                                </Typography>
                            </Stack>
                        );
                    },
                )}
            </Stack>
        );
    }

    return (
        <Stack spacing={2} sx={{ width: 1, mt: 4 }}>
            <Typography variant='h5' sx={{ fontWeight: 'bold' }}>
                {t('heading')}
            </Typography>
            <Card
                variant='outlined'
                sx={{
                    width: 1,
                    borderRadius: 3,
                    backgroundColor: 'background.default',
                    backgroundImage: 'none',
                }}
            >
                <CardContent sx={{ '&:last-child': { pb: 1.5 } }}>
                    <Stack
                        direction='row'
                        sx={{
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 1.5,
                            mb: 1.5,
                        }}
                    >
                        <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
                            <CohortIcon cohort={cohort} size={24} />
                            <Typography sx={{ fontWeight: 600 }}>{cohort}</Typography>
                        </Stack>
                        <ToggleButtonGroup
                            exclusive
                            size='small'
                            value={metric}
                            onChange={(_, value: 'score' | 'time' | null) =>
                                value && setMetric(value)
                            }
                            aria-label={t('type')}
                            data-testid='scoreboard-metric-select'
                            sx={{
                                '& .MuiToggleButton-root': {
                                    textTransform: 'none',
                                    px: 1.5,
                                    py: 0.25,
                                    color: 'text.secondary',
                                    borderColor: 'divider',
                                },
                                '& .Mui-selected': { color: 'text.primary !important' },
                            }}
                        >
                            <ToggleButton value='score'>{t('dojoScore')}</ToggleButton>
                            <ToggleButton value='time'>{t('trainingTime')}</ToggleButton>
                        </ToggleButtonGroup>
                    </Stack>

                    {content}

                    <Divider sx={{ mt: 1.5, mb: 1 }} />

                    <Button
                        component={Link}
                        href={`/scoreboard/${cohort}`}
                        fullWidth
                        variant='text'
                        endIcon={<ArrowForward fontSize='small' />}
                        sx={{ textTransform: 'none' }}
                    >
                        {t('viewFullScoreboard')}
                    </Button>
                </CardContent>
            </Card>
        </Stack>
    );
}
