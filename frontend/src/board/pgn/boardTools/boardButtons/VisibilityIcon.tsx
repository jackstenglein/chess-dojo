import { Game } from '@/database/game';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';
import { UnderboardApi } from '../underboard/Underboard';
import { DefaultUnderboardTab } from '../underboard/underboardTabs';

export const VisibilityIcon = ({
    game,
    underboardRef,
}: {
    game: Game;
    underboardRef: React.RefObject<UnderboardApi | null>;
}) => {
    return (
        <Tooltip
            title={
                game.unlisted
                    ? 'This game is unlisted. Other users can only find it if they have the URL. You can update this in the settings.'
                    : 'This game is public. Other users can find it on the games tab and on your profile. You can update this in the settings.'
            }
        >
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
