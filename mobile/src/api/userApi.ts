import axios, { AxiosResponse } from 'axios';

import { getConfig } from '@/config';
import { FollowerEntry } from '../database/follower';
import { Graduation } from '../database/graduation';
import { UserStatistics } from '../database/statistics';
import { TimelineEntry } from '../database/timeline';
import { User } from '../database/user';

const BASE_URL = getConfig().api.baseUrl;

/**
 * UserApiContextType provides an API for interacting with the current signed-in user.
 */
export type UserApiContextType = {
    /**
     * checkUserAccess returns a 200 OK if the current signed-in user has an active subscription
     * on chessdojo.club and an error otherwise.
     * @returns An empty AxiosResponse if the current user has an active subscription.
     */
    checkUserAccess: () => Promise<AxiosResponse<any, any>>;

    /**
     * getUser returns the current signed-in user.
     * @returns An AxiosResponse containing the current user in the data field.
     */
    getUser: () => Promise<AxiosResponse<User, any>>;

    /**
     * getUserPublic returns the user with the provided username.
     * @returns An AxiosResponse containing the provided user in the data field.
     */
    getUserPublic: (username: string) => Promise<AxiosResponse<User, any>>;

    /**
     * listUserTimeline returns a list of the provided user's timeline entries.
     * @param owner The username to fetch timeline entries for.
     * @param startKey The optional start key to use when searching.
     * @returns A ListUserTimelineResponse
     */
    listUserTimeline: (owner: string, startKey?: string) => Promise<ListUserTimelineResponse>;

    /**
     * listUsersByCohort returns a list of users in the provided cohort.
     * @param cohort The cohort to get users in.
     * @param startKey The optional start key to use when searching.
     * @returns A list of users in the provided cohort.
     */
    listUsersByCohort: (cohort: string, startKey?: string) => Promise<User[]>;

    /**
     * searchUsers returns a list of users matching the provided search query.
     * @param query The query to match users against.
     * @param fields The fields to check the query against.
     * @param startKey The optional startKey to use for pagination.
     * @returns A list of users matching the provided query and fields.
     */
    searchUsers: (query: string, fields: string[], startKey?: string) => Promise<User[]>;

    /**
     * updateUser applies the given updates to the current signed-in user.
     * @param update The updates to apply.
     * @param autopickCohort Whether to automatically pick a cohort for the user based on the rating system and username.
     * @returns An AxiosResponse containing the updated user in the data field.
     */
    updateUser: (
        update: Partial<User>,
        autopickCohort?: boolean,
    ) => Promise<AxiosResponse<User, any>>;

    /**
     * updateUserProgress updates the current user's progress on the provided requirement.
     * @param cohort The cohort the user is making progress in.
     * @param requirementId The id of the requirement to update.
     * @param incrementalCount The amount by which the user is increasing their count.
     * @param incrementalMinutesSpent The amount by which the user is increasing their time spent.
     * @param date The optional date for which the update should apply.
     * @returns An AxiosResponse containing the updated user in the data field.
     */
    updateUserProgress: (
        cohort: string,
        requirementId: string,
        incrementalCount: number,
        incrementalMinutesSpent: number,
        date: Date | null,
    ) => Promise<AxiosResponse<User, any>>;

    /**
     * updateUserTimeline sets the current user's timeline for the provided requirement.
     * @param requirementId The id of the requirement being updated.
     * @param cohort The cohort to update the timeline for.
     * @param updated The timeline entries to update.
     * @param deleted The timeline entries to delete.
     * @param count The cohort count to set on the requirement.
     * @param minutesSpent The cohort minutes spent to set on the requirement.
     * @returns An AxiosResponse containing the updated user in the data field.
     */
    updateUserTimeline: (
        requirementId: string,
        cohort: string,
        updated: TimelineEntry[],
        deleted: TimelineEntry[],
        count: number,
        minutesSpent: number,
    ) => Promise<AxiosResponse<User, any>>;

    /**
     * graduate creates a new graduation object for the given user and updates them to the next cohort.
     * @param comments The comments the user wants to add to their graduation object.
     * @returns An AxiosResponse containing the new graduation object and the user update.
     */
    graduate: (comments: string) => Promise<AxiosResponse<GraduationResponse, any>>;

    /**
     * @returns An AxiosResponse containing the user statistics.
     */
    getUserStatistics: () => Promise<AxiosResponse<UserStatistics, any>>;

    /**
     * Fetches the FollowerEntry for the current signed-in user and the given poster, if it exists.
     * @param poster The person being followed.
     * @returns The FollowerEntry or null if it does not exist.
     */
    getFollower: (poster: string) => Promise<AxiosResponse<FollowerEntry | null, any>>;

    /**
     * Edits the follower state of the current signed-in user for the given poster.
     * @param poster The username of the person to follow or unfollow.
     * @param action Whether to follow or unfollow the user.
     * @returns An empty AxiosResponse if successful.
     */
    editFollower: (
        poster: string,
        action: 'follow' | 'unfollow',
    ) => Promise<AxiosResponse<FollowerEntry | null, any>>;

    /**
     * Fetches a list of followers for the given user.
     * @param username The username of the person to list followers for.
     * @param startKey An optional start key for pagination.
     * @returns The list of followers and the next start key.
     */
    listFollowers: (
        username: string,
        startKey?: string,
    ) => Promise<AxiosResponse<ListFollowersResponse, any>>;

    /**
     * Fetches the list of users the given user is following.
     * @param username The username of the person to list who they are following.
     * @param startKey An optional start key for pagination.
     * @returns The list of who they are following and the next start key.
     */
    listFollowing: (
        username: string,
        startKey?: string,
    ) => Promise<AxiosResponse<ListFollowersResponse, any>>;
};

