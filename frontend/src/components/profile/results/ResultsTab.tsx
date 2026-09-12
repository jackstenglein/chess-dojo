'use client';

import { fetchChesscomArchiveGames } from '@/api/external/chesscom';
import { lichessApi } from '@/api/external/lichess';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { getRatingUsername, hideRatingUsername, RatingSystem, User } from '@/database/user';
import LoadingPage from '@/loading/LoadingPage';
import { RatingSystemIcon } from '@/style/RatingSystemIcons';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Card,
    CardContent,
    Checkbox,
    Chip,
    FormControlLabel,
    Grid,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { fideDpTable } from '@jackstenglein/chess-dojo-common/src/ratings/performanceRating';
import { useTranslations } from 'next-intl';
import { ReactNode, useEffect, useState } from 'react';
import {
    AggregatedResults,
    aggregateResults,
    ResultOutcome,
    ResultsBreakdown,
    toUnifiedChesscomResult,
    toUnifiedLichessResult,
    UnifiedResult,
} from './results';

const WINDOW_OPTIONS: { label: string; months?: number }[] = [
    { label: '1m', months: 1 },
    { label: '3m', months: 3 },
    { label: '6m', months: 6 },
    { label: '1y', months: 12 },
    { label: '2y', months: 24 },
    { label: '3y', months: 36 },
    { label: 'all' },
];
/** Upper bound on monthly Chess.com archives fetched for "All" (≈5 years). */
const MAX_ARCHIVE_MONTHS = 60;
/** Time controls the Dojo cares about. Blitz/bullet/daily/correspondence games are excluded entirely. */
const TIME_CONTROLS = ['rapid', 'classical'] as const;
type TimeControl = (typeof TIME_CONTROLS)[number];
const MAX_GAMES_PER_PLATFORM = 300;
const MAX_RECENT_GAMES = 1000;
const MAX_RECENT_SESSIONS = 60;
const ONLINE_PLATFORMS = [RatingSystem.Chesscom, RatingSystem.Lichess] as const;

/** Theme color token for a given result outcome. */
function outcomeColor(outcome: ResultOutcome): string {
    switch (outcome) {
        case 'win':
            return 'success.main';
        case 'loss':
            return 'error.main';
        case 'draw':
            return 'text.secondary';
    }
}

interface GameSession {
    id: string;
    label: string;
    games: UnifiedResult[];
    start: number;
    end: number;
}

interface SessionStats {
    wins: number;
    losses: number;
    draws: number;
    /** Points scored, e.g. 4.5. */
    score: number;
    /** Score percentage, 0-100. */
    percentage: number;
    /** FIDE performance rating, or undefined when no opponent ratings are known. */
    performance?: number;
}

/** Score, percentage and FIDE performance rating for a set of games. */
function getSessionStats(games: UnifiedResult[]): SessionStats {
    const wins = games.filter((g) => g.outcome === 'win').length;
    const losses = games.filter((g) => g.outcome === 'loss').length;
    const draws = games.length - wins - losses;
    const score = wins + draws / 2;
    const percentage = games.length > 0 ? (score / games.length) * 100 : 0;

    const opponentRatings = games
        .map((g) => g.opponentRating)
        .filter((r): r is number => r !== undefined && r > 0);
    let performance: number | undefined;
    if (opponentRatings.length > 0) {
        const avg = Math.round(
            opponentRatings.reduce((sum, r) => sum + r, 0) / opponentRatings.length,
        );
        performance = avg + fideDpTable[Math.round(percentage)];
    }
    return { wins, losses, draws, score, percentage, performance };
}

/**
 * Groups games into one session per calendar month, most-recent month first
 * (games within each session also most-recent first).
 */
function groupByMonth(results: UnifiedResult[]): GameSession[] {
    const byMonth = new Map<string, UnifiedResult[]>();
    const sorted = [...results].sort((a, b) => b.date - a.date);
    for (const game of sorted) {
        const d = new Date(game.date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const group = byMonth.get(key);
        if (group) {
            group.push(game);
        } else {
            byMonth.set(key, [game]);
        }
    }
    return [...byMonth.values()].map((games) => ({
        id: `month-${new Date(games[0].date).toISOString().slice(0, 7)}`,
        label: new Date(games[0].date).toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric',
        }),
        games,
        start: games[games.length - 1].date,
        end: games[0].date,
    }));
}

interface ResultsTabProps {
    user: User;
}

