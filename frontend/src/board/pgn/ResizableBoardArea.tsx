import { Color } from '@lichess-org/chessground/types';
import UnfoldMore from '@mui/icons-material/UnfoldMore';
import { Box, IconButton, Stack, Tooltip } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { ResizeCallbackData } from 'react-resizable';
import Board, { onInitializeFunc } from '../Board';
import { useChess } from './PgnBoard';
import PlayerHeader from './PlayerHeader';
import BoardButtons, { PanelControls } from './boardTools/boardButtons/BoardButtons';
import { UnderboardApi } from './boardTools/underboard/Underboard';
import { ResizableData, RESTORE_GUTTER_WIDTH } from './resize';

interface ResizableBoardAreaProps {
    barsHidden?: boolean;
    onToggleBars?: () => void;
    panelControls?: PanelControls;
    resizeData: ResizableData;
    onResize: (width: number, height: number) => void;
    hideResize?: boolean;
    pgn?: string;
    fen?: string;
    showPlayerHeaders?: boolean;
    startOrientation?: Color;
    onInitialize: onInitializeFunc;
    underboardRef: React.RefObject<UnderboardApi | null>;
}

const ResizableBoardArea: React.FC<ResizableBoardAreaProps> = ({
    barsHidden = false,
    onToggleBars,
    panelControls,
    resizeData,
    onResize,
    hideResize,
    showPlayerHeaders = true,
    pgn,
    fen,
    startOrientation = 'white',
    onInitialize,
    underboardRef,
}) => {
    const { slotProps } = useChess();
    const t = useTranslations('analysisBoard.boardButtons');
    const hideButton = useRef<HTMLButtonElement>(null);
    const restoreButton = useRef<HTMLButtonElement>(null);
    const previouslyHidden = useRef(barsHidden);

    useEffect(() => {
        if (previouslyHidden.current !== barsHidden) {
            (barsHidden ? restoreButton : hideButton).current?.focus();
            previouslyHidden.current = barsHidden;
        }
    }, [barsHidden]);

    const handlResize = (_: React.SyntheticEvent, data: ResizeCallbackData) => {
        onResize(data.size.width, data.size.height);
    };

    return (
        <Stack
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

                <Box sx={{ display: barsHidden ? 'none' : undefined }}>
                    <BoardButtons
                        underboardRef={underboardRef}
                        panelControls={panelControls}
                        boardWidth={resizeData.width}
                        onHideBars={onToggleBars}
                        hideBarsRef={hideButton}
                    />
                </Box>
            </Stack>
            {barsHidden && (
                <Box sx={{ width: RESTORE_GUTTER_WIDTH, pl: '4px' }}>
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
                </Box>
            )}
        </Stack>
    );
};

export default ResizableBoardArea;
