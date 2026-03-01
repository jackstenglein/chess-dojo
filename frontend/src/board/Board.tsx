import { Chess, Move, SQUARES, type Square } from '@jackstenglein/chess';
import { Box, Button, Dialog, DialogContent, Stack } from '@mui/material';
import { Chessground } from 'chessground';
import { Api as BoardApi } from 'chessground/api';
import { Config } from 'chessground/config';
import { DrawShape } from 'chessground/draw';
import { Color, Key } from 'chessground/types';
import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { Resizable, ResizeCallbackData } from 'react-resizable';
import { useLocalStorage } from 'usehooks-ts';
import './board.css';
import { getBoardSx, getPieceSx } from './boardThemes';
import { compareNags, getNagGlyph } from './pgn/Nag';
import { useChess } from './pgn/PgnBoard';
import ResizeHandle from './pgn/ResizeHandle';
import {
    BoardStyle,
    BoardStyleKey,
    CoordinateStyle,
    CoordinateStyleKey,
    PieceStyle,
    PieceStyleKey,
    ShowGlyphsKey,
    ShowLegalMovesKey,
} from './pgn/boardTools/underboard/settings/ViewerSettings';
import { ResizableData } from './pgn/resize';

export { Chess };
export type { BoardApi };

export function toColor(chess?: Chess): Color {
    if (!chess) {
        return 'white';
    }
    return chess.turn() === 'w' ? 'white' : 'black';
}

export function toDests(chess?: Chess): Map<Key, Key[]> {
    if (!chess) {
        return new Map();
    }

    const disableNullMoves = chess.disableNullMoves || Boolean(chess.currentMove()?.isNullMove);
    const dests = new Map<Key, Key[]>();
    SQUARES.forEach((s) => {
        const moves = chess.moves({ square: s, disableNullMoves });
        if (moves) {
            dests.set(
                s,
                moves.map((m) => (m as Move).to),
            );
        }
    });
    return dests;
}

const boardColors: Record<string, string> = {
    Y: 'yellow',
    R: 'red',
    B: 'blue',
    G: 'green',
    O: 'orange',
    C: 'magenta',
};

const chessColors = Object.fromEntries(Object.entries(boardColors).map(([k, v]) => [v, k]));

export function toShapes(chess?: Chess): DrawShape[] {
    if (!chess) {
        return [];
    }

    const currentMove = chess.currentMove();
    const commentDiag = currentMove ? currentMove.commentDiag : chess.pgn.gameComment;

    const result: DrawShape[] = [];
    if (commentDiag) {
        if (commentDiag.colorArrows) {
            for (const comm of commentDiag.colorArrows) {
                result.push({
                    orig: comm.substring(1, 3) as Key,
                    dest: comm.substring(3, 5) as Key,
                    brush: boardColors[comm.substring(0, 1)],
                });
            }
        }
        if (commentDiag.colorFields) {
            for (const comm of commentDiag.colorFields) {
                result.push({
                    orig: comm.substring(1, 3) as Key,
                    brush: boardColors[comm.substring(0, 1)],
                });
            }
        }
    }
    return result;
}

export function toAutoShapes(chess?: Chess, showGlyphs?: boolean): DrawShape[] {
    if (!chess || !showGlyphs) {
        return [];
    }

    const currentMove = chess.currentMove();
    if (!currentMove) {
        return [];
    }

    const nags = currentMove.nags?.sort(compareNags) ?? [];
    if (nags.length === 0) {
        return [];
    }

    return [
        {
            orig: currentMove.to,
            customSvg: {
                html: getNagGlyph(nags[0]),
            },
        },
    ];
}

export function reconcile(chess?: Chess, board?: BoardApi | null, showGlyphs?: boolean) {
    if (!chess || !board) {
        return;
    }

    const currentMove = chess.currentMove();
    board.set({
        fen: chess.fen(),
        turnColor: toColor(chess),
        lastMove: currentMove ? [currentMove.from, currentMove.to] : [],
        movable: {
            color: toColor(chess),
            dests: toDests(chess),
        },
        drawable: {
            shapes: toShapes(chess),
            autoShapes: toAutoShapes(chess, showGlyphs),
            eraseOnClick: false,
        },
    });
}

export function useReconcile() {
    const { chess, board } = useChess();
    const [showGlyphs] = useLocalStorage(ShowGlyphsKey, false);

    return useCallback(() => {
        reconcile(chess, board, showGlyphs);
    }, [chess, board, showGlyphs]);
}

export function defaultOnMove(showGlyphs: boolean): onMoveFunc {
    return (board: BoardApi, chess: Chess, move: PrimitiveMove) => {
        chess.move({
            from: move.orig,
            to: move.dest,
            promotion: move.promotion,
        });
        reconcile(chess, board, showGlyphs);
    };
}

