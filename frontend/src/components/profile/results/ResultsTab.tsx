'use client';

import { fetchChesscomArchiveGames } from '@/api/external/chesscom';
import { lichessApi } from '@/api/external/lichess';
import { OtbPayload, OtbTournament, pollOtbPayload } from '@/api/external/otb';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { useAuth } from '@/auth/Auth';
import { Link } from '@/components/navigation/Link';
import { getRatingUsername, hideRatingUsername, RatingSystem, User } from '@/database/user';
import LoadingPage from '@/loading/LoadingPage';
import { KingIcon } from '@/style/ChessIcons';
import { FideIcon, RatingSystemIcon, UscfIcon } from '@/style/RatingSystemIcons';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Card,
    CardContent,
    Checkbox,
    Divider,
    FormControlLabel,
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
import { useTranslations } from 'next-intl';
import { ReactNode, useEffect, useState } from 'react';
import { SiChessdotcom, SiLichess } from 'react-icons/si';
import {
    AggregatedResults,
    aggregateResults,
    getFidePerformance,
    ResultOutcome,
    ResultsBreakdown,
    toUnifiedChesscomResult,
    toUnifiedFideResults,
    toUnifiedLichessResult,
    toUnifiedUscfResults,
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
const OTB_PLATFORMS = [RatingSystem.Fide, RatingSystem.Uscf] as const;
/** OTB games carry the event start as their date (no per-game dates published). */

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
    /** Points scored with White and number of games played with White. */
    whiteScore: number;
    whiteGames: number;
    /** Points scored with Black and number of games played with Black. */
    blackScore: number;
    blackGames: number;
}

