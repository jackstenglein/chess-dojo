import { BoardApi, defaultOnMove, PrimitiveMove, reconcile } from '@/board/Board';
import { ShowGlyphsKey } from '@/board/pgn/boardTools/underboard/settings/ViewerSettings';
import {
    correctMoveGlyphHtml,
    incorrectMoveGlyphHtml,
} from '@/components/material/memorizegames/moveGlyphs';
import {
    CORRECT_SOUND_KEY,
    INCORRECT_SOUND_KEY,
} from '@/components/puzzles/settings/puzzleSettingsKeys';
import { Chess, Color, CommentType, Move, Square } from '@jackstenglein/chess';
import { useTranslations } from 'next-intl';
import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';

interface SimpleMove {
    from: Square;
    to: Square;
    promotion?: string | undefined;
}

export type PlayAs = 'both' | 'white' | 'black';

interface SolitaireColorResults {
    correct: number;
    total: number;
}

interface SolitaireResults {
    white: SolitaireColorResults;
    black: SolitaireColorResults;
}

const EMPTY_SOLITAIRE_RESULTS = {
    white: { correct: 0, total: 0 },
    black: { correct: 0, total: 0 },
};

export interface UseSolitaireChessResponse {
    /** Whether solitaire mode is enabled. */
    enabled: boolean;
    /** Which colors to play as. */
    playAs: PlayAs;
    /** Sets which colors to play as. */
    setPlayAs: (v: PlayAs) => void;
    /** Whether to add wrong moves to the PGN after the correct move is played. */
    addWrongMoves: boolean;
    /** Sets whether to add wrong moves to the PGN. */
    setAddWrongMoves: (v: boolean) => void;
    /** Whether solitaire mode has been completed. */
    complete: boolean;
    /** The last correctly guessed move. */
    currentMove: Move | null;
    /** A callback to start solitaire mode from the given move. */
    start: (move: Move | null, opts?: SolitaireChessOptions) => void;
    /** A callback to stop solitaire mode. */
    stop: () => void;
    /** A callback to invoke when the user makes a move on the board. */
    onMove: (board: BoardApi, chess: Chess, primMove: PrimitiveMove) => void;
    /** The results of the solitaire mode. */
    results: SolitaireResults;
}

export type SolitaireChessOptions = Partial<
    Pick<UseSolitaireChessResponse, 'playAs' | 'addWrongMoves'>
> & {
    /** The delay before the first move is played by the computer, if applicable. */
    firstMoveDelayMs?: number;
    /** The board object to use when reconciling with the chess object. */
    board?: BoardApi;
    /** Allow the user to play any move which checkmates, even if it isn't the mainline move. */
    allowDifferentMates?: boolean;
    /** A callback invoked when a wrong move is played. */
    onWrongMove?: () => void;
    /** A callback invoked when the full PGN is completed. */
    onComplete?: () => void;
};

