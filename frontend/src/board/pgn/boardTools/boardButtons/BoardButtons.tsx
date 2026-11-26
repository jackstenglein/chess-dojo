import { VisibilityIcon } from '@/components/games/edit/UnpublishedGameBanner';
import { UnsavedGameIcon } from '@/components/games/edit/UnsavedGameBanner';
import useGame from '@/context/useGame';
import { useLightMode } from '@/style/useLightMode';
import UnfoldLess from '@mui/icons-material/UnfoldLess';
import ViewSidebarOutlined from '@mui/icons-material/ViewSidebarOutlined';
import { Box, IconButton, Paper, Stack, Tooltip } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useChess } from '../../PgnBoard';
import { UnderboardApi } from '../underboard/Underboard';
import ControlButtons from './ControlButtons';
import StartButtons from './StartButtons';
import StatusIcon from './StatusIcon';

export interface PanelControls {
    left?: { visible: boolean; onToggle: () => void };
    right?: { visible: boolean; onToggle: () => void };
}

const BoardButtons = ({
    underboardRef,
    panelControls,
    boardWidth = Infinity,
    onHideBars,
    hideBarsRef,
}: {
    underboardRef?: React.RefObject<UnderboardApi | null>;
    panelControls?: PanelControls;
    boardWidth?: number;
    onHideBars?: () => void;
    hideBarsRef?: React.Ref<HTMLButtonElement>;
}) => {
    const t = useTranslations('analysisBoard.boardButtons');
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
                    ...(panelControls && {
                        display: 'grid',
                        gridTemplateColumns:
                            boardWidth < 480 ? '1fr 1fr' : 'minmax(0, 1fr) auto minmax(0, 1fr)',
                        gridTemplateAreas:
                            boardWidth < 480 ? '"start end" "moves moves"' : '"start moves end"',
                    }),
                }}
            >
                <Stack direction='row' sx={{ gridArea: 'start', alignItems: 'center' }}>
                    <PanelToggle side='left' panelControls={panelControls} />
                    <StartButtons />
                    {onHideBars && (
                        <Tooltip title={t('hideBoardBars')}>
                            <IconButton
                                ref={hideBarsRef}
                                size='small'
                                aria-label={t('hideBoardBars')}
                                onClick={onHideBars}
                            >
                                <UnfoldLess sx={{ color: 'text.secondary' }} />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
                <Box sx={{ gridArea: 'moves', display: 'flex', justifyContent: 'center' }}>
                    <ControlButtons />
                </Box>
                <Stack
                    direction='row'
                    sx={{ gridArea: 'end', alignItems: 'center', justifyContent: 'flex-end' }}
                >
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
                    <PanelToggle side='right' panelControls={panelControls} />
                </Stack>
            </Stack>
        </Paper>
    );
};

export default BoardButtons;

export function PanelToggle({
    panelControls,
    side,
    size,
}: {
    panelControls?: PanelControls;
    side: 'left' | 'right';
    size?: 'small' | 'medium' | 'large' | 'inherit';
}) {
    const t = useTranslations('analysisBoard.boardButtons');
    const control = panelControls?.[side];
    if (!control) return null;

    const label =
        side === 'left'
            ? t(control.visible ? 'hideLeftPanel' : 'showLeftPanel')
            : t(control.visible ? 'hideRightPanel' : 'showRightPanel');
    return (
        <Tooltip title={label}>
            <IconButton
                size='small'
                aria-label={label}
                aria-expanded={control.visible}
                onClick={control.onToggle}
            >
                <ViewSidebarOutlined
                    fontSize={size}
                    sx={{
                        color: 'text.secondary',
                        transform: side === 'left' ? 'scaleX(-1)' : undefined,
                    }}
                />
            </IconButton>
        </Tooltip>
    );
}
