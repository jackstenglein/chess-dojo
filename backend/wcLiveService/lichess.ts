import { Chess } from '@jackstenglein/chess';
import { WC_LICHESS_TOUR_ID } from '@jackstenglein/chess-dojo-common/src/wcLive/api';
import {
    isTestRoundId,
    testRoundState,
} from '@jackstenglein/chess-dojo-common/src/wcLive/testGame';
import { ApiError } from '../directoryService/api';

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
export async function requireMatchRound(roundId: string): Promise<void> {
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
        result: chess.header().getRawValue('Result') || '*',
        fen: chess.fen(history[history.length - 1] ?? null),
    };
}

/** The moves played so far in the round, as Lichess broadcasts them. */
export async function getRoundState(roundId: string): Promise<RoundState> {
    // Game 0 is computed from the clock, not read from Lichess.
    const test = testRoundState(roundId, Date.now());
    if (test) {
        return parseRoundPgn(test.pgn);
    }
    const cached = roundCache.get(roundId);
    if (cached && Date.now() - cached.at < ROUND_TTL_MS) {
        return cached.state;
    }
    await requireMatchRound(roundId);

    const url = `${LICHESS}/api/broadcast/round/${roundId}.pgn`;
    const resp = await fetch(url);
    if (!resp.ok) {
        throw new ApiError({
            statusCode: 502,
            publicMessage: 'Lichess is not answering right now. Try again in a moment.',
            privateMessage: `GET ${url}: ${resp.status}`,
        });
    }
    // A match round holds one game. Anything after the first game is ignored.
    const pgn = (await resp.text()).split(/\n\s*\n(?=\[Event )/)[0];
    const state = parseRoundPgn(pgn);
    roundCache.set(roundId, { at: Date.now(), state });
    return state;
}