export function defaultOnDrawableChange(chess: Chess) {
    return (shapes: DrawShape[]) => {
        const arrows: string[] = [];
        const fields: string[] = [];

        shapes.forEach((s) => {
            const color = chessColors[s.brush || 'red'];
            if (s.orig && color) {
                if (s.dest) {
                    arrows.push(`${color}${s.orig}${s.dest}`);
                } else {
                    fields.push(`${color}${s.orig}`);
                }
            }
        });

        chess.setDrawables(arrows, fields);
    };
}

export function checkPromotion(
    board: BoardApi,
    chess: Chess,
    orig: Square | Key,
    dest: Square | Key,
    onPromotion: (move: PrePromotionMove) => void,
    onMove: onMoveFunc,
) {
    if (orig === 'a0' || dest === 'a0') {
        // a0 represents a square "off the board"
        // such as a new piece
        return;
    }

    if (chess.get(orig)?.type === 'p' && (dest[1] === '1' || dest[1] === '8')) {
        onPromotion({ orig, dest, color: toColor(chess) });
        return;
    }
    onMove(board, chess, { orig, dest });
}

interface PrePromotionMove {
    orig: Square;
    dest: Square;
    color: Color;
}

export interface PrimitiveMove {
    orig: Square;
    dest: Square;
    promotion?: string;
}

export type BoardConfig = Config & {
    pgn?: string;
};

export type onMoveFunc = (board: BoardApi, chess: Chess, move: PrimitiveMove) => void;

export type onInitializeFunc = (
    board: BoardApi,
    chess: Chess,
    boardRef: RefObject<HTMLDivElement | null>,
) => void;

interface BoardProps {
    config?: BoardConfig;
    onInitialize?: onInitializeFunc;
    onInitializeBoard?: (board: BoardApi) => void;
    onMove?: onMoveFunc;
}

const promotionPieces = [
    {
        key: 'q',
        name: 'queen',
    },
    {
        key: 'n',
        name: 'knight',
    },
    {
        key: 'r',
        name: 'rook',
    },
    {
        key: 'b',
        name: 'bishop',
    },
] as const;

