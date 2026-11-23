'use client';

import { AuthStatus, useAuth } from '@/auth/Auth';
import { Chess } from '@/board/Board';
import type { Square } from '@jackstenglein/chess';
import {
    AnalysisNode,
    applyAnalysisRequest,
    buildTree,
    cursorIsCurrent,
    findNode,
    WcAnalysis,
    WcAnalysisRequest,
} from '@jackstenglein/chess-dojo-common/src/wcLive/analysis';
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
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import { isAxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAnalysis } from './analysisClient';
import { useCrosstable } from './crosstable';
import { CrosstableView } from './CrosstableView';
import { GuessPanel, GuessState, Leaderboard } from './GuessTheMove';
import {
    clocksAt,
    formatClock,
    LivePlayer,
    MatchRound,
    pickDefaultRound,
    START_FEN,
    useMatchRounds,
    useNow,
    useRoundFeed,
} from './lichessFeed';
import { LiveBoard } from './LiveBoard';
import { Notation } from './Notation';
import { PlayerPhoto } from './PlayerPhoto';
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
            // The new loop has no moves yet, which also takes the board back to live.
            setRoundId(testRoundId);
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

    // ---- Board position and the senseis' analysis -------------------------
    const mainSans = useMemo(() => moves.map((m) => m.san), [moves]);
    const [boardMode, setBoardMode] = useState<'analyze' | 'guess'>('analyze');
    const analyzing = isSensei && boardMode === 'analyze';

    const applyLocal = useCallback(
        (current: WcAnalysis, request: WcAnalysisRequest): WcAnalysis => {
            try {
                return applyAnalysisRequest(current, request, mainSans, username ?? '');
            } catch {
                // The API refuses it too and says why.
                return current;
            }
        },
        [mainSans, username],
    );
    // Only senseis load the analysis. Fans only ever see the game itself.
    const analysisApi = useAnalysis(roundId, isSensei, applyLocal);
    const analysis = analysisApi.analysis;

    const tree = useMemo(
        () => buildTree(moves, isSensei ? (analysis?.lines ?? []) : []),
        [moves, isSensei, analysis?.lines],
    );

    // A fan's own position; null follows the live position. Senseis share one
    // position instead: the analysis cursor, until the next move of the game.
    const [viewPath, setViewPath] = useState<string[] | null>(null);
    const sharedPath =
        isSensei && analysis?.cursor && cursorIsCurrent(analysis.cursor, moves.length)
            ? analysis.cursor.path
            : null;
    const node: AnalysisNode =
        findNode(tree, viewPath ?? sharedPath ?? mainSans) ?? findNode(tree, mainSans) ?? tree;

    // As soon as a move of the game comes in, everyone goes back to the main line.
    useEffect(() => setViewPath(null), [moves.length]);

    /** The main line ply the position comes from: its evals and clocks. */
    let ply = 0;
    while (ply < node.path.length && node.path[ply] === mainSans[ply]) {
        ply++;
    }
    const atLive = node.mainline && node.ply === moves.length;
    const fen = node.fen;

    /** Shows a position: shared with the other senseis, or just here for fans. Null is live. */
    const goTo = (target: AnalysisNode | null) => {
        if (isSensei) {
            analysisApi.select(target ? target.path : mainSans);
            setViewPath(null);
            return;
        }
        const live = !target || (target.mainline && target.ply === moves.length);
        setViewPath(live ? null : target.path);
    };
    const parentOf = (n: AnalysisNode) => findNode(tree, n.path.slice(0, -1));
    const nextOf = (n: AnalysisNode) => n.children.find((c) => c.mainline) ?? n.children[0];

    /** A sensei moves a piece on the analysis board: it is played for all senseis. */
    const analysisMove = (uci: string) => {
        try {
            const move = new Chess({ fen: node.fen }).move({
                from: uci.slice(0, 2) as Square,
                to: uci.slice(2, 4) as Square,
                promotion: uci[4],
            });
            if (move) {
                analysisApi.move([...node.path, move.san]);
                setViewPath(null);
            }
        } catch {
            // Not a legal move; the board puts the piece back.
        }
    };

    const [orientation, setOrientation] = useState<'white' | 'black'>('white');
    const now = useNow(atLive && !gameOver && moves.length > 0);
    const clocks = clocksAt(feed, ply, now);

    // Read again when the game on the page finishes, so its result shows at once.
    const crosstable = useCrosstable(`${roundId ?? ''}:${feed.result}`);

    const selectRound = (id: string) => {
        setRoundId(id);
        setViewPath(null);
        const r = rounds.find((x) => x.id === id);
        if (r) {
            writeGameParam(r.number);
        }
    };

    // Arrow keys step back to the move before, or on to the next move of the line.
    const stepBack = () => {
        const parent = parentOf(node);
        if (parent && node.ply > 0) {
            goTo(parent);
        }
    };
    const stepNext = () => {
        const next = nextOf(node);
        if (next) {
            goTo(next);
        }
    };
    // The key listener is added once and reads the latest steps from here.
    const keys = useRef<{ back: () => void; next: () => void }>({
        back: () => undefined,
        next: () => undefined,
    });
    useEffect(() => {
        keys.current = { back: stepBack, next: stepNext };
    });
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest('input, textarea, [role="slider"]')) {
                return;
            }
            if (e.key === 'ArrowLeft') {
                keys.current.back();
            } else if (e.key === 'ArrowRight') {
                keys.current.next();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

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
        authStatus === AuthStatus.Authenticated &&
        !gameOver &&
        atLive &&
        !analyzing &&
        feed.status === 'ready';

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
                                lastMove={node.ply > 0 ? [node.from, node.to] : undefined}
                                orientation={orientation}
                                onGuess={
                                    analyzing
                                        ? analysisMove
                                        : canGuess
                                          ? (uci) => void onGuess(uci)
                                          : undefined
                                }
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
                        <Button size='small' onClick={() => goTo(tree)} disabled={node.ply === 0}>
                            Start
                        </Button>
                        <Button size='small' onClick={stepBack} disabled={node.ply === 0}>
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
                            {node.ply > 0 ? moveLabel(node.ply, node.san) : 'No moves yet'}
                            {!atLive && (
                                <Typography
                                    component='span'
                                    color='text.secondary'
                                    sx={{ ml: 1, fontSize: '0.8rem', fontWeight: 400 }}
                                >
                                    {node.mainline ? '(not live)' : '(analysis)'}
                                </Typography>
                            )}
                        </Typography>
                        <Button size='small' onClick={stepNext} disabled={!nextOf(node)}>
                            Next
                        </Button>
                        <Button
                            size='small'
                            variant={atLive ? 'text' : 'contained'}
                            onClick={() => goTo(null)}
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
                    {isSensei && (
                        <Stack
                            direction='row'
                            spacing={1}
                            sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}
                        >
                            <ToggleButtonGroup
                                size='small'
                                exclusive
                                value={boardMode}
                                onChange={(_, mode: 'analyze' | 'guess' | null) =>
                                    mode && setBoardMode(mode)
                                }
                                aria-label='What moving a piece does'
                            >
                                <ToggleButton value='analyze' sx={{ textTransform: 'none' }}>
                                    Analyze with senseis
                                </ToggleButton>
                                <ToggleButton value='guess' sx={{ textTransform: 'none' }}>
                                    Guess the move
                                </ToggleButton>
                            </ToggleButtonGroup>
                            {!node.mainline && (
                                <Button
                                    size='small'
                                    color='error'
                                    onClick={() => analysisApi.remove(node.path)}
                                >
                                    Delete variation from here
                                </Button>
                            )}
                            {analysisApi.error && (
                                <Typography variant='caption' color='error'>
                                    {analysisApi.error}
                                </Typography>
                            )}
                        </Stack>
                    )}
                    <CrosstableView
                        table={crosstable}
                        currentNumber={round?.number}
                        liveNumber={rounds.find((r) => r.ongoing && r.number > 0)?.number}
                        onSelectGame={(n) => {
                            const r = rounds.find((x) => x.number === n);
                            if (r) {
                                selectRound(r.id);
                            }
                        }}
                    />
                    {feed.status === 'error' && (
                        <Alert severity='error'>Could not load this game from Lichess.</Alert>
                    )}
                    {gameOver && (
                        <Alert severity='info'>
                            {round?.name ?? 'This game'} ended {feed.result.replace('1/2', '½')}.
                        </Alert>
                    )}
                    {isSensei && username && (
                        <SenseiPanel
                            me={username}
                            roster={roster}
                            values={valuesAtPly}
                            positionLabel={
                                ply === 0 ? 'the start' : moveLabel(ply, moves[ply - 1]?.san)
                            }
                            onScore={scoreSensei}
                            onRoster={changeRoster}
                        />
                    )}
                </Stack>

                <Stack spacing={2} sx={{ minWidth: 0, gridArea: 'moves' }}>
                    <Notation
                        root={tree}
                        current={node}
                        moves={moves}
                        guesses={myGuesses}
                        onSelect={goTo}
                    />
                    <SenseiStrip roster={roster} pins={bar.pins} />
                </Stack>

                <Stack spacing={2} sx={{ minWidth: 0, gridArea: 'leaders' }}>
                    <Leaderboard
                        gameName={round?.name ?? 'This game'}
                        leaderboard={shownLeaderboard}
                        username={username}
                    />
                    <GuessPanel state={guessState} onGoLive={() => goTo(null)} score={myScore} />
                </Stack>
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
            <Stack direction='row' spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                <PlayerPhoto name={player?.name} size={36} />
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
            </Stack>
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
