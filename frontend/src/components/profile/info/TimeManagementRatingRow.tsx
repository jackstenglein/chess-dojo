import { RabbitIcon } from '@/style/RabbitIcon';
import { SlothIcon } from '@/style/SlothIcon';
import {
    MIN_GAMES_FOR_ELO,
    TimeManagementRating,
} from '@jackstenglein/chess-dojo-common/src/ratings/timeManagement';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { Grid, Stack, Tooltip, Typography } from '@mui/material';

function gameCountLabel(numGames: number): string {
    return `(${numGames} ${numGames === 1 ? 'game' : 'games'})`;
}

const fastTooltip = 'You tend to play faster than the ideal clock curve on average.';
const slowTooltip = 'You tend to play slower than the ideal clock curve on average.';

function TimeManagementDirectionIcon({ area }: { area?: number }) {
    if (!area) {
        return null;
    }

    if (area > 0) {
        return (
            <Tooltip title={fastTooltip}>
                <span>
                    <RabbitIcon
                        data-testid='time-management-fast-icon'
                        sx={{ fontSize: 17, color: 'text.secondary' }}
                    />
                </span>
            </Tooltip>
        );
    }

    return (
        <Tooltip title={slowTooltip}>
            <span>
                <SlothIcon
                    data-testid='time-management-slow-icon'
                    sx={{ fontSize: 17, color: 'text.secondary' }}
                />
            </span>
        </Tooltip>
    );
}

export function TimeManagementRatingRow({
    timeManagementRating,
}: {
    timeManagementRating: TimeManagementRating;
}) {
    const numGames = timeManagementRating.numGames ?? 0;
    const provisional = numGames < MIN_GAMES_FOR_ELO;

    return (
        <Grid size={12}>
            <Tooltip title='Time Management Rating is calculated from the classical games in your My Games folder (and subfolders).'>
                <Stack direction='row' alignItems='center' gap={0.5}>
                    <AccessTimeIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                    <Typography variant='body2' color='text.secondary' sx={{ fontWeight: 'bold' }}>
                        Time Management
                    </Typography>
                    <Stack direction='row' alignItems='center' gap={0.5} sx={{ ml: 'auto' }}>
                        <TimeManagementDirectionIcon area={timeManagementRating.area} />
                        <Typography
                            variant='body2'
                            color='text.secondary'
                            sx={{ fontWeight: 'bold' }}
                        >
                            {timeManagementRating.currentRating}
                            {provisional && '?'}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                            {gameCountLabel(numGames)}
                        </Typography>
                    </Stack>
                </Stack>
            </Tooltip>
        </Grid>
    );
}
