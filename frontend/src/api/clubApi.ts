import { AxiosResponse } from 'axios';
import { Club, ClubDetails, ClubJoinRequestStatus } from '../database/club';
import { ScoreboardSummary } from '../database/scoreboard';
import { User } from '../database/user';
import { axiosService, viewerPath } from './axiosService';

/** Provides an API for interacting with clubs. */
export interface ClubApiContextType {
    /**
     * Creates the given club.
     * @param club The club to create.
     * @returns An AxiosResponse containing the created club.
     */
    createClub: (club: Partial<Club>) => Promise<AxiosResponse<ClubDetails>>;

    /**
     * Updates the club with the given id.
     * @param id The id of the club to update.
     * @param update The fields of the club to update.
     * @returns An AxiosResponse containing the updated club.
     */
    updateClub: (id: string, update: Partial<Club>) => Promise<AxiosResponse<ClubDetails>>;

    /**
     * Fetches the full list of clubs in the database.
     * @param startKey An optional start key to use when searching.
     * @returns A list of all clubs in the database.
     */
    listClubs: (startKey?: string) => Promise<Club[]>;

    /**
     * Fetches the club with the given id.
     * @param id The id of the club to fetch.
     * @param scoreboard If true, the club's scoreboard is included.
     * @returns An AxiosResponse containing the requested club.
     */
    getClub: (id: string, scoreboard?: boolean) => Promise<AxiosResponse<GetClubResponse>>;

    /**
     * Fetches the clubs with the given ids.
     * @param ids The ids of the clubs to fetch.
     * @returns A list of the given clubs.
     */
    batchGetClubs: (ids: string[]) => Promise<AxiosResponse<Club[]>>;

    /**
     * Adds the current user as a member of the given club. The club must have
     * approvalsRequired set to false.
     * @param id The club to join.
     * @returns An AxiosResponse containing the club's updated details and
     * additional scoreboard entries.
     */
    joinClub: (id: string) => Promise<AxiosResponse<GetClubResponse>>;

    /**
     * Sends a request to join the given club.
     * @param id The id of the club to request to join.
     * @param notes The notes the user is including in the request.
     * @returns An AxiosResponse containing the club's updated details.
     */
    requestToJoinClub: (id: string, notes: string) => Promise<AxiosResponse<ClubDetails>>;

    /**
     * Applies the given status to the given club join request.
     * @param clubId The id of the club containing the request.
     * @param username The username of the join request.
     * @param status The status to apply to the join request.
     * @returns An AxiosResponse containing the club's updated details.
     */
    processJoinRequest: (
        clubId: string,
        username: string,
        status: ClubJoinRequestStatus,
    ) => Promise<AxiosResponse<GetClubResponse>>;

    /**
     * Leaves the club with the given id.
     * @param clubId The id of the club to leave.
     * @returns An AxiosResponse containing the club's updated details.
     */
    leaveClub: (clubId: string) => Promise<AxiosResponse<ClubDetails>>;
}

/**
 * Creates the given club.
 * @param idToken The id token of the current signed-in user.
 * @param club The club to create.
 * @returns An AxiosResponse containing the created club.
 */
export function createClub(idToken: string, club: Partial<Club>) {
    return axiosService.post<ClubDetails>(`/clubs`, club, {
        headers: { Authorization: 'Bearer ' + idToken },
        functionName: 'createClub',
    });
}

/**
 * Updates the club with the given id.
 * @param idToken The id token of the current signed-in user.
 * @param id The id of the club to update.
 * @param update The fields of the club to update.
 * @returns An AxiosResponse containing the updated club.
 */
export function updateClub(idToken: string, id: string, update: Partial<Club>) {
    return axiosService.put<ClubDetails>(`/clubs/${id}`, update, {
        headers: { Authorization: 'Bearer ' + idToken },
        functionName: 'updateClub',
    });
}

interface ListClubsResponse {
    clubs: Club[];
    lastEvaluatedKey: string;
}

/**
 * Fetches the full list of clubs in the database.
 * @param startKey An optional start key to use when searching.
 * @returns A list of all clubs in the database.
 */
export async function listClubs(startKey?: string) {
    const params = { startKey };
    const result: Club[] = [];

    do {
        const resp = await axiosService.get<ListClubsResponse>(`/public/clubs`, {
            params,
            functionName: 'listClubs',
        });

        result.push(...resp.data.clubs);
        params.startKey = resp.data.lastEvaluatedKey;
    } while (params.startKey);

    return result;
}

export interface GetClubResponse {
    club: ClubDetails;
    scoreboard?: ScoreboardSummary[];
}

/**
 * Fetches the club with the given id.
 * @param id The id of the club to fetch.
 * @returns An AxiosResponse containing the requested club.
 */
export async function getClub(id: string, scoreboard?: boolean) {
    return axiosService.get<GetClubResponse>(await viewerPath(`/public/clubs/${id}`), {
        params: { scoreboard },
        functionName: 'getClub',
    });
}

/**
 * Fetches the clubs with the given ids.
 * @param ids The ids of the clubs to fetch.
 * @returns A list of the given clubs.
 */
export function batchGetClubs(ids: string[]) {
    return axiosService.get<Club[]>(`/public/clubs/batch`, {
        params: { ids: ids.join(',') },
        functionName: 'batchGetClubs',
    });
}

/**
 * Adds the current user as a member of the given club. The club must have
 * approvalsRequired set to false.
 * @param idToken The id token of the current signed-in user.
 * @param id The club to join.
 * @returns An AxiosResponse containing the club's updated details.
 */
export function joinClub(idToken: string, id: string) {
    return axiosService.put<GetClubResponse>(
        `/clubs/${id}/members`,
        {},
        { headers: { Authorization: 'Bearer ' + idToken }, functionName: 'joinClub' },
    );
}

/**
 * Requests to join the provided club.
 * @param idToken The id token of the current signed-in user.
 * @param id The id of the club.
 * @param notes The notes to include in the join request.
 * @param user The user requesting to join.
 * @returns An AxiosResponse containing the updated club details.
 */
export function requestToJoinClub(idToken: string, id: string, notes: string, user?: User) {
    return axiosService.put<ClubDetails>(
        `/clubs/${id}/requests`,
        {
            username: user?.username,
            displayName: user?.displayName,
            cohort: user?.dojoCohort,
            notes,
        },
        { headers: { Authorization: 'Bearer ' + idToken }, functionName: 'requestToJoinClub' },
    );
}

/**
 * Applies the given status to the given club join request.
 * @param idToken The id token of the current signed-in user.
 * @param clubId The id of the club containing the request.
 * @param username The username of the join request.
 * @param status The status to apply to the join request.
 * @returns An AxiosResponse containing the club's updated details.
 */
export function processJoinRequest(
    _idToken: string,
    clubId: string,
    username: string,
    status: ClubJoinRequestStatus,
) {
    return axiosService.put<GetClubResponse>(
        `/clubs/${clubId}/requests/${username}`,
        { status },
        { functionName: 'processJoinRequest' },
    );
}

/**
 * Leaves the club with the given id.
 * @param idToken The id token of the current signed-in user.
 * @param clubId The id of the club to leave.
 * @returns An AxiosResponse containing the club's updated details.
 */
export function leaveClub(_idToken: string, clubId: string) {
    return axiosService.delete<ClubDetails>(`/clubs/${clubId}/members`, {
        functionName: 'leaveClub',
    });
}
