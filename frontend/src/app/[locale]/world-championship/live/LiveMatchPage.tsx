'use client';

import { AuthStatus, useAuth } from '@/auth/Auth';
import { Chess } from '@/board/Board';
import type { Square } from '@jackstenglein/chess';
import {
    barState,
    buildRoster,
    isWcSensei,
    latestEvals,
    WcEval,
    WcLeaderboard,
    WcRosterRequest,
    WcSensei,
} from '@jackstenglein/chess-dojo-common/src/wcLive/api';
import {
    currentTestRoundId,
    isTestRoundId,
    TEST_GAME_NAME,
    TEST_GAME_NUMBER,
} from '@jackstenglein/chess-dojo-common/src/wcLive/testGame';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import {
    Alert,
    Box,
    Button,
    Container,
    IconButton,
    Paper,
    Stack,
    Tab,
    Tabs,
    Tooltip,
    Typography,
} from '@mui/material';
import { isAxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCrosstable } from './crosstable';
import { CrosstableView } from './CrosstableView';
import { GuessPanel, GuessState, Leaderboard } from './GuessTheMove';
import {
    clocksAt,
    formatClock,
    formatSpent,
    LiveMove,
    LivePlayer,
    MatchRound,
    pickDefaultRound,
    START_FEN,
    useMatchRounds,
    useNow,
    useRoundFeed,
} from './lichessFeed';
import { LiveBoard } from './LiveBoard';
import { EvalBar, SenseiPanel, SenseiStrip } from './SenseiEval';
import { TwitchEmbed } from './TwitchEmbed';
import { getLeaderboard, getMyGuesses, listEvals, putEval, putGuess, putRoster } from './wcLiveApi';

const EVALS_POLL_MS = 5000;
const LEADERBOARD_POLL_MS = 20000;

function moveLabel(ply: number, san?: string): string {
    const number = Math.ceil(ply / 2);
    return ply % 2 === 1 ? `${number}.${san ?? '…'}` : `${number}...${san ?? '…'}`;
}

/** The game number in the address bar, as in ?game=3. */
function readGameParam(): number | undefined {
    const n = parseInt(new URLSearchParams(window.location.search).get('game') ?? '');
    return Number.isFinite(n) ? n : undefined;
}

function writeGameParam(n: number) {
    const url = new URL(window.location.href);
    url.searchParams.set('game', String(n));
    window.history.replaceState(null, '', url.toString());
}

