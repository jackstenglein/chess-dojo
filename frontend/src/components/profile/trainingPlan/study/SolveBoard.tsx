import Board, {
    BoardApi,
    PrimitiveMove,
    reconcile,
    toColor,
    toDests,
    toShapes,
} from '@/board/Board';
import { ChessContext } from '@/board/pgn/PgnBoard';
import { Chess } from '@jackstenglein/chess';
import { Box } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type SolveStatus =
    | { kind: 'prompt'; toMove: 'white' | 'black' }
    | { kind: 'wrong'; toMove: 'white' | 'black'; feedback?: string }
    | { kind: 'correct' }
    | { kind: 'complete' };

export interface SolveBoardProps {
    pgn: string;
    /** The member plays every move of the line instead of only one side's. */
    playBothSides: boolean;
    onStatus: (status: SolveStatus) => void;
    onComplete: () => void;
}

const REPLY_DELAY_MS = 300;
const WRONG_MOVE_MS = 600;
/** A NAG in this range on a reached move ends the puzzle early, the convention PuzzleBoard follows. */
const OPTIONAL_NAG_MIN = 10;
const OPTIONAL_NAG_MAX = 140;

/** The board accepts the member's moves while solving and ignores them during replies and takebacks. */
interface Run {
    phase: 'solving' | 'waiting' | 'complete';
    timer?: ReturnType<typeof setTimeout>;
}

/** One pending timer at a time: a reply, a takeback or the return to the prompt. */
function schedule(r: Run, fn: () => void, ms: number) {
    clearTimeout(r.timer);
    r.timer = setTimeout(fn, ms);
}

function showPosition(board: BoardApi, chess: Chess, movable: boolean) {
    const last = chess.currentMove();
    board.set({
        fen: chess.fen(),
        turnColor: toColor(chess),
        lastMove: last ? [last.from, last.to] : [],
        movable: movable
            ? { color: toColor(chess), dests: toDests(chess) }
            : { color: undefined, dests: undefined },
        drawable: { shapes: toShapes(chess) },
    });
}

function lineEnds(chess: Chess): boolean {
    return (
        chess.lastMove() === chess.currentMove() ||
        chess.hasNagInRange(OPTIONAL_NAG_MIN, OPTIONAL_NAG_MAX)
    );
}

/**
 * The reader's puzzle board. The member plays the main line for the side to move and the
 * board answers with the line's replies. The board takes back a move off the line after a
 * moment. It loads the PGN on mount only, so a new PGN needs a new mount, which the page
 * guarantees through the board key.
 */
export function SolveBoard({ pgn, playBothSides, onStatus, onComplete }: SolveBoardProps) {
    const [chess] = useState(() => new Chess());
    const [board, setBoard] = useState<BoardApi>();
    const run = useRef<Run>({ phase: 'solving' });
    // The board rebinds its move handler whenever onMove changes, so onMove stays stable and
    // reads the latest callbacks through a ref.
    const callbacks = useRef({ onStatus, onComplete });
    useEffect(() => {
        callbacks.current = { onStatus, onComplete };
    });
    const context = useMemo(() => ({ chess, board }), [chess, board]);

    useEffect(() => {
        const current = run.current;
        return () => clearTimeout(current.timer);
    }, []);

    const onInitialize = useCallback(
        (board: BoardApi, chess: Chess) => {
            chess.loadPgn(pgn);
            chess.seek(null);
            board.set({
                fen: chess.fen(),
                turnColor: toColor(chess),
                orientation: playBothSides ? 'white' : toColor(chess),
                lastMove: [],
                movable: { color: toColor(chess), dests: toDests(chess), free: false },
                premovable: { enabled: false },
                drawable: { shapes: toShapes(chess) },
            });
            setBoard(board);
            callbacks.current.onStatus({ kind: 'prompt', toMove: toColor(chess) });
        },
        [pgn, playBothSides],
    );

    const complete = (board: BoardApi, chess: Chess) => {
        clearTimeout(run.current.timer);
        run.current.phase = 'complete';
        showPosition(board, chess, true);
        callbacks.current.onStatus({ kind: 'complete' });
        callbacks.current.onComplete();
    };

    const onMove = useCallback(
        (board: BoardApi, chess: Chess, move: PrimitiveMove) => {
            const r = run.current;
            const candidate = { from: move.orig, to: move.dest, promotion: move.promotion };
            if (r.phase === 'complete') {
                chess.move(candidate);
                reconcile(chess, board);
                return;
            }
            if (r.phase === 'waiting') {
                return;
            }
            if (!chess.isMainline(candidate)) {
                // An author's comment on the move, written as a variation, is its feedback.
                const known = chess.move(candidate, { existingOnly: true, skipSeek: true });
                r.phase = 'waiting';
                board.set({ movable: { color: undefined, dests: undefined } });
                callbacks.current.onStatus({
                    kind: 'wrong',
                    toMove: toColor(chess),
                    feedback: known?.commentAfter || undefined,
                });
                schedule(
                    r,
                    () => {
                        r.phase = 'solving';
                        showPosition(board, chess, true);
                    },
                    WRONG_MOVE_MS,
                );
                return;
            }
            chess.seek(chess.nextMove());
            if (lineEnds(chess)) {
                complete(board, chess);
                return;
            }
            callbacks.current.onStatus({ kind: 'correct' });
            if (playBothSides) {
                showPosition(board, chess, true);
                schedule(
                    r,
                    () => callbacks.current.onStatus({ kind: 'prompt', toMove: toColor(chess) }),
                    REPLY_DELAY_MS,
                );
                return;
            }
            r.phase = 'waiting';
            showPosition(board, chess, false);
            schedule(
                r,
                () => {
                    const reply = chess.nextMove();
                    if (!reply) {
                        complete(board, chess);
                        return;
                    }
                    chess.seek(reply);
                    board.move(reply.from, reply.to);
                    r.phase = 'solving';
                    if (lineEnds(chess)) {
                        complete(board, chess);
                        return;
                    }
                    showPosition(board, chess, true);
                    callbacks.current.onStatus({ kind: 'prompt', toMove: toColor(chess) });
                },
                REPLY_DELAY_MS,
            );
        },
        [playBothSides],
    );

    return (
        <ChessContext.Provider value={context}>
            <Box sx={{ width: 1, aspectRatio: '1' }} data-testid='solve-board'>
                <Board onInitialize={onInitialize} onMove={onMove} />
            </Box>
        </ChessContext.Provider>
    );
}
