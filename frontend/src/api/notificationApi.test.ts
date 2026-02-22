import { describe, expect, it, vi } from 'vitest';

// Mock axiosService before importing the module under test (hoist mock refs so expect() receives standalone functions, not unbound methods)
const { mockGet, mockDelete } = vi.hoisted(() => ({
    mockGet: vi.fn(),
    mockDelete: vi.fn(),
}));
vi.mock('./axiosService', () => ({
    axiosService: {
        get: mockGet,
        delete: mockDelete,
    },
}));

import { deleteAllNotifications, deleteNotification, listNotifications } from './notificationApi';

describe('notificationApi', () => {
    describe('listNotifications', () => {
        it('calls GET /user/notifications with auth header', () => {
            void listNotifications('test-token');
            expect(mockGet).toHaveBeenCalledWith('/user/notifications', {
                params: { startKey: undefined },
                headers: { Authorization: 'Bearer test-token' },
                functionName: 'listNotifications',
            });
        });

        it('passes startKey as a query param', () => {
            void listNotifications('test-token', 'some-key');
            expect(mockGet).toHaveBeenCalledWith('/user/notifications', {
                params: { startKey: 'some-key' },
                headers: { Authorization: 'Bearer test-token' },
                functionName: 'listNotifications',
            });
        });
    });

    describe('deleteNotification', () => {
        it('calls DELETE /user/notifications/{base64Id} with auth header', () => {
            const id = 'GAME_COMMENT|2000-2100|abc123';
            const encodedId = btoa(id);
            void deleteNotification('test-token', id);
            expect(mockDelete).toHaveBeenCalledWith(`/user/notifications/${encodedId}`, {
                headers: { Authorization: 'Bearer test-token' },
                functionName: 'deleteNotification',
            });
        });
    });

    describe('deleteAllNotifications', () => {
        it('calls DELETE /user/notifications with auth header', () => {
            void deleteAllNotifications('test-token');
            expect(mockDelete).toHaveBeenCalledWith('/user/notifications', {
                headers: { Authorization: 'Bearer test-token' },
                functionName: 'deleteAllNotifications',
            });
        });
    });
});
