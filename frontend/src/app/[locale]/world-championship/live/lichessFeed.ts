'use client';

import { Chess } from '@jackstenglein/chess';
import { clockToSeconds } from '@jackstenglein/chess-dojo-common/src/pgn/clock';
import { WC_LICHESS_TOUR_ID } from '@jackstenglein/chess-dojo-common/src/wcLive/api';
import {
    isTestRoundId,
    testRoundState,
} from '@jackstenglein/chess-dojo-common/src/wcLive/testGame';
import { useEffect, useState } from 'react';

const LICHESS = 'https://lichess.org';
const TOUR_ID = WC_LICHESS_TOUR_ID;

/** Both players start with two hours for the first 40 moves. */
export const START_CLOCK_SECONDS = 2 * 60 * 60;

export interface MatchRound {
    id: string;
    name: string;
    /** 1 for "Game 1". Tiebreak rounds keep their index in the list. */
    number: number;
    startsAt?: number;
    ongoing: boolean;
    finished: boolean;
    /** Set for a game a sensei added from a Lichess link: where its PGN is read from. */
    pgnUrl?: string;
}

export interface LiveMove {
    /** 1 is White's first move. */
    ply: number;
    san: string;
    uci: string;
    from: string;
    to: string;
    /** The position after the move. */
    fen: string;
    /** The mover's clock after the move, in seconds. */
    clock?: number;
    /** How long the mover took over the move, in seconds, worked out from the clocks. */
    spent?: number;
}

/** Thirty minutes are added after move 40. */
const MOVE_40_BONUS_SECONDS = 30 * 60;
/** Thirty seconds are added for each move from move 41. */
const INCREMENT_SECONDS = 30;
const INCREMENT_FROM_MOVE = 41;

/**
 * How long each move took, from the clock before and after it. The clock
 * after a move includes the time added for it, so that is taken back out.
 */
/** A game's clock: the seconds each side starts with, and the increment per move. */
export interface SimpleTimeControl {
    initial: number;
    increment: number;
}

/**
 * The time control of an added game, from a PGN TimeControl like "180+2".
 * The match's multi-stage control ("40/7200:...") returns undefined, so the
 * match rules above apply.
 */
export function parseTimeControl(header: string | undefined): SimpleTimeControl | undefined {
    const m = /^(\d+)\+(\d+)$/.exec(header ?? '');
    return m ? { initial: parseInt(m[1]), increment: parseInt(m[2]) } : undefined;
}

export function addTimeSpent(moves: LiveMove[], tc?: SimpleTimeControl): LiveMove[] {
    return moves.map((m, i) => {
        const previousOwn = i >= 2 ? moves[i - 2].clock : (tc?.initial ?? START_CLOCK_SECONDS);
        if (m.clock === undefined || previousOwn === undefined) {
            return m;
        }
        const moveNumber = Math.ceil(m.ply / 2);
        const added = tc
            ? tc.increment
            : (moveNumber >= INCREMENT_FROM_MOVE ? INCREMENT_SECONDS : 0) +
              (moveNumber === 40 ? MOVE_40_BONUS_SECONDS : 0);
        const spent = previousOwn + added - m.clock;
        // A clock fix by the arbiter can make this negative. Show nothing then.
        return spent >= 0 ? { ...m, spent } : m;
    });
}

/** Time taken over a move: 0:30, 4:23, or 1:02:05 past an hour. */
export function formatSpent(seconds: number): string {
    const s = Math.round(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = String(s % 60).padStart(2, '0');
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

export interface LivePlayer {
    name: string;
    title?: string;
    rating?: number;
    fed?: string;
}

export interface RoundFeed {
    status: 'loading' | 'ready' | 'error';
    white?: LivePlayer;
    black?: LivePlayer;
    moves: LiveMove[];
    /** "*" while the game is on. */
    result: string;
    /**
     * When the side to move started thinking, in browser time, for the ticking
     * clock. Undefined when the clock should not tick.
     */
    thinkingSince?: number;
    /** The latest clocks from Lichess, in seconds, if it sent them. */
    liveClocks?: { white: number; black: number; lastMove?: string };
    /** What each clock starts at: two hours in the match, or an added game's own. */
    initialClock?: number;
}

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** Reads the rounds of the match from Lichess. */
export function useMatchRounds(): { rounds: MatchRound[]; error: boolean } {
    const [rounds, setRounds] = useState<MatchRound[]>([]);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const resp = await fetch(`${LICHESS}/api/broadcast/${TOUR_ID}`);
                if (!resp.ok) {
                    throw new Error(`Lichess answered ${resp.status}`);
                }
                const data = (await resp.json()) as {
                    rounds?: {
                        id: string;
                        name: string;
                        startsAt?: number;
                        ongoing?: boolean;
                        finished?: boolean;
                    }[];
                };
                if (!cancelled) {
                    setRounds(
                        (data.rounds ?? []).map((r, i) => ({
                            id: r.id,
                            name: r.name,
                            number: i + 1,
                            startsAt: r.startsAt,
                            ongoing: !!r.ongoing,
                            finished: !!r.finished,
                        })),
                    );
                    setError(false);
                }
            } catch {
                if (!cancelled) {
                    setError(true);
                }
            }
        };
        void load();
        // A round's ongoing and finished flags change during the day.
        const timer = setInterval(() => void load(), 60_000);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, []);

    return { rounds, error };
}

