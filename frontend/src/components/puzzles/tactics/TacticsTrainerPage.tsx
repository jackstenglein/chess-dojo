'use client';

import { BoardApi, PrimitiveMove, reconcile } from '@/board/Board';
import { PieceSounds } from '@/board/pgn/boardTools/underboard/settings/ViewerSettings';
import PgnBoard from '@/board/pgn/PgnBoard';
import { useBoardSound } from '@/board/sounds/useBoardSound';
import {
    correctMoveGlyphHtml,
    incorrectMoveGlyphHtml,
} from '@/components/material/memorizegames/moveGlyphs';
import {
    INCORRECT_SOUND_KEY,
    PUZZLE_COORDINATE_SIZE,
    SOLVED_SOUND_KEY,
} from '@/components/puzzles/settings/puzzleSettingsKeys';
import {
    DEFAULT_SOLVED_SOUND,
    playSolvedSound,
    playWhoosh,
    SolvedSoundId,
} from '@/components/puzzles/settings/puzzleSounds';
import { Chess, Move } from '@jackstenglein/chess';
import { AttemptSubmission } from '@jackstenglein/chess-dojo-common/src/puzzlebase/runs';
import { AccessTime, CheckCircle, EmojiEvents, PlayArrow, Settings } from '@mui/icons-material';
import {
    Box,
    Button,
    CardContent,
    Container,
    Divider,
    FormControlLabel,
    IconButton,
    LinearProgress,
    Stack,
    Switch,
    Tooltip,
    Typography,
} from '@mui/material';
import { alpha, keyframes } from '@mui/material/styles';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { AttemptRecorder } from './attemptRecorder';
import { ConfettiBurst } from './ConfettiBurst';
import { PuzzleResult, SessionStreak } from './RushResults';
import {
    alternateFor,
    commonPrefixLen,
    countUniqueUserMoves,
    formatClock,
    isExpectedMove,
    ratingForPuzzle,
    solutionPgns,
    TACTICS_PUZZLES,
    TACTICS_RATING_KEY,
    TacticsPuzzle,
} from './tacticsPuzzles';
import { TrainerSettingsDialog } from './TrainerSettingsDialog';

/**
 * The pauses in the replay of the shared moves, in ms. A short wait before the shared move is
 * played, and then the opponent's reply follows it straight away, so there is no dead time.
 */
const REPLAY_START_MS = 350;
const REPLAY_REPLY_MS = 550;

type Phase = 'idle' | 'solving' | 'puzzleDone' | 'sessionDone';

function vibrate(pattern: number | number[]) {
    try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    } catch {
        // vibration not supported — ignore
    }
}

function playSample(src: string, enabled: boolean) {
    if (!enabled) return;
    try {
        const audio = new Audio(src);
        void audio.play().catch(() => undefined);
    } catch {
        // autoplay blocked — ignore
    }
}

export interface TacticsTrainerPageProps {
    /** The puzzles to play, in order. Defaults to the built-in samples. */
    puzzles?: TacticsPuzzle[];
    /** Start playing straight away instead of showing the start screen. */
    autoStart?: boolean;
    /** Whether to show the demo rating that is kept in this browser. */
    showRating?: boolean;
    /**
     * Called when a puzzle ends, either finished or left, with a record of every move the solver
     * tried and how long each took. Not called for a puzzle they never touched.
     */
    onPuzzleFinished?: (attempt: AttemptSubmission) => void;
    /**
     * Ends the session after this many seconds. The puzzle in progress can still be finished.
     * The clock counts down instead of up.
     */
    timeLimitSeconds?: number;
    /**
     * Whether the session has no set number of puzzles: it goes on until time runs out, the
     * puzzles do, or the solver ends it. The count and progress bar are not shown.
     */
    endless?: boolean;
    /** Details of a finished puzzle, shown above the PGN beside the board. */
    renderPuzzleInfo?: (puzzle: TacticsPuzzle) => ReactNode;
    /** Shown under the PGN beside the board once a puzzle is finished, such as its tags. */
    renderPuzzleFooter?: (puzzle: TacticsPuzzle) => ReactNode;
    /** Extra controls under the result of a finished puzzle, such as suggesting tags for it. */
    renderPuzzleDone?: (puzzle: TacticsPuzzle) => ReactNode;
    /** Called instead of restarting on the spot when the solver asks to train again. */
    onTrainAgain?: () => void;
}