/** Score, percentage and FIDE performance rating for a set of games. */
function getSessionStats(games: UnifiedResult[]): SessionStats {
    const wins = games.filter((g) => g.outcome === 'win').length;
    const losses = games.filter((g) => g.outcome === 'loss').length;
    const draws = games.length - wins - losses;
    const score = wins + draws / 2;
    const percentage = games.length > 0 ? (score / games.length) * 100 : 0;
    const performance = getFidePerformance(games);
    const scoreOf = (subset: UnifiedResult[]) =>
        subset.filter((g) => g.outcome === 'win').length +
        subset.filter((g) => g.outcome === 'draw').length / 2;
    const whiteGamesList = games.filter((g) => g.color === 'white');
    const blackGamesList = games.filter((g) => g.color === 'black');
    return {
        wins,
        losses,
        draws,
        score,
        percentage,
        performance,
        whiteScore: scoreOf(whiteGamesList),
        whiteGames: whiteGamesList.length,
        blackScore: scoreOf(blackGamesList),
        blackGames: blackGamesList.length,
    };
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
    const [timeControl, setTimeControl] = useState<TimeControl>('classical');
    const [includeLichess, setIncludeLichess] = useState(true);
    const [includeChesscom, setIncludeChesscom] = useState(true);
    const [includeFide, setIncludeFide] = useState(true);
    const [includeUscf, setIncludeUscf] = useState(true);
    const request = useRequest<UnifiedResult[]>();
    const otbRequest = useRequest<OtbPayload>();
    const lichessUsername = getRatingUsername(user, RatingSystem.Lichess);
    const showLichess =
        !!lichessUsername && (isOwnProfile || !hideRatingUsername(user, RatingSystem.Lichess));

    const chesscomUsername = getRatingUsername(user, RatingSystem.Chesscom);
    const showChesscom =
        !!chesscomUsername && (isOwnProfile || !hideRatingUsername(user, RatingSystem.Chesscom));

    const fideId = getRatingUsername(user, RatingSystem.Fide);
    const showFide = !!fideId && (isOwnProfile || !hideRatingUsername(user, RatingSystem.Fide));

    const uscfId = getRatingUsername(user, RatingSystem.Uscf);
    const showUscf = !!uscfId && (isOwnProfile || !hideRatingUsername(user, RatingSystem.Uscf));

    // Online and OTB are fully separate views with separate stats — never mixed.
    // OTB first and default: it is the primary view for rated tournament players.
    const [source, setSource] = useState<'online' | 'otb'>(() =>
        showFide || showUscf ? 'otb' : 'online',
    );
    const isOtb = source === 'otb';

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

    // OTB history comes from the OTB service (backend/otbService), which
    // scrapes FIDE/US Chess asynchronously. Fetched on demand when the OTB
    // view is selected; the include toggles only filter at render time.
    useEffect(() => {
        if (!isOtb || !showFide || otbRequest.data || otbRequest.isLoading()) {
            return;
        }
        const controller = new AbortController();
        otbRequest.onStart();
        pollOtbPayload(fideId, undefined, controller.signal)
            .then((payload) => {
                if (!controller.signal.aborted) {
                    otbRequest.onSuccess(payload);
                }
            })
            .catch((err) => {
                if (!controller.signal.aborted) {
                    otbRequest.onFailure(err);
                }
            });
        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOtb, showFide, fideId]);

    const onlineAvailable = showLichess || showChesscom;
    const otbAvailable = showFide || showUscf;

    if (!onlineAvailable && !otbAvailable) {
        return (
            <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center' }}>
                <Typography>{t('emptyNoAccounts')}</Typography>
                {isOwnProfile && (
                    <Typography>
                        {t.rich('emptyConnectAccounts', {
                            link: (chunks: ReactNode) => <Link href='/profile/edit'>{chunks}</Link>,
                        })}
                    </Typography>
                )}
            </Stack>
        );
    }

    if (isOtb && !otbAvailable) {
        return (
            <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center' }}>
                <Typography>{t('emptyNoOtbAccounts')}</Typography>
                {isOwnProfile && (
                    <Typography>
                        {t.rich('emptyConnectOtbAccounts', {
                            link: (chunks: ReactNode) => <Link href='/profile/edit'>{chunks}</Link>,
                        })}
                    </Typography>
                )}
            </Stack>
        );
    }

    if (!isOtb && !onlineAvailable) {
        return (
            <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center' }}>
                <Typography>{t('emptyNoAccounts')}</Typography>
                {isOwnProfile && (
                    <Typography>
                        {t.rich('emptyConnectAccounts', {
                            link: (chunks: ReactNode) => <Link href='/profile/edit'>{chunks}</Link>,
                        })}
                    </Typography>
                )}
            </Stack>
        );
    }

    if (
        (isOtb
            ? !otbRequest.isSent() || otbRequest.isLoading()
            : !request.isSent() || request.isLoading()) &&
        !(isOtb ? otbRequest.data : request.data)
    ) {
        return <LoadingPage />;
    }

    const allResults = request.data ?? [];
    const onlineResults = allResults.filter(
        (r) =>
            r.timeClass === timeControl &&
            ((r.platform === RatingSystem.Lichess && includeLichess) ||
                (r.platform === RatingSystem.Chesscom && includeChesscom)),
    );

    const cutoffMs = (() => {
        if (windowMonths === undefined) return 0;
        const c = new Date();
        c.setMonth(c.getMonth() - windowMonths);
        return c.getTime();
    })();

    // OTB games become one session per tournament/section (newest first).
    // Blitz time controls are excluded, matching the tab's rapid/classical policy.
    const otbSessions: GameSession[] = [];
    const otbPayload = otbRequest.data;
    if (otbPayload) {
        const pushSessions = (
            tournaments: OtbTournament[] | undefined,
            convert: (t: OtbTournament, i: number) => UnifiedResult[],
            prefix: string,
        ) => {
            (tournaments ?? []).forEach((t, ti) => {
                const games = convert(t, ti).filter(
                    (g) => g.date >= cutoffMs && g.timeClass === timeControl,
                );
                if (games.length === 0) return;
                const start = Date.parse(t.start || '') || 0;
                otbSessions.push({
                    id: `${prefix}-${ti}`,
                    label: t.name,
                    games,
                    start,
                    end: start,
                });
            });
        };
        if (includeFide) {
            pushSessions(otbPayload.tournaments, toUnifiedFideResults, 'fide');
        }
        if (includeUscf && otbPayload.uschess) {
            const uscfId = otbPayload.uschess.uscf_id ?? '';
            pushSessions(
                otbPayload.uschess.tournaments,
                (s, si) => toUnifiedUscfResults(s, uscfId, si),
                'uscf',
            );
        }
    }
    const otbGames = otbSessions.flatMap((s) => s.games);

    const results = isOtb ? otbGames : onlineResults;
    const aggregated = aggregateResults(results);
    // Online games group by calendar month; OTB games already arrived in
    // per-tournament sessions. Newest first under the display caps.
    const recentSessions = (() => {
        const sessions = (isOtb ? otbSessions : groupByMonth(onlineResults)).sort(
            (a, b) => b.start - a.start,
        );
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
            {onlineAvailable && otbAvailable && (
                <ToggleButtonGroup
                    exclusive
                    fullWidth
                    size='large'
                    value={source}
                    onChange={(_, value: 'online' | 'otb' | null) => value && setSource(value)}
                    aria-label={t('sourceToggle')}
                >
                    <ToggleButton value='otb'>
                        <Stack direction='row' spacing={0.75} sx={{ alignItems: 'center' }}>
                            <FideIcon size='small' />
                            <UscfIcon size='small' />
                            {t('overTheBoard')}
                        </Stack>
                    </ToggleButton>
                    <ToggleButton value='online'>
                        <Stack direction='row' spacing={0.75} sx={{ alignItems: 'center' }}>
                            <SiLichess size={15} />
                            <SiChessdotcom size={15} />
                            {t('online')}
                        </Stack>
                    </ToggleButton>
                </ToggleButtonGroup>
            )}
            <RequestSnackbar request={request} />
            {isOtb && <RequestSnackbar request={otbRequest} />}

            <SummaryCard aggregated={aggregated} isOtb={isOtb} t={t} />

            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}
            >
                <Stack
                    direction='row'
                    spacing={1}
                    sx={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        rowGap: 0.5,
                    }}
                >
                    <Typography variant='body1' sx={{ fontWeight: 600 }}>
                        {t('resultsFor')}
                    </Typography>
                    {showChesscom && !isOtb && (
                        <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
                            <RatingSystemIcon system={RatingSystem.Chesscom} size='small' />
                            <Link
                                href={`https://www.chess.com/member/${chesscomUsername}`}
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                {chesscomUsername}
                            </Link>
                        </Stack>
                    )}
                    {!isOtb && showLichess && showChesscom && (
                        <Typography sx={{ color: 'text.secondary' }}>·</Typography>
                    )}
                    {!isOtb && showLichess && (
                        <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
                            <RatingSystemIcon system={RatingSystem.Lichess} size='small' />
                            <Link
                                href={`https://lichess.org/@/${lichessUsername}`}
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                {lichessUsername}
                            </Link>
                        </Stack>
                    )}
                    {isOtb && showFide && (
                        <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
                            <RatingSystemIcon system={RatingSystem.Fide} size='small' />
                            <Link
                                href={`https://ratings.fide.com/profile/${fideId}`}
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                {fideId}
                            </Link>
                        </Stack>
                    )}
                    {isOtb && showUscf && showFide && (
                        <Typography sx={{ color: 'text.secondary' }}>·</Typography>
                    )}
                    {isOtb && showUscf && (
                        <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
                            <RatingSystemIcon system={RatingSystem.Uscf} size='small' />
                            <Link
                                href={`https://ratings.uschess.org/player/${uscfId}`}
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                {uscfId}
                            </Link>
                        </Stack>
                    )}
                </Stack>

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

                {!isOtb && (showLichess || showChesscom) && (
                    <Stack direction='row' spacing={0} sx={{ alignItems: 'center' }}>
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
                                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                                        Chess.com
                                    </Typography>
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
                                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                                        Lichess
                                    </Typography>
                                </Stack>
                            }
                        />
                    </Stack>
                )}
                {isOtb && (showFide || showUscf) && (
                    <Stack direction='row' spacing={0} sx={{ alignItems: 'center' }}>
                        {showFide && (
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        size='small'
                                        checked={includeFide}
                                        onChange={(e) => setIncludeFide(e.target.checked)}
                                    />
                                }
                                label={
                                    <Stack
                                        direction='row'
                                        spacing={0.75}
                                        sx={{ alignItems: 'center' }}
                                    >
                                        <RatingSystemIcon system={RatingSystem.Fide} size='small' />
                                        <Typography
                                            variant='body2'
                                            sx={{ color: 'text.secondary' }}
                                        >
                                            {t('fide')}
                                        </Typography>
                                    </Stack>
                                }
                            />
                        )}
                        {showUscf && (
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        size='small'
                                        checked={includeUscf}
                                        onChange={(e) => setIncludeUscf(e.target.checked)}
                                    />
                                }
                                label={
                                    <Stack
                                        direction='row'
                                        spacing={0.75}
                                        sx={{ alignItems: 'center' }}
                                    >
                                        <RatingSystemIcon system={RatingSystem.Uscf} size='small' />
                                        <Typography
                                            variant='body2'
                                            sx={{ color: 'text.secondary' }}
                                        >
                                            {t('uscf')}
                                        </Typography>
                                    </Stack>
                                }
                            />
                        )}
                    </Stack>
                )}
            </Stack>

            {isOtb && otbRequest.isLoading() && (
                <Typography variant='caption' sx={{ color: 'text.secondary', textAlign: 'center' }}>
                    {t('otbLoading')}
                </Typography>
            )}

            {results.length === 0 ? (
                <Typography sx={{ textAlign: 'center' }}>{t('emptyNoGames')}</Typography>
            ) : (
                <>
                    <RecentSessionsCard sessions={recentSessions} isOtb={isOtb} t={t} />
                </>
            )}
        </Stack>
    );
};