/**
 * The game to open by default: the one being played, else the next one to be
 * played (so move 1 can be guessed before it starts), else the last one.
 */
export function pickDefaultRound(rounds: MatchRound[]): MatchRound | undefined {
    return (
        rounds.find((r) => r.ongoing) ??
        rounds.find((r) => !r.finished) ??
        rounds[rounds.length - 1]
    );
}

function parsePlayers(chess: Chess): { white: LivePlayer; black: LivePlayer } {
    const header = chess.header();
    const player = (color: 'White' | 'Black'): LivePlayer => ({
        name: header.getRawValue(color) || color,
        title: header.getRawValue(`${color}Title`) || undefined,
        rating: parseInt(header.getRawValue(`${color}Elo`)) || undefined,
        fed: header.getRawValue(`${color}Fed`) || undefined,
    });
    return { white: player('White'), black: player('Black') };
}

/** Parses one game of a broadcast PGN into what the page shows. */
export function parseGamePgn(pgn: string) {
    const chess = new Chess({ pgn });
    const moves: LiveMove[] = chess.history().map((m) => ({
        ply: m.ply,
        san: m.san,
        uci: m.uci,
        from: m.from,
        to: m.to,
        fen: m.fen,
        clock: clockToSeconds(m.commentDiag?.clk),
    }));
    const tc = parseTimeControl(chess.header().getRawValue('TimeControl'));
    return {
        ...parsePlayers(chess),
        moves: addTimeSpent(moves, tc),
        result: chess.header().getRawValue('Result') || '*',
        initialClock: tc?.initial ?? START_CLOCK_SECONDS,
    };
}

/** Added games are read this often. Lichess delays ongoing games a little anyway. */
const CUSTOM_POLL_MS = 3000;

/** A broadcast PGN ends with its result. Until then the stream is mid-game. */
const COMPLETE_PGN = /(\*|1-0|0-1|1\/2-1\/2)\s*$/;

/** How often the round JSON is read again while a player thinks, to correct drift. */
const CLOCK_REFRESH_MS = 30_000;
/** How soon the round JSON is read again when it still describes the move before. */
const CLOCK_RETRY_MS = 3000;
const CLOCK_RETRIES = 5;

/** Lichess may write castling as the king taking its rook (e1h1); chess.js writes e1g1. */
const CASTLING: Record<string, string> = {
    e1h1: 'e1g1',
    e1a1: 'e1c1',
    e8h8: 'e8g8',
    e8a8: 'e8c8',
};

/** Whether two UCI moves are the same move, whichever way castling is written. */
export function sameUci(a: string | undefined, b: string | undefined): boolean {
    if (!a || !b) {
        return false;
    }
    return (CASTLING[a] ?? a) === (CASTLING[b] ?? b);
}

/**
 * When the side to move started thinking, from the Lichess round JSON. The
 * JSON can lag behind the PGN stream. While it still describes the move before
 * the latest one, its think time is the other player's, so it is not used:
 * that made the running clock show minutes the player had not spent.
 * @returns The start time in ms, or undefined when the JSON cannot be trusted.
 */
export function thinkingSinceFromRound(
    game: { thinkTime?: number; lastMove?: string; status?: string },
    latestUci: string | undefined,
    now: number,
): number | undefined {
    if (game.thinkTime === undefined || game.status !== '*') {
        return undefined;
    }
    if (!sameUci(game.lastMove, latestUci)) {
        return undefined;
    }
    return now - game.thinkTime * 1000;
}

