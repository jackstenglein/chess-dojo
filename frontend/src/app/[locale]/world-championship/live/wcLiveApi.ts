import { axiosService } from '@/api/axiosService';
import {
    WcEval,
    WcEvalRequest,
    WcGuesses,
    WcGuessRequest,
    WcLeaderboard,
} from '@jackstenglein/chess-dojo-common/src/wcLive/api';

export async function listEvals(roundId: string): Promise<WcEval[]> {
    const resp = await axiosService.get<{ evals: WcEval[] }>(
        `/public/wc-live/rounds/${roundId}/evals`,
        { functionName: 'wcLiveListEvals' },
    );
    return resp.data.evals;
}

export async function putEval(request: WcEvalRequest): Promise<WcEval> {
    const resp = await axiosService.put<WcEval>('/wc-live/eval', request, {
        functionName: 'wcLivePutEval',
    });
    return resp.data;
}

export async function getLeaderboard(roundId: string): Promise<WcLeaderboard> {
    const resp = await axiosService.get<WcLeaderboard>(
        `/public/wc-live/rounds/${roundId}/leaderboard`,
        { functionName: 'wcLiveLeaderboard' },
    );
    return resp.data;
}

export async function getMyGuesses(roundId: string): Promise<WcGuesses> {
    const resp = await axiosService.get<WcGuesses>(`/wc-live/rounds/${roundId}/guesses`, {
        functionName: 'wcLiveMyGuesses',
    });
    return resp.data;
}

export async function putGuess(request: WcGuessRequest): Promise<void> {
    await axiosService.put('/wc-live/guess', request, { functionName: 'wcLiveGuess' });
}
