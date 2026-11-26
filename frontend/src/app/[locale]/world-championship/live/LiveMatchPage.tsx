'use client';

import { useApi } from '@/api/Api';
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
import { guestLink } from '@jackstenglein/chess-dojo-common/src/wcLive/guests';
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
import HeadsetMicIcon from '@mui/icons-material/HeadsetMic';
import LastPageIcon from '@mui/icons-material/LastPage';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import {
    Alert,
    Box,
    Button,
    Container,
    GlobalStyles,
    IconButton,
    Paper,
    Stack,
    Tab,
    Tabs,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
    useMediaQuery,
} from '@mui/material';
import { isAxiosError } from 'axios';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { AddGameDialog } from './AddGameDialog';
import { AdminView } from './AdminView';
import { useAnalysis } from './analysisClient';
import { BoardThemeButton } from './BoardThemeButton';
import { ClockText } from './ClockText';
import { formatResult, useCrosstable } from './crosstable';
import { CrosstableView } from './CrosstableView';
import { GamePicker } from './GamePicker';
import { GuessPanel, GuessState, Leaderboard } from './GuessTheMove';
import { useGuestAccess } from './guestAccess';
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
import {
    ANALYSIS_LANDSCAPE_BOARD,
    ANALYSIS_PHONE_LANDSCAPE,
    boardColumnWidth,
    FAN_LANDSCAPE_BOARD,
    FAN_STREAM_MAX_HEIGHT,
    FAN_TABLET_BOARD,
    FAN_UPRIGHT_WIDE_BOARD,
    fanBoardBlockSx,
    fanLandscapeGrid,
    FanPart,
    fanPartSx,
    fanTabletSidesSx,
    fanTopBarSx,
    fanTwoColumnGrid,
    fanUnwrapSx,
    fanUprightWideGrid,
    parseLayout,
    PHONE,
    PHONE_LANDSCAPE,
    resolveLayout,
    TABLET_UPRIGHT,
    TWO_COLUMNS,
    UPRIGHT_WIDE,
    WcLayout,
} from './liveLayout';
import { useActAs } from './localTesting';
import { useMoveSounds } from './moveSounds';
import { Notation } from './Notation';
import { PLAYER_COLUMN_WIDTH, PlayerColumn } from './PlayerColumn';
import { PlayerPhoto } from './PlayerPhoto';
import { EVAL_BAR_GAP, EVAL_BAR_WIDTH, EvalAverage, EvalBar, SenseiStrip } from './SenseiEval';
import { GuestLinks, SenseiPanel } from './SenseiPanel';
import { StreamEmbed } from './StreamEmbed';
import {
    addCustomGame,
    getLeaderboard,
    getMyGuesses,
    guestPutEval,
    listCustomGames,
    listEvals,
    listInvites,
    putEval,
    putGuess,
    putRoster,
    removeCustomGame,
    resetInvite,
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
    const api = useApi();
    // On a local test run, ?as=<username> acts as that user. Never on the real site.
    const actAs = useActAs();
    const username = actAs ?? user?.username;
    const signedIn = !!actAs || authStatus === AuthStatus.Authenticated;
    const isSensei = isWcSensei(username);

    // A guest link (?guest=...) makes this browser a guest sensei: their own
    // eval and the analysis board, without an account. A real sensei ignores it.
    const guestAccess = useGuestAccess();
    const guest = isSensei ? undefined : guestAccess.guest;
    const guestToken = isSensei ? undefined : guestAccess.token;
    /** Senseis and guest senseis share the analysis board. */
    const canAnalyze = isSensei || !!guest;
    /** Who the analysis records as moving. */
    const analyst = isSensei ? username : guest?.id;

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
    // The board writes its drawn size here, so the player bars end where it ends.
    const layoutRef = useRef<HTMLDivElement>(null);
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
                return applyAnalysisRequest(current, request, mainSans, analyst ?? '');
            } catch {
                // The API refuses it too and says why.
                return current;
            }
        },
        [mainSans, analyst],
    );
    // Only senseis (and guest senseis) load the analysis. Fans only ever see the game itself.
    const analysisApi = useAnalysis(roundId, canAnalyze, applyLocal, guestToken);
    const analysis = analysisApi.analysis;

    const tree = useMemo(
        () => buildTree(moves, canAnalyze ? (analysis?.lines ?? []) : []),
        [moves, canAnalyze, analysis?.lines],
    );

    // A fan's own position; null follows the live position. Senseis share one
    // position instead: the analysis cursor, until the next move of the game.
    const [viewPath, setViewPath] = useState<string[] | null>(null);
    const sharedPath =
        canAnalyze && analysis?.cursor && cursorIsCurrent(analysis.cursor, moves.length)
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
        if (canAnalyze) {
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
    // and the stream below. Viewers always have the stream view. Senseis start on
    // the analysis view, and the browser remembers the view they pick with the switch.
    // Analysis view 2 is analysis view 1 with the players and clocks in a column
    // left of the board, the way chess.com shows a broadcast. A phone has no room
    // for the column, so there it falls back to the player bars.
    //
    // The view someone picks is saved in this browser and on their account, so it
    // follows them to other devices. The account's choice wins. A local test run
    // acting as someone else (?as=) leaves the signed-in account alone.
    const [savedLayout, setSavedLayout] = useLocalStorage<WcLayout | null>('wcLive.layout', null);
    const accountLayout = actAs ? null : parseLayout(user?.wcLiveLayout);
    const layout = resolveLayout(accountLayout ?? parseLayout(savedLayout), canAnalyze);
    const chooseLayout = (next: WcLayout) => {
        setSavedLayout(next);
        if (!actAs && user && user.wcLiveLayout !== next) {
            // The browser keeps the choice even if saving it to the account fails.
            api.updateUser({ wcLiveLayout: next }).catch(() => undefined);
        }
    };
    const streamView = layout === 'stream';
    const playerColumn = layout === 'analysis2';
    // The games show only once the browser has loaded them, so the server never
    // renders them. That makes it safe to ask for the screen's real size on the
    // first render.
    const phone = useMediaQuery(PHONE, { noSsr: true });
    const twoColumns = useMediaQuery(TWO_COLUMNS, { noSsr: true });
    const uprightWide = useMediaQuery(UPRIGHT_WIDE, { noSsr: true });
    /** Only the fan view rearranges its parts on a phone. */
    const fan = (part: FanPart) => (streamView ? fanPartSx(part) : {});

    // The Admin tab. The page always opens on a game, never here.
    const canAdmin = !!user?.isAdmin || (!!actAs && isSensei);
    const [adminOpen, setAdminOpen] = useState(false);
    // In two columns a fan has no row of tabs above the board. The game picker
    // sits beside the top player's bar, and the board gets the height. A sensei
    // keeps the row, which also holds the switch between the views. So does the
    // Admin view, which hides everything under the row.
    const fanWithoutTabs = streamView && !canAnalyze;
    const pickerBeside = fanWithoutTabs && twoColumns && !(adminOpen && canAdmin);
    // One column has the game picker above the board. In the fan view so does a
    // large tablet held upright.
    const picker = phone || (streamView && uprightWide);

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

    /** A guest sensei sets their own eval through their link. */
    const scoreAsGuest = useCallback(
        async (_senseiId: string, value: number) => {
            if (!roundId || !guestToken) {
                return;
            }
            const saved = await guestPutEval({ token: guestToken, roundId, ply, value });
            setEvals((list) => [
                ...list.filter((e) => !(e.senseiId === saved.senseiId && e.ply === saved.ply)),
                saved,
            ]);
        },
        [roundId, ply, guestToken],
    );

    /** For senseis: each guest's link to copy, or a new one. */
    const guestLinks = useMemo<GuestLinks>(
        () => ({
            get: async (id) => {
                const token = (await listInvites())[id];
                if (!token) {
                    throw new Error('No link for that guest');
                }
                return guestLink(window.location.origin, token);
            },
            renew: async (id) => guestLink(window.location.origin, await resetInvite(id)),
        }),
        [],
    );

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
            // On the analysis board a drag is an analysis move; Alt makes it a guess.
            altToGuess: canAnalyze,
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
                me={username}
                onScore={scoreSensei}
                onRoster={changeRoster}
                guestLinks={guestLinks}
            />
        ) : guest ? (
            <SenseiPanel
                roster={roster}
                values={valuesAtPly}
                positionLabel={ply === 0 ? 'the start' : moveLabel(ply, moves[ply - 1]?.san)}
                me={guest.id}
                canManage={false}
                onScore={scoreAsGuest}
                onRoster={changeRoster}
            />
        ) : (
            <SenseiStrip roster={roster} pins={bar.pins} />
        );

    const guessPanel = (
        <GuessPanel
            state={guessState}
            onGoLive={() => goTo(null)}
            score={myScore}
            shortInTwoColumns={streamView}
        />
    );
    const crosstableView = (
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
            // In two columns of the fan view the table is in the column beside the board.
            narrow={streamView && twoColumns}
        />
    );

    /** How each finished game ended, for the game picker. */
    const results = useMemo(() => {
        const byId: Record<string, string> = {};
        for (const r of rounds) {
            const inMatch = !r.pgnUrl && crosstable?.games.find((g) => g.number === r.number);
            const result =
                r.id === roundId && feed.result !== '*'
                    ? feed.result
                    : inMatch
                      ? inMatch.result
                      : '*';
            const shown = formatResult(result);
            if (shown) {
                byId[r.id] = shown;
            }
        }
        return byId;
    }, [rounds, roundId, feed.result, crosstable]);
    // The picker stands above the board on a phone and on a tablet held upright,
    // and beside the top player's bar in two columns.
    const gamePicker = (
        <GamePicker
            rounds={rounds}
            roundId={roundId}
            onSelect={selectRound}
            admin={canAdmin ? { open: adminOpen, onOpen: () => setAdminOpen(true) } : undefined}
            onRemove={isSensei ? (id) => void removeGame(id) : undefined}
            results={results}
        />
    );

    const notation = (
        <Notation
            root={tree}
            current={node}
            moves={moves}
            guesses={myGuesses}
            onSelect={goTo}
            onLive={atLive ? undefined : () => goTo(null)}
            onPromote={canAnalyze ? (n) => analysisApi.promote(n.path) : undefined}
            onDelete={canAnalyze ? (n) => analysisApi.remove(n.path) : undefined}
            // In the stream view the moves scroll in a short box, so the stream
            // under them starts higher up, next to the board.
            compact={streamView}
            fill={!streamView}
        />
    );

    // ---- Layout ----------------------------------------------------------
    const topColor = orientation === 'white' ? 'black' : 'white';
    const bottomColor = orientation;
    const player = (color: 'white' | 'black') => (color === 'white' ? feed.white : feed.black);

    return (
        <Container
            maxWidth='xl'
            sx={{
                py: { xs: 2, md: 3 },
                // A phone gives the board the width that wider margins would take.
                px: { xs: 1.5, sm: 3 },
                ...(streamView && {
                    // The board's column ends 5px above the bottom of the screen. With
                    // the same margin under the page, the board is still in its place
                    // when the page has scrolled to its end.
                    [TWO_COLUMNS]: { pb: '5px' },
                    [PHONE_LANDSCAPE]: { py: 1 },
                }),
            }}
        >
            {/* The two views differ in height. Reserving room for the scrollbar stops
                the page from shifting sideways when a switch adds or removes one. */}
            <GlobalStyles styles={{ html: { scrollbarGutter: 'stable' } }} />
            {actAs && (
                <Alert severity='warning' sx={{ mb: 2 }} data-testid='acting-as'>
                    Local test: acting as <b>{actAs}</b>
                    {isSensei ? ' (a sensei)' : ' (a fan)'}. Change ?as= in the address to switch.
                </Alert>
            )}
            {guest && (
                <Alert
                    severity='info'
                    sx={{ mb: 2 }}
                    data-testid='guest-mode'
                    action={
                        <Button color='inherit' size='small' onClick={guestAccess.leave}>
                            Leave guest mode
                        </Button>
                    }
                >
                    You are on the bar as <b>{guest.name}</b>, a guest sensei. Set your eval with
                    the arrows or symbols on your card, and use the analysis board with the senseis.
                </Alert>
            )}
            {!isSensei && guestAccess.error && (
                <Alert severity='warning' sx={{ mb: 2 }} data-testid='guest-link-error'>
                    {guestAccess.error}
                </Alert>
            )}
            {/* Screen readers and search engines get the title. It is not shown on
                screen, because its 86px would push the bottom of the page out of view
                on a laptop. */}
            <Typography component='h1' sx={visuallyHidden}>
                Gukesh vs Sindarov · Live. 2026 World Championship, Geneva.
            </Typography>

            {roundsError && rounds.length === 0 && (
                <Alert severity='error' sx={{ mb: 2 }}>
                    Could not reach the Lichess broadcast. Refresh to try again.
                </Alert>
            )}

            {rounds.length > 0 && !pickerBeside && (
                <Stack
                    direction='row'
                    sx={{ alignItems: 'center', mb: picker ? 1 : 2, minWidth: 0 }}
                >
                    {picker ? (
                        gamePicker
                    ) : (
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
                    )}
                    {canAnalyze && (
                        <ToggleButtonGroup
                            size='small'
                            exclusive
                            value={layout}
                            onChange={(_, v: WcLayout | null) => v && chooseLayout(v)}
                            aria-label='Page layout'
                            sx={{ flexShrink: 0, ml: 1, display: { xs: 'none', sm: 'flex' } }}
                        >
                            <ToggleButton value='stream' sx={{ textTransform: 'none', py: 0.25 }}>
                                Fan view
                            </ToggleButton>
                            {/* The two streamer views show a headset, numbered; the tooltip
                                and the label still name them. */}
                            {(['analysis', 'analysis2'] as const).map((value, i) => (
                                <ToggleButton
                                    key={value}
                                    value={value}
                                    aria-label={`Stream view ${i + 1}`}
                                    title={`Stream view ${i + 1}`}
                                    sx={{ textTransform: 'none', py: 0.25, gap: 0.5 }}
                                >
                                    <HeadsetMicIcon sx={{ fontSize: '1.1rem' }} />
                                    {i + 1}
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                    )}
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
                ref={layoutRef}
                sx={{
                    display: adminOpen && canAdmin ? 'none' : 'grid',
                    columnGap: 3,
                    rowGap: 1,
                    alignItems: 'start',
                    // Board, then the notation, then the leaderboard. In the stream view
                    // on a wide screen the stream sits above the notation and leaderboard,
                    // beside the board. In the analysis view it is under all three. The
                    // top player bar has a row of its own, so everything beside the board
                    // starts on the same line. On a phone everything stacks.
                    gridTemplateColumns: playerColumn
                        ? {
                              xs: '1fr',
                              md: `${PLAYER_COLUMN_WIDTH}px minmax(0, 1fr)`,
                              // The notation and the leaderboard sit side by side right of the
                              // board, a little narrower than in the other views so the board
                              // keeps its size.
                              lg: `${PLAYER_COLUMN_WIDTH}px minmax(0, 1fr) 260px 260px`,
                              xl: `${PLAYER_COLUMN_WIDTH}px minmax(0, 1fr) 300px 300px`,
                          }
                        : {
                              xs: '1fr',
                              // On a tablet on its side, or in a short window, the board is
                              // no taller than the screen has room for. The column beside
                              // the board takes the width that frees up.
                              md: `${boardColumnWidth(!fanWithoutTabs)} minmax(340px, 1fr)`,
                              // The leaderboard needs no more than this; wider only spreads it out.
                              lg: 'minmax(0, 620px) 340px minmax(280px, 360px)',
                          },
                    gridTemplateAreas: streamView
                        ? {
                              // A phone stacks the parts in the order liveLayout gives them.
                              xs: 'none',
                              md: fanTwoColumnGrid.gridTemplateAreas,
                              lg: '"top . ." "board twitch twitch" "board moves leaders"',
                          }
                        : playerColumn
                          ? {
                                xs: '"top" "board" "moves" "leaders" "twitch"',
                                md: '"players board" "moves moves" "leaders leaders" "twitch twitch"',
                                lg: '"players board moves leaders" "twitch twitch twitch twitch"',
                            }
                          : {
                                xs: '"top" "board" "moves" "leaders" "twitch"',
                                md: '"top ." "board moves" "leaders leaders" "twitch twitch"',
                                lg: '"top . ." "board moves leaders" "twitch twitch twitch"',
                            },
                    // In the stream view the board spans the stream row and the notation row.
                    gridTemplateRows: streamView
                        ? { md: fanTwoColumnGrid.gridTemplateRows, lg: 'auto auto 1fr' }
                        : undefined,
                    ...(streamView && {
                        [UPRIGHT_WIDE]: fanUprightWideGrid,
                        [PHONE_LANDSCAPE]: fanLandscapeGrid,
                    }),
                }}
            >
                <Box
                    sx={{
                        minWidth: 0,
                        gridArea: 'top',
                        // In analysis view 2 the player column replaces the bars, except on a phone.
                        display: playerColumn ? { xs: 'block', md: 'none' } : 'block',
                        ...fan('top'),
                        ...(streamView && fanTopBarSx),
                    }}
                >
                    <PlayerBar
                        player={player(topColor)}
                        seconds={clocks[topColor]}
                        running={clocks.running === topColor}
                        beside={streamView}
                    />
                </Box>
                {pickerBeside && rounds.length > 0 && (
                    <Box sx={{ minWidth: 0, gridArea: 'games' }}>{gamePicker}</Box>
                )}
                {playerColumn && (
                    <Box
                        sx={{
                            minWidth: 0,
                            gridArea: 'players',
                            display: { xs: 'none', md: 'block' },
                        }}
                    >
                        <PlayerColumn
                            top={{
                                player: player(topColor),
                                seconds: clocks[topColor],
                                running: clocks.running === topColor,
                            }}
                            bottom={{
                                player: player(bottomColor),
                                seconds: clocks[bottomColor],
                                running: clocks.running === bottomColor,
                            }}
                            crosstable={crosstable}
                        />
                    </Box>
                )}
                <Stack
                    spacing={1}
                    useFlexGap
                    sx={{ minWidth: 0, gridArea: 'board', ...(streamView && fanUnwrapSx) }}
                >
                    <Box sx={streamView ? fanBoardBlockSx : { display: 'contents' }}>
                        <Stack
                            direction='row'
                            spacing={EVAL_BAR_GAP}
                            sx={[fan('board'), streamView && fanTabletSidesSx]}
                        >
                            <EvalBar
                                average={bar.average}
                                pins={bar.pins}
                                orientation={orientation}
                            />
                            <Box
                                sx={{
                                    flexGrow: 1,
                                    minWidth: 0,
                                    // In analysis view 2 the board fits the window's height, so
                                    // the bottom player card and the move buttons stay in view.
                                    // 230px is the header, the tabs and the move buttons.
                                    maxWidth: playerColumn
                                        ? { md: 'max(360px, calc(100dvh - 230px))' }
                                        : undefined,
                                    ...(streamView
                                        ? {
                                              [TABLET_UPRIGHT]: { maxWidth: FAN_TABLET_BOARD },
                                              [UPRIGHT_WIDE]: {
                                                  maxWidth: FAN_UPRIGHT_WIDE_BOARD,
                                              },
                                              [PHONE_LANDSCAPE]: {
                                                  flexGrow: 0,
                                                  width: FAN_LANDSCAPE_BOARD,
                                                  maxWidth: 'none',
                                              },
                                          }
                                        : {
                                              [ANALYSIS_PHONE_LANDSCAPE]: {
                                                  maxWidth: ANALYSIS_LANDSCAPE_BOARD,
                                              },
                                          }),
                                }}
                            >
                                <LiveBoard
                                    fen={fen}
                                    lastMove={node.ply > 0 ? [node.from, node.to] : undefined}
                                    orientation={orientation}
                                    onGuess={
                                        canAnalyze
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
                                    sizeVarsTo={layoutRef}
                                />
                            </Box>
                        </Stack>
                        <Box
                            sx={{
                                display: playerColumn ? { xs: 'block', md: 'none' } : 'block',
                                ...fan('bottom'),
                            }}
                        >
                            <PlayerBar
                                player={player(bottomColor)}
                                seconds={clocks[bottomColor]}
                                running={clocks.running === bottomColor}
                                beside={streamView}
                                underBar={<EvalAverage average={bar.average} />}
                            />
                        </Box>
                        <Stack
                            direction='row'
                            spacing={0.5}
                            useFlexGap
                            sx={[
                                { alignItems: 'center' },
                                fan('nav'),
                                // On a phone the fan view's buttons close up, which leaves
                                // the move between them room to show in full.
                                streamView && { [PHONE]: { gap: 0 } },
                            ]}
                        >
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
                                    ...(streamView && { [PHONE]: { fontSize: '1rem' } }),
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
                            <Tooltip
                                title={sounds.enabled ? 'Mute move sounds' : 'Play move sounds'}
                            >
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
                            <BoardThemeButton />
                        </Stack>
                        {canAnalyze && analysisApi.error && (
                            <Typography variant='caption' color='error' sx={fan('error')}>
                                {analysisApi.error}
                            </Typography>
                        )}
                    </Box>
                    {streamView && <Box sx={fan('evals')}>{senseiEvals}</Box>}
                    {streamView ? <Box sx={fan('cross')}>{crosstableView}</Box> : crosstableView}
                    {feed.status === 'error' && (
                        <Alert severity='error' sx={fan('notice')}>
                            Could not load this game from Lichess.
                        </Alert>
                    )}
                    {/* The game picker shows the result beside the game's name. */}
                    {gameOver && !picker && !pickerBeside && (
                        <Alert severity='info' sx={fan('notice')}>
                            {round?.name ?? 'This game'} ended {feed.result.replace('1/2', '½')}.
                        </Alert>
                    )}
                </Stack>

                {/* In the two sensei views the columns beside the board are exactly as
                    tall as the board. The notation fills the top of its column and the
                    sensei evals sit at the bottom, level with the board's bottom edge;
                    next to them the guess panel sits under the leaderboard. */}
                <Stack
                    spacing={2}
                    useFlexGap
                    sx={{
                        minWidth: 0,
                        gridArea: 'moves',
                        height: streamView ? undefined : { lg: 'var(---cg-height)' },
                        ...(streamView && fanUnwrapSx),
                    }}
                >
                    {/* In the fan view the guess panel comes first, above the moves. */}
                    {streamView && <Box sx={fan('guess')}>{guessPanel}</Box>}
                    {streamView ? <Box sx={fan('moves')}>{notation}</Box> : notation}
                    {!streamView && senseiEvals}
                </Stack>

                <Stack
                    spacing={2}
                    sx={{
                        minWidth: 0,
                        gridArea: 'leaders',
                        ...fan('leaders'),
                        ...(!streamView && {
                            minHeight: { lg: 'var(---cg-height)' },
                            justifyContent: 'space-between',
                        }),
                    }}
                >
                    <Leaderboard
                        gameName={round?.name ?? 'This game'}
                        leaderboard={shownLeaderboard}
                        username={username}
                        compact={streamView}
                    />
                    {!streamView && guessPanel}
                </Stack>

                <Box
                    sx={{
                        minWidth: 0,
                        gridArea: 'twitch',
                        ...fan('twitch'),
                        ...(streamView && {
                            [TWO_COLUMNS]: { '--wc-stream-max-height': FAN_STREAM_MAX_HEIGHT },
                        }),
                    }}
                >
                    <StreamEmbed minimizable={streamView} />
                </Box>
            </Box>
            <AddGameDialog open={addingGame} onClose={() => setAddingGame(false)} onAdd={addGame} />
        </Container>
    );
}

/** Keeps an element in the page for screen readers and search engines without showing it. */
const visuallyHidden = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
} as const;

function PlayerBar({
    player,
    seconds,
    running,
    beside,
    underBar,
}: {
    player?: LivePlayer;
    seconds: number;
    running: boolean;
    /** Shown in the space under the eval bar, left of the player. */
    underBar?: ReactNode;
    /**
     * The bar is in the fan view. There it goes beside the board on a phone on
     * its side, and lines up with the board on a tablet held upright.
     */
    beside?: boolean;
}) {
    return (
        // The same row as the board: a space as wide as the eval bar, the same
        // gap, then the player, so the photo starts exactly at the board's edge.
        <Stack
            direction='row'
            spacing={EVAL_BAR_GAP}
            useFlexGap
            sx={{
                alignItems: 'center',
                // Under a board that is narrower than the screen, the bar starts and
                // ends where the board does.
                ...(beside && fanTabletSidesSx),
            }}
        >
            <Box
                sx={{
                    width: EVAL_BAR_WIDTH,
                    flexShrink: 0,
                    ...(beside && { [PHONE_LANDSCAPE]: { display: 'none' } }),
                }}
            >
                {underBar}
            </Box>
            <Stack
                direction='row'
                sx={{
                    containerType: 'inline-size',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexGrow: 1,
                    minWidth: 0,
                    // Chessground rounds each square down to whole device pixels, which can
                    // leave the board up to 8 device pixels narrower than its box. This cap
                    // ends the clock at the board's edge, not the box's.
                    maxWidth: 'var(---cg-width)',
                    ...(beside && { [PHONE_LANDSCAPE]: { maxWidth: 'none' } }),
                }}
            >
                <Stack direction='row' spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                    <PlayerPhoto name={player?.name} size={36} />
                    <Typography
                        sx={{
                            fontWeight: 700,
                            // On a narrow phone a long name fits beside the clock only
                            // without the rating and a little smaller.
                            '@container (max-width: 340px)': {
                                fontSize: '0.9375rem',
                                '& .rating': { display: 'none' },
                            },
                        }}
                        noWrap
                    >
                        {player?.title && (
                            <Box component='span' sx={{ color: 'warning.main', mr: 0.75 }}>
                                {player.title}
                            </Box>
                        )}
                        {player?.name ?? '…'}
                        {player?.rating && (
                            <Box
                                component='span'
                                className='rating'
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
                        px: { xs: 1.25, sm: 1.5 },
                        py: 0.5,
                        // Trimming the line box to the digits centers them. The larger
                        // padding makes up the height the trim removes.
                        '@supports (text-box: trim-both cap alphabetic)': {
                            textBox: 'trim-both cap alphabetic',
                            py: { xs: '8px', sm: '11px' },
                        },
                        fontWeight: 600,
                        // A phone's clock is smaller, which leaves the name more of the row.
                        fontSize: { xs: '1.1rem', sm: '1.35rem' },
                        fontVariantNumeric: 'tabular-nums',
                        bgcolor: running ? 'text.primary' : 'action.hover',
                        color: running ? 'background.paper' : 'text.primary',
                    }}
                    data-testid='player-clock'
                >
                    <ClockText text={formatClock(seconds)} />
                </Paper>
            </Stack>
        </Stack>
    );
}
