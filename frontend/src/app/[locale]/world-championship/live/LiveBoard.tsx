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
import { RefObject, useEffect, useMemo, useRef, useState } from 'react';
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
    /**
     * Chessground writes the board's drawn size to this element, as ---cg-width
     * and ---cg-height, so things outside the board can line up with it. It
     * defaults to the board's own element.
     */
    sizeVarsTo?: RefObject<HTMLElement | null>;
}

/**
 * A board that shows one position. It never changes the position itself: a
 * dragged move is reported as a guess and the pieces go back where they were.
 */
export function LiveBoard({
    fen,
    lastMove,
    orientation,
    onGuess,
    guessUci,
    sizeVarsTo,
}: LiveBoardProps) {
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
        const el = ref.current;
        const api = Chessground(el, { coordinates: true });
        api.set({ addDimensionsCssVarsTo: sizeVarsTo?.current ?? el });
        setBoard(api);

        // Chessground remembers where the board is and only measures again on
        // a resize or a scroll. When something above the board grows after it
        // loads, the board moves down and every click lands a square low (d2
        // picks d1). Measuring again as each click or touch starts, before
        // chessground handles it, keeps the squares right.
        const remeasure = () => api.state.dom.bounds.clear();
        el.addEventListener('mousedown', remeasure, { capture: true });
        el.addEventListener('touchstart', remeasure, { capture: true, passive: true });
        return () => {
            el.removeEventListener('mousedown', remeasure, { capture: true });
            el.removeEventListener('touchstart', remeasure, { capture: true });
            api.destroy();
        };
    }, [sizeVarsTo]);

    const chess = useMemo(() => new Chess({ fen }), [fen]);
    const turnColor = chess.turn() === 'w' ? 'white' : 'black';
    const guessing = !!onGuess;
    // The page passes a new lastMove array on every render, and it renders each
    // second while a clock runs. Comparing it as text keeps the effect below from
    // running every second.
    const lastMoveKey = lastMove?.join('');
    // Chessground clears the arrows and circles drawn with the right mouse button
    // whenever it is given a position. The position is given only when it changes,
    // so drawings stay until the next move, as on Lichess.
    const shownFen = useRef<string>(undefined);

    useEffect(() => {
        if (!board) {
            return;
        }
        const lastMoveKeys = lastMoveKey
            ? ([lastMoveKey.slice(0, 2), lastMoveKey.slice(2, 4)] as Key[])
            : undefined;
        const newPosition = shownFen.current !== fen;
        shownFen.current = fen;
        board.set({
            ...(newPosition && { fen }),
            orientation,
            turnColor,
            lastMove: lastMoveKeys,
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
                            // Put the pieces back: a guess is shown as an arrow. They go
                            // back at once. A piece that slides back to where it came
                            // from looks like a move the board refused.
                            // Chessground also passed the turn and forgot the legal
                            // moves when the piece was dropped, so both are given
                            // back too. Otherwise nothing could be moved until the
                            // position changed.
                            board.set({
                                fen,
                                turnColor,
                                lastMove: lastMoveKeys,
                                check: chess.isCheck() ? turnColor : false,
                                movable: { color: turnColor, dests: toDests(chess) },
                                animation: { enabled: false },
                            });
                            board.set({ animation: { enabled: true } });
                        }
                    },
                },
            },
            premovable: { enabled: false },
            draggable: { enabled: guessing },
            selectable: { enabled: guessing },
        });
    }, [board, fen, lastMoveKey, orientation, turnColor, chess, guessing]);

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
