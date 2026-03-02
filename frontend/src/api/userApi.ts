import { RequirementProgress } from '@/database/requirement';
import { DiscordAuthRequest } from '@jackstenglein/chess-dojo-common/src/auth/discord';
import { AxiosResponse } from 'axios';
import { DateTime } from 'luxon';
import { FollowerEntry } from '../database/follower';
import { Graduation } from '../database/graduation';
import { UserStatistics } from '../database/statistics';
import { TimelineEntry } from '../database/timeline';
import { User, UserSummary } from '../database/user';
import { axiosService } from './axiosService';

/**
 * UserApiContextType provides an API for interacting with the current signed-in user.
 */
export interface UserApiContextType {
    /**
     * checkUserAccess returns a 200 OK if the current signed-in user has an active subscription
     * on chessdojo.shop and an error otherwise.
     * @returns An empty AxiosResponse if the current user has an active subscription.
     */
    checkUserAccess: () => Promise<AxiosResponse<User>>;

    /**
     * getUser returns the current signed-in user.
     * @returns An AxiosResponse containing the current user in the data field.
     */
    getUser: () => Promise<AxiosResponse<User>>;

    /**
     * getUserPublic returns the user with the provided username.
     * @returns An AxiosResponse containing the provided user in the data field.
     */
    getUserPublic: (username: string) => Promise<AxiosResponse<User>>;

    /**
     * Gets a list of user summaries for the given usernames. Max of 100 usernames at a time.
     * @param usernames The usernames to get.
     * @returns An AxiosResponse containing the list of user summaries.
     */
    getUserSummaries: (usernames: string[]) => Promise<AxiosResponse<UserSummary[]>>;

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
    updateUser: (update: Partial<User>, autopickCohort?: boolean) => Promise<AxiosResponse<User>>;

    /**
     * updateUserProgress updates the current user's progress on the provided requirement.
     * @param request The request to update the progress.
     * @returns An AxiosResponse containing the updated user and timeline entry in the data field.
     */
    updateUserProgress: (
        request: UpdateUserProgressRequest,
    ) => Promise<AxiosResponse<{ user: User; timelineEntry: TimelineEntry }>>;

    /**
     * updateUserTimeline sets the current user's timeline for the provided requirement.
     * @param request The request to update the user's timeline.
     * @returns An AxiosResponse containing the updated user in the data field.
     */
    updateUserTimeline: (request: UpdateUserTimelineRequest) => Promise<AxiosResponse<User>>;

    /**
     * graduate creates a new graduation object for the given user and updates them to the next cohort.
     * @param comments The comments the user wants to add to their graduation object.
     * @returns An AxiosResponse containing the new graduation object and the user update.
     */
    graduate: (comments: string) => Promise<AxiosResponse<GraduationResponse>>;

    /**
     * @returns An AxiosResponse containing the user statistics.
     */
    getUserStatistics: () => Promise<AxiosResponse<UserStatistics>>;

    /**
     * Fetches the FollowerEntry for the current signed-in user and the given poster, if it exists.
     * @param poster The person being followed.
     * @returns The FollowerEntry or null if it does not exist.
     */
    getFollower: (poster: string) => Promise<AxiosResponse<FollowerEntry | null>>;

    /**
     * Edits the follower state of the current signed-in user for the given poster.
     * @param poster The username of the person to follow or unfollow.
     * @param action Whether to follow or unfollow the user.
     * @returns An empty AxiosResponse if successful.
     */
    editFollower: (
        poster: string,
        action: 'follow' | 'unfollow',
    ) => Promise<AxiosResponse<FollowerEntry | null>>;

    /**
     * Fetches a list of followers for the given user.
     * @param username The username of the person to list followers for.
     * @param startKey An optional start key for pagination.
     * @returns The list of followers and the next start key.
     */
    listFollowers: (
        username: string,
        startKey?: string,
    ) => Promise<AxiosResponse<ListFollowersResponse>>;