/**
 * Follows one round of the match: moves and clocks from the Lichess PGN
 * stream, and the think time of the side to move from the round JSON, so the
 * running clock is right even when the page opens mid-move.
 */
export function useRoundFeed(roundId: string | undefined, pgnUrl?: string): RoundFeed {
    const [feed, setFeed] = useState<RoundFeed>({ status: 'loading', moves: [], result: '*' });

    useEffect(() => {
        // An added Lichess game or board: read its PGN every few seconds.
        if (roundId && pgnUrl) {
            let cancelled = false;
            let lastPgn = '';
            setFeed({ status: 'loading', moves: [], result: '*' });
            const load = async () => {
                try {
                    const resp = await fetch(pgnUrl);
                    if (!resp.ok) {
                        throw new Error(`Lichess answered ${resp.status}`);
                    }
                    const pgn = (await resp.text()).split(/\n\s*\n(?=\[Event )/)[0];
                    if (cancelled || pgn === lastPgn) {
                        return;
                    }
                    lastPgn = pgn;
                    const parsed = parseGamePgn(pgn);
                    setFeed((f) => ({
                        ...f,
                        status: 'ready',
                        ...parsed,
                        thinkingSince:
                            parsed.result !== '*' || parsed.moves.length === 0
                                ? undefined
                                : parsed.moves.length !== f.moves.length
                                  ? Date.now()
                                  : f.thinkingSince,
                    }));
                } catch {
                    if (!cancelled) {
                        setFeed((f) => (f.moves.length ? f : { ...f, status: 'error' }));
                    }
                }
            };
            void load();
            const timer = setInterval(() => void load(), CUSTOM_POLL_MS);
            return () => {
                cancelled = true;
                clearInterval(timer);
            };
        }

        if (!roundId) {
            return;
        }

        // Game 0 replays a game from the clock, the same way the API does.
        if (isTestRoundId(roundId)) {
            let lastPlies = -1;
            const tick = () => {
                const state = testRoundState(roundId, Date.now());
                if (!state || state.sans.length === lastPlies) {
                    return;
                }
                lastPlies = state.sans.length;
                const parsed = parseGamePgn(state.pgn);
                setFeed({
                    status: 'ready',
                    ...parsed,
                    thinkingSince: state.result === '*' ? state.lastMoveAt : undefined,
                });
            };
            tick();
            const timer = setInterval(tick, 1000);
            return () => clearInterval(timer);
        }

        let cancelled = false;
        const controller = new AbortController();
        let lastPgn = '';
        // The last move of the PGN, so the round JSON can be checked against it.
        let latestUci: string | undefined;
        let retryTimer: ReturnType<typeof setTimeout> | undefined;
        setFeed({ status: 'loading', moves: [], result: '*' });

        const loadClocks = async (retriesLeft = CLOCK_RETRIES) => {
            clearTimeout(retryTimer);
            try {
                const resp = await fetch(`${LICHESS}/api/broadcast/-/-/${roundId}`, {
                    signal: controller.signal,
                });
                const data = (await resp.json()) as {
                    games?: {
                        players?: { clock?: number }[];
                        thinkTime?: number;
                        lastMove?: string;
                        status?: string;
                    }[];
                };
                const game = data.games?.[0];
                if (cancelled || !game) {
                    return;
                }
                const [white, black] = game.players ?? [];
                const since = thinkingSinceFromRound(game, latestUci, Date.now());
                setFeed((f) => ({
                    ...f,
                    liveClocks:
                        white?.clock !== undefined && black?.clock !== undefined
                            ? {
                                  white: white.clock / 100,
                                  black: black.clock / 100,
                                  lastMove: game.lastMove,
                              }
                            : f.liveClocks,
                    thinkingSince: since ?? f.thinkingSince,
                }));
                if (game.status !== '*') {
                    return;
                }
                // Still on the move before: ask again soon. Otherwise check again
                // now and then, so the running clock does not drift.
                const stale = !sameUci(game.lastMove, latestUci);
                if (stale && retriesLeft > 0) {
                    retryTimer = setTimeout(() => void loadClocks(retriesLeft - 1), CLOCK_RETRY_MS);
                } else if (!stale) {
                    retryTimer = setTimeout(() => void loadClocks(), CLOCK_REFRESH_MS);
                }
            } catch {
                // The PGN clocks are enough without it.
            }
        };

        const apply = (pgn: string) => {
            if (cancelled || pgn === lastPgn) {
                return;
            }
            lastPgn = pgn;
            try {
                const parsed = parseGamePgn(pgn);
                latestUci = parsed.moves[parsed.moves.length - 1]?.uci;
                setFeed((f) => {
                    // On the first load this starts the clock now. The round JSON
                    // then corrects it with the real think time.
                    const newMove = parsed.moves.length !== f.moves.length;
                    return {
                        ...f,
                        status: 'ready',
                        ...parsed,
                        thinkingSince:
                            parsed.result !== '*' || parsed.moves.length === 0
                                ? undefined
                                : newMove
                                  ? Date.now()
                                  : f.thinkingSince,
                    };
                });
                if (parsed.result === '*' && parsed.moves.length > 0) {
                    void loadClocks();
                }
            } catch {
                // A half-written PGN. The next update replaces it.
            }
        };

        const run = async () => {
            // The full game first, so the board shows at once.
            try {
                const resp = await fetch(`${LICHESS}/api/broadcast/round/${roundId}.pgn`, {
                    signal: controller.signal,
                });
                const text = await resp.text();
                apply(text.split(/\n\s*\n(?=\[Event )/)[0]);
            } catch {
                if (!cancelled) {
                    setFeed((f) => ({ ...f, status: f.moves.length ? f.status : 'error' }));
                }
            }

            // Then follow the stream, reconnecting if it drops, until the game ends.
            while (!cancelled) {
                try {
                    const resp = await fetch(
                        `${LICHESS}/api/stream/broadcast/round/${roundId}.pgn`,
                        { signal: controller.signal },
                    );
                    if (!resp.body) {
                        throw new Error('No stream body');
                    }
                    const reader = resp.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer = '';
                    for (;;) {
                        const { value, done } = await reader.read();
                        if (done) {
                            break;
                        }
                        buffer += decoder.decode(value, { stream: true });
                        const start = buffer.lastIndexOf('[Event ');
                        if (start >= 0 && COMPLETE_PGN.test(buffer)) {
                            apply(buffer.slice(start).trim());
                            buffer = '';
                        }
                    }
                } catch {
                    // Dropped or aborted. Wait and reconnect below.
                }
                if (cancelled) {
                    break;
                }
                await new Promise((resolve) => setTimeout(resolve, 3000));
            }
        };

        void run();
        return () => {
            cancelled = true;
            clearTimeout(retryTimer);
            controller.abort();
        };
    }, [roundId, pgnUrl]);

    return feed;
}

/** Ticks once a second while a clock is running. */
export function useNow(active: boolean): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!active) {
            return;
        }
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [active]);
    return now;
}

