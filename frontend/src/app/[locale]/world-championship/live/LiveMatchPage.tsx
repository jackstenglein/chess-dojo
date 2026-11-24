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
    customGamePgnUrl,
    WcCustomGame,
} from '@jackstenglein/chess-dojo-common/src/wcLive/customGames';
import {
    currentTestRoundId,
    isTestRoundId,
    TEST_GAME_NAME,
    TEST_GAME_NUMBER,
} from '@jackstenglein/chess-dojo-common/src/wcLive/testGame';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import LastPageIcon from '@mui/icons-material/LastPage';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
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
import { useLocalStorage } from 'usehooks-ts';
import { AddGameDialog } from './AddGameDialog';
import { AdminView } from './AdminView';
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
import { useActAs } from './localTesting';
import { useMoveSounds } from './moveSounds';
import { Notation } from './Notation';
import { PlayerPhoto } from './PlayerPhoto';
import { EVAL_BAR_WIDTH, EvalBar, SenseiStrip } from './SenseiEval';
import { SenseiPanel } from './SenseiPanel';
import { TwitchEmbed } from './TwitchEmbed';
import {
    addCustomGame,
    getLeaderboard,
    getMyGuesses,
    listCustomGames,
    listEvals,
    putEval,
    putGuess,
    putRoster,
    removeCustomGame,
} from './wcLiveApi';

const EVALS_POLL_MS = 5000;
const LEADERBOARD_POLL_MS = 20000;

function moveLabel(ply: number, san?: string): string {
    const number = Math.ceil(ply / 2);
    return ply % 2 === 1 ? `${number}.${san ?? '…'}` : `${number}...${san ?? '…'}`;
}

/** The game number in the address bar, as in ?game=3. */
/** ?game=3 for a match game, or ?game=<id> for an added Lichess game. */
function readGameParam(): string | undefined {
    return new URLSearchParams(window.location.search).get('game') ?? undefined;
}

function writeGameParam(value: string | number) {
    const url = new URL(window.location.href);
    url.searchParams.set('game', String(value));
    window.history.replaceState(null, '', url.toString());
}

/** The value of the Admin tab, which no game id can take. */
const ADMIN_TAB = '__admin';

/** Added games sort after the match, numbered from here, so they never clash with it. */
const CUSTOM_NUMBER_BASE = 1000;