    /**
     * Fetches the list of users the given user is following.
     * @param username The username of the person to list who they are following.
     * @param startKey An optional start key for pagination.
     * @returns The list of who they are following and the next start key.
     */
    listFollowing: (
        username: string,
        startKey?: string,
    ) => Promise<AxiosResponse<ListFollowersResponse>>;

    /**
     * Connects or disconnects a user's Discord account.
     * @param request The connection or disconnection request.
     * @returns An empty AxiosResponse.
     */
    discordAuth: (
        request: DiscordAuthRequest,
    ) => Promise<AxiosResponse<Partial<Pick<User, 'discordUsername' | 'discordId'>>>>;
}

/**
 * checkUserAccess returns a 200 OK if the current signed-in user has an active subscription
 * on chessdojo.shop and an error otherwise.
 * @param idToken The id token of the current signed-in user.
 * @returns An empty AxiosResponse if the current user has an active subscription.
 */
export function checkUserAccess(idToken: string) {
    return axiosService.get<User>('/user/access/v2', {
        headers: {
            Authorization: 'Bearer ' + idToken,
        },
        functionName: 'checkUserAccess',
    });
}

/**
 * getUser returns the current signed-in user.
 * @param idToken The id token of the current signed-in user.
 * @returns An AxiosResponse containing the current user in the data field.
 */
export function getUser(idToken: string) {
    return axiosService.get<User>('/user', {
        headers: {
            Authorization: 'Bearer ' + idToken,
        },
        functionName: 'getUser',
    });
}

/**
 * getUserPublic returns the public information for the provided username.
 * @param username The user to fetch public information for.
 * @returns An AxiosResponse containing the requested user.
 */
export function getUserPublic(username: string) {
    return axiosService.get<User>('/public/user/' + username, {
        functionName: 'getUserPublic',
    });
}

/**
 * Gets a list of user summaries for the given usernames. Max of 100 usernames at a time.
 * @param usernames The usernames to get.
 * @returns An AxiosResponse containing the list of user summaries.
 */
export function getUserSummaries(usernames: string[]) {
    return axiosService.post<UserSummary[]>(`/public/users`, usernames, {
        functionName: 'getUserSummaries',
    });
}

export interface ListUserTimelineResponse {
    entries: TimelineEntry[];
    lastEvaluatedKey: string;
}

/**
 * listUserTimeline returns a list of the provided user's timeline entries
 * @param owner The username to fetch timeline entries for.
 * @param startKey The optional start key to use when searching.
 * @returns A ListUserTimelineResponse
 */