/**
 * checkUserAccess returns a 200 OK if the current signed-in user has an active subscription
 * on chessdojo.club and an error otherwise.
 * @param idToken The id token of the current signed-in user.
 * @returns An empty AxiosResponse if the current user has an active subscription.
 */
export function checkUserAccess(idToken: string) {
    return axios.get(BASE_URL + '/user/access', {
        headers: {
            Authorization: 'Bearer ' + idToken,
        },
    });
}

/**
 * getUser returns the current signed-in user.
 * @param idToken The id token of the current signed-in user.
 * @returns An AxiosResponse containing the current user in the data field.
 */
export function getUser(idToken: string) {
    return axios.get<User>(BASE_URL + '/user', {
        headers: {
            Authorization: 'Bearer ' + idToken,
        },
    });
}

/**
 * getUserPublic returns the public information for the provided username.
 * @param username The user to fetch public information for.
 * @returns An AxiosResponse containing the requested user.
 */
export function getUserPublic(idToken: string, username: string) {
    return axios.get<User>(BASE_URL + '/user/profile/' + username, {
        headers: { Authorization: 'Bearer ' + idToken },
    });
}

export interface ListUserTimelineResponse {
    entries: TimelineEntry[];
    lastEvaluatedKey: string;
}

/**
 * listUserTimeline returns a list of the provided user's timeline entries
 * @param idToken The id token of the current signed-in user.
 * @param owner The username to fetch timeline entries for.
 * @param startKey The optional start key to use when searching.
 * @returns A ListUserTimelineResponse
 */
export async function listUserTimeline(idToken: string, owner: string, startKey?: string) {
    let params = { startKey };
    const resp = await axios.get<ListUserTimelineResponse>(`${BASE_URL}/user/${owner}/timeline`, {
        params,
        headers: {
            Authorization: 'Bearer ' + idToken,
        },
    });
    return resp.data;
}

interface ListUsersResponse {
    users: User[];
    lastEvaluatedKey: string;
}

/**
 * listUsersByCohort returns a list of users in the provided cohort.
 * @param idToken The id token of the current signed-in user.
 * @param cohort The cohort to search for users.
 * @param startKey The optional startKey to use when searching.
 * @returns A list of users in the provided cohort.
 */
export async function listUsersByCohort(idToken: string, cohort: string, startKey?: string) {
    let params = { startKey };
    const result: User[] = [];
    do {
        const resp = await axios.get<ListUsersResponse>(BASE_URL + `/user/${cohort}`, {
            params,
            headers: {
                Authorization: 'Bearer ' + idToken,
            },
        });
        result.push(...resp.data.users);
        params.startKey = resp.data.lastEvaluatedKey;
    } while (params.startKey);
    return result;
}

/**
 * searchUsers returns a list of users matching the provided search query.
 * @param query The query to match users against.
 * @param fields The fields to check the query against.
 * @param startKey The optional startKey to use for pagination.
 * @returns A list of users matching the provided query and fields.
 */
export async function searchUsers(query: string, fields: string[], startKey?: string) {
    let params = { query, fields: fields.join(','), startKey };
    const result: User[] = [];

    do {
        const resp = await axios.get<ListUsersResponse>(BASE_URL + '/public/user/search', {
            params,
        });
        result.push(...resp.data.users);
        params.startKey = resp.data.lastEvaluatedKey;
    } while (params.startKey);

    return result;
}

/**
 * updateUser applies the given updates to the current signed-in user.
 * @param idToken The id token of the current signed-in user.
 * @param update The updates to apply.
 * @param callback A callback function to invoke with the update after it has succeeded on the backend.
 * @param autopickCohort Whether to automatically pick a cohort for the user based on the rating system and username.
 * @returns An AxiosResponse containing the updated user in the data field.
 */
export async function updateUser(
    idToken: string,
    update: Partial<User>,
    callback: (update: Partial<User>) => void,
    autopickCohort?: boolean,
) {
    const result = await axios.put<User>(`${BASE_URL}/user`, update, {
        headers: {
            Authorization: 'Bearer ' + idToken,
        },
        params: {
            autopickCohort,
        },
    });
    callback(result.data);
    return result;
}

