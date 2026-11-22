'use client';

import { RequestSnackbar } from '@/api/Request';
import { AuthStatus, useAuth } from '@/auth/Auth';
import { formatTime } from '@/board/pgn/boardTools/underboard/clock/ClockUsage';
import ViewerSettings from '@/board/pgn/boardTools/underboard/settings/ViewerSettings';
import { DefaultUnderboardTab } from '@/board/pgn/boardTools/underboard/underboardTabs';
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
import {
    Bolt,
    ChevronLeft,
    ChevronRight,
    Close,
    FormatListBulleted,
    KeyboardDoubleArrowLeft,
    KeyboardDoubleArrowRight,
    Settings as SettingsIcon,
} from '@mui/icons-material';
import {
    Box,
    Button,
    CardContent,
    Container,
    Divider,
    Drawer,
    IconButton,
    Paper,
    Stack,
    Theme,
    Typography,
    useMediaQuery,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { ReactNode, useMemo, useRef, useState } from 'react';
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
    // On phones Settings is in the MobileActionBar, so the panel keeps only the puzzle
    // tab, which also hides its tab strip.
    const isPhone = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
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
    const { prevWrongHref, nextWrongHref } = getWrongHrefs(session, index);

    return (
        // On phones the action bar is fixed to the bottom of the screen, so leave room for it.
        <Container maxWidth={false} sx={{ pt: 4, pb: { xs: 18, sm: 4 } }}>
            <MobileActionBar
                session={session}
                index={index}
                complete={complete}
                prevHref={prevHref}
                nextHref={nextHref}
                prevWrongHref={prevWrongHref}
                nextWrongHref={nextWrongHref}
            />
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
                                prevWrongHref={prevWrongHref}
                                nextWrongHref={nextWrongHref}
                            />
                        ),
                    },
                    ...(isPhone ? [] : [DefaultUnderboardTab.Settings]),
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
    prevWrongHref,
    nextWrongHref,
}: {
    session: PuzzleRushSession;
    attempt: PuzzleRushAttempt;
    index: number;
    orientation: 'white' | 'black';
    complete: boolean;
    wrongMoves: number;
    prevHref?: string;
    nextHref?: string;
    prevWrongHref?: string;
    nextWrongHref?: string;
}) {
    const t = useTranslations('puzzles.rush');
    const originalMovetext = useMemo(() => stripPgnHeaders(attempt.pgn), [attempt.pgn]);

    return (
        <CardContent sx={{ minHeight: 1 }}>
            <Stack sx={{ minHeight: 1, gap: 2 }}>
                {/* On phones previous/next are in the pinned MobileActionBar instead. */}
                <Stack
                    direction='row'
                    sx={{
                        display: { xs: 'none', sm: 'flex' },
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

                {/* On phones these actions are in the pinned MobileActionBar instead. */}
                <Stack
                    direction='row'
                    sx={{
                        display: { xs: 'none', sm: 'flex' },
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                        flexWrap: 'wrap',
                    }}
                >
                    <Button
                        variant='contained'
                        component={Link}
                        disabled={!prevWrongHref}
                        href={prevWrongHref}
                    >
                        {t('prevWrong')}
                    </Button>
                    <Button
                        variant='contained'
                        component={Link}
                        disabled={!nextWrongHref}
                        href={nextWrongHref}
                    >
                        {t('nextWrong')}
                    </Button>
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

/** Returns links to the closest wrong puzzles before and after the given index. */
function getWrongHrefs(session: PuzzleRushSession, index: number) {
    let prevWrongHref: string | undefined;
    let nextWrongHref: string | undefined;

    for (let i = index - 1; i >= 0; i--) {
        if (session.attempts[i].result !== 'win') {
            prevWrongHref = puzzleRushRetryHref(session.createdAt, i);
            break;
        }
    }
    for (let i = index + 1; i < session.attempts.length; i++) {
        if (session.attempts[i].result !== 'win') {
            nextWrongHref = puzzleRushRetryHref(session.createdAt, i);
            break;
        }
    }
    return { prevWrongHref, nextWrongHref };
}

/**
 * On phones the board fills the screen width, which pushes the navigation buttons
 * below the fold. This bar keeps them fixed to the bottom of the screen instead:
 * previous/next puzzle on top, and the wrong-puzzle, run and new-run actions
 * below as a row of icon tabs.
 */
function MobileActionBar({
    session,
    index,
    complete,
    prevHref,
    nextHref,
    prevWrongHref,
    nextWrongHref,
}: {
    session: PuzzleRushSession;
    index: number;
    complete: boolean;
    prevHref?: string;
    nextHref?: string;
    prevWrongHref?: string;
    nextWrongHref?: string;
}) {
    const t = useTranslations('puzzles.rush');
    const [settingsOpen, setSettingsOpen] = useState(false);

    return (
        <Paper
            square
            elevation={8}
            data-testid='puzzle-rush-mobile-actions'
            sx={{
                display: { xs: 'flex', sm: 'none' },
                flexDirection: 'column',
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: (theme) => theme.zIndex.appBar,
                gap: 0.5,
                px: 1,
                pt: 1.5,
                pb: 'calc(4px + env(safe-area-inset-bottom))',
                borderTop: '1px solid',
                borderColor: 'divider',
            }}
        >
            <Stack direction='row' sx={{ alignItems: 'center', gap: 1.5 }}>
                <Button
                    variant='outlined'
                    startIcon={<ChevronLeft />}
                    disabled={!prevHref}
                    component={Link}
                    href={prevHref ?? '#'}
                    sx={{ flex: 1, whiteSpace: 'nowrap' }}
                >
                    {t('previous')}
                </Button>
                <Typography
                    variant='body2'
                    sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', color: 'text.secondary' }}
                >
                    {index + 1} / {session.attempts.length}
                </Typography>
                <Button
                    variant={complete ? 'contained' : 'outlined'}
                    endIcon={<ChevronRight />}
                    disabled={!nextHref}
                    component={Link}
                    href={nextHref ?? '#'}
                    sx={{ flex: 1, whiteSpace: 'nowrap' }}
                >
                    {t('next')}
                </Button>
            </Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
                <MobileTab
                    icon={<KeyboardDoubleArrowLeft />}
                    label={t('prevWrongShort')}
                    href={prevWrongHref}
                />
                <MobileTab
                    icon={<KeyboardDoubleArrowRight />}
                    label={t('nextWrongShort')}
                    href={nextWrongHref}
                />
                <MobileTab
                    icon={<FormatListBulleted />}
                    label={t('backToRun')}
                    href={puzzleRushReviewHref(session.createdAt)}
                />
                <MobileTab icon={<Bolt />} label={t('newRun')} href='/puzzles/rush' />
                <MobileTab
                    icon={<SettingsIcon />}
                    label={t('tooltipSettings')}
                    onClick={() => setSettingsOpen(true)}
                />
            </Box>
            <Drawer
                anchor='bottom'
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                slotProps={{
                    paper: {
                        sx: {
                            maxHeight: '80vh',
                            borderTopLeftRadius: 12,
                            borderTopRightRadius: 12,
                            pb: 'env(safe-area-inset-bottom)',
                        },
                    },
                }}
            >
                <IconButton
                    aria-label={t('close')}
                    onClick={() => setSettingsOpen(false)}
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                >
                    <Close />
                </IconButton>
                <CardContent>
                    <ViewerSettings />
                </CardContent>
            </Drawer>
        </Paper>
    );
}

/** A bottom-navigation style link: an icon above a one-line caption. */
function MobileTab({
    icon,
    label,
    href,
    onClick,
}: {
    icon: ReactNode;
    label: string;
    href?: string;
    onClick?: () => void;
}) {
    const linkProps = onClick
        ? { onClick }
        : { component: Link, href: href ?? '#', disabled: !href };
    return (
        <Button
            color='inherit'
            {...linkProps}
            sx={{
                minWidth: 0,
                px: 0,
                py: 0.75,
                flexDirection: 'column',
                gap: 0.25,
                color: 'text.secondary',
                textTransform: 'none',
                fontSize: '0.6875rem',
                letterSpacing: 0,
                lineHeight: 1.2,
                '& .MuiSvgIcon-root': { fontSize: '1.375rem' },
            }}
        >
            {icon}
            <Box
                component='span'
                sx={{
                    maxWidth: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}
            >
                {label}
            </Box>
        </Button>
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
                    <Typography
                        color='success'
                        sx={{ fontWeight: 'bold', ml: 2, mt: 1.5, mb: { xs: 1.5, sm: 0 } }}
                    >
                        {t('solved')}
                    </Typography>
                )}
                {/* On phones these actions are in the pinned MobileActionBar instead. */}
                <Stack
                    direction='row'
                    sx={{
                        display: { xs: 'none', sm: 'flex' },
                        my: 1,
                        px: 1,
                        gap: 1,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                    }}
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
