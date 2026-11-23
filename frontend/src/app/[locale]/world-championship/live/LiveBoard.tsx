'use client';

import { Chess, toDests } from '@/board/Board';
import '@/board/board.css';
import { getBoardSx, getCoordinateSx, getPieceSx } from '@/board/boardThemes';
import {
    BoardStyle,
    BoardStyleKey,
    CoordinateSize,
    CoordinateSizeKey,
    PieceStyle,
    PieceStyleKey,
} from '@/board/pgn/boardTools/underboard/settings/ViewerSettings';
import { Chessground } from '@lichess-org/chessground';
import { Api as BoardApi } from '@lichess-org/chessground/api';
import { DrawShape } from '@lichess-org/chessground/draw';
import { Key } from '@lichess-org/chessground/types';
import { Box } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';

interface LiveBoardProps {
    fen: string;
    lastMove?: [string, string];
    orientation: 'white' | 'black';
    /** When set, the side to move can drag a piece, and the move is passed here instead of played. */
    /**
     * Called with each move made on the board. Return true to keep the move on
     * the board (an analysis move); otherwise the pieces go back (a guess).
     */
    onGuess?: (uci: string) => boolean;
    /** The current guess, drawn as an arrow. */
    guessUci?: string;
}

/**
 * A board that shows one position. It never changes the position itself: a
 * dragged move is reported as a guess and the pieces go back where they were.
 */
export function LiveBoard({ fen, lastMove, orientation, onGuess, guessUci }: LiveBoardProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [board, setBoard] = useState<BoardApi>();
    const [boardStyle] = useLocalStorage<BoardStyle>(BoardStyleKey, BoardStyle.Standard);
    const [pieceStyle] = useLocalStorage<PieceStyle>(PieceStyleKey, PieceStyle.Standard);
    const [coordinateSize] = useLocalStorage<CoordinateSize>(
        CoordinateSizeKey,
        CoordinateSize.Standard,
    );

    const onGuessRef = useRef(onGuess);
    useEffect(() => {
        onGuessRef.current = onGuess;
    }, [onGuess]);

    useEffect(() => {
        if (!ref.current) {
            return;
        }
        const api = Chessground(ref.current, { coordinates: true });
        api.set({ addDimensionsCssVarsTo: ref.current });
        setBoard(api);
        return () => api.destroy();
    }, []);

    const chess = useMemo(() => new Chess({ fen }), [fen]);
    const turnColor = chess.turn() === 'w' ? 'white' : 'black';
    const guessing = !!onGuess;

    useEffect(() => {
        if (!board) {
            return;
        }
        board.set({
            fen,
            orientation,
            turnColor,
            lastMove: lastMove as Key[] | undefined,
            check: chess.isCheck() ? turnColor : false,
            movable: {
                free: false,
                color: guessing ? turnColor : undefined,
                dests: guessing ? toDests(chess) : new Map(),
                showDests: true,
                events: {
                    after: (orig, dest) => {
                        const piece = chess.get(orig as never);
                        const lastRank = dest[1] === '8' || dest[1] === '1';
                        // Guesses promote to a queen.
                        const promotion = piece?.type === 'p' && lastRank ? 'q' : '';
                        const keep = onGuessRef.current?.(`${orig}${dest}${promotion}`) === true;
                        if (!keep) {
                            // Put the pieces back: a guess is shown as an arrow.
                            board.set({ fen, lastMove: lastMove as Key[] | undefined });
                        }
                    },
                },
            },
            premovable: { enabled: false },
            draggable: { enabled: guessing },
            selectable: { enabled: guessing },
        });
    }, [board, fen, lastMove, orientation, turnColor, chess, guessing]);

    useEffect(() => {
        const shapes: DrawShape[] = guessUci
            ? [
                  {
                      orig: guessUci.slice(0, 2) as Key,
                      dest: guessUci.slice(2, 4) as Key,
                      brush: 'green',
                  },
              ]
            : [];
        board?.setAutoShapes(shapes);
    }, [board, guessUci, fen]);

    return (
        <Box
            sx={{
                width: 1,
                aspectRatio: '1 / 1',
                ...getPieceSx(pieceStyle),
                ...getBoardSx(boardStyle),
                ...getCoordinateSx(coordinateSize),
            }}
        >
            <div ref={ref} style={{ width: '100%', height: '100%', position: 'relative' }} />
        </Box>
    );
}
