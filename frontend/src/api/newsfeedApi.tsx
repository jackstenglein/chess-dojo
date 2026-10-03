import { AxiosResponse } from 'axios';
import { TimelineEntry } from '../database/timeline';
import { axiosService, viewerPath } from './axiosService';

export interface NewsfeedApiContextType {
    /**
     * Fetches the timeline entry with the provided owner and id.
     * @param owner The owner of the timeline entry.
     * @param id The id of the timeline entry.
     * @returns An AxiosResponse containing the timeline entry.
     */
    getNewsfeedItem: (owner: string, id: string) => Promise<AxiosResponse<TimelineEntry>>;

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
    ) => Promise<AxiosResponse<ListNewsfeedResponse>>;

    /**
     * Adds the given content as a comment on the given TimelineEntry.
     * @param props The owner and id of the TimelineEntry.
     * @param content The text content of the comment.
     * @returns The updated TimelineEntry.
     */
    createNewsfeedComment: (
        props: { owner: string; id: string },
        content: string,
    ) => Promise<AxiosResponse<TimelineEntry>>;

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
    ) => Promise<AxiosResponse<TimelineEntry>>;
}

/**
 * Fetches the timeline entry with the provided owner and id.
 * @param owner The owner of the timeline entry.
 * @param id The id of the timeline entry.
 * @returns An AxiosResponse containing the timeline entry.
 */
export async function getNewsfeedItem(owner: string, id: string) {
    return axiosService.get<TimelineEntry>(await viewerPath(`/public/newsfeed/${owner}/${id}`), {
        functionName: 'getNewsfeedItem',
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
    return axiosService.get<ListNewsfeedResponse>(`/newsfeed`, {
        params: {
            newsfeedIds: newsfeedIds.join(','),
            skipLastFetched: skipLastFetch ? 'true' : '',
            startKey,
        },
        headers: {
            Authorization: 'Bearer ' + idToken,
        },
        functionName: 'listNewsfeed',
    });
}

/**
 * Adds the given content as a comment on the given TimelineEntry.
 * @param idToken The id token of the current signed-in user.
 * @param props The owner and id of the TimelineEntry.
 * @param content The text content of the comment.
 * @returns The updated TimelineEntry.
 */
export function createNewsfeedComment(
    idToken: string,
    props: { owner: string; id: string },
    content: string,
) {
    return axiosService.post<TimelineEntry>(
        `/newsfeed/${props.owner}/${props.id}/comments`,
        { content },
        {
            headers: {
                Authorization: 'Bearer ' + idToken,
            },
            functionName: 'createNewsfeedComment',
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
    return axiosService.put<TimelineEntry>(
        `/newsfeed/${owner}/${id}/reactions`,
        { types },
        { headers: { Authorization: 'Bearer ' + idToken }, functionName: 'setNewsfeedReaction' },
    );
}
