'use client';

import { RequestSnackbar } from '@/api/Request';
import { AuthStatus, useAuth } from '@/auth/Auth';
import { formatTime } from '@/board/pgn/boardTools/underboard/clock/ClockUsage';
import PgnBoard, { PgnBoardApi } from '@/board/pgn/PgnBoard';
import { Link } from '@/components/navigation/Link';
import LoadingPage from '@/loading/LoadingPage';
import NotFoundPage from '@/NotFoundPage';
import { Chess, Color } from '@jackstenglein/chess';
import {
    PuzzleRushAttempt,
    PuzzleRushResult,
} from '@jackstenglein/chess-dojo-common/src/puzzles/rush/api';
import {
    PUZZLE_RUSH_DURATION_SECONDS,
    PUZZLE_RUSH_MAX_STRIKES,
    PUZZLE_RUSH_RATING_WINDOW,
    PUZZLE_RUSH_START_RATING,
} from '@jackstenglein/chess-dojo-common/src/puzzles/rush/rating';
import { AccessTime, Bolt, Close, LocalFireDepartment, Timeline } from '@mui/icons-material';
import {
    Box,
    Button,
    CardContent,
    CircularProgress,
    Container,
    Stack,
    Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useMemo, useRef } from 'react';
import {
    PuzzleRushAttemptsTable,
    puzzleRushRetryHref,
    puzzleRushReviewHref,
    PuzzleRushStatsGrid,
} from './PuzzleRushSummary';
import { usePuzzleRush, UsePuzzleRushResponse } from './usePuzzleRush';

/** Renders the puzzle rush page. Requires authentication. */
export function PuzzleRushPage() {
    const { user, status } = useAuth();
    if (status === AuthStatus.Loading) {
        return <LoadingPage />;
    }
    if (!user) {
        return <NotFoundPage />;
    }
    return <PuzzleRush />;
}