/**
 * The clocks of both players at the given ply. At the live position the side
 * to move counts down from when they started thinking.
 */
export function clocksAt(
    feed: RoundFeed,
    ply: number,
    now: number,
): { white: number; black: number; running?: 'white' | 'black' } {
    const lastOf = (color: 0 | 1) => {
        for (let i = ply - 1; i >= 0; i--) {
            if (i % 2 === color) {
                return feed.moves[i].clock;
            }
        }
        return undefined;
    };
    let white = lastOf(0) ?? feed.initialClock ?? START_CLOCK_SECONDS;
    let black = lastOf(1) ?? feed.initialClock ?? START_CLOCK_SECONDS;

    const isLive = ply === feed.moves.length && feed.result === '*' && feed.moves.length > 0;
    if (!isLive) {
        return { white, black };
    }

    const lastUci = feed.moves[feed.moves.length - 1]?.uci;
    const live = feed.liveClocks;
    if (live && sameUci(live.lastMove, lastUci)) {
        white = live.white;
        black = live.black;
    }
    const running = ply % 2 === 0 ? 'white' : 'black';
    if (feed.thinkingSince !== undefined) {
        const elapsed = Math.max(0, (now - feed.thinkingSince) / 1000);
        if (running === 'white') {
            white = Math.max(0, white - elapsed);
        } else {
            black = Math.max(0, black - elapsed);
        }
    }
    return { white, black, running };
}

export function formatClock(seconds: number): string {
    const s = Math.floor(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(sec).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
