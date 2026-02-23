'use client';

import { ApiContextType, useApi } from '@/api/Api';
import { Request, useRequest } from '@/api/Request';
import { AuthStatus, useAuth } from '@/auth/Auth';
import { getPieceSx } from '@/board/boardThemes';
import { formatTime } from '@/board/pgn/boardTools/underboard/clock/ClockUsage';
import { matchAction } from '@/board/pgn/boardTools/underboard/settings/KeyboardShortcuts';
import {
    ShortcutAction,
    ShortcutBindings,
} from '@/board/pgn/boardTools/underboard/settings/ShortcutAction';
import {
    PieceStyle,
    PieceStyleKey,
} from '@/board/pgn/boardTools/underboard/settings/ViewerSettings';
import PgnBoard, { PgnBoardApi, useChess } from '@/board/pgn/PgnBoard';
import { InProgressAfterPgnText } from '@/board/pgn/solitaire/SolitaireAfterPgnText';
import { Link } from '@/components/navigation/Link';
import { RequirementProgress } from '@/database/requirement';
import { TimelineEntry } from '@/database/timeline';
import { User } from '@/database/user';
import { useRouter } from '@/hooks/useRouter';
import LoadingPage from '@/loading/LoadingPage';
import { Chess, Color } from '@jackstenglein/chess';
import {
    getPuzzleOverview,
    PROVISIONAL_PUZZLE_RATING_DEVIATION,
} from '@jackstenglein/chess-dojo-common/src/database/user';
import {
    NextPuzzleRequest,
    NextPuzzleResponse,
    Puzzle,
} from '@jackstenglein/chess-dojo-common/src/puzzles/api';
import {
    AccessTime,
    Extension,
    LocalFireDepartment,
    Settings,
    Timeline,
} from '@mui/icons-material';
import {
    Box,
    Button,
    CardContent,
    Container,
    Divider,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { ReactNode, RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { useCountdown, useLocalStorage } from 'usehooks-ts';
import { PuzzleSessionChart } from '../chart/PuzzleSessionChart';
import {
    DIFFICULTY_KEY,
    RATED_KEY,
    SHOW_RATING_KEY,
    SHOW_STREAK_KEY,
    SHOW_TIMER_KEY,
    THEME_KEY,
} from '../settings/puzzleSettingsKeys';
import { PuzzleSettings } from './PuzzleSettings';

const checkmatePuzzlesTaskId = '324fa93d-fbdf-456e-bcfa-a04eb4213171';

/** Tracks a single session playing puzzles. */
export interface PuzzleSession {
    /** The cohort the session applies to. */
    cohort: string;
    /** The start rating of the session. */
    start: number;
    /** The history of the session. */
    history: {
        /** The puzzle that was played. */
        puzzle: Puzzle;
        /** The result of the puzzle. */
        result: 'win' | 'draw' | 'loss';
        /** The rating after the puzzle. */
        rating: number;
        /** The rating change from the puzzle. */
        ratingChange: number;
    }[];
    /** The total time spent in seconds during the session. */
    timeSpentSeconds: number;
    /** The requirement progress associated with the session. */
    progress?: RequirementProgress;
    /** The timeline entry associated with the session. */
    timelineEntry?: TimelineEntry;
}

export function CheckmatePuzzlePage({
    id,
}: {
    /** If included, shows a specific puzzle by id. */
    id?: string;
}) {
    const { user, status } = useAuth();
    if (status === AuthStatus.Loading) {
        return <LoadingPage />;
    }
    if (user) {
        return <AuthCheckmatePuzzlePage user={user} id={id} />;
    }
}

function readLocalStorage<T>(key: string, defaultValue: T): T {
    const value = window.localStorage.getItem(key);
    if (!value) {
        return defaultValue;
    }
    return JSON.parse(value) as T;
}

async function fetchNextPuzzle({
    api,
    request,
    requestTracker,
    onSuccess,
}: {
    api: ApiContextType;
    request?: NextPuzzleRequest;
    requestTracker?: Request<NextPuzzleResponse>;
    onSuccess?: (response: NextPuzzleResponse) => void;
}) {
    try {
        requestTracker?.onStart();
        const themes = readLocalStorage(THEME_KEY, ['mateIn1', 'mateIn2', 'mateIn3']);
        const difficulty = readLocalStorage(DIFFICULTY_KEY, 'standard');
        const response = await api.nextPuzzle({
            ...request,
            themes,
            relativeRating: DIFFICULTY_TO_RATING_RANGE[difficulty],
        });
        requestTracker?.onSuccess(response.data);
        onSuccess?.(response.data);
    } catch (err) {
        requestTracker?.onFailure(err);
    }
}

async function updateProgress({
    api,
    session,
}: {
    api: ApiContextType;
    session: RefObject<PuzzleSession>;
}) {
    const { win, draw, loss } = session.current.history.reduce(
        (acc, { result }) => {
            acc[result] += 1;
            return acc;
        },
        { win: 0, draw: 0, loss: 0 },
    );

    if (session.current.timelineEntry && session.current.progress) {
        let totalMinutesSpent = session.current.timelineEntry.totalMinutesSpent;
        totalMinutesSpent =
            totalMinutesSpent -
            session.current.timelineEntry.minutesSpent +
            Math.round(session.current.timeSpentSeconds / 60);

        await api.updateUserTimeline({
            requirementId: checkmatePuzzlesTaskId,
            progress: {
                requirementId: checkmatePuzzlesTaskId,
                minutesSpent: {
                    ...session.current.progress.minutesSpent,
                    [session.current.cohort]: totalMinutesSpent,
                },
                counts: { ALL_COHORTS: session.current.history.at(-1)?.rating ?? 0 },
                updatedAt: new Date().toISOString(),
            },
            updated: [
                {
                    ...session.current.timelineEntry,
                    minutesSpent: Math.round(session.current.timeSpentSeconds / 60),
                    totalMinutesSpent,
                    newCount: session.current.history.at(-1)?.rating ?? 0,
                    notes: `Solved ${session.current.history.length} puzzles!\n\n✅ Correct: ${win}\n☑️ Equal: ${draw}\n❌ Wrong: ${loss}`,
                },
            ],
            deleted: [],
        });
    } else {
        const response = await api.updateUserProgress({
            requirementId: checkmatePuzzlesTaskId,
            cohort: session.current.cohort,
            previousCount: session.current.start,
            newCount: session.current.history.at(-1)?.rating ?? 0,
            incrementalMinutesSpent: Math.round(session.current.timeSpentSeconds / 60),
            date: null,
            notes: `Solved ${session.current.history.length} puzzles!\n\n✅ Correct: ${win}\n☑️ Equal: ${draw}\n❌ Wrong: ${loss}`,
        });
        session.current.timelineEntry = response.data.timelineEntry;
        session.current.progress = response.data.user.progress[checkmatePuzzlesTaskId];
    }
}

function AuthCheckmatePuzzlePage({ user, id }: { user: User; id?: string }) {
    const { updateUser } = useAuth();
    const api = useApi();
    const requestTracker = useRequest<NextPuzzleResponse>();
    const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle>();
    const [seconds, { startCountdown, stopCountdown, resetCountdown }] = useCountdown({
        isIncrement: true,
        countStart: 0,
        countStop: -1,
    });
    const secondsRef = useRef(seconds);
    secondsRef.current = seconds;
    const session = useRef<PuzzleSession>({
        cohort: user.dojoCohort,
        start: getPuzzleOverview(user, 'mate').rating,
        history: [],
        timeSpentSeconds: 0,
    });
    const router = useRouter();

    const pgnRef = useRef<PgnBoardApi>(null);
    const [result, setResult] = useState<'win' | 'loss'>();
    const resultRef = useRef(result);
    resultRef.current = result;
    const [complete, setComplete] = useState(false);
    const [puzzleOverview, setPuzzleOverview] = useState(getPuzzleOverview(user, 'OVERALL'));
    const [ratingChange, setRatingChange] = useState(0);

    const [rated] = useLocalStorage(RATED_KEY, true);
    const [displayedRating, setDisplayedRating] = useState(puzzleOverview.rating);
    const animationFrameRef = useRef<number>(undefined);
    const startTimeRef = useRef<number>(undefined);

    useEffect(() => {
        if (!requestTracker.isSent()) {
            void fetchNextPuzzle({
                api,
                request: { nextId: id },
                requestTracker,
            });
        }
    }, [requestTracker, api, id]);

    useEffect(() => {
        if (!currentPuzzle && requestTracker.data) {
            setCurrentPuzzle(requestTracker.data.puzzle);
            resetCountdown();
            startCountdown();
            updateUser(requestTracker.data.user);
            setPuzzleOverview(getPuzzleOverview(requestTracker.data.user, 'OVERALL'));
        }
    }, [currentPuzzle, requestTracker, resetCountdown, startCountdown, updateUser]);

    const [puzzlePGN, playerColor] = useMemo(() => {
        if (!currentPuzzle) {
            return ['', Color.white];
        }
        const chess = new Chess({ fen: currentPuzzle.fen });
        for (const move of currentPuzzle.moves) {
            chess.move(move);
        }
        return [chess.renderPgn(), chess.history()[1].color];
    }, [currentPuzzle]);

    const onNextPuzzle = () => {
        if (id) {
            router.push('/puzzles/checkmate');
        } else {
            setPuzzleOverview((overview) => ({
                ...overview,
                rating: overview.rating + ratingChange,
            }));
            setRatingChange(0);
            setResult(undefined);
            setComplete(false);
            setCurrentPuzzle(undefined);
        }
    };

    const onWrongMove = () => {
        setResult('loss');

        if (resultRef.current === undefined) {
            void fetchNextPuzzle({
                api,
                requestTracker,
                request: {
                    previousPuzzle: currentPuzzle
                        ? {
                              id: currentPuzzle.id,
                              result: 'loss',
                              timeSpentSeconds: secondsRef.current,
                              pgn: pgnRef.current?.getPgn() ?? '',
                              rated: readLocalStorage(RATED_KEY, true),
                          }
                        : undefined,
                },
                onSuccess: ({ user: newUser }) => {
                    const newOverview = getPuzzleOverview(newUser, 'OVERALL');
                    setRatingChange(newOverview.rating - puzzleOverview.rating);
                    setPuzzleOverview({
                        ...puzzleOverview,
                        ratingDeviation: newOverview.ratingDeviation,
                    });
                    if (currentPuzzle) {
                        session.current.history.push({
                            puzzle: currentPuzzle,
                            result: 'loss',
                            rating: newOverview.rating,
                            ratingChange: newOverview.rating - puzzleOverview.rating,
                        });
                    }
                    session.current.timeSpentSeconds += secondsRef.current;
                    void updateProgress({ api, session });
                },
            });
        }
    };

    const onComplete = () => {
        stopCountdown();
        setResult((r) => r ?? 'win');
        setComplete(true);

        if (resultRef.current === 'loss') {
            return;
        }

        void fetchNextPuzzle({
            api,
            requestTracker,
            request: {
                previousPuzzle: currentPuzzle
                    ? {
                          id: currentPuzzle.id,
                          result: secondsRef.current <= 60 ? 'win' : 'draw',
                          timeSpentSeconds: secondsRef.current,
                          rated: readLocalStorage(RATED_KEY, true),
                      }
                    : undefined,
            },
            onSuccess: ({ user: newUser }) => {
                const newOverview = getPuzzleOverview(newUser, 'OVERALL');
                setRatingChange(newOverview.rating - puzzleOverview.rating);
                setPuzzleOverview({
                    ...puzzleOverview,
                    ratingDeviation: newOverview.ratingDeviation,
                });
                if (currentPuzzle) {
                    session.current.history.push({
                        puzzle: currentPuzzle,
                        result: secondsRef.current <= 60 ? 'win' : 'draw',
                        rating: newOverview.rating,
                        ratingChange: newOverview.rating - puzzleOverview.rating,
                    });
                }
                session.current.timeSpentSeconds += secondsRef.current;
                void updateProgress({ api, session });
            },
        });
    };

    const orientation = playerColor === Color.white ? 'white' : 'black';

    useEffect(() => {
        if (
            !rated ||
            displayedRating === puzzleOverview.rating + ratingChange ||
            animationFrameRef.current
        ) {
            return;
        }

        const duration = 750;
        const start = displayedRating;
        const target = puzzleOverview.rating + ratingChange;

        const animate = (timestamp: number) => {
            if (!startTimeRef.current) {
                startTimeRef.current = timestamp;
            }
            const progress = timestamp - startTimeRef.current;
            const percentage = Math.min(progress / duration, 1);
            const value = Math.floor(start + percentage * (target - start));

            setDisplayedRating(value);

            if (percentage < 1) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                startTimeRef.current = undefined;
                animationFrameRef.current = undefined;
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);
    }, [displayedRating, puzzleOverview.rating, ratingChange, rated]);

    useEffect(() => {
        setDisplayedRating(puzzleOverview.rating);
    }, [currentPuzzle]);

    return (
        <Container maxWidth={false} sx={{ py: 4 }}>
            <PgnBoard
                ref={pgnRef}
                key={currentPuzzle?.fen}
                showPlayerHeaders={false}
                underboardTabs={[
                    {
                        name: 'puzzles',
                        tooltip: 'Puzzle Details',
                        icon: <Extension />,
                        element: (
                            <CheckmatePuzzleUnderboard
                                puzzle={currentPuzzle}
                                seconds={seconds}
                                orientation={orientation}
                                displayedRating={displayedRating}
                                ratingDeviation={puzzleOverview.ratingDeviation}
                                ratingChange={Math.round(ratingChange)}
                                result={result}
                                session={session.current}
                            />
                        ),
                    },
                    {
                        name: 'puzzleSettings',
                        tooltip: 'Settings',
                        icon: <Settings />,
                        element: <PuzzleSettings onChangeOptions={requestTracker.reset} />,
                    },
                ]}
                pgn={puzzlePGN}
                initialUnderboardTab='puzzles'
                disableEngine={!complete}
                disableNullMoves={!complete}
                startOrientation={orientation}
                onInitialize={(board) =>
                    pgnRef.current?.solitaire.start(null, {
                        playAs: orientation,
                        board,
                        allowDifferentMates: true,
                        onWrongMove,
                        onComplete,
                    })
                }
                slots={{
                    afterPgnText: <AfterPgnText result={result} onNextPuzzle={onNextPuzzle} />,
                }}
            />
        </Container>
    );
}

const DIFFICULTY_TO_RATING_RANGE: Record<string, [number, number]> = {
    easiest: [-600, -400],
    easier: [-400, -200],
    standard: [-200, 200],
    harder: [200, 400],
    hardest: [400, 600],
};

function CheckmatePuzzleUnderboard({
    puzzle,
    seconds,
    orientation,
    displayedRating,
    ratingDeviation,
    ratingChange,
    result,
    session,
}: {
    /** The puzzle the user is playing. */
    puzzle?: Puzzle;
    /** The number of seconds the user has been working on the puzzle. */
    seconds: number;
    /** The color the user is playing. */
    orientation: 'white' | 'black';
    /** The rating as shown to the user */
    displayedRating: number;
    /** The user's rating deviation before/after taking the puzzle. */
    ratingDeviation: number;
    /** The user's rating change after taking the puzzle. */
    ratingChange: number;
    /** The user's result on the puzzle. */
    result?: 'win' | 'loss';
    /** The user's current session. */
    session: PuzzleSession;
}) {
    const { solitaire } = useChess();
    const [rated] = useLocalStorage(RATED_KEY, true);
    const [showTimer] = useLocalStorage(SHOW_TIMER_KEY, true);
    const [showRating] = useLocalStorage(SHOW_RATING_KEY, true);
    const [showStreak] = useLocalStorage(SHOW_STREAK_KEY, true);

    const [pieceStyle] = useLocalStorage<PieceStyle>(PieceStyleKey, PieceStyle.Standard);
    const pieceSx = getPieceSx(pieceStyle);

    const successfulPlays = (puzzle?.successfulPlays ?? 0) + (result === 'win' ? 1 : 0);
    let streak = 0;
    for (let i = session.history.length - 1; i >= 0; i--) {
        if (session.history[i].result !== 'win') {
            break;
        }
        streak++;
    }

    return (
        <CardContent sx={{ minHeight: 1 }}>
            <Stack sx={{ minHeight: 1 }}>
                <Stack direction='row' gap={1.5}>
                    <Box
                        sx={{
                            minHeight: 1,
                            aspectRatio: 1,
                            backgroundSize: 'cover',
                            backgroundImage: pieceSx[`--${orientation}-king`],
                        }}
                    />

                    <Stack>
                        <Typography variant='h6' sx={{ fontWeight: 'bold' }}>
                            {orientation[0].toUpperCase()}
                            {orientation.slice(1)} to move
                        </Typography>
                        <Typography variant='subtitle1' color='text.secondary' fontWeight='bold'>
                            Mate in{' '}
                            {puzzle?.themes
                                .find((t) => t.startsWith('mateIn'))
                                ?.replaceAll('mateIn', '')}
                        </Typography>
                    </Stack>
                </Stack>

                <Stack
                    mt={4}
                    direction='row'
                    justifyContent='space-between'
                    alignItems='center'
                    columnGap={2}
                    rowGap={1}
                    flexWrap='wrap'
                >
                    {(showRating || !rated) && (
                        <Stack direction='row' alignItems='center' gap={1.5}>
                            <Timeline fontSize='large' />
                            <Typography variant='h4' fontWeight='bold'>
                                {rated
                                    ? `${Math.round(displayedRating)}${ratingDeviation >= PROVISIONAL_PUZZLE_RATING_DEVIATION ? '?' : ''}`
                                    : 'Unrated'}
                            </Typography>
                            {showRating && rated && (solitaire?.complete || ratingChange !== 0) && (
                                <Typography
                                    color={
                                        ratingChange > 0
                                            ? 'success'
                                            : ratingChange < 0
                                              ? 'error'
                                              : 'textSecondary'
                                    }
                                    fontWeight='bold'
                                >
                                    {ratingChange >= 0 && '+'}
                                    {ratingChange}
                                </Typography>
                            )}
                        </Stack>
                    )}

                    {showTimer && (
                        <Stack
                            direction='row'
                            alignItems='center'
                            gap={1.5}
                            color={seconds >= 60 ? 'error.main' : 'text.secondary'}
                        >
                            <AccessTime />
                            <Typography variant='h5'>{formatTime(60 - seconds)}</Typography>
                        </Stack>
                    )}
                </Stack>

                {solitaire?.complete && showStreak && streak > 1 && (
                    <Stack direction='row' alignItems='center' mt={1} gap={0.5}>
                        <LocalFireDepartment color='dojoOrange' sx={{ fontSize: 30 }} />
                        <Typography variant='h6' color='dojoOrange' fontWeight='bold'>
                            {streak} in a row!
                        </Typography>
                    </Stack>
                )}

                {solitaire?.complete && showRating && rated && session.history.length > 0 && (
                    <PuzzleSessionChart session={session} />
                )}

                {solitaire?.complete && puzzle && (
                    <Stack mt={2}>
                        <PuzzleDetailRow label='Puzzle ID' value={puzzle.id} />
                        {showRating && (
                            <>
                                <PuzzleDetailRow
                                    label='Puzzle Rating'
                                    value={Math.round(puzzle.rating)}
                                />
                                <PuzzleDetailRow
                                    label='Puzzle Rating Deviation'
                                    value={Math.round(puzzle.ratingDeviation)}
                                />
                                <PuzzleDetailRow
                                    label='Your Rating Deviation'
                                    value={Math.round(ratingDeviation)}
                                />
                            </>
                        )}
                        <PuzzleDetailRow label='Total Attempts' value={puzzle.plays + 1} />
                        <PuzzleDetailRow
                            label='Successful Attempts'
                            value={`${successfulPlays} (${Math.round((1000 * successfulPlays) / (puzzle.plays + 1)) / 10}%)`}
                        />
                        <PuzzleDetailRow label='Target Time' value='01:00' />
                        <PuzzleDetailRow label='Used Time' value={formatTime(seconds)} />
                        <Typography variant='body2' mt={0.5} alignSelf='end'>
                            <Link href='/puzzles/history'>View Puzzle History</Link>
                        </Typography>
                    </Stack>
                )}
            </Stack>
        </CardContent>
    );
}

function PuzzleDetailRow({ label, value }: { label: ReactNode; value: string | number }) {
    return (
        <Stack
            direction='row'
            justifyContent='space-between'
            alignItems='center'
            sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                color: 'text.secondary',
                pt: '2px',
            }}
        >
            <Typography>{label}</Typography>
            <Typography fontWeight='bold'>{value}</Typography>
        </Stack>
    );
}

