import { axiosService } from '@/api/axiosService';
import {
    WcEval,
    WcEvalRequest,
    WcEvalsResponse,
    WcGuesses,
    WcGuessRequest,
    WcLeaderboard,
    WcRosterRequest,
    WcSensei,
} from '@jackstenglein/chess-dojo-common/src/wcLive/api';
import { WcCustomGame } from '@jackstenglein/chess-dojo-common/src/wcLive/customGames';
import {
    WcGuestEvalRequest,
    WcGuestMe,
    WcInvites,
} from '@jackstenglein/chess-dojo-common/src/wcLive/guests';
import { localRequestConfig } from './localTesting';

/** The roster and every sensei eval in the game. */
export async function listEvals(roundId: string): Promise<WcEvalsResponse> {
    const resp = await axiosService.get<WcEvalsResponse>(
        `/public/wc-live/rounds/${roundId}/evals`,
        { functionName: 'wcLiveListEvals', ...localRequestConfig() },
    );
    return resp.data;
}

/** Changes the roster and returns it as it is after the change. */
export async function putRoster(request: WcRosterRequest): Promise<WcSensei[]> {
    const resp = await axiosService.put<{ roster: WcSensei[] }>('/wc-live/roster', request, {
        functionName: 'wcLiveRoster',
        ...localRequestConfig(),
    });
    return resp.data.roster;
}

export async function putEval(request: WcEvalRequest): Promise<WcEval> {
    const resp = await axiosService.put<WcEval>('/wc-live/eval', request, {
        functionName: 'wcLivePutEval',
        ...localRequestConfig(),
    });
    return resp.data;
}

export async function getLeaderboard(roundId: string): Promise<WcLeaderboard> {
    const resp = await axiosService.get<WcLeaderboard>(
        `/public/wc-live/rounds/${roundId}/leaderboard`,
        { functionName: 'wcLiveLeaderboard', ...localRequestConfig() },
    );
    return resp.data;
}

export async function getMyGuesses(roundId: string): Promise<WcGuesses> {
    const resp = await axiosService.get<WcGuesses>(`/wc-live/rounds/${roundId}/guesses`, {
        functionName: 'wcLiveMyGuesses',
        ...localRequestConfig(),
    });
    return resp.data;
}

export async function putGuess(request: WcGuessRequest): Promise<void> {
    await axiosService.put('/wc-live/guess', request, {
        functionName: 'wcLiveGuess',
        ...localRequestConfig(),
    });
}

/** The games senseis added from Lichess links. */
export async function listCustomGames(): Promise<WcCustomGame[]> {
    const resp = await axiosService.get<{ games: WcCustomGame[] }>('/public/wc-live/games', {
        functionName: 'wcLiveListGames',
        ...localRequestConfig(),
    });
    return resp.data.games;
}

/** Adds a game from a Lichess link. Returns the new game and the list after it. */
export async function addCustomGame(
    url: string,
    name?: string,
): Promise<{ game: WcCustomGame; games: WcCustomGame[] }> {
    const resp = await axiosService.post<{ game: WcCustomGame; games: WcCustomGame[] }>(
        '/wc-live/games',
        { url, name: name || undefined },
        { functionName: 'wcLiveAddGame', ...localRequestConfig() },
    );
    return resp.data;
}

export async function removeCustomGame(id: string): Promise<WcCustomGame[]> {
    const resp = await axiosService.put<{ games: WcCustomGame[] }>(
        '/wc-live/games/remove',
        { id },
        { functionName: 'wcLiveRemoveGame', ...localRequestConfig() },
    );
    return resp.data.games;
}

export interface GuessStatsDetail {
    ply: number;
    uci: string;
    guessedAt?: string;
    playedAt?: string;
    leadSeconds?: number;
}

export interface GuessStatsRow {
    username: string;
    displayName: string;
    correct: number;
    guessed: number;
    changes: number;
    closeCalls: number;
    medianLeadSeconds?: number;
    details: GuessStatsDetail[];
}

export interface GuessStats {
    roundId: string;
    plies: number;
    closeCallSeconds: number;
    rows: GuessStatsRow[];
    guessCount: number;
}

/** Admins only: when everyone guessed, against when each move came in. */
export async function getGuessStats(roundId: string): Promise<GuessStats> {
    const resp = await axiosService.get<GuessStats>(`/wc-live/rounds/${roundId}/stats`, {
        functionName: 'wcLiveGuessStats',
        ...localRequestConfig(),
    });
    return resp.data;
}

// ---- Guest links ---------------------------------------------------------

/** For senseis: each guest's link token, by guest id. Guests without one get one. */
export async function listInvites(): Promise<Record<string, string>> {
    const resp = await axiosService.get<WcInvites>('/wc-live/invites', {
        functionName: 'wcLiveListInvites',
        ...localRequestConfig(),
    });
    return resp.data.invites;
}

/** For senseis: a new link for a guest. The old one stops working. */
export async function resetInvite(id: string): Promise<string> {
    const resp = await axiosService.put<{ id: string; token: string }>(
        '/wc-live/invites',
        { id },
        { functionName: 'wcLiveResetInvite', ...localRequestConfig() },
    );
    return resp.data.token;
}

/** The guest a link belongs to. Fails with a 403 once the link is turned off. */
export async function guestMe(token: string): Promise<WcGuestMe> {
    const resp = await axiosService.post<WcGuestMe>(
        '/public/wc-live/guest/me',
        { token },
        { functionName: 'wcLiveGuestMe', ...localRequestConfig() },
    );
    return resp.data;
}

/** A guest's own eval of a position. */
export async function guestPutEval(request: WcGuestEvalRequest): Promise<WcEval> {
    const resp = await axiosService.put<WcEval>('/public/wc-live/guest/eval', request, {
        functionName: 'wcLiveGuestEval',
        ...localRequestConfig(),
    });
    return resp.data;
}
