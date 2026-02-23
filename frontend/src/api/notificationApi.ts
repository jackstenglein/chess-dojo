import { AxiosResponse } from 'axios';
import { Notification } from '../database/notification';
import { axiosService } from './axiosService';

/**
 * NotificationApiContextType provides an API for interacting with Notifications.
 */
export interface NotificationApiContextType {
    /**
     * listNotifications returns a list of Notifications for the current signed-in user.
     * @param startKey The startKey to use when searching for Notifications.
     * @returns A list of notifications and the next start key.
     */
    listNotifications: (startKey?: string) => Promise<AxiosResponse<ListNotificationsResponse>>;

    /**
     * deleteNotification deletes the Notification with the provided id.
     * @param id The id of the Notification to delete.
     * @returns An empty AxiosResponse.
     */
    deleteNotification: (id: string) => Promise<AxiosResponse<null>>;

    /**
     * deleteAllNotifications deletes all Notifications for the current signed-in user.
     * @returns An empty AxiosResponse.
     */
    deleteAllNotifications: () => Promise<AxiosResponse<null>>;
}

/**
 * The response from a listNotifications request.
 */
export interface ListNotificationsResponse {
    /** The fetched list of Notifications. */
    notifications: Notification[];

    /** The startKey to use in the next call to listNotifications. */
    lastEvaluatedKey: string;
}

/**
 * listNotifications returns a list of Notifications for the current signed-in user.
 * @param idToken The id token of the current signed-in user.
 * @param startKey The startKey to use when searching for Notifications.
 * @returns A list of notifications and the next start key.
 */
export function listNotifications(idToken: string, startKey?: string) {
    return axiosService.get<ListNotificationsResponse>(`/user/notifications`, {
        params: { startKey },
        headers: {
            Authorization: 'Bearer ' + idToken,
        },
        functionName: 'listNotifications',
    });
}

/**
 * deleteNotification deletes the Notification with the provided id.
 * @param idToken The id token of the current signed-in user.
 * @param id The id of the Notification to delete.
 */
export function deleteNotification(idToken: string, id: string) {
    id = btoa(id);
    return axiosService.delete<null>(`/user/notifications/${id}`, {
        headers: {
            Authorization: 'Bearer ' + idToken,
        },
        functionName: 'deleteNotification',
    });
}

/**
 * deleteAllNotifications deletes all Notifications for the current signed-in user.
 * @param idToken The id token of the current signed-in user.
 */
export function deleteAllNotifications(idToken: string) {
    return axiosService.delete<null>(`/user/notifications`, {
        headers: {
            Authorization: 'Bearer ' + idToken,
        },
        functionName: 'deleteAllNotifications',
    });
}
