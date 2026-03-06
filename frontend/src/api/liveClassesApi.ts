import { User } from '@/database/user';
import {
    GameReviewCohort,
    GameReviewCohortMember,
    GetGameReviewCohortRequest,
    GetRecordingRequest,
    LiveClass,
    PauseQueueDateRequest,
    ResetQueueDateRequest,
    SetGameReviewCohortsRequest,
} from '@jackstenglein/chess-dojo-common/src/liveClasses/api';
import { AxiosResponse } from 'axios';
import { axiosService } from './axiosService';

interface GameReviewCohortResponse {
    gameReviewCohort: GameReviewCohort;
}

export interface LiveClassesApiContextType {
    /** Returns a list of live class recordings. */
    listRecordings: () => Promise<AxiosResponse<{ classes: LiveClass[] }>>;

    /** Returns a presigned URL for the recording. */
    getRecording: (request: GetRecordingRequest) => Promise<AxiosResponse<{ url: string }>>;

    /** Returns a specific game review cohort. */
    getGameReviewCohort: (
        request: GetGameReviewCohortRequest,
    ) => Promise<AxiosResponse<GameReviewCohortResponse>>;
}

export function listRecordings() {
    return axiosService.get<{ classes: LiveClass[] }>(`/public/live-classes/recordings`, {
        functionName: 'listRecordings',
    });
}

export function getRecording(request: GetRecordingRequest) {
    return axiosService.get<{ url: string }>(`/live-classes/recording`, {
        params: request,
        functionName: 'getRecording',
    });
}

/**
 * Fetches a specific game review cohort.
 * @param request The get game review cohort request.
 * @returns The game review cohort specified in the request.
 */
export function getGameReviewCohort(request: GetGameReviewCohortRequest) {
    return axiosService.get<GameReviewCohortResponse>(`/public/game-review-cohort/${request.id}`, {
        functionName: 'getGameReviewCohort',
    });
}

/**
 * Resets the queue date for a specific game review cohort member to the current time.
 * The caller must be an admin.
 * @param request The reset queue date request.
 * @returns The updated game review cohort.
 */
export function resetQueueDate(request: ResetQueueDateRequest) {
    return axiosService.put<GameReviewCohortResponse>(
        `/admin/game-review-cohort/${request.id}/${request.username}/reset`,
        { functionName: 'resetQueueDate' },
    );
}

/**
 * Pauses the queue date for a specific game review cohort member. The caller must be an
 * admin or the member themeselves.
 * @param request The pause queue date request.
 * @returns The updated game review cohort.
 */
export function pauseQueueDate(request: PauseQueueDateRequest) {
    return axiosService.put<GameReviewCohortResponse>(
        `/game-review-cohort/${request.id}/${request.username}/pause`,
        { pause: request.pause },
        { functionName: 'pauseQueueDate' },
    );
}

export interface LectureTierUser {
    username: string;
    displayName: string;
    dojoCohort: string;
}

export interface ListGameReviewCohortsResponse {
    gameReviewCohorts: GameReviewCohort[];
    unassignedUsers: GameReviewCohortMember[];
    lectureUsers: LectureTierUser[];
}

/**
 * Fetches a list of all game review cohorts.
 */
export async function listGameReviewCohorts(): Promise<
    AxiosResponse<ListGameReviewCohortsResponse>
> {
    const response = await axiosService.get<{
        gameReviewCohorts: GameReviewCohort[];
        unassignedUsers: User[];
        lectureUsers: LectureTierUser[];
    }>(`/admin/game-review-cohorts`, {
        functionName: 'listGameReviewCohorts',
    });
    return {
        ...response,
        data: {
            ...response.data,
            unassignedUsers: response.data.unassignedUsers.map((u) => ({
                username: u.username,
                displayName: u.displayName,
                queueDate: u.createdAt,
                dojoCohort: u.dojoCohort,
            })),
        },
    };
}

export function setGameReviewCohorts(request: SetGameReviewCohortsRequest) {
    return axiosService.put<{ gameReviewCohorts: GameReviewCohort[] }>(
        `/admin/game-review-cohorts`,
        request,
        { functionName: 'setGameReviewCohorts' },
    );
}