export async function listUserTimeline(owner: string, startKey?: string) {
    const params = { startKey };
    const resp = await axiosService.get<ListUserTimelineResponse>(
        `/public/user/${owner}/timeline`,
        {
            params,
            functionName: 'listUserTimeline',
        },
    );
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
    const params = { startKey };
    const result: User[] = [];
    do {
        const resp = await axiosService.get<ListUsersResponse>(`/user/${cohort}`, {
            params,
            headers: {
                Authorization: 'Bearer ' + idToken,
            },
            functionName: 'listUsersByCohort',
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
    const params = { query, fields: fields.join(','), startKey };
    const result: User[] = [];

    do {
        const resp = await axiosService.get<ListUsersResponse>('/public/user/search', {
            params,
            functionName: 'searchUsers',
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
    const result = await axiosService.put<User>(`/user`, update, {
        headers: {
            Authorization: 'Bearer ' + idToken,
        },
        params: {
            autopickCohort,
        },
        functionName: 'updateUser',
    });
    callback(result.data);
    return result;
}

export interface UpdateUserProgressRequest {
    /** The cohort the user is making progress in. */
    cohort: string;
    /** The id of the requirement to update. */
    requirementId: string;
    /** The count of the requirement before the update. */
    previousCount: number;
    /** The count of the requirement after the update. */
    newCount: number;
    /** The amount by which the user is increasing their time spent. */
    incrementalMinutesSpent: number;
    /** The optional date for which the update should apply. */
    date: DateTime | null;
    /** The user's optional comments for the progress update. */
    notes: string;
}

/**
 * updateUserProgress updates the current user's progress on the provided requirement.
 * @param idToken The id token of the current signed-in user.
 * @param request The request to update the progress.
 * @param callback A callback function to invoke with the update after it has succeeded on the backend.
 * @returns An AxiosResponse containing the updated user in the data field.
 */
export async function updateUserProgress(
    idToken: string,
    request: UpdateUserProgressRequest,
    callback: (update: Partial<User>) => void,
) {
    const result = await axiosService.post<{ user: User; timelineEntry: TimelineEntry }>(
        '/user/progress/v3',
        {
            ...request,
            date: request.date?.toUTC().toISO(),
        },
        {
            headers: {
                Authorization: 'Bearer ' + idToken,
            },
            functionName: 'updateUserProgress',
        },
    );
    callback(result.data.user);
    return result;
}

export interface UpdateUserTimelineRequest {
    /** The id of the requirement being updated. */
    requirementId: string;
    /** The user's new progress object for the requirement. */
    progress: RequirementProgress;
    /** The timeline entries to update. */
    updated: TimelineEntry[];
    /** The timeline entries to delete. */
    deleted: TimelineEntry[];
}

/**
 * updateUserTimeline sets the current user's timeline for the provided requirement.
 * @param idToken The id token of the current signed-in user.
 * @param request The request to update the user timeline.
 * @param callback A callback function to invoke with the update after it has succeeded on the backend.
 * @returns An AxiosResponse containing the updated user in the data field.
 */
export async function updateUserTimeline(
    idToken: string,
    request: UpdateUserTimelineRequest,
    callback: (update: Partial<User>) => void,
) {
    const result = await axiosService.post<User>(`/user/progress/timeline/v2`, request, {
        headers: {
            Authorization: `Bearer ${idToken}`,
        },
        functionName: 'updateUserTimeline',
    });
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
    const result = await axiosService.post<GraduationResponse>(
        '/user/graduate',
        { comments },
        {
            headers: {
                Authorization: 'Bearer ' + idToken,
            },
            functionName: 'graduate',
        },
    );
    callback(result.data.userUpdate);
    return result;
}

/**
 * @returns An AxiosResponse containing the user statistics.
 */
export function getUserStatistics() {
    return axiosService.get<UserStatistics>('/public/user/statistics', {
        functionName: 'getUserStatistics',
    });
}

/**
 * Fetches the FollowerEntry for the current signed-in user and the given poster, if it exists.
 * @param idToken The id token of the current signed-in user.
 * @param poster The person being followed.
 * @returns The FollowerEntry or null if it does not exist.
 */
export function getFollower(idToken: string, poster: string) {
    return axiosService.get<FollowerEntry | null>(`/user/followers/${poster}`, {
        headers: {
            Authorization: 'Bearer ' + idToken,
        },
        functionName: 'getFollower',
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
    return axiosService.post<FollowerEntry | null>(
        `/user/followers`,
        { poster, action },
        {
            headers: {
                Authorization: 'Bearer ' + idToken,
            },
            functionName: 'editFollower',
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
    return axiosService.get<ListFollowersResponse>(`/public/user/${username}/followers`, {
        params: { startKey },
        functionName: 'listFollowers',
    });
}

/**
 * Fetches the list of users the given user is following.
 * @param username The username of the person to list who they are following.
 * @param startKey An optional start key for pagination.
 * @returns The list of who they are following and the next start key.
 */
export function listFollowing(username: string, startKey?: string) {
    return axiosService.get<ListFollowersResponse>(`/public/user/${username}/following`, {
        params: { startKey },
        functionName: 'listFollowing',
    });
}

/**
 * Connects or disconnects a user's Discord account.
 * @param idToken The id token of the current signed-in user.
 * @param request The connection or disconnection request.
 * @returns An empty AxiosResponse.
 */
export function discordAuth(idToken: string, request: DiscordAuthRequest) {
    return axiosService.post<Partial<Pick<User, 'discordUsername' | 'discordId'>>>(
        `/discord-auth`,
        request,
        {
            headers: { Authorization: `Bearer ${idToken}` },
            functionName: 'discordAuth',
        },
    );
}
