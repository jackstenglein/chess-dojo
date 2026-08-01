import { Chess, Move } from '@jackstenglein/chess';
import { Box, Stack, SxProps, Theme, Typography } from '@mui/material';
import { useCallback, useState } from 'react';

import { logger } from '@/logging/logger';
import Board, { BoardApi, PrimitiveMove, reconcile, toColor, toDests, toShapes } from '../Board';
import { ChessContext } from '../pgn/PgnBoard';
import HintSection from './HintSection';

export enum Status {
    WaitingForMove,
    IncorrectMove,
    CorrectMove,
    Complete,
}

interface PuzzleBoardProps {
    pgn: string;
    coachUrl?: string;
    sx?: SxProps<Theme>;
    hideHeader?: boolean;
    playBothSides?: boolean;
    onComplete: () => void;
    onNextPuzzle?: () => void;
}

const PuzzleBoard: React.FC<PuzzleBoardProps> = ({
    pgn,
    coachUrl,
    sx,
    hideHeader = false,
    playBothSides = false,
    onComplete: onCompletePuzzle,
    onNextPuzzle,
}) => {
    const [board, setBoard] = useState<BoardApi>();
    const [chess] = useState<Chess>(new Chess());
    const [status, setStatus] = useState(Status.WaitingForMove);
    const [move, setMove] = useState<Move | null>(null);
    const [lastCorrectMove, setLastCorrectMove] = useState<Move | null>(null);

    const onRestart = (board: BoardApi | undefined, chess: Chess) => {
        chess.loadPgn(pgn);
        chess.seek(null);
        board?.set({
            fen: chess.fen(),
            turnColor: toColor(chess),
            orientation: toColor(chess),
            lastMove: [],
            movable: {
                color: toColor(chess),
                dests: toDests(chess),
                free: false,
            },
            premovable: {
                enabled: false,
            },
            drawable: {
                shapes: toShapes(chess),
            },
        });
        setBoard(board);
        setStatus(Status.WaitingForMove);
        setMove(null);
        setLastCorrectMove(null);
    };

    const onComplete = useCallback(
        (board: BoardApi | undefined, chess: Chess) => {
            board?.set({
                fen: chess.fen(),
                movable: {
                    color: toColor(chess),
                    dests: toDests(chess),
                },
                drawable: {
                    shapes: toShapes(chess),
                },
            });
            setStatus(Status.Complete);
            setMove(chess.currentMove());
            onCompletePuzzle();
        },
        [onCompletePuzzle, setStatus, setMove],
    );

    const onMove = useCallback(
        (board: BoardApi, chess: Chess, primMove: PrimitiveMove) => {
            const move = {
                from: primMove.orig,
                to: primMove.dest,
                promotion: primMove.promotion,
            };

            if (status === Status.Complete) {
                chess.move(move);
                reconcile(chess, board);
                setMove(chess.currentMove());
                return;
            }

            const isCorrect = chess.isMainline(move);
            if (isCorrect) {
                chess.seek(chess.nextMove());
                if (chess.lastMove() === chess.currentMove() || chess.hasNagInRange(10, 140)) {
                    onComplete(board, chess);
                    return;
                }
                setStatus(Status.CorrectMove);
                setLastCorrectMove(chess.currentMove());
            } else {
                chess.move(move);
                setStatus(Status.IncorrectMove);
            }

            board.set({
                fen: chess.fen(),
                turnColor: toColor(chess),
                movable: {
                    color: isCorrect && playBothSides ? toColor(chess) : undefined,
                    dests: isCorrect && playBothSides ? toDests(chess) : undefined,
                },
                drawable: {
                    shapes: toShapes(chess),
                },
            });

            setMove(chess.currentMove());
        },
        [onComplete, playBothSides, status, setStatus, setMove, setLastCorrectMove],
    );

    const onNext = (board: BoardApi | undefined, chess: Chess) => {
        const nextMove = chess.nextMove();
        if (!nextMove) {
            onComplete(board, chess);
            return;
        }
        chess.seek(nextMove);
        if (chess.lastMove() === nextMove || chess.hasNagInRange(10, 140, nextMove)) {
            onComplete(board, chess);
            return;
        }

        board?.move(nextMove.from, nextMove.to);
        board?.set({
            fen: chess.fen(),
            turnColor: toColor(chess),
            movable: {
                color: toColor(chess),
                dests: toDests(chess),
            },
            drawable: {
                shapes: toShapes(chess),
            },
        });
        setStatus(Status.WaitingForMove);
        setMove(nextMove);
        logger.debug?.('Setting last correct move: ', nextMove);
        setLastCorrectMove(nextMove);
    };

    const onRetry = (board: BoardApi | undefined, chess: Chess) => {
        chess.seek(lastCorrectMove);
        board?.set({
            fen: chess.fen(),
            turnColor: toColor(chess),
            lastMove: lastCorrectMove ? [lastCorrectMove.from, lastCorrectMove.to] : [],
            movable: {
                color: toColor(chess),
                dests: toDests(chess),
            },
            drawable: {
                shapes: toShapes(chess),
            },
        });
        setStatus(Status.WaitingForMove);
        setMove(lastCorrectMove);
    };

    return (
        <Box
            sx={
                sx || {
                    gridArea: 'pgn',
                    display: 'grid',
                    width: 1,
                    alignItems: 'end',
                    gridTemplateRows: {
                        xs: 'auto auto var(--gap) minmax(auto, 400px)',
                        md: 'auto calc(var(--board-size) + var(--tools-height))',
                    },
                    gridTemplateColumns: {
                        xs: '1fr',
                        md: 'var(--board-size) var(--gap) var(--coach-width) auto',
                    },
                    gridTemplateAreas: {
                        xs: '"header" "board" "." "coach"',
                        md: '"header . . ." "board gap coach ."',
                    },
                }
            }
        >
            {board && chess && !hideHeader && (
                <Typography
                    variant='subtitle2'
                    sx={{
                        color: 'text.secondary',
                        gridArea: 'header',
                    }}
                >
                    {chess.pgn.header.tags.White} vs {chess.pgn.header.tags.Black}
                </Typography>
            )}

            <ChessContext.Provider value={{ chess, board }}>
                <Box
                    sx={{
                        gridArea: 'board',
                        aspectRatio: 1,
                        width: 1,
                    }}
                >
                    <Board onInitialize={onRestart} onMove={onMove} />
                </Box>
                <Stack
                    spacing={2}
                    sx={{
                        gridArea: 'coach',
                        height: 1,
                        justifyContent: { xs: 'start', sm: 'flex-end' },
                    }}
                >
                    <HintSection
                        status={status}
                        move={move}
                        board={board}
                        chess={chess}
                        coachUrl={coachUrl}
                        playBothSides={playBothSides}
                        onNext={onNext}
                        onRetry={onRetry}
                        onRestart={onRestart}
                        onNextPuzzle={onNextPuzzle}
                    />
                </Stack>
            </ChessContext.Provider>
        </Box>
    );
};

export default PuzzleBoard;