export function LiveMatchPage() {
    const { user, status: authStatus } = useAuth();
    const username = user?.username;
    const isSensei = isWcSensei(username);

    const { rounds: matchRounds, error: roundsError } = useMatchRounds();
    const [roundId, setRoundId] = useState<string>();

    // Game 0, a replayed test game, is only listed when the address asks for ?game=0.
    const [testRoundId, setTestRoundId] = useState<string>();
    useEffect(() => {
        if (readGameParam() !== TEST_GAME_NUMBER) {
            return;
        }
        const update = () => setTestRoundId(currentTestRoundId(Date.now()));
        update();
        const timer = setInterval(update, 5000);
        return () => clearInterval(timer);
    }, []);

    const rounds: MatchRound[] = useMemo(
        () =>
            testRoundId
                ? [
                      {
                          id: testRoundId,
                          name: TEST_GAME_NAME,
                          number: TEST_GAME_NUMBER,
                          ongoing: true,
                          finished: false,
                      },
                      ...matchRounds,
                  ]
                : matchRounds,
        [testRoundId, matchRounds],
    );

    // When a Game 0 loop ends, follow the next one, which starts with a fresh leaderboard.
    useEffect(() => {
        if (testRoundId && isTestRoundId(roundId) && roundId !== testRoundId) {
            setRoundId(testRoundId);
            setViewPly(null);
        }
    }, [testRoundId, roundId]);

    // Open ?game=N if it is in the address bar, else the most recent game.
    useEffect(() => {
        if (roundId || rounds.length === 0) {
            return;
        }
        const n = readGameParam();
        const round = rounds.find((r) => r.number === n) ?? pickDefaultRound(rounds);
        setRoundId(round?.id);
    }, [rounds, roundId]);

    const round = rounds.find((r) => r.id === roundId);
    const feed = useRoundFeed(roundId);
    const moves = feed.moves;
    const gameOver = feed.result !== '*';

    // Null follows the live position.
    const [viewPly, setViewPly] = useState<number | null>(null);
    const ply = viewPly === null ? moves.length : Math.min(viewPly, moves.length);
    const atLive = ply === moves.length;
    const shownMove: LiveMove | undefined = moves[ply - 1];
    const fen = shownMove?.fen ?? START_FEN;

    const [orientation, setOrientation] = useState<'white' | 'black'>('white');
    const now = useNow(atLive && !gameOver && moves.length > 0);
    const clocks = clocksAt(feed, ply, now);

    // Read again when the game on the page finishes, so its result shows at once.
    const crosstable = useCrosstable(`${roundId ?? ''}:${feed.result}`);

    const selectRound = (id: string) => {
        setRoundId(id);
        setViewPly(null);
        const r = rounds.find((x) => x.id === id);
        if (r) {
            writeGameParam(r.number);
        }
    };

    // Arrow keys step through the game.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest('input, textarea, [role="slider"]')) {
                return;
            }
            if (e.key === 'ArrowLeft') {
                setViewPly((v) => Math.max(0, (v ?? moves.length) - 1));
            } else if (e.key === 'ArrowRight') {
                setViewPly((v) => {
                    const next = (v ?? moves.length) + 1;
                    return next >= moves.length ? null : next;
                });
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [moves.length]);

    // ---- Sensei evals ----------------------------------------------------
    const [evals, setEvals] = useState<WcEval[]>([]);
    // Shown before the first answer, so the strip and bar have Jesse, David and Kostya at once.
    const [roster, setRoster] = useState<WcSensei[]>(() => buildRoster([]));

    useEffect(() => {
        if (!roundId) {
            return;
        }
        let cancelled = false;
        setEvals([]);
        const load = () =>
            listEvals(roundId)
                .then((r) => {
                    if (!cancelled) {
                        setEvals(r.evals);
                        setRoster(r.roster);
                    }
                })
                .catch(() => undefined);
        void load();
        const timer = setInterval(() => void load(), EVALS_POLL_MS);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [roundId]);

    const bar = useMemo(() => barState(roster, evals, ply), [roster, evals, ply]);

    /** Every sensei's eval in force at the shown position, active or not, for the panel. */
    const valuesAtPly = useMemo(
        () => Object.fromEntries(latestEvals(evals, ply).map((e) => [e.senseiId, e.value])),
        [evals, ply],
    );

    const scoreSensei = useCallback(
        async (senseiId: string, value: number) => {
            if (!roundId) {
                return;
            }
            const saved = await putEval({ roundId, ply, value, senseiId });
            setEvals((list) => [
                ...list.filter((e) => !(e.senseiId === saved.senseiId && e.ply === saved.ply)),
                saved,
            ]);
        },
        [roundId, ply],
    );

    const changeRoster = useCallback(async (request: WcRosterRequest) => {
        setRoster(await putRoster(request));
    }, []);

    // ---- Guess the move --------------------------------------------------
    const [myGuesses, setMyGuesses] = useState<Record<string, string>>({});
    const [guessSaving, setGuessSaving] = useState(false);
    const [guessError, setGuessError] = useState<string>();

    useEffect(() => {
        setMyGuesses({});
        setGuessError(undefined);
        if (!roundId || authStatus !== AuthStatus.Authenticated) {
            return;
        }
        let cancelled = false;
        getMyGuesses(roundId)
            .then((g) => !cancelled && setMyGuesses(g.guesses))
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [roundId, authStatus]);

    // A move that lands clears an error about the previous one.
    useEffect(() => setGuessError(undefined), [moves.length]);

    const nextPly = moves.length + 1;
    const canGuess =
        authStatus === AuthStatus.Authenticated && !gameOver && atLive && feed.status === 'ready';

    const onGuess = useCallback(
        async (uci: string) => {
            if (!roundId) {
                return;
            }
            const guessPly = nextPly;
            const previous: string | undefined = myGuesses[guessPly];
            setMyGuesses((g) => ({ ...g, [guessPly]: uci }));
            setGuessSaving(true);
            setGuessError(undefined);
            try {
                await putGuess({ roundId, ply: guessPly, uci });
            } catch (err) {
                setMyGuesses((g) => {
                    const rest = Object.fromEntries(
                        Object.entries(g).filter(([p]) => p !== String(guessPly)),
                    );
                    return previous ? { ...rest, [guessPly]: previous } : rest;
                });
                const data: unknown = isAxiosError(err) ? err.response?.data : undefined;
                const serverMessage =
                    data && typeof data === 'object' && 'message' in data
                        ? data.message
                        : undefined;
                const message =
                    typeof serverMessage === 'string'
                        ? serverMessage
                        : 'Your guess was not saved. Try again.';
                setGuessError(
                    isAxiosError(err) && err.response?.status === 409
                        ? `${message}. Guess the next one!`
                        : message,
                );
            } finally {
                setGuessSaving(false);
            }
        },
        [roundId, nextPly, myGuesses],
    );

    const guessSan = useMemo(() => {
        const uci = myGuesses[nextPly];
        if (!uci) {
            return undefined;
        }
        try {
            const chess = new Chess({ fen: moves[moves.length - 1]?.fen ?? START_FEN });
            const move = chess.move({
                from: uci.slice(0, 2) as Square,
                to: uci.slice(2, 4) as Square,
                promotion: uci[4],
            });
            return move?.san;
        } catch {
            return uci;
        }
    }, [myGuesses, nextPly, moves]);

    let guessState: GuessState;
    if (authStatus !== AuthStatus.Authenticated) {
        guessState = { kind: 'signed-out' };
    } else if (gameOver) {
        guessState = { kind: 'game-over' };
    } else if (!atLive) {
        guessState = { kind: 'not-live' };
    } else {
        guessState = {
            kind: 'open',
            moveLabel:
                nextPly === 1
                    ? 'the first move (open until the game starts)'
                    : `${moveLabel(nextPly)} (${nextPly % 2 === 1 ? 'White' : 'Black'} to play)`,
            guessSan,
            saving: guessSaving,
            error: guessError,
        };
    }

    const myScore = useMemo(() => {
        let correct = 0;
        let guessed = 0;
        for (const [p, uci] of Object.entries(myGuesses)) {
            const m = moves[parseInt(p) - 1];
            if (m) {
                guessed++;
                if (m.uci === uci) {
                    correct++;
                }
            }
        }
        return { correct, guessed };
    }, [myGuesses, moves]);

    // ---- Leaderboard -----------------------------------------------------
    const [leaderboard, setLeaderboard] = useState<WcLeaderboard>();
    useEffect(() => {
        if (!roundId) {
            return;
        }
        let cancelled = false;
        const load = () =>
            getLeaderboard(roundId)
                .then((l) => !cancelled && setLeaderboard(l))
                .catch(() => undefined);
        void load();
        const timer = setInterval(() => void load(), LEADERBOARD_POLL_MS);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [roundId]);
    const shownLeaderboard = leaderboard?.roundId === roundId ? leaderboard : undefined;

    // ---- Layout ----------------------------------------------------------
    const topColor = orientation === 'white' ? 'black' : 'white';
    const bottomColor = orientation;
    const player = (color: 'white' | 'black') => (color === 'white' ? feed.white : feed.black);

    return (
        <Container maxWidth='xl' sx={{ py: { xs: 2, md: 3 } }}>
            <Stack spacing={0.5} sx={{ mb: 2 }}>
                <Typography variant='h4' component='h1' sx={{ fontWeight: 800 }}>
                    Gukesh vs Sindarov · Live
                </Typography>
                <Typography color='text.secondary'>
                    2026 World Championship, Geneva. Moves and clocks from the Lichess broadcast.
                </Typography>
            </Stack>

            <CrosstableView
                table={crosstable}
                currentNumber={round?.number}
                onSelectGame={(n) => {
                    const r = rounds.find((x) => x.number === n);
                    if (r) {
                        selectRound(r.id);
                    }
                }}
            />

            {roundsError && rounds.length === 0 && (
                <Alert severity='error' sx={{ mb: 2 }}>
                    Could not reach the Lichess broadcast. Refresh to try again.
                </Alert>
            )}

            {rounds.length > 0 && (
                <Tabs
                    value={roundId ?? false}
                    onChange={(_, id: string) => selectRound(id)}
                    variant='scrollable'
                    scrollButtons='auto'
                    sx={{ mb: 2 }}
                >
                    {rounds.map((r) => (
                        <Tab
                            key={r.id}
                            value={r.id}
                            label={r.ongoing ? `${r.name} · live` : r.name}
                            sx={{ textTransform: 'none' }}
                        />
                    ))}
                </Tabs>
            )}

            <Box
                sx={{
                    display: 'grid',
                    columnGap: 3,
                    rowGap: 1,
                    alignItems: 'start',
                    // Board, then the notation, then the leaderboard. The top player
                    // bar has a row of its own, so the board, the notation and the
                    // leaderboard all start on the same line. On a phone they stack.
                    gridTemplateColumns: {
                        xs: '1fr',
                        md: 'minmax(0, 1fr) 260px',
                        lg: 'minmax(0, 620px) 260px minmax(280px, 1fr)',
                    },
                    gridTemplateAreas: {
                        xs: '"top" "board" "moves" "leaders"',
                        md: '"top ." "board moves" "leaders leaders"',
                        lg: '"top . ." "board moves leaders"',
                    },
                }}
            >
                <Box sx={{ minWidth: 0, gridArea: 'top' }}>
                    <PlayerBar
                        player={player(topColor)}
                        seconds={clocks[topColor]}
                        running={clocks.running === topColor}
                    />
                </Box>
                <Stack spacing={1} sx={{ minWidth: 0, gridArea: 'board' }}>
                    <Stack direction='row' spacing={1}>
                        <EvalBar average={bar.average} pins={bar.pins} orientation={orientation} />
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <LiveBoard
                                fen={fen}
                                lastMove={shownMove ? [shownMove.from, shownMove.to] : undefined}
                                orientation={orientation}
                                onGuess={canGuess ? (uci) => void onGuess(uci) : undefined}
                                guessUci={canGuess ? myGuesses[nextPly] : undefined}
                            />
                        </Box>
                    </Stack>
                    <PlayerBar
                        player={player(bottomColor)}
                        seconds={clocks[bottomColor]}
                        running={clocks.running === bottomColor}
                    />
                    <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
                        <Button size='small' onClick={() => setViewPly(0)} disabled={ply === 0}>
                            Start
                        </Button>
                        <Button
                            size='small'
                            onClick={() => setViewPly(Math.max(0, ply - 1))}
                            disabled={ply === 0}
                        >
                            Back
                        </Button>
                        <Typography
                            data-testid='last-move'
                            sx={{
                                flexGrow: 1,
                                textAlign: 'center',
                                fontWeight: 800,
                                fontSize: '1.25rem',
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            {shownMove ? moveLabel(shownMove.ply, shownMove.san) : 'No moves yet'}
                            {!atLive && (
                                <Typography
                                    component='span'
                                    color='text.secondary'
                                    sx={{ ml: 1, fontSize: '0.8rem', fontWeight: 400 }}
                                >
                                    (not live)
                                </Typography>
                            )}
                        </Typography>
                        <Button
                            size='small'
                            onClick={() => setViewPly(ply + 1 >= moves.length ? null : ply + 1)}
                            disabled={atLive}
                        >
                            Next
                        </Button>
                        <Button
                            size='small'
                            variant={atLive ? 'text' : 'contained'}
                            onClick={() => setViewPly(null)}
                        >
                            Live
                        </Button>
                        <Tooltip title='Flip board'>
                            <IconButton
                                size='small'
                                onClick={() =>
                                    setOrientation((o) => (o === 'white' ? 'black' : 'white'))
                                }
                            >
                                <SwapVertIcon />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                    {feed.status === 'error' && (
                        <Alert severity='error'>Could not load this game from Lichess.</Alert>
                    )}
                    {gameOver && (
                        <Alert severity='info'>
                            {round?.name ?? 'This game'} ended {feed.result.replace('1/2', '½')}.
                        </Alert>
                    )}
                    <GuessPanel
                        state={guessState}
                        onGoLive={() => setViewPly(null)}
                        score={myScore}
                    />
                    {isSensei && username && (
                        <SenseiPanel
                            me={username}
                            roster={roster}
                            values={valuesAtPly}
                            positionLabel={ply === 0 ? 'the start' : moveLabel(ply, shownMove?.san)}
                            onScore={scoreSensei}
                            onRoster={changeRoster}
                        />
                    )}
                </Stack>

                <Stack spacing={2} sx={{ minWidth: 0, gridArea: 'moves' }}>
                    <MoveList
                        moves={moves}
                        ply={ply}
                        guesses={myGuesses}
                        onSelect={(p) => setViewPly(p >= moves.length ? null : p)}
                    />
                    <SenseiStrip roster={roster} pins={bar.pins} />
                </Stack>

                <Box sx={{ minWidth: 0, gridArea: 'leaders' }}>
                    <Leaderboard
                        gameName={round?.name ?? 'This game'}
                        leaderboard={shownLeaderboard}
                        username={username}
                    />
                </Box>
            </Box>

            <TwitchEmbed />
        </Container>
    );
}

function PlayerBar({
    player,
    seconds,
    running,
}: {
    player?: LivePlayer;
    seconds: number;
    running: boolean;
}) {
    return (
        <Stack
            direction='row'
            sx={{ alignItems: 'center', justifyContent: 'space-between', pl: { xs: 3, sm: 4 } }}
        >
            <Typography sx={{ fontWeight: 700 }} noWrap>
                {player?.title && (
                    <Box component='span' sx={{ color: 'warning.main', mr: 0.75 }}>
                        {player.title}
                    </Box>
                )}
                {player?.name ?? '…'}
                {player?.rating && (
                    <Box
                        component='span'
                        sx={{ color: 'text.secondary', fontWeight: 400, ml: 0.75 }}
                    >
                        {player.rating}
                    </Box>
                )}
            </Typography>
            <Paper
                elevation={0}
                sx={{
                    px: 1.5,
                    py: 0.5,
                    fontWeight: 800,
                    fontSize: '1.15rem',
                    fontVariantNumeric: 'tabular-nums',
                    bgcolor: running ? 'text.primary' : 'action.hover',
                    color: running ? 'background.paper' : 'text.primary',
                }}
                data-testid='player-clock'
            >
                {formatClock(seconds)}
            </Paper>
        </Stack>
    );
}

function MoveList({
    moves,
    ply,
    guesses,
    onSelect,
}: {
    moves: LiveMove[];
    ply: number;
    guesses: Record<string, string>;
    onSelect: (ply: number) => void;
}) {
    const rows: [LiveMove, LiveMove | undefined][] = [];
    for (let i = 0; i < moves.length; i += 2) {
        rows.push([moves[i], moves[i + 1]]);
    }

    const cell = (m?: LiveMove) => {
        if (!m) {
            return <Box />;
        }
        const guessedRight = guesses[m.ply] === m.uci;
        return (
            <Box
                component='button'
                onClick={() => onSelect(m.ply)}
                sx={{
                    all: 'unset',
                    cursor: 'pointer',
                    px: 1,
                    py: 0.25,
                    borderRadius: 0.5,
                    fontWeight: m.ply === ply ? 800 : 500,
                    bgcolor: m.ply === ply ? 'action.selected' : undefined,
                    color: guessedRight ? 'success.main' : undefined,
                }}
                title={guessedRight ? 'You guessed this move' : undefined}
            >
                <Stack
                    direction='row'
                    sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}
                >
                    <span>
                        {m.san}
                        {guessedRight ? ' ✓' : ''}
                    </span>
                    {m.spent !== undefined && (
                        <Box
                            component='span'
                            data-testid='move-time'
                            title={`${m.san} took ${formatSpent(m.spent)}`}
                            sx={{
                                ml: 0.75,
                                fontSize: '0.72rem',
                                fontWeight: 500,
                                color: 'info.main',
                            }}
                        >
                            {formatSpent(m.spent)}
                        </Box>
                    )}
                </Stack>
            </Box>
        );
    };

    return (
        <Paper variant='outlined' sx={{ p: 1.5 }}>
            <Typography variant='subtitle2' sx={{ fontWeight: 700, mb: 0.5 }}>
                Moves
            </Typography>
            {moves.length === 0 ? (
                <Typography variant='body2' color='text.secondary'>
                    No moves yet.
                </Typography>
            ) : (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: '36px 1fr 1fr',
                        rowGap: 0.25,
                        maxHeight: { xs: 240, md: 460 },
                        overflowY: 'auto',
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    {rows.map(([w, b], i) => (
                        <Box key={i} sx={{ display: 'contents' }}>
                            <Typography variant='body2' color='text.secondary' sx={{ py: 0.25 }}>
                                {i + 1}.
                            </Typography>
                            {cell(w)}
                            {cell(b)}
                        </Box>
                    ))}
                </Box>
            )}
        </Paper>
    );
}
