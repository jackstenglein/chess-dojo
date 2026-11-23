'use client';

import { Chess } from '@jackstenglein/chess';
import { clockToSeconds } from '@jackstenglein/chess-dojo-common/src/pgn/clock';
import { WC_LICHESS_TOUR_ID } from '@jackstenglein/chess-dojo-common/src/wcLive/api';
import { useEffect, useState } from 'react';

const LICHESS = 'https://lichess.org';

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
                const resp = await fetch(`${LICHESS}/api/broadcast/${WC_LICHESS_TOUR_ID}`);
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
    return {
        ...parsePlayers(chess),
        moves,
        result: chess.header().getRawValue('Result') || '*',
    };
}

/** A broadcast PGN ends with its result. Until then the stream is mid-game. */
const COMPLETE_PGN = /(\*|1-0|0-1|1\/2-1\/2)\s*$/;

/**
 * Follows one round of the match: moves and clocks from the Lichess PGN
 * stream, and the think time of the side to move from the round JSON, so the
 * running clock is right even when the page opens mid-move.
 */
export function useRoundFeed(roundId: string | undefined): RoundFeed {
    const [feed, setFeed] = useState<RoundFeed>({ status: 'loading', moves: [], result: '*' });

    useEffect(() => {
        if (!roundId) {
            return;
        }
        let cancelled = false;
        const controller = new AbortController();
        let lastPgn = '';
        setFeed({ status: 'loading', moves: [], result: '*' });

        const loadClocks = async () => {
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
                    thinkingSince:
                        game.thinkTime !== undefined && game.status === '*'
                            ? Date.now() - game.thinkTime * 1000
                            : f.thinkingSince,
                }));
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
            controller.abort();
        };
    }, [roundId]);

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
    let white = lastOf(0) ?? START_CLOCK_SECONDS;
    let black = lastOf(1) ?? START_CLOCK_SECONDS;

    const isLive = ply === feed.moves.length && feed.result === '*' && feed.moves.length > 0;
    if (!isLive) {
        return { white, black };
    }

    const lastUci = feed.moves[feed.moves.length - 1]?.uci;
    const live = feed.liveClocks;
    if (lastUci && live?.lastMove === lastUci) {
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
