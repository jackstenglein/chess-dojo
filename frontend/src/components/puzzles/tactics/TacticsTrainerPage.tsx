'use client';

import { BoardApi, PrimitiveMove, reconcile } from '@/board/Board';
import PgnBoard from '@/board/pgn/PgnBoard';
import { PieceSounds } from '@/board/pgn/boardTools/underboard/settings/ViewerSettings';
import { useBoardSound } from '@/board/sounds/useBoardSound';
import {
    correctMoveGlyphHtml,
    incorrectMoveGlyphHtml,
} from '@/components/material/memorizegames/moveGlyphs';
import { INCORRECT_SOUND_KEY } from '@/components/puzzles/settings/puzzleSettingsKeys';
import { Chess, Move } from '@jackstenglein/chess';
import { AccessTime, EmojiEvents, PlayArrow } from '@mui/icons-material';
import {
    Box,
    Button,
    CardContent,
    Container,
    FormControlLabel,
    LinearProgress,
    Stack,
    Switch,
    Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { ConfettiBurst } from './ConfettiBurst';
import {
    commonPrefixLen,
    countUniqueUserMoves,
    formatClock,
    isExpectedMove,
    ratingForPuzzle,
    solutionPgns,
    TACTICS_PUZZLES,
    TACTICS_RATING_KEY,
} from './tacticsPuzzles';

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

export function TacticsTrainerPage() {
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
    const [feedbackKind, setFeedbackKind] = useState<'info' | 'error' | 'success'>('info');

    const [mistakes, setMistakes] = useState(0);
    const [firstTry, setFirstTry] = useState(0);
    const [userMovesTotal, setUserMovesTotal] = useState(0);
    const [elapsed, setElapsed] = useState(0);
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

    const chessRef = useRef<Chess | null>(null);
    const boardRef = useRef<BoardApi | null>(null);
    const showGlyphsRef = useRef(false);
    const lockedRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const mistakesRef = useRef(mistakes);
    mistakesRef.current = mistakes;
    const stateRef = useRef({ phase, puzzleIndex, lineIndex, plyIndex, attempts });
    stateRef.current = { phase, puzzleIndex, lineIndex, plyIndex, attempts };

    const puzzle = TACTICS_PUZZLES[puzzleIndex];
    const line = puzzle.lines[lineIndex];
    // User moves are even plies (user is side to move at start).
    const awaitingUser = plyIndex % 2 === 0;
    const totalUserMoves = useMemo(
        () => TACTICS_PUZZLES.reduce((n, p) => n + countUniqueUserMoves(p.lines), 0),
        [],
    );

    const orientation = puzzle.userColor;
    const accuracy = userMovesTotal === 0 ? 100 : Math.round((100 * firstTry) / userMovesTotal);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    useEffect(() => stopTimer, [stopTimer]);

    const startSession = useCallback(() => {
        setPuzzleIndex(0);
        setLineIndex(0);
        setPlyIndex(0);
        setAttempts(0);
        setMistakes(0);
        setFirstTry(0);
        setUserMovesTotal(0);
        setElapsed(0);
        setLineComplete(false);
        setEndedInMate(false);
        setShowConfetti(false);
        setFeedback(null);
        setLastGain(0);
        setPhase('solving');
        stopTimer();
        const t0 = Date.now();
        timerRef.current = setInterval(() => {
            setElapsed(Math.floor((Date.now() - t0) / 1000));
        }, 1000);
    }, [stopTimer]);

    /**
     * Jump to a ply of the given line without replaying: reload the start
     * and instantly play through to it. Used to return to the branch point
     * after a defense instead of forcing the shared moves again.
     */
    const jumpToPly: (
        chess: Chess,
        board: BoardApi,
        targetLine: string[],
        targetPly: number,
        opts?: { announce?: boolean },
    ) => void = useCallback(
        (
            chess: Chess,
            board: BoardApi,
            targetLine: string[],
            targetPly: number,
            opts?: { announce?: boolean },
        ) => {
            try {
                chess.load(puzzle.fen);
                for (let i = 0; i < targetPly; i++) {
                    chess.move(targetLine[i]);
                }
            } catch {
                // fall through with whatever stuck; the move handler guards
            }
            reconcile(chess, board, showGlyphsRef.current);
            setPlyIndex(targetPly);
            setAttempts(0);
            setLineComplete(false);
            if (opts?.announce !== false) {
                setFeedback('Back where it diverged.');
                setFeedbackKind('info');
            } else {
                setFeedback(null);
            }
        },
        [puzzle],
    );

    // Breaks the finishLine <-> playOpponentReply call cycle: the reply
    // player reaches the current finisher through this ref, so neither
    // const reads the other before initialization (TDZ-safe).
    const finishLineRef = useRef<(mate: boolean) => void>(() => undefined);

    const playOpponentReply: (
        chess: Chess,
        board: BoardApi,
        replyPly: number,
        explicitLine?: string[],
    ) => void = useCallback(
        (chess: Chess, board: BoardApi, replyPly: number, explicitLine?: string[]) => {
            const targetLine =
                explicitLine ??
                TACTICS_PUZZLES[stateRef.current.puzzleIndex].lines[stateRef.current.lineIndex];
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
            }, 650);
        },
        [playSound],
    );

    /** Shared transition when the current line is fully played. */
    const finishLine: (mate: boolean) => void = useCallback(
        (mate: boolean) => {
            setEndedInMate((m) => m || mate);
            setLineComplete(true);
            const isLastLine = lineIndex + 1 >= puzzle.lines.length;
            setFeedback(isLastLine ? 'Main line complete!' : 'Defense refuted!');
            setFeedbackKind('success');
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
                        jumpToPly(chess, board, nextLine, shared);
                        if (shared < nextLine.length && shared % 2 === 1) {
                            playOpponentReply(chess, board, shared, nextLine);
                        }
                    }
                } else {
                    // Puzzle complete — rating ticks up and persists.
                    const gain = ratingForPuzzle(mistakesRef.current);
                    setLastGain(gain);
                    setRating((r) => r + gain);
                    if (puzzleIndex + 1 < TACTICS_PUZZLES.length) {
                        setPhase('puzzleDone');
                    } else {
                        setPhase('sessionDone');
                        stopTimer();
                        if (mate) setShowConfetti(true);
                    }
                }
            }, 1400);
        },
        [line, lineIndex, puzzle, puzzleIndex, setRating, stopTimer, jumpToPly, playOpponentReply],
    );
    finishLineRef.current = finishLine;

    const advanceAfterUserMove = useCallback(
        (chess: Chess, board: BoardApi, nextPly: number, wasFirstTry: boolean) => {
            if (wasFirstTry) setFirstTry((n) => n + 1);
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

            const currentLine = TACTICS_PUZZLES[s.puzzleIndex].lines[s.lineIndex];
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
                advanceAfterUserMove(chess, board, s.plyIndex + 1, s.attempts === 0);
            } else {
                // Wrong move — visible rollback, second attempt allowed.
                const newAttempts = s.attempts + 1;
                setAttempts(newAttempts);
                setMistakes((n) => n + 1);
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
                                reconcile(chess, board, showGlyphsRef.current, playSound);
                                advanceAfterUserMove(chess, board, s.plyIndex + 1, false);
                            }
                        } catch {
                            setAttempts(0);
                        }
                    }
                }, 650);
            }
        },
        [advanceAfterUserMove, incorrectSound, lineComplete, playSound],
    );

    const nextPuzzle = useCallback(() => {
        setPuzzleIndex((i) => i + 1);
        setLineIndex(0);
        setPlyIndex(0);
        setAttempts(0);
        setLineComplete(false);
        setFeedback(null);
        setLastGain(0);
        setPhase('solving');
    }, []);

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

    const progress =
        totalUserMoves === 0
            ? 0
            : Math.min(100, Math.round((100 * userMovesTotal) / totalUserMoves));

    return (
        <Container maxWidth={false} sx={{ py: { xs: 2, sm: 4 } }}>
            {showConfetti && <ConfettiBurst onDone={() => setShowConfetti(false)} />}

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
                    key={puzzle.id}
                    showPlayerHeaders={false}
                    fen={puzzle.fen}
                    startOrientation={orientation}
                    initialUnderboardTab='tactics'
                    disableEngine
                    disableNullMoves
                    onInitialize={(board, chess) => {
                        chessRef.current = chess;
                        boardRef.current = board;
                        // Solver to move from the start.
                        reconcile(chess, board, showGlyphsRef.current);
                    }}
                    slotProps={{ board: { onMove: handleBoardMove } }}
                    underboardTabs={[
                        {
                            name: 'tactics',
                            tooltip: 'Tactics trainer',
                            icon: <EmojiEvents />,
                            element: (
                                <CardContent>
                                    {phase === 'puzzleDone' || phase === 'sessionDone' ? (
                                        <Stack sx={{ gap: 1.5 }}>
                                            {phase === 'puzzleDone' ? (
                                                <Button
                                                    variant='contained'
                                                    onClick={nextPuzzle}
                                                    sx={{ minHeight: 48 }}
                                                >
                                                    Next puzzle
                                                </Button>
                                            ) : (
                                                <Button
                                                    onClick={startSession}
                                                    sx={{ minHeight: 48 }}
                                                >
                                                    Train again
                                                </Button>
                                            )}
                                            <Typography variant='h6' sx={{ fontWeight: 'bold' }}>
                                                {phase === 'puzzleDone'
                                                    ? 'Puzzle complete!'
                                                    : endedInMate
                                                      ? 'Session complete — checkmate! 🎉'
                                                      : 'Session complete!'}
                                            </Typography>
                                            <SolutionReveal
                                                title={puzzle.title}
                                                lines={puzzle.lines}
                                                fen={puzzle.fen}
                                            />
                                            <Stack sx={{ gap: 0.5 }}>
                                                <Typography variant='body2'>
                                                    {phase === 'puzzleDone'
                                                        ? 'Time so far'
                                                        : 'Total time'}
                                                    : {formatClock(elapsed)}
                                                </Typography>
                                                <Typography variant='body2'>
                                                    Accuracy: {accuracy}%
                                                </Typography>
                                                <Typography variant='body2'>
                                                    {phase === 'puzzleDone'
                                                        ? 'Mistakes'
                                                        : 'Total mistakes'}
                                                    : {mistakes}
                                                </Typography>
                                                <Typography variant='body2'>
                                                    {phase === 'puzzleDone' ? (
                                                        <>
                                                            Rating: {Math.round(displayedRating)}
                                                            {lastGain > 0 && ` (+${lastGain})`}
                                                        </>
                                                    ) : (
                                                        <>
                                                            Final rating: {Math.round(rating)}{' '}
                                                            (saved for next time)
                                                        </>
                                                    )}
                                                </Typography>
                                            </Stack>
                                        </Stack>
                                    ) : (
                                        <Stack sx={{ gap: 1.5 }}>
                                            <Stack
                                                direction='row'
                                                sx={{
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    flexWrap: 'wrap',
                                                    gap: 1,
                                                }}
                                            >
                                                <Typography
                                                    variant='h6'
                                                    sx={{ fontWeight: 'bold' }}
                                                >
                                                    Puzzle {puzzleIndex + 1}
                                                </Typography>
                                                <Stack
                                                    direction='row'
                                                    sx={{ alignItems: 'center', gap: 0.75 }}
                                                >
                                                    <AccessTime fontSize='small' />
                                                    <Typography
                                                        variant='h6'
                                                        sx={{ fontVariantNumeric: 'tabular-nums' }}
                                                    >
                                                        {formatClock(elapsed)}
                                                    </Typography>
                                                </Stack>
                                            </Stack>

                                            <Typography variant='body2' color='text.secondary'>
                                                Puzzle {puzzleIndex + 1} of {TACTICS_PUZZLES.length}
                                                {lineIndex + 1 < puzzle.lines.length &&
                                                    puzzle.lines.length > 2 && (
                                                        <>
                                                            {'  ·  '}Defense {lineIndex + 1} of{' '}
                                                            {puzzle.lines.length - 1}
                                                        </>
                                                    )}
                                                {lineIndex + 1 >= puzzle.lines.length &&
                                                    '  ·  Main line'}
                                                {opponentThinking ? '  ·  opponent…' : ''}
                                                {awaitingUser && !lineComplete
                                                    ? '  ·  your move'
                                                    : ''}
                                            </Typography>
                                            <LinearProgress
                                                variant='determinate'
                                                value={progress}
                                            />

                                            <Stack
                                                direction='row'
                                                sx={{
                                                    justifyContent: 'space-between',
                                                    flexWrap: 'wrap',
                                                    gap: 1,
                                                }}
                                            >
                                                <Typography variant='body2'>
                                                    Accuracy: <strong>{accuracy}%</strong>
                                                </Typography>
                                                <Typography variant='body2'>
                                                    Mistakes: <strong>{mistakes}</strong>
                                                </Typography>
                                                <Typography variant='body2'>
                                                    Rating:{' '}
                                                    <strong>{Math.round(displayedRating)}</strong>
                                                    {lastGain > 0 && (
                                                        <Typography
                                                            component='span'
                                                            color='success.main'
                                                            sx={{ fontWeight: 'bold' }}
                                                        >
                                                            {' '}
                                                            +{lastGain}
                                                        </Typography>
                                                    )}
                                                </Typography>
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
                                                </Box>
                                            )}

                                            <Typography
                                                variant='body2'
                                                color='text.secondary'
                                                sx={{ fontFamily: 'monospace' }}
                                            >
                                                {line.slice(0, plyIndex).join(' ') || '—'}
                                            </Typography>

                                            <Stack
                                                direction={{ xs: 'column', sm: 'row' }}
                                                sx={{ gap: 1 }}
                                            >
                                                <FormControlLabel
                                                    control={
                                                        <Switch
                                                            checked={pieceSoundsEnabled}
                                                            onChange={(e) =>
                                                                setPieceSoundsEnabled(
                                                                    e.target.checked,
                                                                )
                                                            }
                                                        />
                                                    }
                                                    label='Sounds'
                                                />
                                            </Stack>

                                            <Typography variant='caption' color='text.secondary'>
                                                {lineComplete
                                                    ? 'Nice work!'
                                                    : awaitingUser
                                                      ? 'Find the winning move.'
                                                      : 'Opponent replies automatically…'}
                                            </Typography>
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
