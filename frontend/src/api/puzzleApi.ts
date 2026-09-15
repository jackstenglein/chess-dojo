import {
    GetMateInOnePuzzleResponse,
    SubmitMateInOneSessionRequest,
    SubmitMateInOneSessionResponse,
} from '@jackstenglein/chess-dojo-common/src/mateInOne/api';
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