function AfterPgnText({
    result,
    onNextPuzzle,
}: {
    result?: 'win' | 'loss';
    onNextPuzzle: () => void;
}) {
    const { solitaire, keydownMap } = useChess();
    const [keyBindings] = useLocalStorage(ShortcutBindings.key, ShortcutBindings.default);
    const keyBinding =
        keyBindings[ShortcutAction.NextPuzzle] ??
        ShortcutBindings.default[ShortcutAction.NextPuzzle];

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (!solitaire?.complete) {
                return;
            }
            const matchedAction = matchAction(
                keyBindings,
                event.code.replace('Key', ''),
                keydownMap?.current || {},
            );
            if (matchedAction === ShortcutAction.NextPuzzle) {
                onNextPuzzle();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [solitaire?.complete, keyBindings, keydownMap, onNextPuzzle]);

    if (solitaire?.complete) {
        return (
            <Stack>
                <Divider sx={{ width: 1 }} />
                <Box sx={{ my: 1, px: 1 }}>
                    <Tooltip
                        title={
                            keyBinding.key || keyBinding.modifier
                                ? `Shortcut: ${keyBinding.modifier}${keyBinding.modifier ? '+' : ''}${keyBinding.key}`
                                : ''
                        }
                    >
                        <Button onClick={onNextPuzzle}>Next Puzzle</Button>
                    </Tooltip>
                </Box>
            </Stack>
        );
    }
    if (result === 'loss') {
        return <InProgressAfterPgnText />;
    }
    return null;
}