export function TacticsTrainerPage({
    puzzles: puzzlesProp = TACTICS_PUZZLES,
    autoStart = false,
    showRating = true,
    onPuzzleFinished,
    timeLimitSeconds,
    endless = false,
    renderPuzzleDone,
    renderPuzzleInfo,
    renderPuzzleFooter,
    onTrainAgain,
}: TacticsTrainerPageProps = {}) {
    const [phase, setPhase] = useState<Phase>('idle');
    const [jsStatus, setJsStatus] = useState('JS: loading…');
    const [jsErrors, setJsErrors] = useState<string[]>([]);

    useEffect(() => {
        setJsStatus('JS: running ✓');
        const onError = (e: ErrorEvent) =>
            setJsErrors((prev) =>
                prev.length >= 3 ? prev : [...prev, String(e.message || e.error || 'error')],
            );
        const onRejection = (e: PromiseRejectionEvent) =>
            setJsErrors((prev) =>
                prev.length >= 3 ? prev : [...prev, `rejection: ${String(e.reason)}`.slice(0, 160)],
            );
        window.addEventListener('error', onError);
        window.addEventListener('unhandledrejection', onRejection);
        return () => {
            window.removeEventListener('error', onError);
            window.removeEventListener('unhandledrejection', onRejection);
        };
    }, []);
    const [puzzleIndex, setPuzzleIndex] = useState(0);
    const [lineIndex, setLineIndex] = useState(0);
    const [plyIndex, setPlyIndex] = useState(0);
    const [attempts, setAttempts] = useState(0);
    const [feedback, setFeedback] = useState<string | null>(null);
    /** An ALT solution the solver just played, waiting for them to choose what to do next. */
    /** Alternate lines the solver chose to play out, by puzzle. Each is added after the puzzle's own lines. */
    const [altLines, setAltLines] = useState<Record<string, string[]>>({});
    const puzzles = useMemo(
        () =>
            puzzlesProp.map((p) =>
                altLines[p.id] ? { ...p, lines: [...p.lines, altLines[p.id]] } : p,
            ),
        [puzzlesProp, altLines],
    );
    const [altPrompt, setAltPrompt] = useState<string | null>(null);
    const [feedbackKind, setFeedbackKind] = useState<'info' | 'error' | 'success'>('info');

    const [mistakes, setMistakes] = useState(0);
    // Wrong moves on the puzzle in front of the solver, for the result.
    const [puzzleMistakes, setPuzzleMistakes] = useState(0);
    // Puzzles solved in a row without a mistake, the best run of the session, and how hard the
    // puzzles finished so far were. Streaks end at the first mistake or reveal, as in a rush.
    const [streak, setStreak] = useState(0);
    const [results, setResults] = useState<PuzzleResult[]>([]);
    const streakRef = useRef(0);
    // Whether the puzzle on screen has gone without a mistake or a reveal so far.
    const puzzleCleanRef = useRef(true);
    const resetStreak = useCallback(() => {
        streakRef.current = 0;
        setStreak(0);
    }, []);
    // Credit earned over the session's moves: 1 for a move found first time, a half for one found
    // second time, nothing for one that was shown. The same scoring as a puzzle's accuracy.
    const [creditEarned, setCreditEarned] = useState(0);
    const [userMovesTotal, setUserMovesTotal] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const elapsedRef = useRef(0);
    elapsedRef.current = elapsed;
    const timeUp = timeLimitSeconds !== undefined && elapsed >= timeLimitSeconds;
    const [opponentThinking, setOpponentThinking] = useState(false);
    const [lineComplete, setLineComplete] = useState(false);
    const [endedInMate, setEndedInMate] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    const [rating, setRating] = useLocalStorage(TACTICS_RATING_KEY, 800);
    const [displayedRating, setDisplayedRating] = useState(rating);
    const [lastGain, setLastGain] = useState(0);

    const [incorrectSound] = useLocalStorage(INCORRECT_SOUND_KEY, true);
    const [pieceSoundsEnabled, setPieceSoundsEnabled] = useLocalStorage<boolean>(
        PieceSounds.key,
        PieceSounds.default,
    );
    const { playSound } = useBoardSound(pieceSoundsEnabled);
    // Read inside timers, which would otherwise see the setting as it was when they started.
    const pieceSoundsEnabledRef = useRef(pieceSoundsEnabled);
    pieceSoundsEnabledRef.current = pieceSoundsEnabled;
    const [solvedSound] = useLocalStorage<SolvedSoundId>(SOLVED_SOUND_KEY, DEFAULT_SOLVED_SOUND);
    const solvedSoundRef = useRef(solvedSound);
    solvedSoundRef.current = solvedSound;
    const [settingsOpen, setSettingsOpen] = useState(false);

    const chessRef = useRef<Chess | null>(null);
    const boardRef = useRef<BoardApi | null>(null);
    const showGlyphsRef = useRef(false);
    const lockedRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const mistakesRef = useRef(mistakes);
    mistakesRef.current = mistakes;
    const stateRef = useRef({ phase, puzzleIndex, lineIndex, plyIndex, attempts });
    stateRef.current = { phase, puzzleIndex, lineIndex, plyIndex, attempts };

    // Everything the solver tries on the current puzzle, kept for the record.
    const recorderRef = useRef<AttemptRecorder | undefined>(undefined);
    const onPuzzleFinishedRef = useRef(onPuzzleFinished);
    useEffect(() => {
        onPuzzleFinishedRef.current = onPuzzleFinished;
    });

    /**
     * Hands over the record of the current puzzle and starts a fresh one for the next. Does
     * nothing if the puzzle was already reported, or if they left without trying anything.
     */
    const reportPuzzle = useCallback((abandoned: boolean) => {
        const recorder = recorderRef.current;
        recorderRef.current = undefined;
        if (!recorder || !onPuzzleFinishedRef.current) return;
        if (abandoned && !recorder.hasActivity) return;
        onPuzzleFinishedRef.current(recorder.finish(abandoned));
    }, []);

    const puzzle = puzzles[puzzleIndex];
    const line = puzzle.lines[lineIndex];
    // User moves are even plies (user is side to move at start).
    const awaitingUser = plyIndex % 2 === 0;
    const totalUserMoves = useMemo(
        () => puzzles.reduce((n, p) => n + countUniqueUserMoves(p.lines), 0),
        [puzzles],
    );

    const orientation = puzzle.userColor;
    const accuracy = userMovesTotal === 0 ? 100 : Math.round((100 * creditEarned) / userMovesTotal);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    useEffect(() => stopTimer, [stopTimer]);

    const startSession = useCallback(() => {
        setAltLines({});
        setPuzzleIndex(0);
        setLineIndex(0);
        setPlyIndex(0);
        setAttempts(0);
        setMistakes(0);
        setPuzzleMistakes(0);
        puzzleCleanRef.current = true;
        streakRef.current = 0;
        setStreak(0);
        setResults([]);
        setCreditEarned(0);
        setUserMovesTotal(0);
        setElapsed(0);
        setLineComplete(false);
        setEndedInMate(false);
        setShowConfetti(false);
        setFeedback(null);
        setLastGain(0);
        setPhase('solving');
        recorderRef.current = undefined;
        stopTimer();
        const t0 = Date.now();
        timerRef.current = setInterval(() => {
            setElapsed(Math.floor((Date.now() - t0) / 1000));
        }, 1000);
    }, [stopTimer]);

    // Breaks the finishLine <-> playOpponentReply call cycle: the reply
    // player reaches the current finisher through this ref, so neither
    // const reads the other before initialization (TDZ-safe).
    const finishLineRef = useRef<(mate: boolean) => void>(() => undefined);

    const playOpponentReply: (
        chess: Chess,
        board: BoardApi,
        replyPly: number,
        explicitLine?: string[],
        delayMs?: number,
    ) => void = useCallback(
        (
            chess: Chess,
            board: BoardApi,
            replyPly: number,
            explicitLine?: string[],
            delayMs = 650,
        ) => {
            const targetLine =
                explicitLine ??
                puzzles[stateRef.current.puzzleIndex].lines[stateRef.current.lineIndex];
            const reply = targetLine[replyPly];
            setOpponentThinking(true);
            lockedRef.current = true;
            board.set({ movable: {}, premovable: { enabled: false } });
            setTimeout(() => {
                try {
                    const moved = chess.move(reply);
                    if (moved) {
                        reconcile(chess, board, showGlyphsRef.current, playSound);
                        if (replyPly + 1 >= targetLine.length) {
                            finishLineRef.current(chess.isCheckmate());
                        } else {
                            setPlyIndex(replyPly + 1);
                        }
                    }
                } finally {
                    setOpponentThinking(false);
                    lockedRef.current = false;
                }
            }, delayMs);
        },
        [playSound, puzzles],
    );

    /**
     * Starts the next defense over from the beginning. The moves it shares with the line just
     * finished are put on the board at once, except the last of them, which is played out so the
     * solver sees it, followed by the opponent's different reply.
     *
     * The game is kept, not reloaded, so the PGN beside the board builds up over the whole puzzle:
     * every defense the solver has met stays in it as a variation, and a move that is already there
     * is followed, not added a second time.
     */
    const replayToBranch: (
        chess: Chess,
        board: BoardApi,
        targetLine: string[],
        targetPly: number,
    ) => void = useCallback(
        (chess: Chess, board: BoardApi, targetLine: string[], targetPly: number) => {
            // While it replays it is nobody's turn: the board is locked and the solver's clock for
            // the turn has not started.
            lockedRef.current = true;
            setOpponentThinking(true);
            setLineComplete(false);
            setAttempts(0);
            setFeedback(null);
            setPlyIndex(0);
            board.set({ movable: {}, premovable: { enabled: false } });
            // Only the last of the shared moves is shown being played. The ones before it are
            // already on the board by the time the solver looks.
            const lastShared = targetPly - 1;
            try {
                chess.seek(null);
                for (let i = 0; i < lastShared; i++) {
                    // A move that is already in the game is followed, not added a second time.
                    chess.move(targetLine[i]);
                }
            } catch {
                // Carry on from wherever the game is; the line is the puzzle's own.
            }
            reconcile(chess, board, showGlyphsRef.current);
            setPlyIndex(Math.max(0, lastShared));

            setTimeout(() => {
                if (stateRef.current.phase !== 'solving') return;
                if (targetPly > 0) {
                    try {
                        chess.move(targetLine[lastShared]);
                        reconcile(chess, board, showGlyphsRef.current, playSound);
                    } catch {
                        // The line is the puzzle's own, so this should not happen.
                    }
                    setPlyIndex(targetPly);
                }
                if (targetPly < targetLine.length && targetPly % 2 === 1) {
                    // The opponent's different reply, which starts this defense. It follows the
                    // shared move at once, with only the short pause that lets it be seen.
                    setOpponentThinking(false);
                    playOpponentReply(chess, board, targetPly, targetLine, REPLAY_REPLY_MS);
                } else {
                    lockedRef.current = false;
                    setOpponentThinking(false);
                    setPlyIndex(targetPly);
                    reconcile(chess, board, showGlyphsRef.current);
                }
            }, REPLAY_START_MS);
        },
        [playOpponentReply, playSound],
    );

    /** Shared transition when the current line is fully played. */
    const finishLine: (mate: boolean) => void = useCallback(
        (mate: boolean) => {
            setEndedInMate((m) => m || mate);
            setLineComplete(true);
            const isLastLine = lineIndex + 1 >= puzzle.lines.length;
            if (isLastLine) reportPuzzle(false);
            setFeedback(null);
            vibrate(mate ? [80, 40, 80, 40, 200] : [80, 40, 120]);
            if (mate) setShowConfetti(true);

            setTimeout(() => {
                if (stateRef.current.phase !== 'solving') return;
                if (!isLastLine) {
                    // Jump back to where the next defense diverges instead
                    // of replaying the shared opening moves.
                    const nextLine = puzzle.lines[lineIndex + 1];
                    const shared = commonPrefixLen(line, nextLine);
                    const chess = chessRef.current;
                    const board = boardRef.current;
                    if (chess && board) {
                        setLineIndex(lineIndex + 1);
                        if (pieceSoundsEnabledRef.current) playWhoosh();
                        replayToBranch(chess, board, nextLine, shared);
                    }
                } else {
                    // Puzzle complete — rating ticks up and persists.
                    const clean = puzzleCleanRef.current;
                    if (clean) {
                        streakRef.current += 1;
                        setStreak(streakRef.current);
                    }
                    setResults((all) => [
                        ...all,
                        { id: puzzle.id, rating: puzzle.rating, ok: clean },
                    ]);
                    const gain = ratingForPuzzle(mistakesRef.current);
                    setLastGain(gain);
                    setRating((r) => r + gain);
                    const outOfTime =
                        timeLimitSeconds !== undefined && elapsedRef.current >= timeLimitSeconds;
                    if (pieceSoundsEnabledRef.current) playSolvedSound(solvedSoundRef.current);
                    if (puzzleIndex + 1 < puzzles.length && !outOfTime) {
                        setPhase('puzzleDone');
                    } else {
                        setPhase('sessionDone');
                        stopTimer();
                        if (mate) setShowConfetti(true);
                    }
                }
            }, 1400);
        },
        [
            line,
            lineIndex,
            puzzle,
            puzzleIndex,
            puzzles,
            reportPuzzle,
            setRating,
            stopTimer,
            timeLimitSeconds,
            replayToBranch,
            playOpponentReply,
        ],
    );
    finishLineRef.current = finishLine;

    const advanceAfterUserMove = useCallback(
        (chess: Chess, board: BoardApi, nextPly: number, credit: number) => {
            if (credit > 0) setCreditEarned((n) => n + credit);
            setUserMovesTotal((n) => n + 1);
            setAttempts(0);
            setFeedback(null);

            if (nextPly >= line.length) {
                finishLine(chess.isCheckmate());
                return;
            }
            setPlyIndex(nextPly);
            // Odd plies belong to the opponent — played automatically.
            if (nextPly % 2 === 1) {
                playOpponentReply(chess, board, nextPly);
            }
        },
        [finishLine, line.length, playOpponentReply],
    );

    const handleBoardMove = useCallback(
        (board: BoardApi, chess: Chess, primMove: PrimitiveMove) => {
            const s = stateRef.current;
            if (s.phase !== 'solving' || lockedRef.current || lineComplete) return;
            if (s.plyIndex % 2 === 1) return; // opponent's turn — auto-played

            const currentLine = puzzles[s.puzzleIndex].lines[s.lineIndex];
            const expected = currentLine[s.plyIndex];

            // What did the user try? Validate without mutating.
            let attempted: Move | null = null;
            try {
                attempted = chess.validateMove(
                    { from: primMove.orig, to: primMove.dest, promotion: primMove.promotion },
                    { previousMove: chess.currentMove() },
                );
            } catch {
                attempted = null;
            }
            if (!attempted) {
                // Illegal move — snap back with feedback.
                playSample('/static/sounds/puzzles_incorrect_move.mp3', incorrectSound);
                vibrate(120);
                board.set({
                    drawable: {
                        autoShapes: [
                            { orig: primMove.dest, customSvg: { html: incorrectMoveGlyphHtml } },
                        ],
                        eraseOnMovablePieceClick: false,
                    },
                });
                setTimeout(() => reconcile(chess, board, showGlyphsRef.current), 550);
                return;
            }

            if (isExpectedMove(attempted.san, expected)) {
                recorderRef.current?.recordCorrect(attempted.san);
                const moved = chess.move({
                    from: primMove.orig,
                    to: primMove.dest,
                    promotion: primMove.promotion,
                });
                if (!moved) return;
                reconcile(chess, board, showGlyphsRef.current, playSound);
                board.set({
                    drawable: {
                        autoShapes: [
                            { orig: primMove.dest, customSvg: { html: correctMoveGlyphHtml } },
                        ],
                    },
                });
                // Right first time earns the whole move, right on the second try half of it.
                advanceAfterUserMove(chess, board, s.plyIndex + 1, s.attempts === 0 ? 1 : 0.5);
            } else if (
                alternateFor(puzzles[s.puzzleIndex], currentLine, s.plyIndex, attempted.san)
            ) {
                // A marked alternate is neither right nor wrong. Nothing is said about the
                // best move: ALT2 only hints there is one, ALT lets the solver choose.
                const alternate = alternateFor(
                    puzzles[s.puzzleIndex],
                    currentLine,
                    s.plyIndex,
                    attempted.san,
                );
                lockedRef.current = true;
                board.set({ movable: {}, premovable: { enabled: false } });
                if (alternate?.kind === 'alt2') {
                    recorderRef.current?.recordAlternate(attempted.san, 'alt2');
                    setFeedback('Good move, but you have a better one!');
                    setFeedbackKind('info');
                    setTimeout(() => {
                        reconcile(chess, board, showGlyphsRef.current);
                        lockedRef.current = false;
                    }, 650);
                } else {
                    setAltPrompt(attempted.san);
                    setFeedback('That works too. Would you like to try again?');
                    setFeedbackKind('success');
                }
            } else {
                // Wrong move — visible rollback, second attempt allowed.
                recorderRef.current?.recordWrong(attempted.san);
                puzzleCleanRef.current = false;
                resetStreak();
                const newAttempts = s.attempts + 1;
                setAttempts(newAttempts);
                setMistakes((n) => n + 1);
                setPuzzleMistakes((n) => n + 1);
                playSample('/static/sounds/puzzles_incorrect_move.mp3', incorrectSound);
                vibrate(120);
                lockedRef.current = true;
                board.set({
                    movable: {},
                    premovable: { enabled: false },
                    drawable: {
                        autoShapes: [
                            { orig: primMove.dest, customSvg: { html: incorrectMoveGlyphHtml } },
                        ],
                        eraseOnMovablePieceClick: false,
                    },
                });
                setFeedback(
                    newAttempts >= 2
                        ? `Second miss — the move was ${expected}. Playing it for you…`
                        : 'Not quite — try again!',
                );
                setFeedbackKind('error');
                setTimeout(() => {
                    reconcile(chess, board, showGlyphsRef.current);
                    lockedRef.current = false;
                    if (newAttempts >= 2) {
                        // Reveal: play the correct move for the user.
                        try {
                            const moved = chess.move(expected);
                            if (moved) {
                                recorderRef.current?.recordCorrect(expected, true);
                                reconcile(chess, board, showGlyphsRef.current, playSound);
                                advanceAfterUserMove(chess, board, s.plyIndex + 1, 0);
                            }
                        } catch {
                            setAttempts(0);
                        }
                    }
                }, 650);
            }
        },
        [advanceAfterUserMove, incorrectSound, lineComplete, playSound, puzzles, resetStreak],
    );

    /** The solver took an ALT solution and chose to look for another move. */
    const altTryAgain = useCallback(() => {
        const chess = chessRef.current;
        const board = boardRef.current;
        if (altPrompt) recorderRef.current?.recordAlternate(altPrompt, 'alt');
        setAltPrompt(null);
        setFeedback(null);
        if (chess && board) reconcile(chess, board, showGlyphsRef.current);
        lockedRef.current = false;
    }, [altPrompt]);

    /**
     * The solver took an ALT solution and asked to be shown the next move. The main line's move is
     * played for them, like a reveal: the move they found is noted, but the best move is shown, and
     * it counts as missed.
     */
    const altShowNext = useCallback(() => {
        const chess = chessRef.current;
        const board = boardRef.current;
        const s = stateRef.current;
        if (!chess || !board || !altPrompt) return;
        const currentLine = puzzles[s.puzzleIndex].lines[s.lineIndex];
        const expected = currentLine[s.plyIndex];

        recorderRef.current?.recordAlternate(altPrompt, 'alt');
        setAltPrompt(null);
        setFeedback(null);
        lockedRef.current = false;
        try {
            reconcile(chess, board, showGlyphsRef.current);
            if (!chess.move(expected)) return;
            recorderRef.current?.recordCorrect(expected, true);
            puzzleCleanRef.current = false;
            resetStreak();
            reconcile(chess, board, showGlyphsRef.current, playSound);
            advanceAfterUserMove(chess, board, s.plyIndex + 1, 0);
        } catch {
            setFeedback(null);
        }
    }, [advanceAfterUserMove, altPrompt, playSound, puzzles, resetStreak]);

    const nextPuzzle = useCallback(() => {
        if (timeLimitSeconds !== undefined && elapsedRef.current >= timeLimitSeconds) {
            // The clock ran out while the solver was reading the result.
            setPhase('sessionDone');
            stopTimer();
            return;
        }
        setPuzzleMistakes(0);
        puzzleCleanRef.current = true;
        setPuzzleIndex((i) => i + 1);
        setLineIndex(0);
        setPlyIndex(0);
        setAttempts(0);
        setLineComplete(false);
        setFeedback(null);
        setLastGain(0);
        setPhase('solving');
    }, [stopTimer, timeLimitSeconds]);

    // The space bar goes on to the next puzzle once one is solved. It is taken before the analysis
    // board can use it (to play the engine's move), and left alone in a text field or a dialog.
    useEffect(() => {
        if (phase !== 'puzzleDone' || settingsOpen) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.code !== 'Space' && event.key !== ' ') return;
            if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
                return;
            }
            const target = event.target as HTMLElement | null;
            if (
                target?.closest(
                    'input, textarea, select, [contenteditable="true"], [role="dialog"]',
                )
            ) {
                return;
            }
            event.preventDefault();
            event.stopImmediatePropagation();
            // A button that has focus would otherwise be pressed by the space bar as well.
            (document.activeElement as HTMLElement | null)?.blur();
            nextPuzzle();
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [phase, settingsOpen, nextPuzzle]);

    // Start the clock on each of the solver's turns, and on the puzzle itself with the first one.
    useEffect(() => {
        if (phase !== 'solving' || opponentThinking || lineComplete || !awaitingUser) return;
        const expected = puzzle.lines[lineIndex]?.[plyIndex];
        if (!expected) return;
        if (recorderRef.current?.puzzleId !== puzzle.id) {
            recorderRef.current = new AttemptRecorder(puzzle.id);
        }
        recorderRef.current.beginTurn(lineIndex, plyIndex, expected);
    }, [phase, opponentThinking, lineComplete, awaitingUser, puzzle, lineIndex, plyIndex]);

    // Leaving in the middle of a puzzle still counts: report it as abandoned.
    useEffect(
        () => () => {
            if (stateRef.current.phase === 'solving') reportPuzzle(true);
        },
        [reportPuzzle],
    );

    useEffect(() => {
        if (autoStart) startSession();
    }, [autoStart, startSession]);

    // Animate the rating tick-up like the checkmate trainer.
    useEffect(() => {
        if (displayedRating === rating || phase === 'idle') return;
        const duration = 750;
        const start = displayedRating;
        const target = rating;
        let raf = 0;
        const t0 = performance.now();
        const animate = (now: number) => {
            const p = Math.min((now - t0) / duration, 1);
            setDisplayedRating(Math.floor(start + p * (target - start)));
            if (p < 1) raf = requestAnimationFrame(animate);
        };
        raf = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(raf);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rating]);

    // The board remounts per line (key), so the position resets for every
    // defense via onInitialize. Restart reuses the same path.

    // Once a puzzle is done the board shows its whole annotated solution, variations and comments
    // included, in the move list at the side, like any PGN.
    const reviewPgn =
        (phase === 'puzzleDone' || phase === 'sessionDone') && puzzle.solutionPgn
            ? puzzle.solutionPgn
            : undefined;

    const progress =
        totalUserMoves === 0
            ? 0
            : Math.min(100, Math.round((100 * userMovesTotal) / totalUserMoves));

    return (
        <Container maxWidth={false} sx={{ py: { xs: 2, sm: 4 } }}>
            {showConfetti && <ConfettiBurst onDone={() => setShowConfetti(false)} />}
            {settingsOpen && <TrainerSettingsDialog onClose={() => setSettingsOpen(false)} />}

            {phase === 'idle' && (
                <Stack sx={{ maxWidth: 640, mx: 'auto', gap: 2 }}>
                    <Typography variant='h4' sx={{ fontWeight: 'bold' }}>
                        Dojo Tactics Trainer
                    </Typography>
                    <Typography color='text.secondary'>
                        Solve each position against every defense. Wrong moves get a second chance —
                        miss twice and the move is shown. No hints.
                    </Typography>
                    <Button
                        variant='contained'
                        size='large'
                        startIcon={<PlayArrow />}
                        onClick={startSession}
                        sx={{ minHeight: 52, fontSize: '1.1rem' }}
                    >
                        Start — timer begins on first puzzle
                    </Button>
                    <Typography id='tactics-js-status' variant='caption' color='text.secondary'>
                        {jsStatus}
                    </Typography>
                    <span id='tactics-js-errors' />
                    {jsErrors.map((err, i) => (
                        <Typography key={i} variant='caption' color='error'>
                            Error: {err}
                        </Typography>
                    ))}
                </Stack>
            )}

            {phase !== 'idle' && (
                <PgnBoard
                    key={reviewPgn ? `${puzzle.id}-review` : puzzle.id}
                    largeBoard
                    showPlayerHeaders={false}
                    fen={reviewPgn ? undefined : puzzle.fen}
                    pgn={reviewPgn}
                    startOrientation={orientation}
                    initialUnderboardTab='tactics'
                    // Once the puzzle is over the board is a normal analysis board.
                    disableEngine={!reviewPgn}
                    disableNullMoves={!reviewPgn}
                    onInitialize={(board, chess) => {
                        // Reviewing the finished puzzle is plain analysis: nothing to track.
                        if (reviewPgn) return;
                        chessRef.current = chess;
                        boardRef.current = board;
                        // Solver to move from the start.
                        reconcile(chess, board, showGlyphsRef.current);
                    }}
                    slotProps={{
                        pgnText: { hideResultDivider: true },
                        board: {
                            defaultCoordinateSize: PUZZLE_COORDINATE_SIZE,
                            ...(reviewPgn ? {} : { onMove: handleBoardMove }),
                        },
                    }}
                    slots={
                        reviewPgn
                            ? renderPuzzleInfo || renderPuzzleFooter
                                ? {
                                      // Stockfish and the notation come first, then the result.
                                      // Under it go the puzzle's details, and under those its tags.
                                      pgnFooter: (
                                          <>
                                              {renderPuzzleInfo && (
                                                  <Box
                                                      sx={{
                                                          // Some room under the result, then a line.
                                                          mt: 4,
                                                          borderTop: 1,
                                                          borderColor: 'divider',
                                                          pb: 1,
                                                          flexShrink: 0,
                                                      }}
                                                  >
                                                      {renderPuzzleInfo(puzzle)}
                                                  </Box>
                                              )}
                                              {renderPuzzleFooter?.(puzzle)}
                                          </>
                                      ),
                                  }
                                : undefined
                            : {
                                  // While solving, a sticker in the middle of the right side says who
                                  // is to play.
                                  overPgnText: <SideToPlay color={puzzle.userColor} wide />,
                              }
                    }
                    underboardTabs={[
                        {
                            name: 'tactics',
                            tooltip: 'Tactics trainer',
                            icon: <EmojiEvents />,
                            element: (
                                <CardContent>
                                    {/* The clock stays put, whether the puzzle is being solved or is over. */}
                                    <Stack
                                        direction='row'
                                        sx={{ mb: 2, alignItems: 'flex-start', gap: 1 }}
                                    >
                                        <Box sx={{ flexGrow: 1 }}>
                                            <SessionClock
                                                elapsed={elapsed}
                                                limit={timeLimitSeconds}
                                            />
                                        </Box>
                                        <Tooltip title='Settings'>
                                            <IconButton
                                                aria-label='Settings'
                                                onClick={() => setSettingsOpen(true)}
                                            >
                                                <Settings />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                    {phase === 'puzzleDone' || phase === 'sessionDone' ? (
                                        <Stack sx={{ gap: 2 }}>
                                            <SolvedBanner mistakes={puzzleMistakes} />
                                            {phase === 'sessionDone' && (
                                                <Typography
                                                    sx={{ fontWeight: 'bold', textAlign: 'center' }}
                                                >
                                                    {endedInMate
                                                        ? 'Session complete — checkmate! 🎉'
                                                        : timeUp
                                                          ? 'Time’s up!'
                                                          : 'Session complete!'}
                                                </Typography>
                                            )}
                                            <Stack sx={{ gap: 1.5 }}>
                                                {phase === 'puzzleDone' ? (
                                                    <>
                                                        <Button
                                                            variant='contained'
                                                            onClick={nextPuzzle}
                                                            sx={{ minHeight: 48 }}
                                                        >
                                                            Next puzzle
                                                        </Button>
                                                        {endless && (
                                                            <Button
                                                                variant='outlined'
                                                                color='error'
                                                                onClick={() => {
                                                                    setPhase('sessionDone');
                                                                    stopTimer();
                                                                }}
                                                            >
                                                                End session
                                                            </Button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <Button
                                                        onClick={onTrainAgain ?? startSession}
                                                        sx={{ minHeight: 48 }}
                                                    >
                                                        Train again
                                                    </Button>
                                                )}
                                            </Stack>
                                            <Divider />
                                            {reviewPgn ? (
                                                renderPuzzleInfo ? null : (
                                                    <Typography sx={{ fontWeight: 'bold' }}>
                                                        {puzzle.title}
                                                    </Typography>
                                                )
                                            ) : (
                                                <SolutionReveal
                                                    title={puzzle.title}
                                                    lines={puzzlesProp[puzzleIndex].lines}
                                                    fen={puzzle.fen}
                                                />
                                            )}
                                            {renderPuzzleDone?.(puzzle)}
                                            <Divider />
                                            <Stack sx={{ gap: 0.75 }}>
                                                <Typography
                                                    variant='overline'
                                                    sx={{
                                                        color: 'text.secondary',
                                                        lineHeight: 1.4,
                                                    }}
                                                >
                                                    {phase === 'puzzleDone'
                                                        ? 'Session so far'
                                                        : 'This session'}
                                                </Typography>
                                                <Stack
                                                    direction='row'
                                                    sx={{ gap: 1, flexWrap: 'wrap' }}
                                                >
                                                    <StatTile
                                                        label='Puzzles'
                                                        value={results.filter((r) => r.ok).length}
                                                        compact
                                                    />
                                                    <StatTile
                                                        label='Accuracy'
                                                        value={`${accuracy}%`}
                                                        compact
                                                    />
                                                    <StatTile
                                                        label='Mistakes'
                                                        value={mistakes}
                                                        compact
                                                    />
                                                </Stack>
                                                {/* The run so far, under the session's numbers. */}
                                                <Box sx={{ mt: 1.25 }}>
                                                    <SessionStreak
                                                        results={results}
                                                        streak={streak}
                                                        showCount={false}
                                                    />
                                                </Box>
                                                {showRating && (
                                                    <Typography
                                                        variant='body2'
                                                        color='text.secondary'
                                                    >
                                                        {phase === 'puzzleDone'
                                                            ? `Rating ${Math.round(displayedRating)}${lastGain > 0 ? ` (+${lastGain})` : ''}`
                                                            : `Final rating ${Math.round(rating)} (saved for next time)`}
                                                    </Typography>
                                                )}
                                            </Stack>
                                        </Stack>
                                    ) : (
                                        <Stack sx={{ gap: 2 }}>
                                            <Stack sx={{ gap: 1.5 }}>
                                                {/* Like a puzzle rush: the run so far. */}
                                                <SessionStreak results={results} streak={streak} />
                                                {timeUp && (
                                                    <Typography variant='body2' color='error'>
                                                        Time’s up. Finish this puzzle.
                                                    </Typography>
                                                )}
                                                {!endless && (
                                                    <LinearProgress
                                                        variant='determinate'
                                                        value={progress}
                                                    />
                                                )}
                                            </Stack>

                                            {feedback && (
                                                <Box
                                                    sx={{
                                                        borderRadius: 1,
                                                        px: 1.5,
                                                        py: 1,
                                                        bgcolor:
                                                            feedbackKind === 'error'
                                                                ? 'error.dark'
                                                                : feedbackKind === 'success'
                                                                  ? 'success.dark'
                                                                  : 'action.hover',
                                                    }}
                                                >
                                                    <Typography variant='body2'>
                                                        {feedback}
                                                    </Typography>
                                                    {altPrompt && (
                                                        <Stack
                                                            direction='row'
                                                            sx={{ gap: 1, mt: 1 }}
                                                        >
                                                            <Button
                                                                size='small'
                                                                variant='contained'
                                                                onClick={altTryAgain}
                                                            >
                                                                Try again
                                                            </Button>
                                                            <Button
                                                                size='small'
                                                                variant='outlined'
                                                                color='inherit'
                                                                onClick={altShowNext}
                                                            >
                                                                Show next move
                                                            </Button>
                                                        </Stack>
                                                    )}
                                                </Box>
                                            )}

                                            <Divider />

                                            <Stack direction='row' sx={{ gap: 1 }}>
                                                <StatTile label='Accuracy' value={`${accuracy}%`} />
                                                <StatTile label='Mistakes' value={mistakes} />
                                                {showRating && (
                                                    <StatTile
                                                        label='Rating'
                                                        value={Math.round(displayedRating)}
                                                        note={
                                                            lastGain > 0
                                                                ? `+${lastGain}`
                                                                : undefined
                                                        }
                                                    />
                                                )}
                                            </Stack>

                                            <Divider />

                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={pieceSoundsEnabled}
                                                        onChange={(e) =>
                                                            setPieceSoundsEnabled(e.target.checked)
                                                        }
                                                    />
                                                }
                                                label='Sounds'
                                            />
                                        </Stack>
                                    )}
                                </CardContent>
                            ),
                        },
                    ]}
                />
            )}
        </Container>
    );
}

