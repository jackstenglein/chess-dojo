'use client';

import { BoardApi, reconcile } from '@/board/Board';
import { logger } from '@/logging/logger';
import { Chess, FEN } from '@jackstenglein/chess';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TimeControl } from './PlayBotSetup';
import { callMaiaApi, MaiaRating } from './maiaengine';
import { getOpeningBookMove, OPENING_PLY_LIMIT } from './openingBook';

export type PlayerColor = 'white' | 'black';

export interface MoveRecord {
    san: string;
    uci: string;
    fen: string;
    ms: number;
}

export type GameResult = 'white' | 'black' | 'draw' | null;
export type GameOverReason =
    | 'checkmate'
    | 'stalemate'
    | 'insufficient'
    | 'repetition'
    | 'fifty-move'
    | 'resign'
    | 'timeout'
    | null;

export interface StartOpts {
    playerColor: PlayerColor;
    maiaRating: MaiaRating;
    startFen?: string;
    timeControl: TimeControl;
}

export interface ClockState {
    whiteMs: number | null; // null = unlimited
    blackMs: number | null;
    /** Which side's clock is currently running */
    running: 'white' | 'black' | null;
}

export interface UseMaiaGameResult {
    moves: MoveRecord[];
    playerColor: PlayerColor;
    playerToMove: boolean;
    botThinking: boolean;
    result: GameResult;
    reason: GameOverReason;
    maiaRating: MaiaRating;
    maiaWinProb: number | null;
    startFen: string;
    gameActive: boolean;
    timeControl: TimeControl;
    clock: ClockState;

    onBoardInit: (board: BoardApi, chess: Chess) => void;
    onPlayerMoved: (uci: string) => void;
    startGame: (opts: StartOpts) => void;
    resign: () => void;
}

function detectTermination(chess: Chess): { result: GameResult; reason: GameOverReason } {
    if (!chess.isGameOver()) return { result: null, reason: null };
    if (chess.isCheckmate()) {
        const loser = chess.turn() === 'w' ? 'white' : 'black';
        return { result: loser === 'white' ? 'black' : 'white', reason: 'checkmate' };
    }
    if (chess.isStalemate()) return { result: 'draw', reason: 'stalemate' };
    if (chess.isInsufficientMaterial()) return { result: 'draw', reason: 'insufficient' };
    if (chess.isThreefoldRepetition()) return { result: 'draw', reason: 'repetition' };
    if (chess.isDraw()) return { result: 'draw', reason: 'fifty-move' };
    return { result: 'draw', reason: null };
}

/**
 * Returns a random delay for the bot to make its move. If the ply
 * count is past the opening, the bot will think longer.
 * @param plyCount The current ply count of the game.
 * @returns The delay in milliseconds for the bot to play.
 */
function botDelay(plyCount: number): number {
    if (plyCount >= OPENING_PLY_LIMIT) {
        return 1000 + Math.random() * 8000;
    }
    return 450 + Math.random() * 800;
}

const UNLIMITED_TC: TimeControl = { initialMs: 0, incrementMs: 0 };

