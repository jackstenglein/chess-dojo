import useGame from '@/context/useGame';
import LoadingPage from '@/loading/LoadingPage';
import { Chess, Move, Observer } from '@jackstenglein/chess';
import { Box } from '@mui/material';
import { Color } from 'chessground/types';
import React, {
    createContext,
    forwardRef,
    RefObject,
    useCallback,
    useContext,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
    type JSX,
} from 'react';
import { BoardApi, onMoveFunc } from '../Board';
import ResizableContainer from './ResizableContainer';
import { UnderboardTab } from './boardTools/underboard/underboardTabs';
import { ButtonProps as MoveButtonProps } from './pgnText/MoveButton';
import { CONTAINER_ID } from './resize';
import {
    SolitaireChessOptions,
    useSolitaireChess,
    UseSolitaireChessResponse,
} from './solitaire/useSolitaireChess';

export const BlockBoardKeyboardShortcuts = 'blockBoardKeyboardShortcuts';

interface ChessConfig {
    initKey?: string;
    allowMoveDeletion?: boolean;
    allowDeleteBefore?: boolean;
    disableTakebacks?: Color | 'both';
    disableNullMoves?: boolean;
    disableEngine?: boolean;
    showElapsedMoveTimes?: boolean;
}

interface ChessContextType {
    chess?: Chess;
    board?: BoardApi;
    boardRef?: RefObject<HTMLDivElement | null>;
    config?: ChessConfig;
    toggleOrientation?: () => void;
    keydownMap?: React.RefObject<Record<string, boolean>>;
    slots?: PgnBoardSlots;
    slotProps?: PgnBoardSlotProps;
    orientation?: 'white' | 'black';
    solitaire?: UseSolitaireChessResponse;
    addEngineMoveRef?: React.RefObject<(() => void) | null>;
}

export const ChessContext = createContext<ChessContextType>({});

export function useChess() {
    return useContext(ChessContext);
}

export interface PgnBoardApi {
    getPgn: () => string;
    solitaire: {
        start: (move: Move | null, opts?: SolitaireChessOptions) => void;
        stop: () => void;
    };
    addObserver: (observer: Observer) => void;
    removeObserver: (observer: Observer) => void;
}

export interface PgnBoardSlots {
    moveButtonExtras?: React.JSXElementConstructor<MoveButtonProps>;
    afterPgnText?: JSX.Element;
}

export interface PgnBoardSlotProps {
    pgnText?: {
        hideResult?: boolean;
    };
    board?: {
        onMove?: onMoveFunc;
    };
}

interface PgnBoardProps extends ChessConfig {
    underboardTabs: UnderboardTab[];
    initialUnderboardTab?: string;
    pgn?: string;
    fen?: string;
    showPlayerHeaders?: boolean;
    startOrientation?: Color;
    onInitialize?: (board: BoardApi, chess: Chess) => void;
    slots?: PgnBoardSlots;
    slotProps?: PgnBoardSlotProps;
}

const PgnBoard = forwardRef<PgnBoardApi, PgnBoardProps>(
    (
        {
            underboardTabs,
            initialUnderboardTab,
            pgn,
            fen,
            showPlayerHeaders = true,
            startOrientation = 'white',
            onInitialize: parentOnInitialize,
            initKey,
            allowMoveDeletion,
            allowDeleteBefore,
            disableTakebacks,
            disableNullMoves: disableNullMovesProp,
            disableEngine,
            showElapsedMoveTimes,
            slots,
            slotProps,
        },
        ref,
    ) => {
        const { game } = useGame();
        const [board, setBoard] = useState<BoardApi>();
        const [boardRef, setBoardRef] = useState<RefObject<HTMLDivElement | null>>();

        const disableNullMoves = disableNullMovesProp ?? !game;
        const [chess] = useState<Chess>(new Chess({ disableNullMoves }));
        const [orientation, setOrientation] = useState(game?.orientation || startOrientation);
        const keydownMap = useRef<Record<string, boolean>>({});
        const solitaire = useSolitaireChess(chess, board);
        const addEngineMoveRef = useRef<(() => void) | null>(null);

        const toggleOrientation = useCallback(() => {
            if (board) {
                board.toggleOrientation();
                setOrientation(board.state.orientation);
            }
        }, [board, setOrientation]);

        const chessContext = useMemo(
            () => ({
                chess,
                board,
                boardRef,
                config: {
                    initKey,
                    allowMoveDeletion,
                    allowDeleteBefore,
                    disableTakebacks,
                    disableEngine,
                    showElapsedMoveTimes,
                },
                toggleOrientation,
                keydownMap,
                slots,
                slotProps: {
                    ...slotProps,
                    board: {
                        onMove: slotProps?.board?.onMove
                            ? slotProps.board.onMove
                            : solitaire.enabled
                              ? solitaire.onMove
                              : undefined,
                    },
                },
                orientation,
                solitaire,
                addEngineMoveRef,
            }),
            [
                chess,
                board,
                boardRef,
                allowMoveDeletion,
                allowDeleteBefore,
                orientation,
                toggleOrientation,
                keydownMap,
                slots,
                slotProps,
                disableTakebacks,
                disableEngine,
                initKey,
                showElapsedMoveTimes,
                solitaire,
                addEngineMoveRef,
            ],
        );

        const onInitialize = useCallback(
            (board: BoardApi, chess: Chess, boardRef: RefObject<HTMLDivElement | null>) => {
                parentOnInitialize?.(board, chess);
                setBoard(board);
                setBoardRef(boardRef);
            },
            [parentOnInitialize, setBoard],
        );

        const gameOrientation = game?.orientation || startOrientation || 'white';
        useEffect(() => {
            if (gameOrientation !== board?.state.orientation) {
                setOrientation(gameOrientation);
                toggleOrientation();
            }
        }, [gameOrientation, board, toggleOrientation]);

        useEffect(() => {
            // eslint-disable-next-line react-hooks/immutability
            chess.disableNullMoves = disableNullMoves;
        }, [chess, disableNullMoves]);

        useImperativeHandle(ref, (): PgnBoardApi => {
            return {
                getPgn() {
                    return chess.renderPgn() || '';
                },
                solitaire: {
                    start: solitaire.start,
                    stop: solitaire.stop,
                },
                addObserver(observer: Observer) {
                    chess.addObserver(observer);
                },
                removeObserver(observer: Observer) {
                    chess.removeObserver(observer);
                },
            };
        }, [chess, solitaire.start, solitaire.stop]);

        return (
            <Box
                id={CONTAINER_ID}
                sx={{
                    gridArea: 'pgn',
                    width: 1,
                    maxWidth: 1,
                    overflowX: 'clip',
                    overflowY: chess ? undefined : 'hidden',
                }}
            >
                {(!chess || (!pgn && !fen)) && (
                    <LoadingPage disableShrink sx={{ position: 'absolute', width: 1 }} />
                )}

                {(pgn || fen) && (
                    <ChessContext.Provider value={chessContext}>
                        <ResizableContainer
                            {...{
                                underboardTabs,
                                initialUnderboardTab,
                                showPlayerHeaders,
                                pgn,
                                fen,
                                startOrientation,
                                onInitialize,
                            }}
                        />
                    </ChessContext.Provider>
                )}
            </Box>
        );
    },
);
PgnBoard.displayName = 'PgnBoard';

export default PgnBoard;
