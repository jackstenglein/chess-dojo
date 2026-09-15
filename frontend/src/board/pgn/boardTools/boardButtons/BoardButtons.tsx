import { VisibilityIcon } from '@/components/games/edit/UnpublishedGameBanner';
import { UnsavedGameIcon } from '@/components/games/edit/UnsavedGameBanner';
import useGame from '@/context/useGame';
import { useLightMode } from '@/style/useLightMode';
import { Box, Paper, Stack } from '@mui/material';
import { useChess } from '../../PgnBoard';
import { UnderboardApi } from '../underboard/Underboard';
import ControlButtons from './ControlButtons';
import StartButtons from './StartButtons';
import StatusIcon from './StatusIcon';

const BoardButtons = ({
    underboardRef,
}: {
    underboardRef?: React.RefObject<UnderboardApi | null>;
}) => {
    const light = useLightMode();
    const { game, isOwner: isGameOwner, unsaved } = useGame();
    const { chess } = useChess();

    return (
        <Paper
            elevation={3}
            variant={light ? 'outlined' : 'elevation'}
            sx={{
                mt: { xs: 0.5, md: 1 },
                mb: { xs: 0.5, md: 1, xl: 0 },
                gridArea: 'boardButtons',
                boxShadow: 'none',
                visibility: chess ? undefined : 'hidden',
            }}
        >
            <Stack
                direction='row'
                sx={{
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    position: 'relative',
                }}
            >
                <StartButtons />
                <ControlButtons />
                {game && isGameOwner ? (
                    <Stack direction='row'>
                        <VisibilityIcon underboardRef={underboardRef} />
                        <StatusIcon game={game} />
                    </Stack>
                ) : unsaved ? (
                    <UnsavedGameIcon />
                ) : (
                    <Box sx={{ width: '40px' }}></Box>
                )}
            </Stack>
        </Paper>
    );
};

export default BoardButtons;
