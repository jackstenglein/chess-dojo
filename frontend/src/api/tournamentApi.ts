import { AxiosResponse } from 'axios';
import {
    Leaderboard,
    LeaderboardSite,
    OpenClassical,
    TournamentType,
} from '../database/tournament';
import { axiosService } from './axiosService';

export type TimePeriod = 'monthly' | 'yearly';
export type TimeControl = 'blitz' | 'rapid' | 'classical';

export interface TournamentApiContextType {
    /**
     * getLeaderboard returns the requested leaderboard.
     * @param site The site the leaderboard is for.
     * @param timePeriod The time period the leaderboard covers. Either monthly or yearly.
     * @param tournamentType The type of the leaderboard. Valid values are arena, swiss and grand_prix.
     * @param timeControl The time control of the leaderboard. Valid values are blitz, rapid and classical.
     * @param date The ISO-3601 date of the leaderboard to fetch.
     * @returns An AxiosResponse containing the requested leaderboard.
     */
    getLeaderboard: (
        site: LeaderboardSite,
        timePeriod: TimePeriod,
        tournamentType: TournamentType,
        timeControl: TimeControl,
        date: string,
    ) => Promise<AxiosResponse<Leaderboard>>;

    /**
     * Fetches the requested Open Classical.
     * @param startsAt The time period the open classical starts at. If not provided, the
     * current tournament will be returned.
     * @returns An AxiosResponse containing the requested OpenClassical.
     */
    getOpenClassical: (startsAt?: string) => Promise<AxiosResponse<OpenClassical>>;

    /**
     * Submits a request to register for the Open Classical.
     * @param req The Open Classical registration request.
     * @returns An empty AxiosResponse.
     */
    registerForOpenClassical: (
        req: OpenClassicalRegistrationRequest,
    ) => Promise<AxiosResponse<null>>;

    /**
     * Submits a request to enter results for the Open Classical.
     * @param req The Open Classical result submission request.
     * @returns An empty AxiosResponse.
     */
    submitResultsForOpenClassical: (
        req: OpenClassicalSubmitResultsRequest,
    ) => Promise<AxiosResponse<OpenClassical>>;

    /**
     * Sets the pairings using the given request. Only admins and tournament
     * admins can call this function.
     * @param req The Open Classical put pairings request.
     * @returns An AxiosResponse containing the updated open classical.
     */
    putOpenClassicalPairings: (
        req: OpenClassicalPutPairingsRequest,
    ) => Promise<AxiosResponse<OpenClassical>>;

    /**
     * Returns a list of previous open classicals.
     * @param startKey The optional start key to use when listing the open classicals.
     * @returns A list of previous open classicals, in descending order by date.
     */
    listPreviousOpenClassicals: (startKey?: string) => Promise<OpenClassical[]>;

    /**
     * Returns a csv file containing the current open classical registrations for the given section.
     * @param region The region to get.
     * @param section The section to get.
     * @returns A csv file containing the current open classical registrations.
     */
    adminGetRegistrations: (region: string, section: string) => Promise<AxiosResponse<Blob>>;

    /**
     * Bans the given player from the open classical.
     * @param username The username of the player to ban.
     * @param region The region the player is in.
     * @param section The section the player is in.
     * @returns An AxiosResponse containing the updated open classical.
     */
    adminBanPlayer: (
        username: string,
        region: string,
        section: string,
    ) => Promise<AxiosResponse<OpenClassical>>;

    /**
     * Unbans the given player from the open classical.
     * @param username The username of the player to unban.
     * @returns An AxiosResponse containing the updated open classical.
     */
    adminUnbanPlayer: (username: string) => Promise<AxiosResponse<OpenClassical>>;

    /**
     * Withdraws the given player from the current open classical.
     * @param username The username of the player to withdraw.
     * @param region The region the player is in.
     * @param section The section the player is in.
     * @returns An AxiosResponse containing the updated open classical.
     */
    adminWithdrawPlayer: (
        username: string,
        region: string,
        section: string,
    ) => Promise<AxiosResponse<OpenClassical>>;

    /**
     * Emails the pairings for the current round of the open classical.
     * The round parameter must be provided to ensure the caller understands which
     * round they are sending emails for.
     * @param round The round to send the emails for.
     * @returns An AxiosResponse containing the updated open classical and the number of pairing emails sent.
     */
    adminEmailPairings: (
        round: number,
    ) => Promise<AxiosResponse<OpenClassicalEmailPairingsResponse>>;

    /**
     * Sets the result of the given pairing in the current round of the open classical.
     * @param request The request to update the open classical pairing.
     * @returns An AxiosResponse containing the updated open classical.
     */
    adminVerifyResult: (
        request: OpenClassicalVerifyResultRequest,
    ) => Promise<AxiosResponse<OpenClassical>>;