export function LiveMatchPage() {
    const { user, status: authStatus } = useAuth();
    // On a local test run, ?as=<username> acts as that user. Never on the real site.
    const actAs = useActAs();
    const username = actAs ?? user?.username;
    const signedIn = !!actAs || authStatus === AuthStatus.Authenticated;
    const isSensei = isWcSensei(username);

    const { rounds: matchRounds, error: roundsError } = useMatchRounds();
    const [roundId, setRoundId] = useState<string>();

    // Game 0, a replayed test game, is only listed when the address asks for ?game=0.
    const [testRoundId, setTestRoundId] = useState<string>();
    useEffect(() => {
        if (readGameParam() !== String(TEST_GAME_NUMBER)) {
            return;
        }
        const update = () => setTestRoundId(currentTestRoundId(Date.now()));
        update();
        const timer = setInterval(update, 5000);
        return () => clearInterval(timer);
    }, []);

    // Games senseis added from Lichess links, as tabs after the match.
    const [customGames, setCustomGames] = useState<WcCustomGame[]>();
    useEffect(() => {
        let cancelled = false;
        const load = () =>
            listCustomGames()
                .then((g) => !cancelled && setCustomGames(g))
                .catch(() => !cancelled && setCustomGames((g) => g ?? []));
        void load();
        const timer = setInterval(() => void load(), 30_000);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, []);
    const [addingGame, setAddingGame] = useState(false);

    const rounds: MatchRound[] = useMemo(() => {
        const test: MatchRound[] = testRoundId
            ? [
                  {
                      id: testRoundId,
                      name: TEST_GAME_NAME,
                      number: TEST_GAME_NUMBER,
                      ongoing: true,
                      finished: false,
                  },
              ]
            : [];
        const custom: MatchRound[] = (customGames ?? []).map((g, i) => ({
            id: g.id,
            name: g.name,
            number: CUSTOM_NUMBER_BASE + i,
            ongoing: false,
            finished: false,
            pgnUrl: customGamePgnUrl(g),
        }));
        return [...test, ...matchRounds, ...custom];
    }, [testRoundId, matchRounds, customGames]);

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
        const param = readGameParam();
        // An added game's tab only exists once the added games have loaded.
        if (param && !/^\d+$/.test(param) && customGames === undefined) {
            return;
        }
        const round =
            rounds.find((r) => (r.pgnUrl ? r.id === param : String(r.number) === param)) ??
            pickDefaultRound(rounds.filter((r) => !r.pgnUrl));
        setRoundId(round?.id);
    }, [rounds, roundId, customGames]);

    const round = rounds.find((r) => r.id === roundId);
    const feed = useRoundFeed(roundId, round?.pgnUrl);
    const moves = feed.moves;
    const gameOver = feed.result !== '*';

    // ---- Board position and the senseis' analysis -------------------------
    const mainSans = useMemo(() => moves.map((m) => m.san), [moves]);
    // A sensei's moves go on the analysis board. Holding Alt makes a move a guess instead.
    const altHeld = useRef(false);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Alt') {
                altHeld.current = e.type === 'keydown';
                // Alt on its own opens the browser menu on Windows; keep the page focused.
                e.preventDefault();
            }
        };
        const onPointer = (e: PointerEvent) => {
            if (e.altKey) {
                altHeld.current = true;
            }
        };
        const release = () => {
            altHeld.current = false;
        };
        window.addEventListener('keydown', onKey, true);
        window.addEventListener('keyup', onKey, true);
        window.addEventListener('pointerdown', onPointer, true);
        window.addEventListener('blur', release);
        return () => {
            window.removeEventListener('keydown', onKey, true);
            window.removeEventListener('keyup', onKey, true);
            window.removeEventListener('pointerdown', onPointer, true);
            window.removeEventListener('blur', release);
        };
    }, []);

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
    /** Plays a sensei's move on the analysis board. Returns whether it was played. */
    const analysisMove = (uci: string): boolean => {
        try {
            const move = new Chess({ fen: node.fen }).move({
                from: uci.slice(0, 2) as Square,
                to: uci.slice(2, 4) as Square,
                promotion: uci[4],
            });
            if (move) {
                sounds.playSan(move.san);
                analysisApi.move([...node.path, move.san]);
                setViewPath(null);
                return true;
            }
        } catch {
            // Not a legal move; the board puts the piece back.
        }
        return false;
    };

    const sounds = useMoveSounds();
    const heard = useRef<{ roundId?: string; plies: number }>({ plies: 0 });
    useEffect(() => {
        const last = heard.current;
        if (last.roundId === roundId && moves.length > last.plies && feed.status === 'ready') {
            const san = moves[moves.length - 1]?.san;
            if (san) {
                sounds.playSan(san);
            }
        }
        if (feed.status === 'ready' || last.roundId !== roundId) {
            heard.current = { roundId, plies: moves.length };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the game moves on.
    }, [roundId, moves.length, feed.status]);

    const [orientation, setOrientation] = useState<'white' | 'black'>('white');
    const now = useNow(atLive && !gameOver && moves.length > 0);
    const clocks = clocksAt(feed, ply, now);

    // Read again when the game on the page finishes, so its result shows at once.
    const crosstable = useCrosstable(`${roundId ?? ''}:${feed.result}`);

    // Two layouts. The stream view puts the ChessDojo stream beside the board and
    // the sensei evals under it; the analysis view keeps the evals by the notation
    // and the stream below. Viewers start on the stream view, senseis on the
    // analysis view, and a choice made with the switch is remembered.
    const [savedLayout, setSavedLayout] = useLocalStorage<'stream' | 'analysis' | null>(
        'wcLive.layout',
        null,
    );
    const layout = savedLayout ?? (isSensei ? 'analysis' : 'stream');
    const streamView = layout === 'stream';

    // The Admin tab. The page always opens on a game, never here.
    const canAdmin = !!user?.isAdmin || (!!actAs && isSensei);
    const [adminOpen, setAdminOpen] = useState(false);

    const selectRound = (id: string) => {
        setAdminOpen(false);
        setRoundId(id);
        setViewPath(null);
        const r = rounds.find((x) => x.id === id);
        if (r) {
            writeGameParam(r.pgnUrl ? r.id : r.number);
        }
    };

    const addGame = async (url: string, name: string) => {
        const { game, games } = await addCustomGame(url, name);
        setCustomGames(games);
        setRoundId(game.id);
        setViewPath(null);
        writeGameParam(game.id);
    };

    const removeGame = async (id: string) => {
        setCustomGames(await removeCustomGame(id));
        if (roundId === id) {
            setRoundId(undefined);
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
        if (!roundId || !signedIn) {
            return;
        }
        let cancelled = false;
        getMyGuesses(roundId)
            .then((g) => !cancelled && setMyGuesses(g.guesses))
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [roundId, signedIn, username]);

    // A move that lands clears an error about the previous one.
    useEffect(() => setGuessError(undefined), [moves.length]);

    const nextPly = moves.length + 1;
    const canGuess = signedIn && !gameOver && atLive && feed.status === 'ready';

    const onGuess = useCallback(
        async (uci: string) => {
            if (!roundId) {
                return;
            }
            const guessPly = nextPly;
            const previous: string | undefined = myGuesses[guessPly];
            try {
                const guessed = new Chess({ fen: moves[moves.length - 1]?.fen ?? START_FEN }).move({
                    from: uci.slice(0, 2) as Square,
                    to: uci.slice(2, 4) as Square,
                    promotion: uci[4],
                });
                if (guessed) {
                    sounds.playSan(guessed.san);
                }
            } catch {
                // The API refuses it and says why.
            }
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
    if (!signedIn) {
        guessState = { kind: 'signed-out' };
    } else if (gameOver) {
        guessState = { kind: 'game-over' };
    } else if (!atLive) {
        guessState = { kind: 'not-live' };
    } else {
        guessState = {
            kind: 'open',
            altToGuess: isSensei,
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

    // The sensei evals: cards for senseis, the read-only list for everyone else.
    const senseiEvals =
        isSensei && username ? (
            <SenseiPanel
                roster={roster}
                values={valuesAtPly}
                positionLabel={ply === 0 ? 'the start' : moveLabel(ply, moves[ply - 1]?.san)}
                onScore={scoreSensei}
                onRoster={changeRoster}
            />
        ) : (
            <SenseiStrip roster={roster} pins={bar.pins} />
        );

    // ---- Layout ----------------------------------------------------------
    const topColor = orientation === 'white' ? 'black' : 'white';
    const bottomColor = orientation;
    const player = (color: 'white' | 'black') => (color === 'white' ? feed.white : feed.black);

    return (
        <Container maxWidth='xl' sx={{ py: { xs: 2, md: 3 } }}>
            {actAs && (
                <Alert severity='warning' sx={{ mb: 2 }} data-testid='acting-as'>
                    Local test: acting as <b>{actAs}</b>
                    {isSensei ? ' (a sensei)' : ' (a fan)'}. Change ?as= in the address to switch.
                </Alert>
            )}
            <Stack spacing={0.5} sx={{ mb: 2 }}>
                <Typography variant='h4' component='h1' sx={{ fontWeight: 800 }}>
                    Gukesh vs Sindarov · Live
                </Typography>
                <Typography color='text.secondary'>2026 World Championship, Geneva.</Typography>
            </Stack>

            {roundsError && rounds.length === 0 && (
                <Alert severity='error' sx={{ mb: 2 }}>
                    Could not reach the Lichess broadcast. Refresh to try again.
                </Alert>
            )}

            {rounds.length > 0 && (
                <Stack direction='row' sx={{ alignItems: 'center', mb: 2, minWidth: 0 }}>
                    <Tabs
                        value={adminOpen ? ADMIN_TAB : (roundId ?? false)}
                        onChange={(_, id: string) =>
                            id === ADMIN_TAB ? setAdminOpen(true) : selectRound(id)
                        }
                        variant='scrollable'
                        scrollButtons='auto'
                        sx={{ flexGrow: 1, minWidth: 0 }}
                    >
                        {canAdmin && (
                            <Tab
                                value={ADMIN_TAB}
                                label='Admin'
                                sx={{ textTransform: 'none', fontWeight: 700 }}
                            />
                        )}
                        {rounds.map((r) => (
                            <Tab
                                key={r.id}
                                value={r.id}
                                sx={{ textTransform: 'none' }}
                                label={
                                    r.pgnUrl && isSensei ? (
                                        <Stack direction='row' sx={{ alignItems: 'center' }}>
                                            {r.name}
                                            <Box
                                                component='span'
                                                role='button'
                                                aria-label={`Remove ${r.name}`}
                                                title='Remove this game'
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    void removeGame(r.id);
                                                }}
                                                sx={{
                                                    ml: 0.75,
                                                    px: 0.5,
                                                    borderRadius: 0.5,
                                                    color: 'text.secondary',
                                                    '&:hover': { bgcolor: 'action.hover' },
                                                }}
                                            >
                                                ×
                                            </Box>
                                        </Stack>
                                    ) : r.ongoing ? (
                                        `${r.name} · live`
                                    ) : (
                                        r.name
                                    )
                                }
                            />
                        ))}
                    </Tabs>
                    <ToggleButtonGroup
                        size='small'
                        exclusive
                        value={layout}
                        onChange={(_, v: 'stream' | 'analysis' | null) => v && setSavedLayout(v)}
                        aria-label='Page layout'
                        sx={{ flexShrink: 0, ml: 1, display: { xs: 'none', sm: 'flex' } }}
                    >
                        <ToggleButton value='stream' sx={{ textTransform: 'none', py: 0.25 }}>
                            Stream view
                        </ToggleButton>
                        <ToggleButton value='analysis' sx={{ textTransform: 'none', py: 0.25 }}>
                            Analysis view
                        </ToggleButton>
                    </ToggleButtonGroup>
                    {isSensei && (
                        <Button
                            size='small'
                            startIcon={<AddIcon />}
                            onClick={() => setAddingGame(true)}
                            sx={{ textTransform: 'none', flexShrink: 0, ml: 1 }}
                        >
                            Add game
                        </Button>
                    )}
                </Stack>
            )}

            {adminOpen && canAdmin && <AdminView rounds={rounds} initialRoundId={roundId} />}

            <Box
                sx={{
                    display: adminOpen && canAdmin ? 'none' : 'grid',
                    columnGap: 3,
                    rowGap: 1,
                    alignItems: 'start',
                    // Board, then the notation, then the leaderboard, with the stream
                    // under the notation and leaderboard so it plays beside the board.
                    // The top player bar has a row of its own, so the board, the
                    // notation and the leaderboard all start on the same line. On a
                    // phone everything stacks, with the stream under the board.
                    gridTemplateColumns: {
                        xs: '1fr',
                        md: 'minmax(0, 1fr) 340px',
                        // The leaderboard needs no more than this; wider only spreads it out.
                        lg: 'minmax(0, 620px) 340px minmax(280px, 360px)',
                    },
                    gridTemplateAreas: streamView
                        ? {
                              xs: '"top" "board" "twitch" "moves" "leaders"',
                              md: '"top ." "board moves" "twitch twitch" "leaders leaders"',
                              lg: '"top . ." "board moves leaders" "board twitch twitch"',
                          }
                        : {
                              xs: '"top" "board" "moves" "leaders" "twitch"',
                              md: '"top ." "board moves" "leaders leaders" "twitch twitch"',
                              lg: '"top . ." "board moves leaders" "twitch twitch twitch"',
                          },
                    // In the stream view the board spans the notation row and the stream row.
                    gridTemplateRows: streamView ? { lg: 'auto auto 1fr' } : undefined,
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
                                    isSensei
                                        ? (uci) => {
                                              if (altHeld.current && canGuess) {
                                                  void onGuess(uci);
                                                  return false;
                                              }
                                              // The move stays on the board.
                                              return analysisMove(uci);
                                          }
                                        : canGuess
                                          ? (uci) => {
                                                void onGuess(uci);
                                                return false;
                                            }
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
                        <Tooltip title='Start'>
                            <span>
                                <IconButton
                                    size='small'
                                    aria-label='Start'
                                    onClick={() => goTo(tree)}
                                    disabled={node.ply === 0}
                                >
                                    <FirstPageIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title='Back'>
                            <span>
                                <IconButton
                                    size='small'
                                    aria-label='Back'
                                    onClick={stepBack}
                                    disabled={node.ply === 0}
                                >
                                    <ChevronLeftIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Typography
                            data-testid='last-move'
                            sx={{
                                flexGrow: 1,
                                textAlign: 'center',
                                fontWeight: 800,
                                fontSize: { xs: '1rem', sm: '1.25rem' },
                                fontVariantNumeric: 'tabular-nums',
                                minWidth: 0,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
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
                        <Tooltip title='Next'>
                            <span>
                                <IconButton
                                    size='small'
                                    aria-label='Next'
                                    onClick={stepNext}
                                    disabled={!nextOf(node)}
                                >
                                    <ChevronRightIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title='Live'>
                            <span>
                                <IconButton
                                    size='small'
                                    aria-label='Live'
                                    onClick={() => goTo(null)}
                                    disabled={atLive}
                                    color={atLive ? 'default' : 'primary'}
                                >
                                    <LastPageIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title={sounds.enabled ? 'Mute move sounds' : 'Play move sounds'}>
                            <IconButton
                                size='small'
                                aria-label={
                                    sounds.enabled ? 'Mute move sounds' : 'Play move sounds'
                                }
                                onClick={() => sounds.setEnabled(!sounds.enabled)}
                            >
                                {sounds.enabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
                            </IconButton>
                        </Tooltip>
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
                    {isSensei && analysisApi.error && (
                        <Typography variant='caption' color='error'>
                            {analysisApi.error}
                        </Typography>
                    )}
                    {streamView && senseiEvals}
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
                </Stack>

                <Stack spacing={2} sx={{ minWidth: 0, gridArea: 'moves' }}>
                    <Notation
                        root={tree}
                        current={node}
                        moves={moves}
                        guesses={myGuesses}
                        onSelect={goTo}
                        onLive={atLive ? undefined : () => goTo(null)}
                        onPromote={isSensei ? (n) => analysisApi.promote(n.path) : undefined}
                        onDelete={isSensei ? (n) => analysisApi.remove(n.path) : undefined}
                    />
                    {!streamView && senseiEvals}
                </Stack>

                <Stack spacing={2} sx={{ minWidth: 0, gridArea: 'leaders' }}>
                    <GuessPanel state={guessState} onGoLive={() => goTo(null)} score={myScore} />
                    <Leaderboard
                        gameName={round?.name ?? 'This game'}
                        leaderboard={shownLeaderboard}
                        username={username}
                    />
                </Stack>

                <Box sx={{ minWidth: 0, gridArea: 'twitch' }}>
                    <TwitchEmbed />
                </Box>
            </Box>
            <AddGameDialog open={addingGame} onClose={() => setAddingGame(false)} onAdd={addGame} />
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
        // The same row as the board: a space as wide as the eval bar, the same
        // gap, then the player, so the photo starts exactly at the board's edge.
        <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: EVAL_BAR_WIDTH, flexShrink: 0 }} />
            <Stack
                direction='row'
                sx={{
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexGrow: 1,
                    minWidth: 0,
                }}
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
        </Stack>
    );
}