type TFunc = ReturnType<typeof useTranslations<'profile.resultsTab'>>;

function WinLossDrawBar({
    breakdown,
    centerLabel,
}: {
    breakdown: ResultsBreakdown;
    /** Optional text rendered centered on top of the bar (e.g. per-platform score). */
    centerLabel?: string;
}) {
    if (breakdown.games === 0) {
        return null;
    }

    const segments: { outcome: ResultOutcome; count: number }[] = [
        { outcome: 'win', count: breakdown.wins },
        { outcome: 'draw', count: breakdown.draws },
        { outcome: 'loss', count: breakdown.losses },
    ];

    return (
        <Box sx={{ position: 'relative', width: 1 }}>
            <Box
                sx={{
                    display: 'flex',
                    width: 1,
                    height: centerLabel ? 22 : 8,
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
            {centerLabel && (
                <Typography
                    variant='caption'
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'common.white',
                        fontWeight: 600,
                        lineHeight: 1,
                        pointerEvents: 'none',
                        textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                    }}
                >
                    {centerLabel}
                </Typography>
            )}
        </Box>
    );
}

/** Formats a chess score, using ½ for halves (e.g. 6½). */
function formatScore(score: number): string {
    return Number.isInteger(score) ? `${score}` : `${Math.floor(score)}½`;
}

