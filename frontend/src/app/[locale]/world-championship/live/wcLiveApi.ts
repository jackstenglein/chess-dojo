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