export function useMaiaGame(): UseMaiaGameResult {
    const chessRef = useRef<Chess | null>(null);
    const boardRef = useRef<BoardApi | null>(null);

    const [playerColor, setPlayerColor] = useState<PlayerColor>('white');
    const [maiaRating, setMaiaRating] = useState<MaiaRating>(1500);
    const [startFen, setStartFen] = useState<string>(FEN.start);
    const [gameActive, setGameActive] = useState(false);
    const [timeControl, setTimeControl] = useState<TimeControl>(UNLIMITED_TC);

    const [moves, setMoves] = useState<MoveRecord[]>([]);
    const [result, setResult] = useState<GameResult>(null);
    const [reason, setReason] = useState<GameOverReason>(null);
    const [maiaWinProb, setMaiaWinProb] = useState<number | null>(null);
    const [botThinking, setBotThinking] = useState(false);
    const [tick, setTick] = useState(0);

    // Clock
    const [clock, setClock] = useState<ClockState>({ whiteMs: null, blackMs: null, running: null });

    // Stable refs
    const playerColorRef = useRef<PlayerColor>('white');
    const resultRef = useRef<GameResult>(null);
    const maiaRatingRef = useRef<MaiaRating>(1500);
    const gameActiveRef = useRef(false);
    const cancelBotRef = useRef(false);
    const moveStartRef = useRef(Date.now());
    const timeControlRef = useRef<TimeControl>(UNLIMITED_TC);
    // Track last tick timestamp for accurate countdown
    const clockTickRef = useRef<number>(Date.now());
    const clockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    playerColorRef.current = playerColor;
    resultRef.current = result;
    maiaRatingRef.current = maiaRating;
    gameActiveRef.current = gameActive;
    timeControlRef.current = timeControl;

    const refresh = useCallback(() => setTick((t) => t + 1), []);

    const chess = chessRef.current;
    const playerToMove =
        gameActive &&
        result === null &&
        !!chess &&
        (chess.turn(chess.lastMove()) === 'w') === (playerColor === 'white');

    const startClockInterval = useCallback(() => {
        if (clockIntervalRef.current) clearInterval(clockIntervalRef.current);
        clockTickRef.current = Date.now();

        clockIntervalRef.current = setInterval(() => {
            if (resultRef.current !== null) {
                if (clockIntervalRef.current) clearInterval(clockIntervalRef.current);
                return;
            }

            const now = Date.now();
            const elapsed = now - clockTickRef.current;
            clockTickRef.current = now;

            setClock((prev) => {
                if (!prev.running) return prev;
                const side = prev.running;
                const current = side === 'white' ? prev.whiteMs : prev.blackMs;
                if (current === null) return prev; // unlimited

                const next = Math.max(0, current - elapsed);

                if (next === 0) {
                    // Timeout — flag the losing side
                    if (clockIntervalRef.current) clearInterval(clockIntervalRef.current);
                    const winner: GameResult = side === 'white' ? 'black' : 'white';
                    setResult(winner);
                    setReason('timeout');
                    setClock((c) => ({ ...c, running: null }));
                    return {
                        ...prev,
                        [side === 'white' ? 'whiteMs' : 'blackMs']: 0,
                        running: null,
                    };
                }

                return { ...prev, [side === 'white' ? 'whiteMs' : 'blackMs']: next };
            });
        }, 100);
    }, []);

    const stopClock = useCallback(() => {
        if (clockIntervalRef.current) {
            clearInterval(clockIntervalRef.current);
            clockIntervalRef.current = null;
        }
        setClock((prev) => ({ ...prev, running: null }));
    }, []);

    // Add increment to the side that just moved and switch clock to opponent
    const switchClock = useCallback(
        (justMoved: 'white' | 'black') => {
            const tc = timeControlRef.current;
            if (tc.initialMs === null) return; // unlimited, no clock needed

            setClock((prev) => {
                const inc = tc.incrementMs;
                const updatedMs =
                    justMoved === 'white'
                        ? { whiteMs: prev.whiteMs !== null ? prev.whiteMs + inc : null }
                        : { blackMs: prev.blackMs !== null ? prev.blackMs + inc : null };
                return {
                    ...prev,
                    ...updatedMs,
                    running: justMoved === 'white' ? 'black' : 'white',
                };
            });
            clockTickRef.current = Date.now();
            if (!clockIntervalRef.current) startClockInterval();
        },
        [startClockInterval],
    );

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (clockIntervalRef.current) clearInterval(clockIntervalRef.current);
        };
    }, []);

    // ------------------------------------------------------------------
    // Bot move
    // ------------------------------------------------------------------
    const makeBotMove = useCallback(async () => {
        const chess = chessRef.current;
        const board = boardRef.current;
        if (!chess || !board) return;
        if (!gameActiveRef.current) return;
        if (cancelBotRef.current) return;
        if (resultRef.current !== null) return;

        setBotThinking(true);
        try {
            const fen = chess.fen();
            const rating = maiaRatingRef.current;
            const plyCount = chess.plyCount();

            // Opening book (Posira API) for the first OPENING_PLY_LIMIT half-moves.
            // Falls back to Maia silently if no book move is found.
            let bestMove: string | null = null;

            const bookMove = await getOpeningBookMove(fen, rating, plyCount);
            if (bookMove) {
                bestMove = bookMove.uci;
            } else if (!cancelBotRef.current) {
                const evalResult = await callMaiaApi(fen, rating);
                const isBlack = fen.split(' ')[1] === 'b';
                setMaiaWinProb(isBlack ? 1 - evalResult.value : evalResult.value);
                bestMove = evalResult.bestMove || null;
            }

            await new Promise<void>((res) => setTimeout(res, botDelay(plyCount)));
            if (cancelBotRef.current) return;

            if (bestMove) {
                const elapsed = Date.now() - moveStartRef.current;
                moveStartRef.current = Date.now();

                const move = chess.move(bestMove, { previousMove: chess.lastMove() });
                if (move) {
                    reconcile(chess, board);
                    setMoves((prev) => [
                        ...prev,
                        {
                            san: move.san,
                            uci: move.uci ?? bestMove,
                            fen: move.fen ?? chess.fen(),
                            ms: elapsed,
                        },
                    ]);

                    const botColor = playerColorRef.current === 'white' ? 'black' : 'white';
                    switchClock(botColor);

                    const term = detectTermination(chess);
                    if (term.result !== null) {
                        setResult(term.result);
                        setReason(term.reason);
                        stopClock();
                    }
                    refresh();
                }
            }
        } catch (e) {
            logger.error('[MaiaBot] eval error:', e);
        } finally {
            if (!cancelBotRef.current) setBotThinking(false);
        }
    }, [refresh, switchClock, stopClock]);

    useEffect(() => {
        if (!gameActive) return;
        if (result !== null) return;
        if (playerToMove) return;
        if (botThinking) return;
        void makeBotMove();
    }, [tick, gameActive, result, playerToMove, botThinking, makeBotMove]);

    // ------------------------------------------------------------------
    // Board callbacks
    // ------------------------------------------------------------------

    const onBoardInit = useCallback(
        (board: BoardApi, chess: Chess) => {
            chessRef.current = chess;
            boardRef.current = board;
            refresh();
        },
        [refresh],
    );

    const onPlayerMoved = useCallback(
        (uci: string) => {
            const chess = chessRef.current;
            if (!chess) return;
            const lastMove = chess.currentMove();
            if (!lastMove) return;
            const elapsed = Date.now() - moveStartRef.current;
            moveStartRef.current = Date.now();

            setMoves((prev) => [
                ...prev,
                {
                    san: lastMove.san,
                    uci: lastMove.uci ?? uci,
                    fen: lastMove.fen ?? chess.fen(),
                    ms: elapsed,
                },
            ]);

            // Switch clock after player move
            switchClock(playerColorRef.current);

            const term = detectTermination(chess);
            if (term.result !== null) {
                setResult(term.result);
                setReason(term.reason);
                stopClock();
            }
            refresh();
        },
        [refresh, switchClock, stopClock],
    );

    // ------------------------------------------------------------------
    // Public actions
    // ------------------------------------------------------------------

    const startGame = useCallback(
        (opts: StartOpts) => {
            cancelBotRef.current = true;
            if (clockIntervalRef.current) clearInterval(clockIntervalRef.current);
            clockIntervalRef.current = null;
            setBotThinking(false);
            setMoves([]);
            setResult(null);
            setReason(null);
            setMaiaWinProb(null);
            setPlayerColor(opts.playerColor);
            playerColorRef.current = opts.playerColor;
            setMaiaRating(opts.maiaRating);
            maiaRatingRef.current = opts.maiaRating;
            setStartFen(opts.startFen || FEN.start);
            setTimeControl(opts.timeControl);
            timeControlRef.current = opts.timeControl;
            setGameActive(true);
            gameActiveRef.current = true;
            moveStartRef.current = Date.now();

            // Init clocks
            const initMs = opts.timeControl.initialMs;
            const initClock: ClockState = {
                whiteMs: initMs,
                blackMs: initMs,
                running: null, // white's clock starts when they make their first move
            };
            setClock(initClock);

            // If player is black, bot (white) moves first — start white's clock immediately
            // White's clock runs until white makes a move; we start it now for the bot
            if (opts.playerColor === 'black' && initMs !== null) {
                setTimeout(() => {
                    setClock((c) => ({ ...c, running: 'white' }));
                    clockTickRef.current = Date.now();
                    startClockInterval();
                }, 100);
            } else if (opts.playerColor === 'white' && initMs !== null) {
                // Player is white — start white's clock immediately (player moves first)
                setTimeout(() => {
                    setClock((c) => ({ ...c, running: 'white' }));
                    clockTickRef.current = Date.now();
                    startClockInterval();
                }, 100);
            }

            setTimeout(() => {
                cancelBotRef.current = false;
                refresh();
            }, 80);
        },
        [refresh, startClockInterval],
    );

    const resign = useCallback(() => {
        if (resultRef.current !== null) return;
        cancelBotRef.current = true;
        if (clockIntervalRef.current) clearInterval(clockIntervalRef.current);
        clockIntervalRef.current = null;
        setBotThinking(false);
        setResult(playerColorRef.current === 'white' ? 'black' : 'white');
        setReason('resign');
        setClock((c) => ({ ...c, running: null }));
    }, []);

    return {
        moves,
        playerColor,
        playerToMove,
        botThinking,
        result,
        reason,
        maiaRating,
        maiaWinProb,
        startFen,
        gameActive,
        timeControl,
        clock,
        onBoardInit,
        onPlayerMoved,
        startGame,
        resign,
    };
}
