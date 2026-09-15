'use client';

import { getMateInOnePuzzle, submitMateInOneSession } from '@/api/puzzleApi';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { AuthStatus, useAuth } from '@/auth/Auth';
import Board from '@/board/Board';
import LoadingPage from '@/loading/LoadingPage';
import NotFoundPage from '@/NotFoundPage';
import { Chess } from '@jackstenglein/chess';
import {
    MateInOneAttempt,
    MateInOnePuzzle,
} from '@jackstenglein/chess-dojo-common/src/mateInOne/api';
import { fenToPieceList } from '@jackstenglein/chess-dojo-common/src/mateInOne/fen';
import { PUZZLES_PER_BLOCK } from '@jackstenglein/chess-dojo-common/src/mateInOne/rating';
import { Key } from '@lichess-org/chessground/types';
import AccessTime from '@mui/icons-material/AccessTime';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import Target from '@mui/icons-material/GpsFixed';
import Timer from '@mui/icons-material/Timer';
import {
    Box,
    Button,
    CircularProgress,
    Container,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { computeSessionStats, isCorrectAnswer } from './mateInOneDrillUtils';

type DrillState = 'loading' | 'ready' | 'in_progress' | 'block_complete' | 'paused';

/** A puzzle with its pre-computed solution and display data. */
interface PuzzleWithSolution {
    puzzle: MateInOnePuzzle;
    /** The correct mating move in SAN notation. */
    correctSan: string;
    /** The correct move's from square. */
    correctFrom: Key;
    /** The correct move's to square. */
    correctTo: Key;
    /** The FEN after the setup move (the position the user must solve). */
    fenAfterSetup: string;
    /** 'White' or 'Black', the side that delivers mate. */
    sideToMove: string;
    /** Human-readable piece list derived from fenAfterSetup. */
    pieceList: string;
}

/** Summary of a completed 10-puzzle drill. */
interface BlockSummary {
    correctCount: number;
    totalTimeSeconds: number;
    avgResponseTimeMs: number;
    rating: number;
    attempts: MateInOneAttempt[];
}

/**
 * Applies the setup move from a puzzle and computes display data for it.
 *
 * @param puzzle - The raw puzzle from the API.
 * @returns The puzzle enriched with solution info and display strings.
 */
function computeSolutionFromPuzzle(puzzle: MateInOnePuzzle): PuzzleWithSolution {
    const chess = new Chess({ fen: puzzle.fen });
    chess.move(puzzle.moves[0]);
    const fenAfterSetup = chess.fen();
    const sideToMove = chess.turn() === 'w' ? 'White' : 'Black';
    const moveResult = chess.move(puzzle.moves[1]);
    if (!moveResult) {
        throw new Error(`Invalid mating move for puzzle ${puzzle.id}: ${puzzle.moves[1]}`);
    }
    const correctSan = moveResult.san;
    return {
        puzzle,
        correctSan,
        correctFrom: moveResult.from,
        correctTo: moveResult.to,
        fenAfterSetup,
        sideToMove,
        pieceList: fenToPieceList(fenAfterSetup),
    };
}

/** Root component: requires authentication. */
export function MateInOneDrillPage() {
    const { user, status } = useAuth();

    if (status === AuthStatus.Loading) {
        return <LoadingPage />;
    }
    if (!user) {
        return <NotFoundPage />;
    }

    return <MateInOneDrill />;
}

/** Inner component: manages the full drill lifecycle. */
function MateInOneDrill() {
    const { user, updateUser } = useAuth();
    const submitRequest = useRequest();
    const [drillState, setDrillState] = useState<DrillState>('loading');
    const [currentPuzzle, setCurrentPuzzle] = useState<PuzzleWithSolution | null>(null);
    const [userInput, setUserInput] = useState('');
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const [attempts, setAttempts] = useState<MateInOneAttempt[]>([]);
    const [blockSummary, setBlockSummary] = useState<BlockSummary | null>(null);
    const [pauseRequested, setPauseRequested] = useState(false);
    const [pausedElapsedMs, setPausedElapsedMs] = useState(0);
    const [prefetchLoading, setPrefetchLoading] = useState(false);
    const [fetchError, setFetchError] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const attemptsRef = useRef<MateInOneAttempt[]>([]);
    /** Total accumulated active solve time for the current block, in ms. Excludes paused time. */
    const accumulatedMsRef = useRef<number>(0);
    /**
     * The performance.now() value when the stopwatch started running. Null when paused.
     * Use performance.now() (not Date.now()) so wall-clock changes can't skew the timer.
     */
    const runningSinceMsRef = useRef<number | null>(null);
    const questionStartRef = useRef<number>(0);
    const blockCreatedAtRef = useRef<string>('');
    const prefetchRef = useRef<Promise<PuzzleWithSolution> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    /** Snapshot of the user's PR taken when a drill starts, so the complete-screen diff
     * is computed against the pre-drill rating even after `updateUser` lands. */
    const previousBestRef = useRef<number | undefined>(user?.mateInOneRating);

    const FOCUS_DELAY_MS = 50;
    const focusInput = useCallback(() => {
        setTimeout(() => inputRef.current?.focus(), FOCUS_DELAY_MS);
    }, []);

    /** Returns the active solve time for the current block in ms (excluding paused time). */
    const getElapsedMs = useCallback(() => {
        const running =
            runningSinceMsRef.current !== null ? performance.now() - runningSinceMsRef.current : 0;
        return accumulatedMsRef.current + running;
    }, []);

    /** Fetches and computes a single puzzle. */
    const fetchPuzzle = useCallback(async (): Promise<PuzzleWithSolution> => {
        const response = await getMateInOnePuzzle();
        return computeSolutionFromPuzzle(response.data.puzzle);
    }, []);

    /** Kicks off a background prefetch for the next puzzle. */
    const prefetchNext = useCallback(() => {
        prefetchRef.current = fetchPuzzle();
    }, [fetchPuzzle]);

    /** Loads the first puzzle on mount. */
    useEffect(() => {
        fetchPuzzle()
            .then((p) => {
                setCurrentPuzzle(p);
                setFetchError(false);
                setDrillState('ready');
            })
            .catch(() => {
                setFetchError(true);
                setDrillState('ready');
            });
    }, [fetchPuzzle]);

    /** Resets all per-drill state and starts a fresh timer + first puzzle fetch. */
    const startBlock = useCallback(() => {
        setAttempts([]);
        attemptsRef.current = [];
        setFeedback(null);
        setBlockSummary(null);
        setUserInput('');
        setPauseRequested(false);
        setPausedElapsedMs(0);
        setCurrentPuzzle(null);
        prefetchRef.current = null;
        accumulatedMsRef.current = 0;
        runningSinceMsRef.current = performance.now();
        blockCreatedAtRef.current = new Date().toISOString();
        previousBestRef.current = user?.mateInOneRating;
        setDrillState('in_progress');
        fetchPuzzle()
            .then((p) => {
                setCurrentPuzzle(p);
                setFetchError(false);
                questionStartRef.current = performance.now();
                prefetchNext();
                focusInput();
            })
            .catch(() => {
                setFetchError(true);
                setDrillState('ready');
            });
    }, [fetchPuzzle, prefetchNext, focusInput]);

    const startDrill = useCallback(() => startBlock(), [startBlock]);

    useEffect(() => {
        if (drillState === 'ready') {
            previousBestRef.current = user?.mateInOneRating;
        }
    }, [drillState, user?.mateInOneRating]);

    /**
     * Finalizes a complete 10-puzzle block: freezes timer, computes rating, fires submission.
     *
     * @param finalAttempts - The 10 attempts that make up the block.
     */
    const finalizeBlock = useCallback(
        (finalAttempts: MateInOneAttempt[]) => {
            // Freeze the stopwatch.
            if (runningSinceMsRef.current !== null) {
                accumulatedMsRef.current += performance.now() - runningSinceMsRef.current;
                runningSinceMsRef.current = null;
            }
            const elapsedMs = accumulatedMsRef.current;
            const stats = computeSessionStats(finalAttempts, elapsedMs);
            const rating = stats.rating ?? 0;

            const summary: BlockSummary = {
                correctCount: stats.correctCount,
                totalTimeSeconds: stats.totalTimeSeconds,
                avgResponseTimeMs: stats.avgResponseTimeMs,
                rating,
                attempts: finalAttempts,
            };
            setBlockSummary(summary);
            setDrillState('block_complete');

            setSubmitting(true);
            submitRequest.onStart();
            submitMateInOneSession({
                totalPuzzles: finalAttempts.length,
                correctCount: stats.correctCount,
                avgResponseTimeMs: stats.avgResponseTimeMs,
                totalTimeSeconds: stats.totalTimeSeconds,
                attempts: finalAttempts,
                createdAt: blockCreatedAtRef.current,
            }).then(
                (response) => {
                    submitRequest.onSuccess();
                    setSubmitting(false);
                    const serverRating = response.data.rating;
                    if (
                        serverRating !== undefined &&
                        (user?.mateInOneRating === undefined || serverRating > user.mateInOneRating)
                    ) {
                        updateUser({ mateInOneRating: serverRating });
                    }
                },
                (err: unknown) => {
                    submitRequest.onFailure(err);
                    setSubmitting(false);
                },
            );
        },
        [submitRequest, user, updateUser],
    );

    const advanceToNextPuzzle = useCallback(() => {
        setUserInput('');
        setFeedback(null);

        const onPuzzle = (p: PuzzleWithSolution) => {
            setCurrentPuzzle(p);
            setPrefetchLoading(false);
            questionStartRef.current = performance.now();
            prefetchNext();
            focusInput();
        };

        if (!prefetchRef.current) {
            setPrefetchLoading(true);
            fetchPuzzle()
                .then(onPuzzle)
                .catch(() => {
                    setPrefetchLoading(false);
                    setFetchError(true);
                });
            return;
        }

        prefetchRef.current.then(onPuzzle).catch(() => {
            setPrefetchLoading(false);
            setFetchError(true);
        });
        prefetchRef.current = null;
    }, [fetchPuzzle, prefetchNext, focusInput]);

    /** Handles the user's "Continue" click after a feedback flash. */
    const handleContinue = useCallback(() => {
        const filled = attemptsRef.current.length;
        if (filled >= PUZZLES_PER_BLOCK) {
            // Block already finalized while feedback was showing; nothing to do.
            return;
        }
        if (pauseRequested) {
            // Freeze stopwatch and enter paused state.
            if (runningSinceMsRef.current !== null) {
                accumulatedMsRef.current += performance.now() - runningSinceMsRef.current;
                runningSinceMsRef.current = null;
            }
            setPausedElapsedMs(accumulatedMsRef.current);
            setPauseRequested(false);
            setDrillState('paused');
            setFeedback(null);
            setUserInput('');
            return;
        }
        advanceToNextPuzzle();
    }, [advanceToNextPuzzle, pauseRequested]);

    const handleResume = useCallback(() => {
        runningSinceMsRef.current = performance.now();
        setDrillState('in_progress');
        advanceToNextPuzzle();
    }, [advanceToNextPuzzle]);

    /**
     * Ends the session while paused. The most recent per-attempt save already wrote
     * a partial-block row to the server (with attempts.length < 10, so no rating).
     * We just navigate back to the landing screen, no extra request needed.
     */
    const handleEndSession = useCallback(() => {
        runningSinceMsRef.current = null;
        accumulatedMsRef.current = 0;
        attemptsRef.current = [];
        setAttempts([]);
        setBlockSummary(null);
        setPauseRequested(false);
        setPausedElapsedMs(0);
        setDrillState('ready');
    }, []);

    const handleSubmit = useCallback(() => {
        if (!currentPuzzle || feedback !== null || userInput.trim() === '') return;

        const responseTimeMs = performance.now() - questionStartRef.current;
        const correct = isCorrectAnswer(
            currentPuzzle.fenAfterSetup,
            userInput,
            currentPuzzle.correctSan,
        );
        const attempt: MateInOneAttempt = {
            puzzleId: currentPuzzle.puzzle.id,
            fen: currentPuzzle.fenAfterSetup,
            correctMove: currentPuzzle.correctSan,
            userMove: userInput.trim(),
            isCorrect: correct,
            responseTimeMs: Math.round(responseTimeMs),
        };

        const updatedAttempts = [...attemptsRef.current, attempt];
        attemptsRef.current = updatedAttempts;
        setAttempts(updatedAttempts);

        const elapsedMs = getElapsedMs();
        const stats = computeSessionStats(updatedAttempts, elapsedMs);

        if (updatedAttempts.length === PUZZLES_PER_BLOCK) {
            // Final attempt of the block. finalizeBlock fires the canonical submission
            // (with the createdAt that earlier per-attempt saves used). No extra
            // mid-block save here, otherwise we'd race with the server-side rating write.
            setFeedback(correct ? 'correct' : 'incorrect');
            finalizeBlock(updatedAttempts);
            return;
        }

        // Partial block: save progress so an interrupted block isn't lost.
        submitMateInOneSession({
            totalPuzzles: updatedAttempts.length,
            correctCount: stats.correctCount,
            avgResponseTimeMs: stats.avgResponseTimeMs,
            totalTimeSeconds: stats.totalTimeSeconds,
            attempts: updatedAttempts,
            createdAt: blockCreatedAtRef.current,
        }).catch(() => undefined);

        setFeedback(correct ? 'correct' : 'incorrect');
    }, [currentPuzzle, feedback, userInput, getElapsedMs, finalizeBlock]);

    if (drillState === 'loading') {
        return (
            <Container maxWidth='sm' sx={{ py: 8, textAlign: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }

    if (drillState === 'ready') {
        return (
            <ReadyScreen
                onStart={startDrill}
                fetchError={fetchError}
                personalBest={user?.mateInOneRating}
            />
        );
    }

    if (drillState === 'paused') {
        return (
            <PausedScreen
                elapsedMs={pausedElapsedMs}
                puzzlesAnswered={attemptsRef.current.length}
                onResume={handleResume}
                onEndSession={handleEndSession}
            />
        );
    }

    if (drillState === 'block_complete' && blockSummary) {
        return (
            <>
                <BlockCompleteScreen
                    summary={blockSummary}
                    personalBest={previousBestRef.current}
                    submitting={submitting}
                    submitFailed={submitRequest.isFailure()}
                    onContinue={() => startBlock()}
                    onRetry={() => finalizeBlock(blockSummary.attempts)}
                    onEndSession={handleEndSession}
                />
                <RequestSnackbar request={submitRequest} />
            </>
        );
    }

    return (
        <InProgressScreen
            puzzle={currentPuzzle}
            puzzleNumberInBlock={attempts.length + 1}
            userInput={userInput}
            onInputChange={setUserInput}
            onSubmit={handleSubmit}
            onContinue={handleContinue}
            pauseRequested={pauseRequested}
            onRequestPause={() => setPauseRequested(true)}
            feedback={feedback}
            prefetchLoading={prefetchLoading}
            inputRef={inputRef}
        />
    );
}

/**
 * Landing screen with a two-step armed Start flow.
 *
 * @param onStart - Callback invoked when the user confirms they want to start.
 * @param fetchError - Whether the initial puzzle fetch failed.
 */
function ReadyScreen({
    onStart,
    fetchError,
    personalBest,
}: {
    onStart: () => void;
    fetchError: boolean;
    personalBest?: number;
}) {
    const [armed, setArmed] = useState(false);

    return (
        <Container maxWidth='sm' sx={{ py: 8, textAlign: 'center' }}>
            <Typography variant='h4' sx={{ fontWeight: 'bold', mb: 2 }}>
                Mate in One Visualization Drill
            </Typography>
            {personalBest !== undefined && (
                <Typography
                    variant='body1'
                    sx={{
                        color: 'text.secondary',
                        mb: 2,
                    }}
                >
                    Your best rating: {personalBest}
                </Typography>
            )}
            <Typography
                variant='body1'
                sx={{
                    color: 'text.secondary',
                    mb: 1,
                }}
            >
                You will see a list of pieces and their squares. Type the mating move in SAN
                notation (e.g. "Qh7#" or just "Qh7") and press Enter.
            </Typography>
            <Typography
                variant='body2'
                sx={{
                    color: 'warning.main',
                    mb: 1,
                    fontWeight: 'bold',
                }}
            >
                This drill is very hard. Your rating is computed after {PUZZLES_PER_BLOCK} problems;
                you can pause between problems with the Pause button.
            </Typography>
            <Typography
                variant='body1'
                sx={{
                    color: 'text.secondary',
                    mb: 4,
                }}
            >
                {armed
                    ? 'Ready? Hit GO! to start the timer.'
                    : 'No board is shown. Visualize the position and find the mate from memory!'}
            </Typography>
            {fetchError && (
                <Typography variant='body2' color='error' sx={{ mb: 2 }}>
                    Could not load puzzles. Check your connection and try again.
                </Typography>
            )}
            <Button
                variant='contained'
                size='large'
                onClick={armed ? onStart : () => setArmed(true)}
                sx={{ px: 6, py: 1.5 }}
            >
                {armed ? 'GO!' : 'Start'}
            </Button>
        </Container>
    );
}

interface InProgressScreenProps {
    puzzle: PuzzleWithSolution | null;
    puzzleNumberInBlock: number;
    userInput: string;
    onInputChange: (value: string) => void;
    onSubmit: () => void;
    onContinue: () => void;
    pauseRequested: boolean;
    onRequestPause: () => void;
    feedback: 'correct' | 'incorrect' | null;
    prefetchLoading: boolean;
    inputRef: React.RefObject<HTMLInputElement | null>;
}

/**
 * Active drill screen: shows piece list, accepts typed move, flashes feedback.
 *
 * @param puzzle - The current puzzle with solution data.
 * @param puzzleNumberInBlock - 1-based puzzle index within the drill.
 * @param userInput - Current text in the move input field.
 * @param onInputChange - Callback to update the input value.
 * @param onSubmit - Callback invoked when the user submits their answer.
 * @param onContinue - Callback invoked when the user advances after feedback.
 * @param pauseRequested - Whether the user has armed a pause for the next problem boundary.
 * @param onRequestPause - Callback invoked when the user clicks "Pause after this problem".
 * @param feedback - Current feedback state ('correct', 'incorrect', or null).
 * @param prefetchLoading - Whether the next puzzle is still being fetched.
 * @param inputRef - Ref to the text input element for programmatic focus.
 */
function InProgressScreen({
    puzzle,
    puzzleNumberInBlock,
    userInput,
    onInputChange,
    onSubmit,
    onContinue,
    pauseRequested,
    onRequestPause,
    feedback,
    prefetchLoading,
    inputRef,
}: InProgressScreenProps) {
    if (!puzzle || prefetchLoading) {
        return (
            <Container maxWidth='sm' sx={{ py: 8, textAlign: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }

    return (
        <Container maxWidth='sm' sx={{ py: 4, textAlign: 'center' }}>
            <Typography
                variant='subtitle1'
                sx={{
                    color: 'text.secondary',
                    mb: 0.5,
                }}
            >
                Puzzle {puzzleNumberInBlock} / {PUZZLES_PER_BLOCK}
            </Typography>

            <Typography
                variant='body2'
                sx={{
                    color: 'text.secondary',
                    mb: 2,
                }}
            >
                {puzzle.sideToMove} to move and mate in 1
            </Typography>

            <Box
                sx={{
                    py: 3,
                    px: 2,
                    mb: 4,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor:
                        feedback === 'correct'
                            ? 'success.main'
                            : feedback === 'incorrect'
                              ? 'error.main'
                              : 'background.paper',
                    transition: 'background-color 0.15s',
                }}
            >
                <Typography
                    variant='body1'
                    sx={{
                        fontFamily: 'monospace',
                        fontSize: '1rem',
                        color: feedback ? 'white' : 'text.primary',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                    }}
                >
                    {puzzle.pieceList}
                </Typography>
                {feedback === 'incorrect' && (
                    <Typography variant='body2' sx={{ mt: 1, color: 'white', fontWeight: 'bold' }}>
                        Correct: {puzzle.correctSan}
                    </Typography>
                )}
            </Box>

            <Stack
                direction='row'
                spacing={2}
                sx={{
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <TextField
                    inputRef={inputRef}
                    value={userInput}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            if (feedback) {
                                onContinue();
                            } else {
                                onSubmit();
                            }
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    }}
                    placeholder='e.g. Qh7'
                    size='small'
                    sx={{ width: 150 }}
                    autoComplete='off'
                    autoCorrect='off'
                    autoCapitalize='off'
                    spellCheck={false}
                />
                <Button
                    variant='contained'
                    onClick={feedback ? onContinue : onSubmit}
                    disabled={feedback === null && userInput.trim() === ''}
                >
                    {feedback ? 'Continue' : 'Submit'}
                </Button>

                <Button
                    variant='outlined'
                    color='warning'
                    onClick={onRequestPause}
                    disabled={pauseRequested}
                >
                    {pauseRequested ? 'Pause queued' : 'Pause after this problem'}
                </Button>
            </Stack>

            {feedback && (
                <Stack
                    direction='row'
                    sx={{
                        justifyContent: 'center',
                    }}
                >
                    <Box
                        sx={{
                            width: { xs: 1, sm: 0.8, md: 0.75, lg: 0.75 },
                            aspectRatio: 1,
                            mt: 3,
                        }}
                    >
                        <Board
                            config={{
                                fen: puzzle.fenAfterSetup,
                                viewOnly: true,
                                drawable: {
                                    shapes: [
                                        {
                                            orig: puzzle.correctFrom,
                                            dest: puzzle.correctTo,
                                            brush: 'green',
                                        },
                                    ],
                                    eraseOnMovablePieceClick: false,
                                },
                            }}
                        />
                    </Box>
                </Stack>
            )}
        </Container>
    );
}

interface PausedScreenProps {
    elapsedMs: number;
    puzzlesAnswered: number;
    onResume: () => void;
    onEndSession: () => void;
}

/**
 * Paused screen shown between problems. Hides the puzzle text and freezes the
 * block timer. The user can resume to continue the same block, or end the
 * session. Ending while paused leaves the partial-block row already saved on
 * the server intact (no rating, no PR update).
 *
 * @param elapsedMs - Active solve time accumulated so far in the current block.
 * @param puzzlesAnswered - Number of puzzles already answered in this block.
 * @param onResume - Callback to resume the block.
 * @param onEndSession - Callback to abort the session and return to the landing screen.
 */
function PausedScreen({ elapsedMs, puzzlesAnswered, onResume, onEndSession }: PausedScreenProps) {
    const totalSeconds = Math.round(elapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    return (
        <Container maxWidth='sm' sx={{ py: 8, textAlign: 'center' }}>
            <Typography variant='h4' sx={{ fontWeight: 'bold', mb: 3 }}>
                Paused
            </Typography>
            <Typography
                variant='body1'
                sx={{
                    color: 'text.secondary',
                    mb: 1,
                }}
            >
                {display} elapsed · {puzzlesAnswered} / {PUZZLES_PER_BLOCK} puzzles answered
            </Typography>
            <Typography
                variant='body2'
                sx={{
                    color: 'text.secondary',
                    mb: 4,
                }}
            >
                The timer is frozen. Resume to continue, or end the session. Your progress so far is
                already saved.
            </Typography>
            <Stack
                direction='row'
                spacing={2}
                sx={{
                    justifyContent: 'center',
                }}
            >
                <Button variant='contained' size='large' onClick={onResume} sx={{ px: 4 }}>
                    Resume
                </Button>
                <Button variant='outlined' color='error' size='large' onClick={onEndSession}>
                    End session
                </Button>
            </Stack>
        </Container>
    );
}

interface BlockCompleteScreenProps {
    summary: BlockSummary;
    personalBest?: number;
    submitting: boolean;
    submitFailed: boolean;
    onContinue: () => void;
    onRetry: () => void;
    onEndSession: () => void;
}

/**
 * Summary screen shown after a 10-puzzle block completes.
 *
 * @param summary - The computed block statistics.
 * @param personalBest - The user's previous best rating (pre-drill snapshot), if any.
 * @param submitting - Whether the canonical block submission is in flight.
 * @param submitFailed - Whether the canonical block submission failed.
 * @param onContinue - Callback to start a new drill.
 * @param onRetry - Callback to retry the failed submission.
 * @param onEndSession - Callback to end the session and return to the landing screen.
 */
function BlockCompleteScreen({
    summary,
    personalBest,
    submitting,
    submitFailed,
    onContinue,
    onRetry,
    onEndSession,
}: BlockCompleteScreenProps) {
    const accuracy = Math.round((summary.correctCount / PUZZLES_PER_BLOCK) * 100);
    const avgTime = (summary.avgResponseTimeMs / 1000).toFixed(1);
    const ratingDiff =
        summary.rating > 0 && personalBest !== undefined && summary.rating !== personalBest
            ? summary.rating - personalBest
            : null;
    const isNewPR =
        summary.rating > 0 && (personalBest === undefined || summary.rating > personalBest);

    return (
        <Container maxWidth='sm' sx={{ py: 8, textAlign: 'center' }}>
            <Typography variant='h4' sx={{ fontWeight: 'bold', mb: 1 }}>
                Drill Complete!
            </Typography>
            <Typography variant='h2' sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                {summary.rating}
            </Typography>
            {ratingDiff !== null && (
                <Stack
                    direction='row'
                    spacing={0.5}
                    sx={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 1,
                    }}
                >
                    {ratingDiff > 0 ? (
                        <ArrowUpward color='success' sx={{ fontSize: '1.5rem' }} />
                    ) : (
                        <ArrowDownward color='error' sx={{ fontSize: '1.5rem' }} />
                    )}
                    <Typography
                        variant='h6'
                        sx={{ fontWeight: 'bold' }}
                        color={ratingDiff > 0 ? 'success' : 'error'}
                    >
                        {ratingDiff > 0 ? '+' : ''}
                        {ratingDiff}
                    </Typography>
                </Stack>
            )}
            {isNewPR && (
                <Typography variant='h6' sx={{ fontWeight: 'bold', color: 'warning', mb: 1 }}>
                    New Personal Best!
                </Typography>
            )}
            {personalBest !== undefined && (
                <Typography
                    variant='body1'
                    sx={{
                        color: 'text.secondary',
                        mb: 3,
                    }}
                >
                    Personal Best: {personalBest}
                </Typography>
            )}

            <Stack spacing={2} sx={{ mb: 4 }}>
                <StatRow
                    icon={<Target fontSize='small' />}
                    label='Score'
                    value={`${summary.correctCount} / ${PUZZLES_PER_BLOCK} (${accuracy}%)`}
                />
                <StatRow
                    icon={<Timer fontSize='small' />}
                    label='Avg Response Time'
                    value={`${avgTime}s`}
                />
                <StatRow
                    icon={<AccessTime fontSize='small' />}
                    label='Total Time'
                    value={`${summary.totalTimeSeconds}s`}
                />
            </Stack>

            <Stack spacing={1} sx={{ mb: 4, maxHeight: 300, overflow: 'auto' }}>
                {summary.attempts.map((a, i) => (
                    <Stack
                        key={`${a.puzzleId}-${i}`}
                        direction='row'
                        sx={{
                            justifyContent: 'space-between',
                            px: 2,
                            py: 0.5,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <Typography
                            sx={{
                                fontWeight: 'bold',
                                textAlign: 'left',
                                flex: 1,
                            }}
                        >
                            {a.puzzleId}
                        </Typography>
                        <Typography
                            sx={{ flex: 1, textAlign: 'center' }}
                            color={a.isCorrect ? 'success' : 'error'}
                        >
                            {a.isCorrect ? a.userMove : `${a.userMove} (${a.correctMove})`}
                        </Typography>
                        <Typography
                            sx={{
                                color: 'text.secondary',
                                width: { sm: 76 },
                                textAlign: 'right',
                            }}
                        >
                            {(a.responseTimeMs / 1000).toFixed(1)}s
                        </Typography>
                    </Stack>
                ))}
            </Stack>

            {submitFailed && !submitting && (
                <Typography variant='body2' color='error' sx={{ mb: 2 }}>
                    Could not save this drill. Retry to record your rating.
                </Typography>
            )}

            <Stack
                direction='row'
                spacing={2}
                sx={{
                    justifyContent: 'center',
                }}
            >
                {submitFailed ? (
                    <Button variant='contained' size='large' onClick={onRetry} sx={{ px: 4 }}>
                        Retry save
                    </Button>
                ) : (
                    <Button
                        variant='contained'
                        size='large'
                        onClick={onContinue}
                        disabled={submitting}
                        sx={{ px: 4 }}
                    >
                        {submitting ? (
                            <>
                                <CircularProgress size={18} sx={{ mr: 1, color: 'inherit' }} />
                                Saving...
                            </>
                        ) : (
                            'Try again'
                        )}
                    </Button>
                )}
                <Button
                    variant='outlined'
                    color='error'
                    size='large'
                    onClick={onEndSession}
                    disabled={submitting}
                >
                    End session
                </Button>
            </Stack>
        </Container>
    );
}

/**
 * A single labeled stat row for the summary table.
 *
 * @param icon - An icon element displayed before the label.
 * @param label - The human-readable label for the stat.
 * @param value - The formatted value to display.
 */
function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <Stack
            direction='row'
            sx={{
                justifyContent: 'space-between',
                alignItems: 'center',
                px: 2,
                py: 1,
                borderBottom: '1px solid',
                borderColor: 'divider',
            }}
        >
            <Stack
                direction='row'
                spacing={1}
                sx={{
                    alignItems: 'center',
                }}
            >
                <Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box>
                <Typography
                    sx={{
                        color: 'text.secondary',
                    }}
                >
                    {label}
                </Typography>
            </Stack>
            <Typography
                sx={{
                    fontWeight: 'bold',
                }}
            >
                {value}
            </Typography>
        </Stack>
    );
}
