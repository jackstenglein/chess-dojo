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
} from '@jackstenglein/chess-dojo-common/src/puzzles/rush/rating';
import {
    AccessAlarm,
    AccessTime,
    Bolt,
    Clear,
    Close,
    LocalFireDepartment,
    Settings,
} from '@mui/icons-material';
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
import { ShortcutAction } from 'src/board/pgn/boardTools/underboard/settings/ShortcutAction';
import ViewerSettings, {
    ViewerSetting,
} from 'src/board/pgn/boardTools/underboard/settings/ViewerSettings';
import { PuzzleRushBests, PuzzleRushIndexes } from './PuzzleRushStanding';
import {
    PuzzleRushAttemptsTable,
    puzzleRushRetryHref,
    puzzleRushReviewHref,
    PuzzleRushStatsGrid,
} from './PuzzleRushSummary';
import { usePuzzleRush, UsePuzzleRushResponse } from './usePuzzleRush';
import { usePuzzleRushBests } from './usePuzzleRushBests';

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
    const bestsRequest = usePuzzleRushBests();

    return (
        <Container maxWidth='sm' sx={{ py: 8, textAlign: 'center' }}>
            <Bolt color='primary' sx={{ fontSize: '5rem' }} />
            <Typography variant='h4' sx={{ fontWeight: 'bold', mb: 2 }}>
                {t('title')}
            </Typography>

            <Stack
                direction='row'
                sx={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    gap: 6,
                    my: 5,
                }}
            >
                <Stack sx={{ alignItems: 'center', justifyContent: 'center' }}>
                    <AccessAlarm sx={{ fontSize: '3rem', mb: 1 }} />
                    <Typography variant='h6'>
                        {t('introTime', {
                            minutes: PUZZLE_RUSH_DURATION_SECONDS / 60,
                        })}
                    </Typography>
                </Stack>

                <Stack sx={{ alignItems: 'center', justifyContent: 'center' }}>
                    <Clear sx={{ fontSize: '3rem', mb: 1 }} />
                    <Typography variant='h6'>
                        {t('introStrikes', {
                            strikes: PUZZLE_RUSH_MAX_STRIKES,
                        })}
                    </Typography>
                </Stack>
            </Stack>

            {bestsRequest.data && (
                <Box sx={{ my: 4 }}>
                    <PuzzleRushBests bests={bestsRequest.data} />
                </Box>
            )}

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
                underboardTabs={[]}
                rightTabs={[
                    {
                        name: 'puzzleRush',
                        tooltip: t('title'),
                        icon: <Bolt />,
                        element: <PuzzleRushUnderboard rush={rush} orientation={orientation} />,
                    },
                    {
                        name: 'puzzleRushSettings',
                        tooltip: t('tooltipSettings'),
                        icon: <Settings />,
                        element: <PuzzleRushSettings />,
                    },
                ]}
                pgn={puzzlePGN}
                initialRightTab='puzzleRush'
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
                        incorrectMoveComment: t('incorrectMoveCommentDuringRun'),
                        addWrongMoves: true,
                    })
                }
                hideBoardButtons
            />
        </Container>
    );
}

const viewerSettings = {
    [ViewerSetting.BoardStyle]: true,
    [ViewerSetting.PieceStyle]: true,
    [ViewerSetting.CoordinateStyle]: true,
    [ViewerSetting.CoordinateSize]: true,
    [ViewerSetting.StartEndButtonBehavior]: true,
    [ViewerSetting.VariationBehavior]: true,
    [ViewerSetting.ShowLegalMoves]: true,
    [ViewerSetting.ScrollOnBoardToMove]: true,
    [ViewerSetting.InlineNotation]: true,
    [ViewerSetting.ShowEngine]: true,
    [ViewerSetting.PieceSounds]: true,
    [ViewerSetting.CorrectSolitaireMoveSound]: true,
    [ViewerSetting.IncorrectSolitaireMoveSound]: true,
};

const keyboardShortcutProps = {
    actions: [
        ShortcutAction.FirstMove,
        ShortcutAction.FirstMoveVariation,
        ShortcutAction.PreviousMove,
        ShortcutAction.NextMove,
        ShortcutAction.LastMove,
        ShortcutAction.LastMoveVariation,
        ShortcutAction.ToggleOrientation,
    ],
};

/** The underboard panel for puzzle rush settings. */
function PuzzleRushSettings() {
    return (
        <CardContent sx={{ minHeight: 1 }}>
            <ViewerSettings
                enabledSettings={viewerSettings}
                keyboardShortcutsProps={keyboardShortcutProps}
            />
        </CardContent>
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
    const { secondsRemaining, strikes, stats, streak, attempts, flash, abort } = rush;
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
                        my: 3,
                    }}
                >
                    <Stack direction='row' sx={{ alignItems: 'center', gap: 1 }}>
                        <Typography variant='h5' sx={{ fontWeight: 'bold' }} color='success'>
                            {stats.correctCount}
                        </Typography>
                        <Typography color='textSecondary'>{t('correctLabel')}</Typography>
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
                                width: isLatest ? 24 : 18,
                                height: isLatest ? 24 : 18,
                                borderRadius: 0.5,
                                bgcolor: attempt.result === 'win' ? 'success.main' : 'error.main',
                                transition: 'all 0.15s',
                            }}
                        />
                        <Typography
                            variant='caption'
                            sx={{
                                color: attempt.result === 'win' ? 'success.main' : 'error.main',
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
    const standing = submitRequest.data?.standing;
    const totalTimeSeconds = PUZZLE_RUSH_DURATION_SECONDS - rush.secondsRemaining;

    return (
        <Container maxWidth='md' sx={{ py: 5 }}>
            <Stack spacing={4} sx={{ alignItems: 'center' }}>
                <Typography variant='h4' sx={{ fontWeight: 'bold' }}>
                    {t('runComplete')}
                </Typography>

                <PuzzleRushStatsGrid
                    stats={submitRequest.data?.session ?? stats}
                    endReason={endReason}
                    totalTimeSeconds={totalTimeSeconds}
                />

                {standing && (
                    <Stack spacing={3} sx={{ alignItems: 'center', width: 1 }}>
                        <PuzzleRushIndexes standing={standing} />
                        <PuzzleRushBests bests={standing.bests} />
                    </Stack>
                )}

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
