import { RabbitIcon } from '@/style/RabbitIcon';
import { TurtleIcon } from '@/style/TurtleIcon';
import {
    MIN_GAMES_FOR_ELO,
    TimeManagementRating,
} from '@jackstenglein/chess-dojo-common/src/ratings/timeManagement';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { Grid, Stack, SxProps, Theme, Tooltip, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { JSX } from 'react';

function gameCountLabel(numGames: number): string {
    return `(${numGames} ${numGames === 1 ? 'game' : 'games'})`;
}

const fastTooltip = 'You tend to play faster than the ideal clock curve on average.';
const slowTooltip = 'You tend to play slower than the ideal clock curve on average.';

export function TimeManagementDirectionTooltip({
    area,
    children,
}: {
    area?: number;
    children: JSX.Element;
}) {
    return <Tooltip title={!area ? '' : area > 0 ? fastTooltip : slowTooltip}>{children}</Tooltip>;
}

export function TimeManagementDirectionIcon({
    area,
    sx = [],
}: {
    area?: number;
    sx?: SxProps<Theme>;
}) {
    const iconSx = [{ fontSize: 17, color: 'text.secondary', mt: '3px' }, sx].flat();

    if (!area) {
        return null;
    }

    if (area > 0) {
        return (
            <span>
                <RabbitIcon data-testid='time-management-fast-icon' sx={iconSx} />
            </span>
        );
    }

    return (
        <span>
            <TurtleIcon data-testid='time-management-slow-icon' sx={iconSx} />
        </span>
    );
}

export function TimeManagementRatingRow({
    timeManagementRating,
}: {
    timeManagementRating: TimeManagementRating;
}) {
    const t = useTranslations('profile.info');
    const numGames = timeManagementRating.numGames ?? 0;
    const provisional = numGames < MIN_GAMES_FOR_ELO;

    return (
        <Grid size={12}>
            <Stack
                direction='row'
                sx={{
                    alignItems: 'center',
                    gap: 0.5,
                }}
            >
                <AccessTimeIcon sx={{ fontSize: 15, color: 'text.secondary' }} />

                <Tooltip title='Time Management Rating is calculated from the classical games in your My Games folder (and subfolders).'>
                    <Typography
                        variant='caption'
                        noWrap
                        sx={{
                            color: 'text.secondary',
                            fontWeight: 600,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            lineHeight: 1,
                            paddingTop: '3px',
                        }}
                    >
                        {t('timeManagement')}
                    </Typography>
                </Tooltip>

                <TimeManagementDirectionTooltip area={timeManagementRating.area}>
                    <Stack
                        direction='row'
                        sx={{
                            alignItems: 'center',
                            gap: 0.5,
                            ml: 'auto',
                        }}
                    >
                        <TimeManagementDirectionIcon area={timeManagementRating.area} />
                        <Typography
                            variant='body2'
                            sx={{
                                color: 'text.secondary',
                                fontWeight: 'bold',
                            }}
                        >
                            {timeManagementRating.currentRating}
                            {provisional && '?'}
                        </Typography>
                        <Typography
                            variant='body2'
                            sx={{
                                color: 'text.secondary',
                            }}
                        >
                            {gameCountLabel(numGames)}
                        </Typography>
                    </Stack>
                </TimeManagementDirectionTooltip>
            </Stack>
        </Grid>
    );
}