    /**
     * Completes the current open classical and creates a new one that is accepting registrations.
     * @param nextStartDate The start date of the new open classical.
     * @returns An AxiosResponse containing the new open classical.
     */
    adminCompleteTournament: (nextStartDate: string) => Promise<AxiosResponse<OpenClassical>>;
}

/** A request to register for the Open Classical. */
export interface OpenClassicalRegistrationRequest {
    lichessUsername: string;
    title: string;
    region: string;
    section: string;
    byeRequests: boolean[];
}

/** A request to submit results for the Open Classical. */
export interface OpenClassicalSubmitResultsRequest {
    region: string;
    section: string;
    gameUrl: string;
    white: string;
    black: string;
    result: string;
    reportOpponent: boolean;
    notes: string;
    screenshotsData?: string[];
}

export interface OpenClassicalPutPairingsRequest {
    /** Updates whether the tournament is accepting registrations. */
    closeRegistrations?: boolean;

    /** The region to update pairings for. */
    region?: string;

    /** The section to update pairings for. */
    section?: string;

    /** The round to update pairings for. */
    round?: number;

    /** The CSV to use when updating the pairings. */
    csvData?: string;
}

export interface OpenClassicalVerifyResultRequest {
    /** The region of the pairing to update. */
    region: string;

    /** The section of the pairing to update. */
    section: string;

    /** The round of the pairing to update. */
    round: number;

    /** The Lichess username of the player with white. */
    white: string;

    /** The Lichess username of the player with black. */
    black: string;

    /** The result to set on the pairing. */
    result: string;
}

/**
 * getLeaderboard returns the requested leaderboard.
 * @param site The site the leaderboard is for.
 * @param timePeriod The time period the leaderboard covers. Either monthly or yearly.
 * @param tournamentType The type of the leaderboard. Valid values are arena, swiss and grand_prix.
 * @param timeControl The time control of the leaderboard. Valid values are blitz, rapid and classical.
 * @param date The ISO-3601 date of the leaderboard to fetch.
 * @returns An AxiosResponse containing the requested leaderboard.
 */
export function getLeaderboard(
    site: LeaderboardSite,
    timePeriod: TimePeriod,
    tournamentType: TournamentType,
    timeControl: TimeControl,
    date: string,
) {
    return axiosService.get<Leaderboard>(`/public/tournaments/leaderboard`, {
        params: {
            site,
            timePeriod,
            tournamentType,
            timeControl,
            date,
        },
        functionName: 'getLeaderboard',
    });
}

/**
 * Fetches the requested Open Classical.
 * @param startsAt The time period the open classical starts at. If not provided, the
 * current tournament will be returned.
 * @returns An AxiosResponse containing the requested OpenClassical.
 */
export function getOpenClassical(startsAt?: string) {
    return axiosService.get<OpenClassical>(`/public/tournaments/open-classical`, {
        params: { startsAt },
        functionName: 'getOpenClassical',
    });
}

/**
 * Submits a request to register for the Open Classical.
 * @param idToken The id token of the signed-in user.
 * @param req The Open Classical registration request.
 * @returns An empty AxiosResponse.
 */
export function registerForOpenClassical(idToken: string, req: OpenClassicalRegistrationRequest) {
    return axiosService.post<null>(`/tournaments/open-classical/register`, req, {
        headers: { Authorization: 'Bearer ' + idToken },
        functionName: 'registerForOpenClassical',
    });
}

/**
 * Submits a request to enter results for the Open Classical.
 * @param idToken The id token of the signed-in user.
 * @param req The Open Classical result submission request.
 * @returns An empty AxiosResponse.
 */
export function submitResultsForOpenClassical(
    idToken: string,
    req: OpenClassicalSubmitResultsRequest,
) {
    return axiosService.post<OpenClassical>(`/tournaments/open-classical/results`, req, {
        headers: { Authorization: 'Bearer ' + idToken },
        functionName: 'submitResultsForOpenClassical',
    });
}

/**
 * Sets the pairings for the open classical using the given request. Only admins and tournament
 * admins can call this function.
 * @param idToken The id
 * @param req The request to use when updating pairings.
 * @returns An AxiosResponse containing the updated open classical.
 */
export function putOpenClassicalPairings(idToken: string, req: OpenClassicalPutPairingsRequest) {
    return axiosService.post<OpenClassical>(`/tournaments/open-classical/admin/pairings`, req, {
        headers: { Authorization: 'Bearer ' + idToken },
        functionName: 'putOpenClassicalPairings',
    });
}

interface ListPreviousOpenClassicalsResponse {
    openClassicals: OpenClassical[];
    lastEvaluatedKey: string;
}