/**
 * updateUserProgress updates the current user's progress on the provided requirement.
 * @param idToken The id token of the current signed-in user.
 * @param cohort The cohort the user is making progress in.
 * @param requirementId The id of the requirement to update.
 * @param incrementalCount The amount by which the user is increasing their count.
 * @param incrementalMinutesSpent The amount by which the user is increasing their time spent.
 * @param date The optional date for which the update should apply.
 * @param callback A callback function to invoke with the update after it has succeeded on the backend.
 * @returns An AxiosResponse containing the updated user in the data field.
 */
export async function updateUserProgress(
    idToken: string,
    cohort: string,
    requirementId: string,
    incrementalCount: number,
    incrementalMinutesSpent: number,
    date: Date | null,
    callback: (update: Partial<User>) => void,
) {
    const result = await axios.post<User>(
        BASE_URL + '/user/progress',
        {
            cohort,
            requirementId,
            incrementalCount,
            incrementalMinutesSpent,
            date: date?.toISOString(),
        },
        {
            headers: {
                Authorization: 'Bearer ' + idToken,
            },
        },
    );
    callback(result.data);
    return result;
}

/**
 * updateUserTimeline sets the current user's timeline for the provided requirement.
 * @param idToken The id token of the current signed-in user.
 * @param requirementId The id of the requirement being updated.
 * @param cohort The cohort to set the requirement for.
 * @param updated The timeline entries to update.
 * @param deleted The timeline entries to delete.
 * @param count The cohort count to set on the requirement.
 * @param minutesSpent The cohort minutes spent to set on the requirement.
 * @param callback A callback function to invoke with the update after it has succeeded on the backend.
 * @returns An AxiosResponse containing the updated user in the data field.
 */
export async function updateUserTimeline(
    idToken: string,
    requirementId: string,
    cohort: string,
    updated: TimelineEntry[],
    deleted: TimelineEntry[],
    count: number,
    minutesSpent: number,
    callback: (update: Partial<User>) => void,
) {
    const result = await axios.post<User>(
        BASE_URL + '/user/progress/timeline',
        {
            requirementId,
            cohort,
            updated,
            deleted,
            count,
            minutesSpent,
        },
        {
            headers: {
                Authorization: 'Bearer ' + idToken,
            },
        },
    );
    callback(result.data);
    return result;
}

interface GraduationResponse {
    graduation: Graduation;
    userUpdate: Partial<User>;
}

/**
 * graduate creates a new graduation object for the current user. If successful,
 * the current user is updated to match the effects of the graduation.
 * @param idToken The id token of the current signed-in user.
 * @param comments The comments the user wants to add to their graduation.
 * @param callback A callback function to invoke with the user update upon success.
 * @returns An AxiosResponse containing the new graduation object and the user update.
 */
export async function graduate(
    idToken: string,
    comments: string,
    callback: (update: Partial<User>) => void,
) {
    const result = await axios.post<GraduationResponse>(
        BASE_URL + '/user/graduate',
        { comments },
        {
            headers: {
                Authorization: 'Bearer ' + idToken,
            },
        },
    );
    callback(result.data.userUpdate);
    return result;
}

/**
 * @returns An AxiosResponse containing the user statistics.
 */
export function getUserStatistics() {
    return axios.get<UserStatistics>(BASE_URL + '/public/user/statistics');
}

/**
 * Fetches the FollowerEntry for the current signed-in user and the given poster, if it exists.
 * @param idToken The id token of the current signed-in user.
 * @param poster The person being followed.
 * @returns The FollowerEntry or null if it does not exist.
 */
export function getFollower(idToken: string, poster: string) {
    return axios.get<FollowerEntry | null>(`${BASE_URL}/user/followers/${poster}`, {
        headers: {
            Authorization: 'Bearer ' + idToken,
        },
    });
}

/**
 * Edits the follower state of the current signed-in user for the given poster.
 * @param idToken The id token of the current signed-in user.
 * @param poster The username of the person to follow or unfollow.
 * @param action Whether to follow or unfollow the user.
 * @returns An empty AxiosResponse if successful.
 */
export function editFollower(idToken: string, poster: string, action: 'follow' | 'unfollow') {
    return axios.post<FollowerEntry | null>(
        `${BASE_URL}/user/followers`,
        { poster, action },
        {
            headers: {
                Authorization: 'Bearer ' + idToken,
            },
        },
    );
}

export interface ListFollowersResponse {
    followers: FollowerEntry[];
    lastEvaluatedKey: string;
}

/**
 * Fetches the list of followers for the given user.
 * @param username The username of the person to list followers for.
 * @param startKey An optional start key for pagination.
 * @returns The list of followers and the next start key.
 */
export function listFollowers(username: string, startKey?: string) {
    return axios.get<ListFollowersResponse>(`${BASE_URL}/public/user/${username}/followers`, {
        params: { startKey },
    });
}

/**
 * Fetches the list of users the given user is following.
 * @param username The username of the person to list who they are following.
 * @param startKey An optional start key for pagination.
 * @returns The list of who they are following and the next start key.
 */
export function listFollowing(username: string, startKey?: string) {
    return axios.get<ListFollowersResponse>(`${BASE_URL}/public/user/${username}/following`, {
        params: { startKey },
    });
}
