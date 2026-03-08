import { FollowPositionRequest } from '@jackstenglein/chess-dojo-common/src/explorer/follower';
import { LichessTablebasePosition } from '@jackstenglein/chess-dojo-common/src/explorer/types';
import { AxiosResponse } from 'axios';
import {
    ExplorerPosition,
    ExplorerPositionFollower,
    LichessExplorerPosition,
} from '../database/explorer';
import { axiosService } from './axiosService';

/**
 * Provides an API for interacting with the position explorer.
 */
export interface ExplorerApiContextType {
    /**
     * Gets the ExplorerPosition with the provided FEN.
     * @param fen The FEN to fetch.
     * @returns The ExplorerPosition, if it exists.
     */
    getPosition: (fen: string) => Promise<AxiosResponse<GetExplorerPositionResult>>;

    /**
     * Creates, updates or deletes an ExplorerPositionFollower with the provided parameters.
     * @param request The FollowPositionRequest to send.
     * @returns The new ExplorerPositionFollower or null if request.unfollow is true.
     */
    followPosition: (
        request: FollowPositionRequest,
    ) => Promise<AxiosResponse<ExplorerPositionFollower | null>>;

    /**
     * Fetches a list of positions the caller has followed.
     */
    listFollowedPositions: () => Promise<AxiosResponse<ListFollowedPositionsResponse>>;
}

/** The result from a GetExplorerPosition request. */
export interface GetExplorerPositionResult {
    /** The normalized FEN of the requested position. */
    normalizedFen: string;

    /** The data from the Dojo database. */
    dojo: ExplorerPosition | null;

    /** The data from the Dojo masters database. */
    masters: ExplorerPosition | null;

    /** The data from the Lichess database. */
    lichess: LichessExplorerPosition | null;

    /** The data from the Lichess tablebase API. */
    tablebase: LichessTablebasePosition | null;

    /** The follower config, if the caller is following the position. */
    follower: ExplorerPositionFollower | null;
}

/**
 * Gets the ExplorerPosition with the provided FEN.
 * @param idToken The id token of the current signed-in user.
 * @param fen The FEN to fetch.
 * @returns An AxiosResponse containing the requested ExplorerPosition.
 */
export function getPosition(idToken: string, fen: string) {
    return axiosService.get<GetExplorerPositionResult>(`/explorer/position`, {
        params: { fen },
        headers: { Authorization: 'Bearer ' + idToken },
        functionName: 'getPosition',
    });
}

/**
 * Creates, updates or deletes an ExplorerPositionFollower with the provided parameters.
 * @param idToken The id token of the current signed-in user.
 * @param request The FollowPositionRequest to send.
 * @returns The new ExplorerPositionFollower or null if request.unfollow is true.
 */
export function followPosition(idToken: string, request: FollowPositionRequest) {
    return axiosService.put<ExplorerPositionFollower | null>(
        `/explorer/position/follower`,
        request,
        {
            headers: { Authorization: 'Bearer ' + idToken },
            functionName: 'followPosition',
        },
    );
}

export interface SourceCursor {
    lastTimestamp: string;
    completed?: boolean;
}

export interface Cursor {
    sources: Record<string, SourceCursor>;
    totalGames: number;
}

export interface BuildPlayerOpeningTreeRequest {
    sources: { type: string; username: string }[];
    since?: string;
    until?: string;
    cursor?: Cursor;
}

export interface BackendSourceError {
    source: string;
    username: string;
    error: string;
}

export interface BuildPlayerOpeningTreeResponse {
    positions: Record<string, BackendPositionData>;
    games: Record<string, BackendIndexedGame>;
    sourceErrors?: BackendSourceError[];
    truncated?: boolean;
    cursor?: Cursor;
}

export interface BackendPositionData {
    white: number;
    black: number;
    draws: number;
    moves: BackendMoveData[] | null;
    games: string[];
}

export interface BackendMoveData {
    san: string;
    white: number;
    black: number;
    draws: number;
    games: string[];
}

export interface BackendIndexedGame {
    source: { type: string };
    playerColor: string;
    white: string;
    black: string;
    whiteElo: number;
    blackElo: number;
    result: string;
    plyCount: number;
    rated: boolean;
    url: string;
    headers: Record<string, string>;
    timeClass: string;
}

/**
 * Builds a player opening tree on the backend.
 * @param idToken The id token of the current signed-in user.
 * @param sources The player sources to build the tree from.
 * @returns The serialized opening tree.
 */
export function buildPlayerOpeningTree(
    idToken: string,
    sources: BuildPlayerOpeningTreeRequest['sources'],
    signal?: AbortSignal,
    cursor?: Cursor,
    since?: string,
    until?: string,
) {
    const body: BuildPlayerOpeningTreeRequest = { sources, cursor };
    if (since) {
        body.since = since;
    }
    if (until) {
        body.until = until;
    }
    return axiosService.post<BuildPlayerOpeningTreeResponse>(
        `/explorer/player-opening-tree`,
        body,
        {
            headers: { Authorization: 'Bearer ' + idToken },
            functionName: 'buildPlayerOpeningTree',
            signal,
        },
    );
}

export interface ListFollowedPositionsResponse {
    /** The followed positions */
    positions: ExplorerPositionFollower[];
    /** The last evaluated key for pagination. */
    lastEvaluatedKey?: string;
}

/**
 * Fetches a list of positions the caller has followed.
 * @param idToken The id token of the current signed-in user.
 * @returns The list of followed positions.
 */
export function listFollowedPositions(idToken: string) {
    return axiosService.get<ListFollowedPositionsResponse>(`/explorer/position/follower`, {
        headers: { Authorization: `Bearer ${idToken}` },
        functionName: 'listFollowedPositions',
    });
}