const Board: React.FC<BoardProps> = ({ config, onInitialize, onInitializeBoard, onMove }) => {
    const { chess, config: chessConfig } = useChess();
    const [board, setBoard] = useState<BoardApi | null>(null);
    const boardRef = useRef<HTMLDivElement>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [promotion, setPromotion] = useState<PrePromotionMove | null>(null);
    const [boardStyle] = useLocalStorage<BoardStyle>(BoardStyleKey, BoardStyle.Standard);
    const [pieceStyle] = useLocalStorage<PieceStyle>(PieceStyleKey, PieceStyle.Standard);
    const [coordinateStyle] = useLocalStorage<CoordinateStyle>(
        CoordinateStyleKey,
        CoordinateStyle.RankFileOnly,
    );
    const [showLegalMoves] = useLocalStorage(ShowLegalMovesKey, true);
    const [showGlyphs] = useLocalStorage(ShowGlyphsKey, false);

    const onStartPromotion = useCallback(
        (move: PrePromotionMove) => {
            setPromotion(move);
        },
        [setPromotion],
    );

    const onFinishPromotion = useCallback(
        (piece: string) => {
            if (board && chess && promotion) {
                const func = onMove ? onMove : defaultOnMove(showGlyphs);
                func(board, chess, {
                    orig: promotion.orig,
                    dest: promotion.dest,
                    promotion: piece,
                });
            }
            setPromotion(null);
        },
        [board, chess, promotion, onMove, setPromotion, showGlyphs],
    );

    const onCancelPromotion = useCallback(() => {
        setPromotion(null);
        reconcile(chess, board, showGlyphs);
    }, [board, chess, showGlyphs]);

    useEffect(() => {
        if (boardRef.current && !board) {
            const chessgroundApi = Chessground(boardRef.current, config);
            setBoard(chessgroundApi);
            window.chessground = chessgroundApi;
        } else if (boardRef.current && board && chess && !isInitialized) {
            if (config?.pgn) {
                chess.loadPgn(config.pgn);
                chess.seek(null);
            } else if (config?.fen) {
                chess.load(config.fen);
            }

            board.set({
                ...config,
                fen: chess.fen(),
                turnColor: config?.turnColor || toColor(chess),
                movable: {
                    color: config?.movable?.color || toColor(chess),
                    free: config?.movable?.free || false,
                    dests: config?.movable?.dests || toDests(chess),
                    events: {
                        after: (orig, dest) => {
                            checkPromotion(
                                board,
                                chess,
                                orig,
                                dest,
                                onStartPromotion,
                                onMove ? onMove : defaultOnMove(showGlyphs),
                            );
                        },
                    },
                },
                lastMove: [],
                drawable: {
                    shapes: config?.drawable?.shapes || toShapes(chess),
                    autoShapes: toAutoShapes(chess, showGlyphs),
                    onChange: config?.drawable?.onChange || defaultOnDrawableChange(chess),
                    eraseOnClick: false,
                },
                addPieceZIndex:
                    pieceStyle === PieceStyle.ThreeD || pieceStyle === PieceStyle.ThreeDRedBlue,
            });

            onInitialize?.(board, chess, boardRef);
            setIsInitialized(true);
        } else if (boardRef.current && board && !isInitialized) {
            board.set({ ...config });
            onInitializeBoard?.(board);
            setIsInitialized(true);
        }
    }, [
        boardRef,
        board,
        chess,
        config,
        isInitialized,
        setIsInitialized,
        onMove,
        onInitialize,
        onInitializeBoard,
        onStartPromotion,
        pieceStyle,
        showGlyphs,
    ]);

    const fen = config?.fen;
    const pgn = config?.pgn;
    const initKey = chessConfig?.initKey;
    useEffect(() => {
        if (initKey || fen || pgn) {
            setIsInitialized(false);
        }
    }, [initKey, fen, pgn, setIsInitialized]);

    useEffect(() => {
        if (chess && board) {
            board.set({
                movable: {
                    events: {
                        after: (orig, dest) =>
                            checkPromotion(
                                board,
                                chess,
                                orig,
                                dest,
                                onStartPromotion,
                                onMove ? onMove : defaultOnMove(showGlyphs),
                            ),
                    },
                },
                addPieceZIndex:
                    pieceStyle === PieceStyle.ThreeD || pieceStyle === PieceStyle.ThreeDRedBlue,
            });
        }
    }, [chess, board, onMove, onStartPromotion, pieceStyle, showGlyphs]);

    useEffect(() => {
        board?.set({
            movable: {
                showDests: showLegalMoves,
            },
        });
    }, [board, showLegalMoves]);

    useEffect(() => {
        board?.set({
            coordinates: coordinateStyle !== CoordinateStyle.None,
            coordinatesOnSquares: coordinateStyle === CoordinateStyle.AllSquares,
        });
        board?.redrawAll();
    }, [board, coordinateStyle]);

    useEffect(() => {
        board?.set({
            drawable: {
                shapes: toShapes(chess),
                autoShapes: toAutoShapes(chess, showGlyphs),
                eraseOnClick: false,
            },
        });
    }, [board, chess, showGlyphs]);

    const pieceSx = getPieceSx(pieceStyle);

    return (
        <Box width={1} height={1} sx={{ ...pieceSx, ...getBoardSx(boardStyle) }}>
            <div
                data-testid='chessground-board'
                ref={boardRef}
                style={{ width: '100%', height: '100%' }}
            />

            <Dialog open={promotion !== null} onClose={onCancelPromotion}>
                <DialogContent>
                    <Stack direction='row'>
                        {promotionPieces.map((piece) => (
                            <Button key={piece.key} onClick={() => onFinishPromotion(piece.key)}>
                                <Box
                                    sx={{
                                        width: '75px',
                                        aspectRatio: 1,
                                        backgroundSize: 'cover',
                                        backgroundImage: promotion
                                            ? pieceSx[`--${promotion.color}-${piece.name}`]
                                            : '',
                                    }}
                                />
                            </Button>
                        ))}
                    </Stack>
                </DialogContent>
            </Dialog>
        </Box>
    );
};

interface MaybeResizableBoardProps extends BoardProps {
    resizeData?: ResizableData;
    onResize?: (event: React.SyntheticEvent, data: ResizeCallbackData) => void;
    hideResize?: boolean;
}

const MaybeResizableBoard: React.FC<MaybeResizableBoardProps> = (props) => {
    const { resizeData, onResize, hideResize, ...boardProps } = props;
    const { chess } = useChess();

    if (resizeData && onResize) {
        return (
            <Resizable
                lockAspectRatio
                width={resizeData.width}
                height={resizeData.height}
                onResize={onResize}
                resizeHandles={hideResize ? [] : ['se']}
                minConstraints={[resizeData.minWidth, resizeData.minHeight]}
                maxConstraints={[resizeData.maxWidth, resizeData.maxHeight]}
                handle={
                    <ResizeHandle
                        position='absolute'
                        bottom={0}
                        right={1}
                        fontSize='1rem'
                        dark
                        visibility={chess ? undefined : 'hidden'}
                    />
                }
            >
                <div
                    style={{
                        width: `${resizeData.width}px`,
                        height: `${resizeData.height}px`,
                        visibility: chess ? undefined : 'hidden',
                    }}
                >
                    <Board {...boardProps} />
                </div>
            </Resizable>
        );
    }

    return <Board {...boardProps} />;
};

export default MaybeResizableBoard;
