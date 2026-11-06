import { Color } from '@lichess-org/chessground/types';
import UnfoldMore from '@mui/icons-material/UnfoldMore';
import { Box, IconButton, Stack, Tooltip } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { ResizeCallbackData } from 'react-resizable';
import Board, { onInitializeFunc } from '../Board';
import { useChess } from './PgnBoard';
import PlayerHeader from './PlayerHeader';
import BoardButtons, { PanelControls, PanelToggle } from './boardTools/boardButtons/BoardButtons';
import { FlipBoardButton } from './boardTools/boardButtons/ControlButtons';
import NagControls from './boardTools/underboard/NagControls';
import { UnderboardApi } from './boardTools/underboard/Underboard';
import { ResizableData, RESTORE_GUTTER_WIDTH } from './resize';

interface ResizableBoardAreaProps {
    showNagControls?: boolean;
    onHeightChange?: (height: number) => void;
    barsHidden?: boolean;
    onToggleBars?: () => void;
    panelControls?: PanelControls;
    resizeData: ResizableData;
    onResize: (width: number, height: number) => void;
    hideResize?: boolean;
    pgn?: string;
    fen?: string;
    showPlayerHeaders?: boolean;
    hideBoardButtons?: boolean;
    startOrientation?: Color;
    onInitialize: onInitializeFunc;
    underboardRef: React.RefObject<UnderboardApi | null>;
}

const ResizableBoardArea: React.FC<ResizableBoardAreaProps> = ({
    showNagControls = false,
    onHeightChange,
    barsHidden = false,
    onToggleBars,
    panelControls,
    resizeData,
    onResize,
    hideResize,
    showPlayerHeaders = true,
    hideBoardButtons,
    pgn,
    fen,
    startOrientation = 'white',
    onInitialize,
    underboardRef,
}) => {
    const { board, slotProps } = useChess();
    const areaRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const area = areaRef.current;
        if (!area || !onHeightChange) return;
        const measure = () => onHeightChange(area.getBoundingClientRect().height);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(area);
        return () => observer.disconnect();
    }, [onHeightChange]);
    const t = useTranslations('analysisBoard.boardButtons');
    const hideButton = useRef<HTMLButtonElement>(null);
    const restoreButton = useRef<HTMLButtonElement>(null);
    const previouslyHidden = useRef(barsHidden);
    const leftPanelVisible = panelControls?.left?.visible;
    const rightPanelVisible = panelControls?.right?.visible;

    useEffect(() => {
        if (previouslyHidden.current !== barsHidden) {
            (barsHidden ? restoreButton : hideButton).current?.focus();
            previouslyHidden.current = barsHidden;
        }
    }, [barsHidden]);

    useEffect(() => {
        board?.redrawAll();
    }, [board, barsHidden, leftPanelVisible, rightPanelVisible]);

    const handlResize = (_: React.SyntheticEvent, data: ResizeCallbackData) => {
        onResize(data.size.width, data.size.height);
    };

    return (
        <Stack
            ref={areaRef}
            direction='row'
            sx={{
                width: `${resizeData.width + (barsHidden ? RESTORE_GUTTER_WIDTH : 0)}px`,
            }}
        >
            <Stack sx={{ width: `${resizeData.width}px` }}>
                {showPlayerHeaders && !barsHidden && <PlayerHeader type='header' />}

                <Board
                    config={{
                        pgn,
                        fen,
                        orientation: startOrientation,
                    }}
                    onInitialize={onInitialize}
                    resizeData={resizeData}
                    onResize={handlResize}
                    hideResize={hideResize}
                    onMove={slotProps?.board?.onMove}
                />

                {showPlayerHeaders && !barsHidden && <PlayerHeader type='footer' />}

                {!hideBoardButtons && (
                    <Box
                        sx={{
                            display: barsHidden ? 'none' : undefined,
                            ...(showNagControls && { '& > .MuiPaper-root': { mb: 0 } }),
                        }}
                    >
                        <BoardButtons
                            underboardRef={underboardRef}
                            panelControls={panelControls}
                            boardWidth={resizeData.width}
                            onHideBars={onToggleBars}
                            hideBarsRef={hideButton}
                        />
                    </Box>
                )}
                {showNagControls && !barsHidden && <NagControls underboardRef={underboardRef} />}
            </Stack>
            {barsHidden && (
                <Stack sx={{ width: RESTORE_GUTTER_WIDTH, pl: '4px', rowGap: 0.5 }}>
                    <Tooltip title={t('showBoardBars')}>
                        <IconButton
                            ref={restoreButton}
                            size='small'
                            aria-label={t('showBoardBars')}
                            onClick={onToggleBars}
                            sx={{ width: 32, height: 32, color: 'text.secondary' }}
                        >
                            <UnfoldMore />
                        </IconButton>
                    </Tooltip>

                    <PanelToggle side='left' size='small' panelControls={panelControls} />
                    <PanelToggle side='right' size='small' panelControls={panelControls} />

                    <FlipBoardButton size='small' />
                </Stack>
            )}
        </Stack>
    );
};

export default ResizableBoardArea;