/** Score percentage (wins + draws/2) / games * 100 — includes draws, unlike winRate. */
function scorePercentage(breakdown: ResultsBreakdown): number {
    return breakdown.games > 0
        ? ((breakdown.wins + breakdown.draws / 2) / breakdown.games) * 100
        : 0;
}

/** Share of games not lost (wins + draws) / games * 100. */
function unbeatenPercentage(breakdown: ResultsBreakdown): number {
    return breakdown.games > 0 ? ((breakdown.wins + breakdown.draws) / breakdown.games) * 100 : 0;
}

function SummaryCard({
    aggregated,
    isOtb,
    t,
}: {
    aggregated: AggregatedResults;
    isOtb: boolean;
    t: TFunc;
}) {
    const {
        overall,
        byPlatform,
        avgOpponentRating,
        bestWinStreak,
        bestWin,
        whitePerformance,
        blackPerformance,
        performance,
    } = aggregated;
    const platforms = [...ONLINE_PLATFORMS, ...OTB_PLATFORMS].filter(
        (platform) => byPlatform[platform],
    );
    const platformName: Record<string, string> = {
        [RatingSystem.Lichess]: 'Lichess',
        [RatingSystem.Chesscom]: 'Chess.com',
        [RatingSystem.Fide]: 'FIDE',
        [RatingSystem.Uscf]: 'US Chess',
    };

    return (
        <Card variant='outlined' sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack spacing={2}>
                    <Stack
                        direction='row'
                        divider={<Divider orientation='vertical' flexItem />}
                        spacing={{ xs: 1, sm: 3 }}
                        sx={{
                            justifyContent: 'space-evenly',
                            flexWrap: 'wrap',
                            rowGap: 2,
                        }}
                    >
                        <HeroStat
                            label={t('record')}
                            value={
                                isOtb ? (
                                    <>
                                        <Box
                                            component='span'
                                            sx={{ display: { xs: 'none', sm: 'inline' } }}
                                        >
                                            {`${overall.wins}-${overall.losses}-${overall.draws} · `}
                                        </Box>
                                        {`${scorePercentage(overall).toFixed(0)}%`}
                                    </>
                                ) : (
                                    `${overall.wins}-${overall.losses}-${overall.draws}`
                                )
                            }
                        />
                        {isOtb ? (
                            <HeroStat
                                label='Performance Rating'
                                value={
                                    performance !== undefined ? `${Math.round(performance)}` : '-'
                                }
                            />
                        ) : (
                            <HeroStat
                                label={t('winRate')}
                                value={`${unbeatenPercentage(overall).toFixed(0)}%`}
                            />
                        )}
                        <HeroStat
                            label={t('bestStreak')}
                            value={t('streakWin', { count: bestWinStreak })}
                            color={bestWinStreak > 0 ? outcomeColor('win') : undefined}
                        />
                    </Stack>

                    {overall.games > 0 && (
                        <>
                            <Divider />
                            <Stack
                                direction='row'
                                divider={
                                    <Divider
                                        orientation='vertical'
                                        flexItem
                                        sx={{ display: { xs: 'none', sm: 'block' } }}
                                    />
                                }
                                spacing={2}
                                sx={{ justifyContent: 'space-evenly', flexWrap: 'wrap', rowGap: 1 }}
                            >
                                <MiniStat
                                    label={
                                        <ColorStatLabel color='white' text='Performance White' />
                                    }
                                    value={
                                        whitePerformance !== undefined
                                            ? `${Math.round(whitePerformance)}`
                                            : '-'
                                    }
                                />
                                <MiniStat
                                    label={
                                        <ColorStatLabel color='black' text='Performance Black' />
                                    }
                                    value={
                                        blackPerformance !== undefined
                                            ? `${Math.round(blackPerformance)}`
                                            : '-'
                                    }
                                />
                                <MiniStat
                                    label={t('avgOpponent')}
                                    value={
                                        avgOpponentRating ? `${Math.round(avgOpponentRating)}` : '-'
                                    }
                                />
                                <MiniStat
                                    label={t('bestWin')}
                                    value={
                                        bestWin?.opponentRating ? `${bestWin.opponentRating}` : '-'
                                    }
                                    href={bestWin?.url}
                                    color={bestWin ? outcomeColor('win') : undefined}
                                />
                            </Stack>
                        </>
                    )}

                    {platforms.length > 0 && (
                        <>
                            <Divider />
                            <Stack spacing={1.5}>
                                {platforms.map((platform) => {
                                    const breakdown = byPlatform[platform];
                                    if (!breakdown) {
                                        return null;
                                    }
                                    return (
                                        <Stack
                                            key={platform}
                                            direction='row'
                                            spacing={1.5}
                                            sx={{ alignItems: 'center' }}
                                        >
                                            <Stack
                                                direction='row'
                                                spacing={1}
                                                sx={{
                                                    alignItems: 'center',
                                                    width: { xs: 34, sm: 120 },
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <RatingSystemIcon system={platform} size='small' />
                                                <Typography
                                                    variant='body2'
                                                    sx={{
                                                        color: 'text.secondary',
                                                        display: { xs: 'none', sm: 'block' },
                                                    }}
                                                    noWrap
                                                >
                                                    {platformName[platform] ?? platform}
                                                </Typography>
                                            </Stack>
                                            <Box sx={{ flexGrow: 1 }}>
                                                <WinLossDrawBar breakdown={breakdown} />
                                            </Box>
                                            <Typography
                                                variant='caption'
                                                sx={{
                                                    color: 'text.secondary',
                                                    whiteSpace: 'nowrap',
                                                    width: { xs: 56, sm: 68 },
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {breakdown.wins}-{breakdown.losses}-
                                                {breakdown.draws}
                                            </Typography>
                                            <Typography
                                                variant='body2'
                                                sx={{
                                                    fontWeight: 600,
                                                    minWidth: 44,
                                                    textAlign: 'right',
                                                }}
                                            >
                                                {(isOtb
                                                    ? scorePercentage(breakdown)
                                                    : unbeatenPercentage(breakdown)
                                                ).toFixed(0)}
                                                %
                                            </Typography>
                                        </Stack>
                                    );
                                })}
                            </Stack>
                        </>
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
}

/** Large centered hero stat, matching the RatingCard header pattern. */
function HeroStat({
    label,
    value,
    color,
}: {
    label: string;
    value: ReactNode;
    color?: string;
}) {
    return (
        <Stack sx={{ alignItems: 'center', minWidth: 0, flex: '1 1 0' }}>
            <Typography
                variant='overline'
                sx={{
                    color: 'text.secondary',
                    lineHeight: 1.4,
                    textAlign: 'center',
                }}
            >
                {label}
            </Typography>
            <Typography
                variant='h5'
                sx={{
                    color,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    fontSize: { xs: '1.2rem', sm: '1.5rem' },
                    whiteSpace: 'nowrap',
                }}
            >
                {value}
            </Typography>
        </Stack>
    );
}

/** Small muted stat for the secondary row. */
function MiniStat({
    label,
    value,
    href,
    color,
}: {
    label: ReactNode;
    value: string;
    /** If set, the value links out (e.g. to the game the stat came from). */
    href?: string;
    color?: string;
}) {
    const valueNode = (
        <Typography
            variant='subtitle2'
            sx={{
                color,
                fontWeight: 600,
                ...(href && { '&:hover': { textDecoration: 'underline' } }),
            }}
        >
            {value}
        </Typography>
    );

    return (
        <Stack sx={{ alignItems: 'center', minWidth: 0, flex: { xs: '1 1 45%', sm: 'none' } }}>
            {href ? (
                <Link href={href} target='_blank' rel='noopener noreferrer' underline='none'>
                    {valueNode}
                </Link>
            ) : (
                valueNode
            )}
            {typeof label === 'string' ? (
                <Typography
                    variant='caption'
                    sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}
                >
                    {label}
                </Typography>
            ) : (
                label
            )}
        </Stack>
    );
}

/** King piece icon on a circle of its own color (white gets a border to stay visible). */
function ColorKingIcon({ color }: { color: 'white' | 'black' }) {
    const isWhite = color === 'white';
    return (
        <Box
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 18,
                height: 18,
                borderRadius: '50%',
                bgcolor: isWhite ? 'common.white' : 'common.black',
                border: '1px solid',
                borderColor: 'text.secondary',
            }}
        >
            <KingIcon
                sx={{ fontSize: '0.65rem', color: isWhite ? 'common.black' : 'common.white' }}
            />
        </Box>
    );
}

/** Label pairing a color king icon with its stat text. */
function ColorStatLabel({ color, text }: { color: 'white' | 'black'; text: string }) {
    return (
        <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
            <ColorKingIcon color={color} />
            <Typography variant='caption' sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                {text}
            </Typography>
        </Stack>
    );
}

function RecentSessionsCard({
    sessions,
    isOtb,
    t,
}: {
    sessions: GameSession[];
    isOtb: boolean;
    t: TFunc;
}) {
    return (
        <Card variant='outlined' sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant='overline' sx={{ color: 'text.secondary' }}>
                    {isOtb ? 'Tournament Results' : 'Performance by Month'}
                </Typography>
                <Stack spacing={1} sx={{ mt: 1.5 }}>
                    {sessions.map((session, index) => {
                        const stats = getSessionStats(session.games);
                        return (
                            <Accordion
                                key={session.id}
                                disableGutters
                                elevation={0}
                                defaultExpanded={index === 0 && !isOtb}
                                slotProps={{ transition: { unmountOnExit: true } }}
                                sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    '&:before': { display: 'none' },
                                }}
                            >
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Stack
                                        direction='row'
                                        spacing={1.5}
                                        sx={{
                                            alignItems: 'center',
                                            flexGrow: 1,
                                            pr: 1,
                                            minWidth: 0,
                                        }}
                                    >
                                        <Box sx={{ minWidth: 92, flexShrink: 1 }}>
                                            <Typography variant='body2' sx={{ fontWeight: 600 }}>
                                                {session.label}
                                            </Typography>
                                            {isOtb && session.start > 0 && (
                                                <Typography
                                                    variant='caption'
                                                    sx={{
                                                        color: 'text.secondary',
                                                        display: 'block',
                                                        lineHeight: 1.2,
                                                    }}
                                                    noWrap
                                                >
                                                    {new Date(session.start).toLocaleDateString(
                                                        undefined,
                                                        {
                                                            month: 'long',
                                                            year: 'numeric',
                                                        },
                                                    )}
                                                </Typography>
                                            )}
                                        </Box>
                                        <Box sx={{ flexGrow: 1, minWidth: 40 }}>
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
                                        <Typography
                                            variant='caption'
                                            sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}
                                        >
                                            {stats.wins}-{stats.losses}-{stats.draws}
                                        </Typography>
                                        <Typography
                                            variant='body2'
                                            sx={{
                                                fontWeight: 600,
                                                minWidth: 44,
                                                textAlign: 'right',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {stats.percentage.toFixed(0)}%
                                        </Typography>
                                    </Stack>
                                </AccordionSummary>
                                <AccordionDetails sx={{ px: 1, pb: 1, pt: 0 }}>
                                    <Stack
                                        direction='row'
                                        spacing={1}
                                        sx={{ alignItems: 'center', px: 1, pb: 0.5 }}
                                    >
                                        <Typography
                                            variant='caption'
                                            sx={{
                                                color: 'text.secondary',
                                                display: 'block',
                                                flexGrow: 1,
                                            }}
                                        >
                                            {session.games.length}{' '}
                                            {session.games.length === 1 ? 'game' : 'games'} · Score:{' '}
                                            {formatScore(stats.score)}/{session.games.length}
                                            {stats.performance !== undefined &&
                                                ` · Performance ${Math.round(stats.performance)}`}
                                        </Typography>
                                        {isOtb && (
                                            <Stack direction='row' spacing={1.5}>
                                                <Stack
                                                    direction='row'
                                                    spacing={0.5}
                                                    sx={{ alignItems: 'center' }}
                                                >
                                                    <ColorKingIcon color='white' />
                                                    <Typography
                                                        variant='caption'
                                                        sx={{
                                                            color: 'text.secondary',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {stats.whiteGames > 0
                                                            ? `${formatScore(stats.whiteScore)}/${stats.whiteGames}`
                                                            : '-'}
                                                    </Typography>
                                                </Stack>
                                                <Stack
                                                    direction='row'
                                                    spacing={0.5}
                                                    sx={{ alignItems: 'center' }}
                                                >
                                                    <ColorKingIcon color='black' />
                                                    <Typography
                                                        variant='caption'
                                                        sx={{
                                                            color: 'text.secondary',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {stats.blackGames > 0
                                                            ? `${formatScore(stats.blackScore)}/${stats.blackGames}`
                                                            : '-'}
                                                    </Typography>
                                                </Stack>
                                            </Stack>
                                        )}
                                    </Stack>
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
                        <TableCell>{t('color')}</TableCell>
                        <TableCell align='right'>{t('result')}</TableCell>
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
                                    })}
                                </Link>
                            </TableCell>
                            <TableCell>
                                <Stack direction='row' spacing={0.75} sx={{ alignItems: 'center' }}>
                                    <RatingSystemIcon system={game.platform} size='small' />
                                    <Link href={game.url} target='_blank' rel='noopener noreferrer'>
                                        {game.opponent}
                                    </Link>
                                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                                        {game.opponentRating ?? '-'}
                                    </Typography>
                                </Stack>
                            </TableCell>
                            <TableCell sx={{ color: 'text.secondary' }}>{t(game.color)}</TableCell>
                            <TableCell
                                align='right'
                                sx={{
                                    textTransform: 'capitalize',
                                    color: outcomeColor(game.outcome),
                                    fontWeight: 600,
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