/**
 * Displays the given user's recent online results (games played, win/loss/draw
 * record and a recent-games list) pulled live from their connected Lichess
 * and/or Chess.com accounts, filtered to rapid or classical time controls.
 */
const ResultsTab: React.FC<ResultsTabProps> = ({ user }) => {
    const t = useTranslations('profile.resultsTab');
    const { user: viewer } = useAuth();
    const isOwnProfile = viewer?.username === user.username;

    const [windowMonths, setWindowMonths] = useState<number | undefined>(3);
    const [timeControl, setTimeControl] = useState<TimeControl>('rapid');
    const [includeLichess, setIncludeLichess] = useState(true);
    const [includeChesscom, setIncludeChesscom] = useState(true);
    const request = useRequest<UnifiedResult[]>();

    const lichessUsername = getRatingUsername(user, RatingSystem.Lichess);
    const showLichess =
        !!lichessUsername && (isOwnProfile || !hideRatingUsername(user, RatingSystem.Lichess));

    const chesscomUsername = getRatingUsername(user, RatingSystem.Chesscom);
    const showChesscom =
        !!chesscomUsername && (isOwnProfile || !hideRatingUsername(user, RatingSystem.Chesscom));

    const fetchLichessGames = showLichess && includeLichess;
    const fetchChesscomGames = showChesscom && includeChesscom;

    useEffect(() => {
        if (!showLichess && !showChesscom) {
            return;
        }
        if (!fetchLichessGames && !fetchChesscomGames) {
            request.onSuccess([]);
            return;
        }

        request.onStart();
        const now = new Date();
        const cutoff = new Date(now);
        if (windowMonths !== undefined) {
            cutoff.setMonth(cutoff.getMonth() - windowMonths);
        }
        const since = windowMonths === undefined ? 0 : cutoff.getTime();

        // Monthly Chess.com archives spanning [cutoff, now]; capped for "All".
        const archiveMonths: { year: string; month: string }[] = [];
        {
            const cursor = new Date(
                windowMonths === undefined
                    ? new Date(now.getFullYear(), now.getMonth() - (MAX_ARCHIVE_MONTHS - 1), 1)
                    : new Date(cutoff.getFullYear(), cutoff.getMonth(), 1),
            );
            const end = new Date(now.getFullYear(), now.getMonth(), 1);
            while (cursor <= end && archiveMonths.length < MAX_ARCHIVE_MONTHS) {
                archiveMonths.push({
                    year: String(cursor.getFullYear()),
                    month: String(cursor.getMonth() + 1).padStart(2, '0'),
                });
                cursor.setMonth(cursor.getMonth() + 1);
            }
        }

        const fetchLichess = fetchLichessGames
            ? lichessApi
                  .exportUserGames({
                      username: lichessUsername,
                      since,
                      max: MAX_GAMES_PER_PLATFORM,
                      moves: false,
                      opening: false,
                      clocks: false,
                      evals: false,
                  })
                  .then((resp) =>
                      resp.data
                          .map((g) => toUnifiedLichessResult(g, lichessUsername))
                          .filter((r): r is UnifiedResult => !!r),
                  )
            : Promise.resolve<UnifiedResult[]>([]);

        // One failed monthly archive must not wipe out all Chess.com data,
        // so settle per-month and keep whatever succeeded.
        const fetchChesscom = fetchChesscomGames
            ? Promise.allSettled(
                  archiveMonths.map((m) =>
                      fetchChesscomArchiveGames(chesscomUsername, m.year, m.month),
                  ),
              ).then((settled) =>
                  settled
                      .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
                      .filter((g) => g.end_time * 1000 >= since)
                      .map((g) => toUnifiedChesscomResult(g, chesscomUsername)),
              )
            : Promise.resolve<UnifiedResult[]>([]);

        void Promise.allSettled([fetchLichess, fetchChesscom]).then(
            ([lichessResult, chesscomResult]) => {
                if (lichessResult.status === 'rejected' && chesscomResult.status === 'rejected') {
                    request.onFailure(lichessResult.reason);
                    return;
                }

                const results = [
                    ...(lichessResult.status === 'fulfilled' ? lichessResult.value : []),
                    ...(chesscomResult.status === 'fulfilled' ? chesscomResult.value : []),
                ].sort((a, b) => b.date - a.date);

                request.onSuccess(results);
            },
        );
        // request is stable (from useRequest); only re-fetch when the inputs actually change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        showLichess,
        showChesscom,
        fetchLichessGames,
        fetchChesscomGames,
        lichessUsername,
        chesscomUsername,
        windowMonths,
    ]);

    if (!showLichess && !showChesscom) {
        return (
            <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center' }}>
                <Typography>{t('emptyNoAccounts')}</Typography>
                {isOwnProfile && (
                    <Typography>
                        {t.rich('emptyConnectAccounts', {
                            link: (chunks: ReactNode) => (
                                <Link href='/profile/edit'>{chunks}</Link>
                            ),
                        })}
                    </Typography>
                )}
            </Stack>
        );
    }

    if (!request.isSent() || request.isLoading()) {
        return <LoadingPage />;
    }

    const allResults = request.data ?? [];
    const results = allResults.filter(
        (r) =>
            r.timeClass === timeControl &&
            ((r.platform === RatingSystem.Lichess && includeLichess) ||
                (r.platform === RatingSystem.Chesscom && includeChesscom)),
    );
    const aggregated = aggregateResults(results);
    // Every calendar month is a session, including the ongoing month.
    // Most-recent month first, covering up to MAX_RECENT_GAMES games.
    const recentSessions = (() => {
        const sessions = groupByMonth(results);
        const picked: GameSession[] = [];
        let gameCount = 0;
        for (const session of sessions) {
            if (picked.length >= MAX_RECENT_SESSIONS || gameCount >= MAX_RECENT_GAMES) {
                break;
            }
            picked.push(session);
            gameCount += session.games.length;
        }
        return picked;
    })();

    return (
        <Stack spacing={3}>
            <RequestSnackbar request={request} />

            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}
            >
                <ToggleButtonGroup
                    exclusive
                    size='small'
                    value={timeControl}
                    onChange={(_, value: TimeControl | null) => value && setTimeControl(value)}
                >
                    {TIME_CONTROLS.map((tc) => (
                        <ToggleButton key={tc} value={tc}>
                            {t(tc)}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>

                <ToggleButtonGroup
                    exclusive
                    size='small'
                    value={windowMonths ?? 'all'}
                    onChange={(_, value: number | 'all' | null) =>
                        value !== null && setWindowMonths(value === 'all' ? undefined : value)
                    }
                >
                    {WINDOW_OPTIONS.map(({ label, months }) => (
                        <ToggleButton key={label} value={months ?? 'all'}>
                            {label}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>

                {showLichess && showChesscom && (
                    <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    size='small'
                                    checked={includeChesscom}
                                    onChange={(e) => setIncludeChesscom(e.target.checked)}
                                />
                            }
                            label={
                                <Stack direction='row' spacing={0.75} sx={{ alignItems: 'center' }}>
                                    <RatingSystemIcon system={RatingSystem.Chesscom} size='small' />
                                    <Typography variant='body2'>Chess.com</Typography>
                                </Stack>
                            }
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    size='small'
                                    checked={includeLichess}
                                    onChange={(e) => setIncludeLichess(e.target.checked)}
                                />
                            }
                            label={
                                <Stack direction='row' spacing={0.75} sx={{ alignItems: 'center' }}>
                                    <RatingSystemIcon system={RatingSystem.Lichess} size='small' />
                                    <Typography variant='body2'>Lichess</Typography>
                                </Stack>
                            }
                        />
                    </Stack>
                )}
            </Stack>

            <SummaryCard aggregated={aggregated} t={t} />

            {results.length === 0 ? (
                <Typography sx={{ textAlign: 'center' }}>{t('emptyNoGames')}</Typography>
            ) : (
                <>
                    <PlatformBreakdownCard aggregated={aggregated} />
                    <RecentSessionsCard sessions={recentSessions} t={t} />
                </>
            )}
        </Stack>
    );
};

type TFunc = ReturnType<typeof useTranslations<'profile.resultsTab'>>;

function WinLossDrawBar({ breakdown }: { breakdown: ResultsBreakdown }) {
    if (breakdown.games === 0) {
        return null;
    }

    const segments: { outcome: ResultOutcome; count: number }[] = [
        { outcome: 'win', count: breakdown.wins },
        { outcome: 'draw', count: breakdown.draws },
        { outcome: 'loss', count: breakdown.losses },
    ];

    return (
        <Box
            sx={{
                display: 'flex',
                width: 1,
                height: 8,
                borderRadius: 1,
                overflow: 'hidden',
            }}
        >
            {segments.map(
                ({ outcome, count }) =>
                    count > 0 && (
                        <Tooltip key={outcome} title={`${count} ${outcome}`}>
                            <Box
                                sx={{
                                    width: `${(count / breakdown.games) * 100}%`,
                                    bgcolor: outcomeColor(outcome),
                                }}
                            />
                        </Tooltip>
                    ),
            )}
        </Box>
    );
}

function SummaryCard({ aggregated, t }: { aggregated: AggregatedResults; t: TFunc }) {
    const { overall, byColor, avgOpponentRating, bestWinStreak, bestWin } = aggregated;

    return (
        <Card>
            <CardContent>
                <Stack spacing={2}>
                    <Grid container spacing={2}>
                        <SummaryStat label={t('gamesPlayed')} value={`${overall.games}`} />
                        <SummaryStat
                            label={t('record')}
                            value={`${overall.wins}-${overall.losses}-${overall.draws}`}
                        />
                        <SummaryStat
                            label={t('winRate')}
                            value={`${overall.winRate.toFixed(1)}%`}
                        />
                        <SummaryStat
                            label={t('bestStreak')}
                            value={t('streakWin', { count: bestWinStreak })}
                            color={bestWinStreak > 0 ? outcomeColor('win') : undefined}
                        />
                    </Grid>

                    <WinLossDrawBar breakdown={overall} />

                    {overall.games > 0 && (
                        <Grid container spacing={2}>
                            <SummaryStat
                                label={t('asWhite')}
                                value={`${byColor.white.winRate.toFixed(0)}%`}
                                small
                            />
                            <SummaryStat
                                label={t('asBlack')}
                                value={`${byColor.black.winRate.toFixed(0)}%`}
                                small
                            />
                            <SummaryStat
                                label={t('avgOpponent')}
                                value={avgOpponentRating ? `${Math.round(avgOpponentRating)}` : '-'}
                                small
                            />
                            <SummaryStat
                                label={t('bestWin')}
                                value={bestWin?.opponentRating ? `${bestWin.opponentRating}` : '-'}
                                href={bestWin?.url}
                                color={bestWin ? outcomeColor('win') : undefined}
                                small
                            />
                        </Grid>
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
}

function SummaryStat({
    label,
    value,
    caption,
    href,
    color,
    small,
}: {
    label: string;
    value: string;
    /** Optional secondary line under the value, e.g. the opponent's name for "Best Win". */
    caption?: string;
    /** If set, the value links out (e.g. to the game the stat came from). */
    href?: string;
    color?: string;
    small?: boolean;
}) {
    const valueNode = (
        <Typography
            variant={small ? 'h6' : 'h5'}
            sx={{ color, ...(href && { '&:hover': { textDecoration: 'underline' } }) }}
        >
            {value}
        </Typography>
    );

    return (
        <Grid size={{ xs: 6, sm: 3 }}>
            <Stack sx={{ alignItems: 'center' }}>
                {href ? (
                    <Link href={href} target='_blank' rel='noopener noreferrer' underline='none'>
                        {valueNode}
                    </Link>
                ) : (
                    valueNode
                )}
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    {label}
                </Typography>
                {caption && (
                    <Typography
                        variant='caption'
                        sx={{ color: 'text.secondary', maxWidth: '100%' }}
                        noWrap
                    >
                        {caption}
                    </Typography>
                )}
            </Stack>
        </Grid>
    );
}

function PlatformBreakdownCard({ aggregated }: { aggregated: AggregatedResults }) {
    const platforms = ONLINE_PLATFORMS.filter((platform) => aggregated.byPlatform[platform]);
    if (platforms.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardContent>
                <Stack spacing={2}>
                    {platforms.map((platform) => {
                        const breakdown = aggregated.byPlatform[platform];
                        if (!breakdown) {
                            return null;
                        }
                        return (
                            <Stack
                                key={platform}
                                direction='row'
                                spacing={2}
                                sx={{ alignItems: 'center' }}
                            >
                                <Stack
                                    direction='row'
                                    spacing={1}
                                    sx={{ alignItems: 'center', minWidth: 110 }}
                                >
                                    <RatingSystemIcon system={platform} size='small' />
                                    <Typography variant='body1'>
                                        {platform === RatingSystem.Lichess ? 'Lichess' : 'Chess.com'}
                                    </Typography>
                                </Stack>
                                <Box sx={{ flexGrow: 1 }}>
                                    <WinLossDrawBar breakdown={breakdown} />
                                </Box>
                                <Typography
                                    variant='body2'
                                    sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}
                                >
                                    {breakdown.wins}-{breakdown.losses}-{breakdown.draws}
                                </Typography>
                                <Typography sx={{ fontWeight: 'bold', minWidth: 48, textAlign: 'right' }}>
                                    {breakdown.winRate.toFixed(0)}%
                                </Typography>
                            </Stack>
                        );
                    })}
                </Stack>
            </CardContent>
        </Card>
    );
}

function ColorChip({ color, t }: { color: 'white' | 'black'; t: TFunc }) {
    const isWhite = color === 'white';
    return (
        <Chip
            label={t(color)}
            size='small'
            sx={{
                bgcolor: isWhite ? '#eeeeee' : '#2a2a2a',
                color: isWhite ? '#111111' : '#f5f5f5',
                fontWeight: 'bold',
                border: isWhite ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(255,255,255,0.15)',
            }}
        />
    );
}

function RecentSessionsCard({ sessions, t }: { sessions: GameSession[]; t: TFunc }) {
    return (
        <Card>
            <CardContent>
                <Typography variant='subtitle1' sx={{ mb: 1 }}>
                    Performance by Month
                </Typography>
                <Stack spacing={1}>
                    {sessions.map((session, index) => {
                        const stats = getSessionStats(session.games);
                        return (
                            <Accordion
                                key={session.id}
                                disableGutters
                                defaultExpanded={index === 0}
                                slotProps={{ transition: { unmountOnExit: true } }}
                            >
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Stack
                                        direction='row'
                                        spacing={2}
                                        sx={{
                                            alignItems: 'center',
                                            flexGrow: 1,
                                            pr: 1,
                                            flexWrap: 'wrap',
                                            rowGap: 0.5,
                                        }}
                                    >
                                        <Typography sx={{ fontWeight: 'bold' }}>
                                            {session.label}
                                        </Typography>
                                        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                                            {session.games.length}{' '}
                                            {session.games.length === 1 ? 'game' : 'games'}
                                        </Typography>
                                        <Typography
                                            variant='body2'
                                            sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}
                                        >
                                            {stats.score}/{session.games.length} ·{' '}
                                            {stats.percentage.toFixed(0)}%
                                        </Typography>
                                        <Typography
                                            variant='body2'
                                            sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}
                                        >
                                            Perf{' '}
                                            {stats.performance !== undefined
                                                ? Math.round(stats.performance)
                                                : '–'}
                                        </Typography>
                                        <Box sx={{ flexGrow: 1, minWidth: 80 }}>
                                            <WinLossDrawBar
                                                breakdown={{
                                                    games: session.games.length,
                                                    wins: stats.wins,
                                                    losses: stats.losses,
                                                    draws: stats.draws,
                                                    winRate:
                                                        session.games.length > 0
                                                            ? (stats.wins / session.games.length) *
                                                              100
                                                            : 0,
                                                }}
                                            />
                                        </Box>
                                    </Stack>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 0 }}>
                                    <SessionGamesTable games={session.games} t={t} />
                                </AccordionDetails>
                            </Accordion>
                        );
                    })}
                </Stack>
            </CardContent>
        </Card>
    );
}

function SessionGamesTable({ games, t }: { games: UnifiedResult[]; t: TFunc }) {
    return (
        <TableContainer>
            <Table size='small'>
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('date')}</TableCell>
                                <TableCell>{t('opponent')}</TableCell>
                                <TableCell align='center'>{t('opponentRating')}</TableCell>
                                <TableCell align='center'>{t('color')}</TableCell>
                                <TableCell>{t('result')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {games.map((game) => (
                                <TableRow
                                    key={`${game.platform}-${game.id}`}
                                    hover
                                    sx={{ '& > *': { whiteSpace: 'nowrap' } }}
                                >
                                    <TableCell>
                                        <Link href={game.url} target='_blank' rel='noopener noreferrer'>
                                            {new Date(game.date).toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                            })}{' '}
                                            {new Date(game.date).toLocaleTimeString(undefined, {
                                                hour: 'numeric',
                                                minute: '2-digit',
                                            })}
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <Link
                                            href={game.url}
                                            target='_blank'
                                            rel='noopener noreferrer'
                                            sx={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 0.75,
                                            }}
                                        >
                                            <RatingSystemIcon system={game.platform} size='small' />
                                            {game.opponent}
                                        </Link>
                                    </TableCell>
                                    <TableCell align='center'>{game.opponentRating ?? '-'}</TableCell>
                                    <TableCell align='center'>
                                        <ColorChip color={game.color} t={t} />
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            textTransform: 'capitalize',
                                            color: outcomeColor(game.outcome),
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        {t(game.outcome)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
    );
}

export default ResultsTab;