/** Solution reveal shown under the board once a puzzle is complete. */
function SolutionReveal({ title, lines, fen }: { title: string; lines: string[][]; fen: string }) {
    return (
        <Stack sx={{ gap: 1 }}>
            <Typography sx={{ fontWeight: 'bold' }}>{title}</Typography>
            {solutionPgns(lines, fen).map((s) => (
                <Box
                    key={s.label}
                    sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        px: 1.5,
                        py: 1,
                    }}
                >
                    <Typography variant='subtitle2' color='text.secondary'>
                        {s.label}
                    </Typography>
                    <Typography sx={{ fontFamily: 'monospace' }}>{s.pgn}</Typography>
                </Box>
            ))}
        </Stack>
    );
}

const pulse = keyframes`
    0%, 100% { opacity: 1; }
    50% { opacity: 0.45; }
`;

/**
 * The session clock, big enough to watch while solving. It counts up, or down when the session
 * has a time limit, with a bar of the time left. In the last minute it turns red and pulses.
 */
function SessionClock({ elapsed, limit }: { elapsed: number; limit?: number }) {
    const remaining = limit === undefined ? undefined : Math.max(0, limit - elapsed);
    const urgent = remaining !== undefined && remaining <= 60;

    return (
        <Stack sx={{ alignItems: 'stretch', gap: 0.75 }}>
            <Stack
                direction='row'
                aria-label={remaining === undefined ? 'Time elapsed' : 'Time left'}
                sx={{
                    alignItems: 'center',
                    gap: 1,
                    color: urgent ? 'error.main' : 'text.primary',
                    animation:
                        urgent && remaining > 0 ? `${pulse} 1s ease-in-out infinite` : 'none',
                }}
            >
                <AccessTime sx={{ fontSize: 28 }} />
                <Typography
                    sx={{
                        fontSize: '2.25rem',
                        fontWeight: 800,
                        lineHeight: 1.1,
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    {formatClock(remaining ?? elapsed)}
                </Typography>
            </Stack>
            {limit !== undefined && remaining !== undefined && (
                <LinearProgress
                    variant='determinate'
                    value={(100 * remaining) / limit}
                    color={urgent ? 'error' : 'primary'}
                    sx={{ width: '100%', height: 6, borderRadius: 3 }}
                />
            )}
        </Stack>
    );
}

/**
 * Says which side the solver plays, large enough to read at a glance. White to play is a white
 * plate with a dark shadow, Black to play a black plate with a white glow, so the colors show
 * the answer before the words are read.
 */
function SideToPlay({
    color,
    wide,
}: {
    color: 'white' | 'black';
    /** A big, wide sticker on one line, for beside the board. */
    wide?: boolean;
}) {
    const white = color === 'white';
    return (
        <Stack
            direction='row'
            aria-label={`${white ? 'White' : 'Black'} to play`}
            sx={{
                alignItems: 'center',
                justifyContent: wide ? 'center' : undefined,
                gap: wide ? 1.5 : 1,
                px: wide ? 3 : 1.5,
                py: wide ? 1.25 : 0.5,
                minWidth: wide ? 240 : undefined,
                borderRadius: 1.5,
                bgcolor: white ? '#f4f4f4' : '#0b0b0b',
                color: white ? '#111' : '#fff',
                border: '2px solid',
                borderColor: white ? '#fff' : '#fff',
                boxShadow: white
                    ? '0 4px 12px rgba(0, 0, 0, 0.75), 0 2px 0 #9a9a9a'
                    : '0 0 0 1px #444, 0 0 12px rgba(255, 255, 255, 0.35)',
            }}
        >
            <Box
                sx={{
                    width: wide ? 18 : 12,
                    height: wide ? 18 : 12,
                    borderRadius: '50%',
                    bgcolor: white ? '#fff' : '#000',
                    border: '2px solid',
                    borderColor: white ? '#111' : '#fff',
                    flexShrink: 0,
                }}
            />
            <Typography
                component='span'
                sx={{
                    fontSize: wide ? '1.4rem' : '1rem',
                    fontWeight: 800,
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                }}
            >
                {white ? 'White' : 'Black'} to play
            </Typography>
        </Stack>
    );
}

/** A number with its label, in a tile: accuracy, mistakes and so on. The tiles share the width. */
function StatTile({
    label,
    value,
    note,
    compact,
}: {
    label: string;
    value: string | number;
    note?: string;
    /** Tighter, for when the room is short. */
    compact?: boolean;
}) {
    return (
        <Box
            sx={{
                flex: '1 1 84px',
                minWidth: 0,
                px: 1.5,
                py: compact ? 0.5 : 1,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1.5,
            }}
        >
            <Typography
                variant='overline'
                sx={{
                    color: 'text.secondary',
                    lineHeight: 1.4,
                    display: 'block',
                    fontSize: '0.65rem',
                    letterSpacing: '0.06em',
                }}
            >
                {label}
            </Typography>
            <Stack direction='row' sx={{ alignItems: 'baseline', gap: 0.75 }}>
                <Typography
                    sx={{
                        fontSize: compact ? '1.25rem' : '1.5rem',
                        fontWeight: 800,
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    {value}
                </Typography>
                {note && (
                    <Typography
                        sx={{ color: 'success.main', fontWeight: 'bold', fontSize: '0.9rem' }}
                    >
                        {note}
                    </Typography>
                )}
            </Stack>
        </Box>
    );
}

/**
 * Tells the solver they got it. A green plate with a check, so a solved puzzle is not just an
 * absence of red. Says how clean the solve was.
 */
function SolvedBanner({ mistakes }: { mistakes: number }) {
    return (
        <Stack
            direction='row'
            role='status'
            sx={{
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1.5,
                borderRadius: 2,
                border: '2px solid',
                borderColor: 'success.main',
                background: (theme) =>
                    `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.28)}, ${alpha(
                        theme.palette.success.main,
                        0.08,
                    )})`,
            }}
        >
            <CheckCircle sx={{ fontSize: 40, color: 'success.main' }} />
            <Stack>
                <Typography
                    sx={{
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        lineHeight: 1.15,
                        color: 'success.main',
                    }}
                >
                    Puzzle Solved!
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                    {mistakes === 0
                        ? 'No mistakes'
                        : `${mistakes} ${mistakes === 1 ? 'mistake' : 'mistakes'} along the way`}
                </Typography>
            </Stack>
        </Stack>
    );
}
