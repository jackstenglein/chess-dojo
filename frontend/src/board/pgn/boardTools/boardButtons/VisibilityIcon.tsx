import { Game } from '@/database/game';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';
import { useTranslations } from 'next-intl';
import { UnderboardApi } from '../underboard/Underboard';
import { DefaultUnderboardTab } from '../underboard/underboardTabs';

export const VisibilityIcon = ({
    game,
    underboardRef,
}: {
    game: Game;
    underboardRef: React.RefObject<UnderboardApi | null>;
}) => {
    const t = useTranslations('analysisBoard.boardButtons');
    return (
        <Tooltip title={game.unlisted ? t('unlistedGameTooltip') : t('publicGameTooltip')}>
            <IconButton
                onClick={() => underboardRef.current?.switchTab(DefaultUnderboardTab.Settings)}
            >
                {game.unlisted ? (
                    <VisibilityOff data-testid='unlisted-icon' color='error' />
                ) : (
                    <Visibility data-testid='public-icon' sx={{ color: 'text.secondary' }} />
                )}
            </IconButton>
        </Tooltip>
    );
};
