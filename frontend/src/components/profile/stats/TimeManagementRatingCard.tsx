import { RatingHistory, User } from '@/database/user';
import { MIN_GAMES_FOR_ELO } from '@jackstenglein/chess-dojo-common/src/ratings/timeManagement';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import {
    TimeManagementDirectionIcon,
    TimeManagementDirectionTooltip,
} from '../info/TimeManagementRatingRow';
import { RatingHistoryChart } from './RatingHistoryChart';

/**
 * Returns recorded daily ratings within the last year, without inventing missing history.
 * @param history The user's saved aggregate time management history.
 * @param now The end of the displayed year.
 * @returns Valid, chronologically sorted chart points.
 */
export function getTimeManagementChartData(history: RatingHistory[] = [], now = new Date()) {
    const start = new Date(now);
    start.setUTCFullYear(start.getUTCFullYear() - 1);
    start.setUTCHours(0, 0, 0, 0);

    return history
        .map((point) => ({ date: new Date(point.date), rating: point.rating }))
        .filter(
            (point) =>
                Number.isFinite(point.rating) &&
                point.rating >= 0 &&
                point.date >= start &&
                point.date <= now,
        )
        .sort((lhs, rhs) => lhs.date.getTime() - rhs.date.getTime());
}

/**
 * Shows aggregate time management progress on the profile's Ratings tab.
 * @param user The profile being viewed.
 */
export function TimeManagementRatingCard({ user }: { user: User }) {
    const t = useTranslations('profile');
    const rating = user.timeManagementRating;
    if (!rating || rating.numGames <= 0) {
        return null;
    }

    const title = t('info.timeManagement');
    const points = getTimeManagementChartData(user.timeManagementRatingHistory);

    return (
        <Card variant='outlined'>
            <CardContent>
                <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
                    <AccessTimeIcon color='primary' fontSize='large' />
                    <Stack>
                        <Typography variant='h6'>{title}</Typography>
                        <Typography variant='body2' color='text.secondary'>
                            {t('info.pastYear')}
                        </Typography>
                    </Stack>
                </Stack>
                <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
                    <Typography variant='subtitle2' color='text.secondary'>
                        {t('stats.ratingCard.current')}
                    </Typography>

                    <TimeManagementDirectionTooltip area={rating.area}>
                        <Stack
                            direction='row'
                            sx={{
                                alignItems: 'center',
                                gap: 0.5,
                                position: 'relative',
                                left: '-8px',
                            }}
                        >
                            <TimeManagementDirectionIcon
                                area={rating.area}
                                sx={{ fontSize: '2.25rem' }}
                            />
                            <Typography
                                sx={{ fontSize: '2.25rem', lineHeight: 1, fontWeight: 'bold' }}
                            >
                                {rating.currentRating}
                                {rating.numGames < MIN_GAMES_FOR_ELO && '?'}
                            </Typography>
                        </Stack>
                    </TimeManagementDirectionTooltip>
                    <Typography variant='body2' color='text.secondary'>
                        {t('directories.gamesCount', { count: rating.numGames })}
                    </Typography>
                </Stack>
                {points.length > 0 ? (
                    <Box role='img' aria-label={title} sx={{ height: 300, mt: 2, minWidth: 0 }}>
                        <RatingHistoryChart
                            data={points}
                            label={t('stats.ratingCard.ratingChartLabel')}
                        />
                    </Box>
                ) : (
                    <Typography color='text.secondary' sx={{ mt: 2, textAlign: 'center' }}>
                        {t('activity.noData')}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
}