export function useSolitaireChess(
    chess: Chess,
    board: BoardApi | undefined,
): UseSolitaireChessResponse {
    const [enabled, setEnabled] = useState(false);
    const [playAs, setPlayAs] = useState<PlayAs>('both');
    const [addWrongMoves, setAddWrongMoves] = useState(true);
    const [showGlyphs] = useLocalStorage(ShowGlyphsKey, false);
    const [currentMove, setCurrentMove] = useState<Move | null>(null);
    const lastMove = useRef<Move | null>(null);
    const incorrectMoves = useRef<SimpleMove[]>([]);
    const [results, setResults] = useState<SolitaireResults>(EMPTY_SOLITAIRE_RESULTS);
    const onWrongMove = useRef<() => void>(undefined);
    const onComplete = useRef<() => void>(undefined);
    const allowDifferentMates = useRef(false);
    const [correctSound] = useLocalStorage(CORRECT_SOUND_KEY, true);
    const [incorrectSound] = useLocalStorage(INCORRECT_SOUND_KEY, true);
    const t = useTranslations('analysisBoard.underboard.tools');
    const incorrectMoveComment = t('incorrectMoveComment');

    const start = useCallback(
        (move: Move | null, opts?: SolitaireChessOptions) => {
            if (opts?.playAs) {
                setPlayAs(opts.playAs);
            }
            if (opts?.addWrongMoves !== undefined) {
                setAddWrongMoves(opts.addWrongMoves);
            }
            allowDifferentMates.current = opts?.allowDifferentMates ?? false;
            onWrongMove.current = opts?.onWrongMove;
            onComplete.current = opts?.onComplete;

            chess.seek(move);
            reconcile(chess, board, showGlyphs);
            incorrectMoves.current = [];
            setResults(EMPTY_SOLITAIRE_RESULTS);
            setCurrentMove(move);
            setEnabled(true);
            lastMove.current = chess.lastMove();

            const finalPlayAs = opts?.playAs ?? playAs;
            if (
                finalPlayAs !== 'both' &&
                chess.turn(move) !== finalPlayAs[0] &&
                chess.nextMove(move)
            ) {
                waitForOpponentMove({
                    chess,
                    board: opts?.board ?? board,
                    showGlyphs,
                    move: chess.nextMove(move),
                    setCurrentMove,
                    delay: opts?.firstMoveDelayMs,
                });
            }
        },
        [setEnabled, chess, board, showGlyphs, playAs],
    );

    const stop = useCallback(() => {
        setEnabled(false);
    }, [setEnabled]);

    const onMove = useCallback(
        (board: BoardApi, chess: Chess, primMove: PrimitiveMove) => {
            if (
                currentMove &&
                (chess.currentMove() !== currentMove || currentMove === lastMove.current)
            ) {
                // If the user goes back in the game, we let them analyze freely
                defaultOnMove(showGlyphs)(board, chess, primMove);
                return;
            }

            const move = { from: primMove.orig, to: primMove.dest, promotion: primMove.promotion };
            const existingMove = chess.move(move, {
                previousMove: currentMove,
                skipSeek: true,
                existingOnly: true,
            });
            const testMove = chess.move(move, { previousMove: currentMove, skipSeek: true });
            if (
                chess.isMainline(move) ||
                (allowDifferentMates.current && chess.isCheckmate(testMove))
            ) {
                if (correctSound) {
                    const audio = new Audio('/static/sounds/puzzles_correct_move.mp3');
                    void audio.play();
                }
                handleCorrectMove({
                    chess,
                    board,
                    showGlyphs,
                    playAs,
                    move,
                    incorrectMoves,
                    setCurrentMove,
                    setResults,
                });
                return;
            }

            if (incorrectSound) {
                const audio = new Audio('/static/sounds/puzzles_incorrect_move.mp3');
                void audio.play();
            }

            incorrectMoves.current.push(move);
            if (!addWrongMoves && existingMove === null) {
                chess.delete(testMove);
            } else if (
                addWrongMoves &&
                testMove &&
                !testMove.commentAfter?.includes(incorrectMoveComment)
            ) {
                const newComment = (testMove.commentAfter ?? '') + '\n\n' + incorrectMoveComment;
                chess.setComment(newComment.trim(), CommentType.After, testMove);
            }
            board.set({
                movable: {},
                premovable: {
                    enabled: false,
                },
                drawable: {
                    autoShapes: [{ orig: move.to, customSvg: { html: incorrectMoveGlyphHtml } }],
                    eraseOnClick: false,
                },
            });
            setTimeout(() => {
                reconcile(chess, board, showGlyphs);
            }, 500);
            onWrongMove.current?.();
        },
        [
            showGlyphs,
            addWrongMoves,
            currentMove,
            playAs,
            incorrectSound,
            correctSound,
            incorrectMoveComment,
        ],
    );

    const complete = currentMove === lastMove.current || chess.isCheckmate(currentMove);
    useEffect(() => {
        if (complete) {
            onComplete.current?.();
        }
    }, [complete]);

    return useMemo(
        () => ({
            enabled,
            playAs,
            setPlayAs,
            addWrongMoves,
            setAddWrongMoves,
            complete,
            currentMove,
            start,
            stop,
            onMove,
            results,
        }),
        [addWrongMoves, enabled, onMove, start, stop, currentMove, playAs, results, complete],
    );
}

function handleCorrectMove({
    chess,
    board,
    showGlyphs,
    playAs,
    move,
    incorrectMoves,
    setCurrentMove,
    setResults,
}: {
    chess: Chess;
    board: BoardApi;
    showGlyphs: boolean;
    playAs: PlayAs;
    move: SimpleMove;
    incorrectMoves: RefObject<SimpleMove[]>;
    setCurrentMove: (v: Move | null) => void;
    setResults: React.Dispatch<React.SetStateAction<SolitaireResults>>;
}) {
    const nextMove = chess.move(move);
    const color = nextMove?.color === Color.white ? 'white' : 'black';
    setResults((results) => ({
        ...results,
        [color]: {
            correct: results[color].correct + (incorrectMoves.current.length ? 0 : 1),
            total: results[color].total + 1,
        },
    }));

    incorrectMoves.current = [];
    reconcile(chess, board, showGlyphs);
    board.set({
        drawable: {
            autoShapes: [{ orig: move.to, customSvg: { html: correctMoveGlyphHtml } }],
        },
    });
    const isComplete = nextMove === chess.history().at(-1) || chess.isCheckmate(nextMove);
    if (!isComplete && playAs !== 'both') {
        waitForOpponentMove({
            chess,
            board,
            showGlyphs,
            move: nextMove?.next ?? null,
            setCurrentMove,
        });
    } else {
        setCurrentMove(nextMove);
    }
}

function waitForOpponentMove({
    chess,
    board,
    showGlyphs,
    move,
    setCurrentMove,
    delay = 500,
}: {
    chess: Chess;
    board: BoardApi | undefined;
    showGlyphs: boolean;
    move: Move | null;
    setCurrentMove: (v: Move | null) => void;
    delay?: number;
}) {
    board?.set({
        movable: {},
        premovable: { enabled: false },
    });
    setCurrentMove(move);
    setTimeout(() => {
        chess.seek(move);
        reconcile(chess, board, showGlyphs);
    }, delay);
}
