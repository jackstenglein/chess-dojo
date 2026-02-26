import {
    RoundRobin,
    RoundRobinListRequest,
    RoundRobinRegisterRequest,
    RoundRobinSubmitGameRequest,
    RoundRobinWaitlist,
    RoundRobinWithdrawRequest,
} from '@jackstenglein/chess-dojo-common/src/roundRobin/api';
import { AxiosResponse } from 'axios';
import { axiosService } from './axiosService';

export interface RoundRobinApiContextType {
    /**
     * Sends a request to register for a round robin tournament.
     * @param request The request to register for the tournament.
     * @returns The updated tournament and waitlist.
     */
    registerForRoundRobin: (
        request: RoundRobinRegisterRequest,
    ) => Promise<AxiosResponse<RoundRobinRegisterResponse>>;

    /**
     * Sends a request to withdraw from a round robin tournament.
     * @param request The request to withdraw from the tournament.
     * @returns The updated tournament.
     */
    withdrawFromRoundRobin: (
        request: RoundRobinWithdrawRequest,
    ) => Promise<AxiosResponse<RoundRobin>>;

    /**
     * Sends a request to submit a game for a round robin tournament.
     * @param request The request to submit a game for the tournament.
     * @returns The updated tournament.
     */
    submitRoundRobinGame: (
        request: RoundRobinSubmitGameRequest,
    ) => Promise<AxiosResponse<RoundRobin>>;
}

export type RoundRobinRegisterResponse =
    | { url: string; banned?: boolean }
    | {
        waitlist: RoundRobinWaitlist;
        tournament?: RoundRobin;
    };

/**
 * Sends a request to register for a round robin tournament.
 * @param idToken The id token of the current signed-in user.
 * @param request The request to register for the tournament.
 * @returns The updated tournament and waitlist.
 */
export function registerForRoundRobin(idToken: string, request: RoundRobinRegisterRequest) {
    return axiosService.post<RoundRobinRegisterResponse>(
        `/tournaments/round-robin/register`,
        request,
        {
            headers: { Authorization: `Bearer ${idToken}` },
            functionName: 'registerForRoundRobin',
        },
    );
}

/**
 * Sends a request to withdraw from a round robin tournament.
 * @param idToken The id token of the current signed-in user.
 * @param request The request to withdraw from the tournament.
 * @returns The updated tournament.
 */
export function withdrawFromRoundRobin(idToken: string, request: RoundRobinWithdrawRequest) {
    return axiosService.post<RoundRobin>(`/tournaments/round-robin/withdraw`, request, {
        headers: { Authorization: `Bearer ${idToken}` },
        functionName: 'withdrawFromRoundRobin',
    });
}

/**
 * Sends a request to submit a game for the round robin tournament.
 * @param idToken The id token of the current signed-in user.
 * @param request The request to submit a game for the tournament.
 * @returns The updated tournament.
 */
export function submitRoundRobinGame(idToken: string, request: RoundRobinSubmitGameRequest) {
    return axiosService.post<RoundRobin>(`/tournaments/round-robin/submit-game`, request, {
        headers: { Authorization: `Bearer ${idToken}` },
        functionName: 'submitRoundRobinGame',
    });
}

export interface RoundRobinListResponse {
    tournaments: RoundRobin[];
    lastEvaluatedKey?: string;
}

/**
 * Sends a request to list round robin tournaments.
 * @param request The request to list the tournaments.
 * @returns The list of tournaments and the last evaluated key for pagination.
 */
export function listRoundRobins(request: RoundRobinListRequest) {
    return axiosService.get<RoundRobinListResponse>(`/public/tournaments/round-robin`, {
        params: request,
        functionName: 'listRoundRobins',
    });
}