/**
 * Returns a list of previous open classicals.
 * @param startKey The optional start key to use when listing the open classicals.
 * @returns A list of previous open classicals, in descending order by date.
 */
export async function listPreviousOpenClassicals(startKey?: string) {
    const result: OpenClassical[] = [];
    const params = { startKey };

    do {
        const resp = await axiosService.get<ListPreviousOpenClassicalsResponse>(
            `/public/tournaments/open-classical/previous`,
            {
                params,
                functionName: 'listPreviousOpenClassicals',
            },
        );

        result.push(...resp.data.openClassicals);
        params.startKey = resp.data.lastEvaluatedKey;
    } while (params.startKey);

    return result;
}

export function adminGetRegistrations(idToken: string, region: string, section: string) {
    return axiosService.get(`/tournaments/open-classical/admin/registrations`, {
        params: { region, section },
        headers: { Authorization: 'Bearer ' + idToken },
        responseType: 'blob',
        functionName: 'adminGetRegistrations',
    });
}

/**
 * Bans the given player from the open classical.
 * @param idToken The id token of the current signed-in user.
 * @param username The username of the player to ban.
 * @param region The region the player is in.
 * @param section The section the player is in.
 * @returns An AxiosResponse containing the updated open classical.
 */
export function adminBanPlayer(idToken: string, username: string, region: string, section: string) {
    return axiosService.put<OpenClassical>(
        `/tournaments/open-classical/admin/ban-player`,
        {
            username,
            region,
            section,
        },
        {
            headers: { Authorization: 'Bearer ' + idToken },
            functionName: 'adminBanPlayer',
        },
    );
}

/**
 * Unbans the given player from the open classical.
 * @param idToken The id token of the current signed-in user.
 * @param username The username of the player to unban.
 * @returns An AxiosResponse containing the updated open classical.
 */
export function adminUnbanPlayer(idToken: string, username: string) {
    return axiosService.put<OpenClassical>(
        `/tournaments/open-classical/admin/unban-player`,
        { username },
        { headers: { Authorization: 'Bearer ' + idToken }, functionName: 'adminUnbanPlayer' },
    );
}

/**
 * Withdraws the given player from the open classical.
 * @param idToken The id token of the current signed-in user.
 * @param username The username of the player to withdraw.
 * @param region The region the player is in.
 * @param section The section the player is in.
 */
export function adminWithdrawPlayer(
    idToken: string,
    username: string,
    region: string,
    section: string,
) {
    return axiosService.put<OpenClassical>(
        `/tournaments/open-classical/admin/withdraw-player`,
        { username, region, section },
        { headers: { Authorization: 'Bearer ' + idToken }, functionName: 'adminWithdrawPlayer' },
    );
}

/** The response from an adminEmailPairings call. */
export interface OpenClassicalEmailPairingsResponse {
    /** The updated open classical. */
    openClassical: OpenClassical;

    /** The number of emails sent. */
    emailsSent: number;
}

/**
 * Emails the pairings for the current round of the open classical.
 * The round parameter must be provided to ensure the caller understands which
 * round they are sending emails for.
 * @param idToken The id token of the current signed-in user.
 * @param round The round to send the emails for.
 * @returns An AxiosResponse containing the updated open classical and the number of pairing emails sent.
 */
export function adminEmailPairings(idToken: string, round: number) {
    return axiosService.put<OpenClassicalEmailPairingsResponse>(
        `/tournaments/open-classical/admin/email-pairings`,
        { round },
        { headers: { Authorization: 'Bearer ' + idToken }, functionName: 'adminEmailPairings' },
    );
}

/**
 * Sets the result of the given pairing in the current round of the open classical.
 * @param idToken The id token of the current signed-in user.
 * @param request The request to update the open classical pairing.
 * @returns An AxiosResponse containing the updated open classical.
 */
export function adminVerifyResult(idToken: string, request: OpenClassicalVerifyResultRequest) {
    return axiosService.put<OpenClassical>(
        `/tournaments/open-classical/admin/verify-result`,
        request,
        {
            headers: { Authorization: 'Bearer ' + idToken },
            functionName: 'adminVerifyResult',
        },
    );
}

/**
 * Completes the current open classical and creates a new one that is accepting registrations.
 * @param idToken The id token of the current signed-in user.
 * @param nextStartDate The start date of the new open classical.
 * @returns An AxiosResponse containing the new open classical.
 */
export function adminCompleteTournament(idToken: string, nextStartDate: string) {
    return axiosService.put<OpenClassical>(
        `/tournaments/open-classical/admin/complete`,
        { nextStartDate },
        {
            headers: { Authorization: `Bearer ${idToken}` },
            functionName: 'adminCompleteTournament',
        },
    );
}