function PuzzleRush() {
    const rush = usePuzzleRush();

    if (rush.phase === 'idle') {
        return (
            <>
                <IdleScreen onStart={rush.start} />
                <RequestSnackbar request={rush.fetchRequest} />
            </>
        );
    }

    if (rush.phase === 'loading') {
        return (
            <Container maxWidth='sm' sx={{ py: 8, textAlign: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }

    if (rush.phase === 'finished') {
        return (
            <>
                <FinishedScreen rush={rush} />
                <RequestSnackbar request={rush.submitRequest} />
                <RequestSnackbar request={rush.fetchRequest} />
            </>
        );
    }

    return <RunningScreen rush={rush} />;
}

/** The landing screen shown before a run begins. */
function IdleScreen({ onStart }: { onStart: () => void }) {
    const t = useTranslations('puzzles.rush');

    return (
        <Container maxWidth='sm' sx={{ py: 8, textAlign: 'center' }}>
            <Bolt color='primary' sx={{ fontSize: '5rem' }} />
            <Typography variant='h4' sx={{ fontWeight: 'bold', mb: 2 }}>
                {t('title')}
            </Typography>
            <Typography
                variant='body1'
                sx={{
                    color: 'text.secondary',
                    mb: 1,
                }}
            >
                {t('introTime', {
                    minutes: PUZZLE_RUSH_DURATION_SECONDS / 60,
                    strikes: PUZZLE_RUSH_MAX_STRIKES,
                })}
            </Typography>
            <Typography
                variant='body1'
                sx={{
                    color: 'text.secondary',
                    mb: 1,
                }}
            >
                {t('introRating', {
                    start: PUZZLE_RUSH_START_RATING,
                    window: PUZZLE_RUSH_RATING_WINDOW,
                })}
            </Typography>
            <Typography
                variant='body1'
                sx={{
                    color: 'text.secondary',
                    mb: 4,
                }}
            >
                {t('introReview')}
            </Typography>
            <Stack direction='row' spacing={2} sx={{ justifyContent: 'center' }}>
                <Button variant='contained' size='large' onClick={onStart} sx={{ px: 6, py: 1.5 }}>
                    {t('startButton')}
                </Button>
                <Button size='large' component={Link} href='/puzzles/rush/history'>
                    {t('viewHistory')}
                </Button>
            </Stack>
        </Container>
    );
}

/** The screen shown while a run is in progress. */
function RunningScreen({ rush }: { rush: UsePuzzleRushResponse }) {
    const t = useTranslations('puzzles.rush');
    const pgnRef = useRef<PgnBoardApi>(null);
    const { currentPuzzle, onWrongMove, onComplete } = rush;

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
    const orientation = playerColor === Color.white ? 'white' : 'black';

    if (!currentPuzzle) {
        return (
            <Container maxWidth='sm' sx={{ py: 8, textAlign: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }

    return (
        <Container maxWidth={false} sx={{ py: 4 }}>
            <PgnBoard
                ref={pgnRef}
                key={currentPuzzle.id}
                showPlayerHeaders={false}
                underboardTabs={[
                    {
                        name: 'puzzleRush',
                        tooltip: t('title'),
                        icon: <Bolt />,
                        element: <PuzzleRushUnderboard rush={rush} orientation={orientation} />,
                    },
                ]}
                pgn={puzzlePGN}
                initialUnderboardTab='puzzleRush'
                disableEngine
                disableNullMoves
                startOrientation={orientation}
                onInitialize={(board) =>
                    pgnRef.current?.solitaire.start(null, {
                        playAs: orientation,
                        board,
                        allowDifferentMates: true,
                        onWrongMove: () => onWrongMove(pgnRef.current?.getPgn()),
                        onComplete,
                    })
                }
            />
        </Container>
    );
}

/** The underboard panel shown during a run: timer, strikes, score, rating and streak. */
function PuzzleRushUnderboard({
    rush,
    orientation,
}: {
    rush: UsePuzzleRushResponse;
    orientation: 'white' | 'black';
}) {
    const t = useTranslations('puzzles.rush');
    const { secondsRemaining, strikes, stats, rating, streak, attempts, flash, abort } = rush;
    const lowTime = secondsRemaining <= 30;

    return (
        <CardContent sx={{ minHeight: 1 }}>
            <Stack sx={{ minHeight: 1, gap: 2 }}>
                <Stack
                    direction='row'
                    sx={{
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 2,
                    }}
                >
                    <Stack
                        direction='row'
                        sx={{
                            alignItems: 'center',
                            gap: 1,
                            color: lowTime ? 'error.main' : 'text.primary',
                        }}
                    >
                        <AccessTime fontSize='large' />
                        <Typography variant='h4' sx={{ fontWeight: 'bold' }}>
                            {formatTime(secondsRemaining)}
                        </Typography>
                    </Stack>

                    <StrikeIndicator strikes={strikes} />
                </Stack>

                <Typography variant='h6' sx={{ fontWeight: 'bold' }}>
                    {orientation === 'white' ? t('whiteToMove') : t('blackToMove')}
                </Typography>

                <Stack
                    direction='row'
                    sx={{
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 2,
                    }}
                >
                    <Stack direction='row' sx={{ alignItems: 'center', gap: 1 }}>
                        <Typography variant='h5' sx={{ fontWeight: 'bold' }} color='success'>
                            {stats.correctCount}
                        </Typography>
                        <Typography color='textSecondary'>{t('correctLabel')}</Typography>
                    </Stack>

                    <Stack direction='row' sx={{ alignItems: 'center', gap: 1 }}>
                        <Timeline />
                        <Typography variant='h5' sx={{ fontWeight: 'bold' }}>
                            {rating}
                        </Typography>
                    </Stack>

                    {streak > 1 && (
                        <Stack direction='row' sx={{ alignItems: 'center', gap: 0.5 }}>
                            <LocalFireDepartment color='dojoOrange' />
                            <Typography color='dojoOrange' sx={{ fontWeight: 'bold' }}>
                                {t('streakRow', { streak })}
                            </Typography>
                        </Stack>
                    )}
                </Stack>

                <ResultStrip attempts={attempts} flash={flash} />

                <Box sx={{ flexGrow: 1 }} />

                <Button
                    color='error'
                    variant='outlined'
                    onClick={abort}
                    sx={{ alignSelf: 'start' }}
                >
                    {t('endRunButton')}
                </Button>
            </Stack>
        </CardContent>
    );
}

/** Renders one X per allowed strike, filled in for strikes already used. */
function StrikeIndicator({ strikes }: { strikes: number }) {
    return (
        <Stack direction='row' sx={{ gap: 0.5 }}>
            {Array.from({ length: PUZZLE_RUSH_MAX_STRIKES }).map((_, i) => (
                <Box
                    key={i}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        borderRadius: 1,
                        border: '2px solid',
                        borderColor: i < strikes ? 'error.main' : 'divider',
                        bgcolor: i < strikes ? 'error.main' : 'transparent',
                        color: i < strikes ? 'error.contrastText' : 'divider',
                    }}
                >
                    <Close fontSize='small' />
                </Box>
            ))}
        </Stack>
    );
}

/** Renders a compact strip of green/red squares for the attempts made so far. */
function ResultStrip({
    attempts,
    flash,
}: {
    attempts: PuzzleRushAttempt[];
    flash?: PuzzleRushResult;
}) {
    if (attempts.length === 0) {
        return null;
    }

    return (
        <Stack direction='row' sx={{ flexWrap: 'wrap', columnGap: 1, rowGap: 1 }}>
            {attempts.map((attempt, i) => {
                const isLatest = i === attempts.length - 1 && flash !== undefined;
                return (
                    <Stack
                        key={`${attempt.puzzleId}-${i}`}
                        sx={{ alignItems: 'center', minWidth: 32, gap: 0.25 }}
                    >
                        <Box
                            sx={{
                                width: isLatest ? 20 : 14,
                                height: isLatest ? 20 : 14,
                                borderRadius: 0.5,
                                bgcolor: attempt.result === 'win' ? 'success.main' : 'error.main',
                                transition: 'all 0.15s',
                            }}
                        />
                        <Typography
                            variant='caption'
                            sx={{
                                color: 'text.secondary',
                                lineHeight: 1,
                                fontWeight: isLatest ? 'bold' : undefined,
                            }}
                        >
                            {attempt.puzzleRating}
                        </Typography>
                    </Stack>
                );
            })}
        </Stack>
    );
}

/** The results screen shown once a run has ended. */
function FinishedScreen({ rush }: { rush: UsePuzzleRushResponse }) {
    const t = useTranslations('puzzles.rush');
    const { stats, attempts, endReason, createdAt, submitRequest, start, retrySubmit } = rush;
    const saved = submitRequest.data !== undefined;
    const totalTimeSeconds = PUZZLE_RUSH_DURATION_SECONDS - rush.secondsRemaining;

    return (
        <Container maxWidth='md' sx={{ py: 5 }}>
            <Stack spacing={4} sx={{ alignItems: 'center' }}>
                <Typography variant='h4' sx={{ fontWeight: 'bold' }}>
                    {t('runComplete')}
                </Typography>

                <PuzzleRushStatsGrid
                    stats={submitRequest.data ?? stats}
                    endReason={endReason}
                    totalTimeSeconds={totalTimeSeconds}
                />

                <Stack
                    direction='row'
                    spacing={2}
                    sx={{
                        justifyContent: 'center',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                    }}
                >
                    <Button variant='contained' size='large' onClick={start} sx={{ px: 4 }}>
                        {t('playAgain')}
                    </Button>
                    {saved ? (
                        <Button
                            variant='outlined'
                            size='large'
                            component={Link}
                            href={puzzleRushReviewHref(createdAt)}
                        >
                            {t('reviewPuzzles')}
                        </Button>
                    ) : submitRequest.isFailure() ? (
                        <Button variant='outlined' size='large' color='error' onClick={retrySubmit}>
                            {t('retrySave')}
                        </Button>
                    ) : (
                        <Button variant='outlined' size='large' disabled>
                            <CircularProgress size={18} sx={{ mr: 1, color: 'inherit' }} />
                            {t('saving')}
                        </Button>
                    )}
                </Stack>

                {attempts.length > 0 && (
                    <Box sx={{ width: 1 }}>
                        <Typography variant='h6' sx={{ mb: 1 }}>
                            {t('attemptsHeading')}
                        </Typography>
                        <Typography
                            variant='body2'
                            sx={{
                                color: 'text.secondary',
                                mb: 2,
                            }}
                        >
                            {saved ? t('attemptsHintSaved') : t('attemptsHintUnsaved')}
                        </Typography>
                        <PuzzleRushAttemptsTable
                            attempts={attempts}
                            getHref={
                                saved ? (index) => puzzleRushRetryHref(createdAt, index) : undefined
                            }
                        />
                    </Box>
                )}
            </Stack>
        </Container>
    );
}
