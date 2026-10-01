import {
    GetMateInOnePuzzleResponse,
    SubmitMateInOneSessionRequest,
    SubmitMateInOneSessionResponse,
} from '@jackstenglein/chess-dojo-common/src/mateInOne/api';
import {
    GetPuzzleRushPuzzleRequest,
    GetPuzzleRushPuzzleResponse,
    GetPuzzleRushSessionResponse,
    ListPuzzleRushSessionsRequest,
    ListPuzzleRushSessionsResponse,
    SubmitPuzzleRushSessionRequest,
    SubmitPuzzleRushSessionResponse,
} from '@jackstenglein/chess-dojo-common/src/puzzleRush/api';
import {
    GetPuzzleHistoryRequest,
    GetPuzzleHistoryResponse,
    NextPuzzleRequest,
    NextPuzzleResponse,
} from '@jackstenglein/chess-dojo-common/src/puzzles/api';
import {
    SubmitSquareColorSessionRequest,
    SubmitSquareColorSessionResponse,
} from '@jackstenglein/chess-dojo-common/src/squareColors/api';
import { AxiosResponse } from 'axios';
import { axiosService } from './axiosService';

export interface PuzzleApiContextType {
    nextPuzzle: (request: NextPuzzleRequest) => Promise<AxiosResponse<NextPuzzleResponse>>;

    /** Returns the puzzle history for a given user. */
    getPuzzleHistory: (
        request: GetPuzzleHistoryRequest,
    ) => Promise<AxiosResponse<GetPuzzleHistoryResponse>>;
}

export function nextPuzzle(idToken: string, request: NextPuzzleRequest) {
    return axiosService.post<NextPuzzleResponse>(`/puzzle/next`, request, {
        headers: { Authorization: `Bearer ${idToken}` },
        functionName: 'nextPuzzle',
    });
}

export function getPuzzleHistory(idToken: string, request: GetPuzzleHistoryRequest) {
    return axiosService.get<GetPuzzleHistoryResponse>(`/puzzle/history`, {
        params: request,
        headers: { Authorization: `Bearer ${idToken}` },
        functionName: 'getPuzzleHistory',
    });
}

/**
 * Submits the results of a square color drill session.
 * @param request The request containing the session results.
 * @returns A promise that resolves to the response from the API.
 */
export function submitSquareColorSession(request: SubmitSquareColorSessionRequest) {
    return axiosService.post<SubmitSquareColorSessionResponse>(`/puzzle/square-color`, request, {
        functionName: 'submitSquareColorSession',
    });
}

/**
 * Fetches a random mate-in-one puzzle in the 800-1200 rating band.
 * @returns A promise that resolves to a puzzle the user must solve.
 */
export function getMateInOnePuzzle(): Promise<AxiosResponse<GetMateInOnePuzzleResponse>> {
    return axiosService.get<GetMateInOnePuzzleResponse>(`/puzzle/mate-in-one/next`, {
        functionName: 'getMateInOnePuzzle',
    });
}

/**
 * Submits the results of a mate-in-one drill session.
 * @param request The request containing the session results.
 * @returns A promise that resolves to the response from the API.
 */
export function submitMateInOneSession(
    request: SubmitMateInOneSessionRequest,
): Promise<AxiosResponse<SubmitMateInOneSessionResponse>> {
    return axiosService.post<SubmitMateInOneSessionResponse>(
        `/puzzle/mate-in-one/session`,
        request,
        { functionName: 'submitMateInOneSession' },
    );
}

/**
 * Fetches the next puzzle for a puzzle rush run.
 * @param request The search rating and the ids of puzzles already used in the run.
 * @returns A promise that resolves to the next puzzle.
 */
export function getPuzzleRushPuzzle(
    request: GetPuzzleRushPuzzleRequest,
): Promise<AxiosResponse<GetPuzzleRushPuzzleResponse>> {
    return axiosService.post<GetPuzzleRushPuzzleResponse>(`/puzzle/rush/next`, request, {
        functionName: 'getPuzzleRushPuzzle',
    });
}

/**
 * Submits a completed puzzle rush run.
 * @param request The request containing the run's attempts.
 * @returns A promise that resolves to the saved run.
 */
export function submitPuzzleRushSession(
    request: SubmitPuzzleRushSessionRequest,
): Promise<AxiosResponse<SubmitPuzzleRushSessionResponse>> {
    return axiosService.post<SubmitPuzzleRushSessionResponse>(`/puzzle/rush/session`, request, {
        functionName: 'submitPuzzleRushSession',
    });
}

/**
 * Fetches a single puzzle rush run belonging to the current user.
 * @param createdAt The createdAt timestamp of the run.
 * @returns A promise that resolves to the run.
 */
export function getPuzzleRushSession(
    createdAt: string,
): Promise<AxiosResponse<GetPuzzleRushSessionResponse>> {
    return axiosService.get<GetPuzzleRushSessionResponse>(
        `/puzzle/rush/session/${encodeURIComponent(createdAt)}`,
        { functionName: 'getPuzzleRushSession' },
    );
}

/**
 * Lists the current user's puzzle rush runs, most recent first.
 * @param request The optional pagination key.
 * @returns A promise that resolves to the runs.
 */
export function listPuzzleRushSessions(
    request: ListPuzzleRushSessionsRequest = {},
): Promise<AxiosResponse<ListPuzzleRushSessionsResponse>> {
    return axiosService.get<ListPuzzleRushSessionsResponse>(`/puzzle/rush/history`, {
        params: request,
        functionName: 'listPuzzleRushSessions',
    });
}
