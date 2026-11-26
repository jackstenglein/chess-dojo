import Board, { BoardApi, reconcile } from '@/board/Board';
import { ChessContext } from '@/board/pgn/PgnBoard';
import { useSolitaireChess } from '@/board/pgn/solitaire/useSolitaireChess';
import { Chess, Color } from '@jackstenglein/chess';
import { PuzzleRushPuzzle } from '@jackstenglein/chess-dojo-common/src/puzzles/rush/api';
import { Box } from '@mui/material';
import { Ref, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

export type RushBoardPuzzle = Pick<PuzzleRushPuzzle, 'id' | 'fen' | 'moves'>;

export interface RushBoardApi {
    /** Plays the rest of the solution on the board, one move at a time. */
    showSolution: () => void;
}

const SOLUTION_STEP_MS = 800;
const BOARD_BACKGROUND = "url('/static/board/backgrounds/standard.png')";

/** The puzzle as a PGN, and the side the visitor plays. The first move is the opponent's. */
export function puzzleToPgn(puzzle: RushBoardPuzzle): {
    pgn: string;
    orientation: 'white' | 'black';
} {
    const chess = new Chess({ fen: puzzle.fen });
    for (const move of puzzle.moves) {
        chess.move(move);
    }
    return {
        pgn: chess.renderPgn(),
        orientation: chess.history()[1]?.color === Color.black ? 'black' : 'white',
    };
}

/** The solution in notation, without the PGN headers: "24... Bxg3 25. Rxe7". */
export function solutionText(puzzle: RushBoardPuzzle): string {
    return puzzleToPgn(puzzle)
        .pgn.split('\n')
        .filter((line) => !line.trim().startsWith('['))
        .join(' ')
        .replace(/\s*\*\s*$/, '')
        .trim();
}

/** A square that keeps its size before the board script has drawn anything. */
export function BoardFrame({ children }: { children?: React.ReactNode }) {
    return (
        <Box
            sx={{
                position: 'relative',
                width: 1,
                aspectRatio: '1 / 1',
                backgroundImage: BOARD_BACKGROUND,
                backgroundSize: 'cover',
                borderRadius: { xs: 0, sm: 1 },
                overflow: 'hidden',
            }}
        >
            <Box sx={{ position: 'absolute', inset: 0 }}>{children}</Box>
        </Box>
    );
}

/**
 * One puzzle on the app's own board, driven by the app's solitaire hook: the
 * opponent's first move plays itself, then the visitor has to find each move.
 * This is what PgnBoard does for the members' Dojo Rush, without the side panels.
 *
 * Mount it with `key={puzzle.id}` so every puzzle starts from a clean board.
 */
export function RushBoard({
    puzzle,
    onWrongMove,
    onComplete,
    keepWrongMoves = false,
    ref,
}: {
    puzzle: RushBoardPuzzle;
    onWrongMove?: () => void;
    onComplete?: () => void;
    /** The app keeps wrong tries in the game during a run. The demo has no use for them. */
    keepWrongMoves?: boolean;
    ref?: Ref<RushBoardApi>;
}) {
    const [chess] = useState(() => new Chess({ disableNullMoves: true }));
    const [board, setBoard] = useState<BoardApi>();
    const solitaire = useSolitaireChess(chess, board);
    const { pgn, orientation } = useMemo(() => puzzleToPgn(puzzle), [puzzle]);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

    const callbacks = useRef({ onWrongMove, onComplete });
    useEffect(() => {
        callbacks.current = { onWrongMove, onComplete };
    });

    useEffect(() => {
        const pending = timers.current;
        return () => pending.forEach(clearTimeout);
    }, []);

    const { start, stop, enabled, onMove } = solitaire;

    const onInitialize = useCallback(
        (initializedBoard: BoardApi) => {
            start(null, {
                playAs: orientation,
                board: initializedBoard,
                allowDifferentMates: true,
                addWrongMoves: keepWrongMoves,
                onWrongMove: () => callbacks.current.onWrongMove?.(),
                onComplete: () => callbacks.current.onComplete?.(),
            });
            setBoard(initializedBoard);
        },
        [start, orientation, keepWrongMoves],
    );

    useImperativeHandle(
        ref,
        () => ({
            showSolution() {
                if (!board) {
                    return;
                }
                stop();
                timers.current.forEach(clearTimeout);
                timers.current = [];

                const line = chess.history();
                const reached = chess.currentMove();
                const from = reached ? line.indexOf(reached) + 1 : 0;
                board.set({ viewOnly: true });
                line.slice(from).forEach((move, index) => {
                    timers.current.push(
                        setTimeout(
                            () => {
                                chess.seek(move);
                                reconcile(chess, board);
                            },
                            SOLUTION_STEP_MS * (index + 1),
                        ),
                    );
                });
            },
        }),
        [board, chess, stop],
    );

    const config = useMemo(() => ({ pgn, orientation }), [pgn, orientation]);
    const boardOnMove = enabled ? onMove : undefined;
    const context = useMemo(
        () => ({
            chess,
            board,
            config: { disableEngine: true },
            orientation,
            solitaire,
            slotProps: { board: { onMove: boardOnMove } },
        }),
        [chess, board, orientation, solitaire, boardOnMove],
    );

    return (
        <ChessContext.Provider value={context}>
            <BoardFrame>
                <Board config={config} onInitialize={onInitialize} onMove={boardOnMove} />
            </BoardFrame>
        </ChessContext.Provider>
    );
}

/** A position that cannot be moved. Used for the picture of a run in the hero. */
export function StaticBoard({ fen, orientation }: { fen: string; orientation: 'white' | 'black' }) {
    const config = useMemo(
        () => ({ fen, orientation, viewOnly: true, coordinates: false }),
        [fen, orientation],
    );
    return (
        <BoardFrame>
            <Board config={config} />
        </BoardFrame>
    );
}
