import axios, { AxiosResponse } from 'axios';

import { getConfig } from '@/config';
import { TimelineEntry } from '../database/timeline';

const BASE_URL = getConfig().api.baseUrl;

export type NewsfeedApiContextType = {
    /**
     * Fetches the timeline entry with the provided owner and id.
     * @param owner The owner of the timeline entry.
     * @param id The id of the timeline entry.
     * @returns An AxiosResponse containing the timeline entry.
     */
    getNewsfeedItem: (owner: string, id: string) => Promise<AxiosResponse<TimelineEntry, any>>;

    /**
     * Fetches a page of the provided newsfeed.
     * @param newsfeedIds The list of newsfeed ids to fetch, in order of priority.
     * @param skipLastFetch Optionally skip the lastFetch value when listing the newsfeed.
     * @param startKey The optional startKey to use for pagination.
     * @returns An AxiosResponse containing the list of newsfeed items and the next start key.
     */
    listNewsfeed: (
        newsfeedIds: string[],
        skipLastFetch?: boolean,
        startKey?: string,
    ) => Promise<AxiosResponse<ListNewsfeedResponse, any>>;

    /**
     * Adds the given content as a comment on the given TimelineEntry.
     * @param owner The owner of the TimelineEntry.
     * @param id The id of the TimelineEntry.
     * @param content The text content of the comment.
     * @returns The updated TimelineEntry.
     */
    createNewsfeedComment: (
        owner: string,
        id: string,
        content: string,
    ) => Promise<AxiosResponse<TimelineEntry, any>>;

    /**
     * Sets the provided reaction types on the given TimelineEntry.
     * @param owner The owner of the TimelineEntry.
     * @param id The id of the TimelineEntry.
     * @param types The reaction types to set. An empty list deletes the reaction.
     * @returns An AxiosResponse containing the updated TimelineEntry.
     */
    setNewsfeedReaction: (
        owner: string,
        id: string,
        types: string[],
    ) => Promise<AxiosResponse<TimelineEntry, any>>;
};

/**
 * Fetches the timeline entry with the provided owner and id.
 * @param owner The owner of the timeline entry.
 * @param id The id of the timeline entry.
 * @returns An AxiosResponse containing the timeline entry.
 */
export function getNewsfeedItem(idToken: string, owner: string, id: string) {
    return axios.get<TimelineEntry>(`${BASE_URL}/newsfeed/${owner}/${id}`, {
        headers: { Authorization: 'Bearer ' + idToken },
    });
}

/**
 * The response from a list newsfeed request.
 */
export interface ListNewsfeedResponse {
    /** The listed timeline entries. */
    entries: TimelineEntry[];

    /** The date of the previous request to ListNewsfeed.  */
    lastFetch: string;

    /** The start keys to pass in the next request. */
    lastKeys: Record<string, string>;
}

/**
 * Fetches a page of the provided newsfeed.
 * @param idToken The id token of the current signed-in user.
 * @param newsfeedIds The list of newsfeed ids to fetch, in order of priority.
 * @param startKey The optional startKey to use for pagination.
 * @returns An AxiosResponse containing the list of newsfeed items and the next start key.
 */
export function listNewsfeed(
    idToken: string,
    newsfeedIds: string[],
    skipLastFetch?: boolean,
    startKey?: string,
) {
    return axios.get<ListNewsfeedResponse>(`${BASE_URL}/newsfeed`, {
        params: {
            newsfeedIds: newsfeedIds.join(','),
            skipLastFetched: skipLastFetch ? 'true' : '',
            startKey,
        },
        headers: {
            Authorization: 'Bearer ' + idToken,
        },
    });
}

/**
 * Adds the given content as a comment on the given TimelineEntry.
 * @param idToken The id token of the current signed-in user.
 * @param owner The owner of the TimelineEntry.
 * @param id The id of the TimelineEntry.
 * @param content The text content of the comment.
 * @returns The updated TimelineEntry.
 */
export function createNewsfeedComment(idToken: string, owner: string, id: string, content: string) {
    return axios.post<TimelineEntry>(
        `${BASE_URL}/newsfeed/${owner}/${id}/comments`,
        { content },
        {
            headers: {
                Authorization: 'Bearer ' + idToken,
            },
        },
    );
}

/**
 * Sets the provided reaction types on the given TimelineEntry.
 * @param idToken The id token of the current signed-in user.
 * @param owner The owner of the TimelineEntry.
 * @param id The id of the TimelineEntry.
 * @param types The reaction types to set. An empty list deletes the reaction.
 * @returns An AxiosResponse containing the updated TimelineEntry.
 */
export function setNewsfeedReaction(idToken: string, owner: string, id: string, types: string[]) {
    return axios.put<TimelineEntry>(
        `${BASE_URL}/newsfeed/${owner}/${id}/reactions`,
        { types },
        { headers: { Authorization: 'Bearer ' + idToken } },
    );
}
