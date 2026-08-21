import { Color } from '@lichess-org/chessground/types';
import { Stack } from '@mui/material';
import { ResizeCallbackData } from 'react-resizable';
import Board, { onInitializeFunc } from '../Board';
import { useChess } from './PgnBoard';
import PlayerHeader from './PlayerHeader';
import BoardButtons from './boardTools/boardButtons/BoardButtons';
import { UnderboardApi } from './boardTools/underboard/Underboard';
import { ResizableData } from './resize';

interface ResizableBoardAreaProps {
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

    const handlResize = (_: React.SyntheticEvent, data: ResizeCallbackData) => {
        onResize(data.size.width, data.size.height);
    };

    return (
        <Stack
            sx={{
                width: `${resizeData.width}px`,
            }}
        >
            {showPlayerHeaders && <PlayerHeader type='header' />}

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

            {showPlayerHeaders && <PlayerHeader type='footer' />}

            <BoardButtons underboardRef={underboardRef} />
        </Stack>
    );
};

export default ResizableBoardArea;
