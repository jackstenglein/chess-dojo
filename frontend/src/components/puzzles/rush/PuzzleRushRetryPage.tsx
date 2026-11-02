'use client';

import { RequestSnackbar } from '@/api/Request';
import { AuthStatus, useAuth } from '@/auth/Auth';
import { formatTime } from '@/board/pgn/boardTools/underboard/clock/ClockUsage';
import PgnBoard, { PgnBoardApi, useChess } from '@/board/pgn/PgnBoard';
import { InProgressAfterPgnText } from '@/board/pgn/solitaire/SolitaireAfterPgnText';
import { LoseIcon, WinIcon } from '@/components/games/list/GameListItem';
import { Link } from '@/components/navigation/Link';
import LoadingPage from '@/loading/LoadingPage';
import NotFoundPage from '@/NotFoundPage';
import { Chess, Color } from '@jackstenglein/chess';
import {
    PuzzleRushAttempt,
    PuzzleRushSession,
} from '@jackstenglein/chess-dojo-common/src/puzzles/rush/api';
import { Bolt, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { Box, Button, CardContent, Container, Divider, Stack, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { ReactNode, useMemo, useRef, useState } from 'react';
import { DefaultUnderboardTab } from 'src/board/pgn/boardTools/underboard/underboardTabs';
import { puzzleRushRetryHref, puzzleRushReviewHref } from './PuzzleRushSummary';
import { usePuzzleRushSession } from './usePuzzleRushSession';

/**
 * Renders an untimed retry of a single puzzle from a puzzle rush run. The user can
 * step through the run's puzzles with previous/next controls.
 */
export function PuzzleRushRetryPage({ createdAt, index }: { createdAt: string; index: number }) {
    const { user, status } = useAuth();
    if (status === AuthStatus.Loading) {
        return <LoadingPage />;
    }
    if (!user) {
        return <NotFoundPage />;
    }
    return <PuzzleRushRetry createdAt={createdAt} index={index} />;
}

function PuzzleRushRetry({ createdAt, index }: { createdAt: string; index: number }) {
    const request = usePuzzleRushSession(createdAt);

    if (!request.isSent() || request.isLoading()) {
        return <LoadingPage />;
    }

    const session = request.data;
    const attempt = session?.attempts[index];
    if (!session || !attempt || !Number.isInteger(index) || index < 0) {
        return (
            <>
                <NotFoundPage />
                <RequestSnackbar request={request} />
            </>
        );
    }

    return (
        <RetryBoard
            key={`${createdAt}-${index}`}
            session={session}
            attempt={attempt}
            index={index}
        />
    );
}

function RetryBoard({
    session,
    attempt,
    index,
}: {
    session: PuzzleRushSession;
    attempt: PuzzleRushAttempt;
    index: number;
}) {
    const t = useTranslations('puzzles.rush');
    const pgnRef = useRef<PgnBoardApi>(null);
    const [complete, setComplete] = useState(false);
    const [wrongMoves, setWrongMoves] = useState(0);

    const [puzzlePGN, playerColor] = useMemo(() => {
        let chess: Chess;
        if (attempt.pgn) {
            chess = new Chess({ pgn: attempt.pgn });
        } else {
            chess = new Chess({ fen: attempt.fen });
            for (const move of attempt.moves) {
                chess.move(move);
            }
        }
        return [chess.renderPgn(), chess.history()[1].color];
    }, [attempt]);
    const orientation = playerColor === Color.white ? 'white' : 'black';

    const prevHref = index > 0 ? puzzleRushRetryHref(session.createdAt, index - 1) : undefined;
    const nextHref =
        index < session.attempts.length - 1
            ? puzzleRushRetryHref(session.createdAt, index + 1)
            : undefined;

    return (
        <Container maxWidth={false} sx={{ py: 4 }}>
            <PgnBoard
                ref={pgnRef}
                pgn={puzzlePGN}
                showPlayerHeaders={false}
                underboardTabs={[
                    {
                        name: 'puzzleRushRetry',
                        tooltip: t('title'),
                        icon: <Bolt />,
                        element: (
                            <RetryUnderboard
                                session={session}
                                attempt={attempt}
                                index={index}
                                orientation={orientation}
                                complete={complete}
                                wrongMoves={wrongMoves}
                                prevHref={prevHref}
                                nextHref={nextHref}
                            />
                        ),
                    },
                    DefaultUnderboardTab.Settings,
                ]}
                initialUnderboardTab='puzzleRushRetry'
                disableNullMoves={!complete}
                startOrientation={orientation}
                onInitialize={(board) =>
                    pgnRef.current?.solitaire.start(null, {
                        playAs: orientation,
                        board,
                        allowDifferentMates: true,
                        onWrongMove: () => setWrongMoves((n) => n + 1),
                        onComplete: () => setComplete(true),
                        addWrongMoves: true,
                        incorrectMoveComment: t('incorrectMoveComment'),
                        enableEngine: true,
                    })
                }
                slots={{
                    afterPgnText: (
                        <RetryAfterPgnText
                            nextHref={nextHref}
                            reviewHref={puzzleRushReviewHref(session.createdAt)}
                        />
                    ),
                }}
            />
        </Container>
    );
}

function RetryUnderboard({
    session,
    attempt,
    index,
    orientation,
    complete,
    wrongMoves,
    prevHref,
    nextHref,
}: {
    session: PuzzleRushSession;
    attempt: PuzzleRushAttempt;
    index: number;
    orientation: 'white' | 'black';
    complete: boolean;
    wrongMoves: number;
    prevHref?: string;
    nextHref?: string;
}) {
    const t = useTranslations('puzzles.rush');
    const originalMovetext = useMemo(() => stripPgnHeaders(attempt.pgn), [attempt.pgn]);

    return (
        <CardContent sx={{ minHeight: 1 }}>
            <Stack sx={{ minHeight: 1, gap: 2 }}>
                <Stack
                    direction='row'
                    sx={{
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Button
                        size='small'
                        startIcon={<ChevronLeft />}
                        disabled={!prevHref}
                        component={Link}
                        href={prevHref ?? '#'}
                    >
                        {t('previous')}
                    </Button>
                    <Typography sx={{ fontWeight: 'bold' }}>
                        {t('puzzleIndex', { index: index + 1, total: session.attempts.length })}
                    </Typography>
                    <Button
                        size='small'
                        endIcon={<ChevronRight />}
                        disabled={!nextHref}
                        component={Link}
                        href={nextHref ?? '#'}
                    >
                        {t('next')}
                    </Button>
                </Stack>

                <Typography variant='h6' sx={{ fontWeight: 'bold' }}>
                    {orientation === 'white' ? t('whiteToMove') : t('blackToMove')}
                </Typography>

                <Typography
                    variant='body2'
                    sx={{
                        color: 'text.secondary',
                    }}
                >
                    {t('retryHint')}
                </Typography>

                <Stack>
                    <DetailRow label={t('puzzleId')} value={attempt.puzzleId} />
                    <DetailRow label={t('columnPuzzleRating')} value={attempt.puzzleRating} />
                    <DetailRow
                        label={t('originalTime')}
                        value={formatTime(attempt.timeSpentSeconds)}
                    />
                    <DetailRow
                        label={t('originalResult')}
                        value={
                            <Stack
                                direction='row'
                                sx={{
                                    alignItems: 'center',
                                    gap: 1,
                                    color: attempt.result === 'win' ? 'success.main' : 'error.main',
                                }}
                            >
                                {attempt.result === 'win' ? <WinIcon /> : <LoseIcon />}
                                {attempt.result === 'win' ? t('resultCorrect') : t('resultWrong')}
                            </Stack>
                        }
                    />
                    {complete && (
                        <DetailRow
                            label={t('retryResult')}
                            value={
                                wrongMoves === 0
                                    ? t('retrySolvedClean')
                                    : t('retrySolvedWithMistakes', { count: wrongMoves })
                            }
                        />
                    )}
                </Stack>

                {attempt.result === 'loss' && originalMovetext && complete && (
                    <Stack>
                        <Typography variant='subtitle2' sx={{ mb: 0.5 }}>
                            {t('originalMoves')}
                        </Typography>
                        <Box
                            sx={{
                                p: 1,
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                fontFamily: 'monospace',
                                fontSize: '0.85rem',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                            }}
                        >
                            {originalMovetext}
                        </Box>
                    </Stack>
                )}

                <Box sx={{ flexGrow: 1 }} />

                <Stack
                    direction='row'
                    sx={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                        flexWrap: 'wrap',
                    }}
                >
                    <Button
                        variant='contained'
                        component={Link}
                        href={puzzleRushReviewHref(session.createdAt)}
                    >
                        {t('backToRun')}
                    </Button>
                    <Button variant='contained' component={Link} href='/puzzles/rush'>
                        {t('newRun')}
                    </Button>
                </Stack>
            </Stack>
        </CardContent>
    );
}

function DetailRow({ label, value }: { label: ReactNode; value: ReactNode }) {
    return (
        <Stack
            direction='row'
            sx={{
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid',
                borderColor: 'divider',
                color: 'text.secondary',
                pt: '2px',
            }}
        >
            <Typography>{label}</Typography>
            <Typography component='div' sx={{ fontWeight: 'bold' }}>
                {value}
            </Typography>
        </Stack>
    );
}

/** Shows hint/answer buttons while solving and navigation buttons once the puzzle is solved. */
function RetryAfterPgnText({ nextHref, reviewHref }: { nextHref?: string; reviewHref: string }) {
    const t = useTranslations('puzzles.rush');
    const { solitaire } = useChess();

    if (solitaire?.complete || !solitaire?.enabled) {
        return (
            <Stack>
                <Divider sx={{ width: 1 }} />
                {solitaire?.complete && (
                    <Typography color='success' sx={{ fontWeight: 'bold', ml: 2, mt: 1.5 }}>
                        {t('solved')}
                    </Typography>
                )}
                <Stack
                    direction='row'
                    sx={{ my: 1, px: 1, gap: 1, alignItems: 'center', flexWrap: 'wrap' }}
                >
                    {nextHref && (
                        <Button component={Link} href={nextHref}>
                            {t('nextPuzzle')}
                        </Button>
                    )}
                    <Button component={Link} href={reviewHref}>
                        {t('backToRun')}
                    </Button>
                    <Button component={Link} href='/puzzles/rush'>
                        {t('newRun')}
                    </Button>
                </Stack>
            </Stack>
        );
    }
    return <InProgressAfterPgnText />;
}

/** Removes the header section from a PGN, returning only the movetext. */
function stripPgnHeaders(pgn?: string): string {
    if (!pgn) {
        return '';
    }
    return pgn
        .split('\n')
        .filter((line) => !line.trim().startsWith('['))
        .join('\n')
        .trim();
}
