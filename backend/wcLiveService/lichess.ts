import { Chess } from '@jackstenglein/chess';
import { WC_LICHESS_TOUR_ID } from '@jackstenglein/chess-dojo-common/src/wcLive/api';
import {
    customGamePgnUrl,
    WcCustomGame,
} from '@jackstenglein/chess-dojo-common/src/wcLive/customGames';
import {
    isTestRoundId,
    testRoundState,
} from '@jackstenglein/chess-dojo-common/src/wcLive/testGame';
import { ApiError } from '../directoryService/api';
import { listCustomGames, recordPlayed } from './database';

const LICHESS = 'https://lichess.org';

/** The match schedule barely changes, so the round list is kept for 10 minutes. */
const TOUR_TTL_MS = 10 * 60 * 1000;

/**
 * Moves are read again at most every 2 seconds per Lambda instance, which keeps
 * Lichess load low and is well under the broadcast's own delay.
 */
const ROUND_TTL_MS = 2000;

let tourCache: { at: number; roundIds: Set<string> } | undefined;
const roundCache = new Map<string, { at: number; state: RoundState }>();

export interface RoundState {
    /** The UCI of each move played, in order. played[0] is ply 1. */
    played: string[];
    /** The same moves in SAN, for the senseis' analysis. */
    sans: string[];
    /** The PGN result, "*" while the game is on. */
    result: string;
    /** The position after the last move played. */
    fen: string;
}

async function getJson(url: string): Promise<unknown> {
    const resp = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!resp.ok) {
        throw new ApiError({
            statusCode: 502,
            publicMessage: 'Lichess is not answering right now. Try again in a moment.',
            privateMessage: `GET ${url}: ${resp.status}`,
        });
    }
    return resp.json();
}

/** Throws a 404 unless the round belongs to the World Championship broadcast. */
/** Added games are read again at most every 10 seconds per Lambda instance. */
const CUSTOM_TTL_MS = 10_000;
let customCache: { at: number; games: WcCustomGame[] } | undefined;

/** The added game with this id, if there is one. */
export async function findCustomGame(id: string): Promise<WcCustomGame | undefined> {
    if (!customCache || Date.now() - customCache.at > CUSTOM_TTL_MS) {
        customCache = { at: Date.now(), games: await listCustomGames() };
    }
    return customCache.games.find((g) => g.id === id);
}

/** Forgets the added games, after one is added or removed. */
export function clearCustomGameCache(): void {
    customCache = undefined;
}

export async function requireMatchRound(roundId: string): Promise<void> {
    if (await findCustomGame(roundId)) {
        return;
    }
    if (isTestRoundId(roundId)) {
        if (!testRoundState(roundId, Date.now())) {
            throw new ApiError({ statusCode: 404, publicMessage: 'That test game has not begun' });
        }
        return;
    }
    // An unknown id reloads the list at most once a minute, so made-up ids
    // cannot make every request call Lichess.
    const age = tourCache ? Date.now() - tourCache.at : Infinity;
    if (age > TOUR_TTL_MS || (!tourCache?.roundIds.has(roundId) && age > 60_000)) {
        const tour = (await getJson(`${LICHESS}/api/broadcast/${WC_LICHESS_TOUR_ID}`)) as {
            rounds?: { id: string }[];
        };
        tourCache = { at: Date.now(), roundIds: new Set((tour.rounds ?? []).map((r) => r.id)) };
    }
    if (!tourCache?.roundIds.has(roundId)) {
        throw new ApiError({
            statusCode: 404,
            publicMessage: 'That game is not part of the match',
        });
    }
}

/** Parses the moves and result of a single-game round PGN. */
export function parseRoundPgn(pgn: string): RoundState {
    const chess = new Chess({ pgn });
    const history = chess.history();
    return {
        played: history.map((m) => m.uci),
        sans: history.map((m) => m.san),
        result: chess.header().getRawValue('Result') || '*',
        fen: chess.fen(history[history.length - 1] ?? null),
    };
}

/** The moves played so far in the round, as Lichess broadcasts them. */
/** The plies this Lambda instance has already recorded as seen, per game. */
const noted = new Map<string, number>();

/** Writes when each new move was first seen, once per move per Lambda instance. */
async function notePlayed(roundId: string, plies: number): Promise<void> {
    const before = noted.get(roundId) ?? 0;
    if (plies > before) {
        noted.set(roundId, plies);
        await recordPlayed(roundId, before + 1, plies, new Date().toISOString());
    }
}

export async function getRoundState(roundId: string): Promise<RoundState> {
    const state = await loadRoundState(roundId);
    await notePlayed(roundId, state.played.length);
    return state;
}

async function loadRoundState(roundId: string): Promise<RoundState> {
    // Game 0 is computed from the clock, not read from Lichess.
    const test = testRoundState(roundId, Date.now());
    if (test) {
        return parseRoundPgn(test.pgn);
    }
    const cached = roundCache.get(roundId);
    if (cached && Date.now() - cached.at < ROUND_TTL_MS) {
        return cached.state;
    }
    // An added game is read from its own PGN; a match round from the broadcast.
    const custom = await findCustomGame(roundId);
    if (!custom) {
        await requireMatchRound(roundId);
    }
    const url = custom ? customGamePgnUrl(custom) : `${LICHESS}/api/broadcast/round/${roundId}.pgn`;
    const resp = await fetch(url);
    if (!resp.ok) {
        throw new ApiError({
            statusCode: 502,
            publicMessage: 'Lichess is not answering right now. Try again in a moment.',
            privateMessage: `GET ${url}: ${resp.status}`,
        });
    }
    // A match round holds one game. Anything after the first game is ignored,
    // which is also how an added broadcast round follows its first board.
    const pgn = (await resp.text()).split(/\n\s*\n(?=\[Event )/)[0];
    const state = parseRoundPgn(pgn);
    roundCache.set(roundId, { at: Date.now(), state });
    return state;
}
