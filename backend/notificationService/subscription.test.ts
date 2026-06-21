import { SubscriptionTier } from '@jackstenglein/chess-dojo-common/src/database/user';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getNotificationSettingsMock = vi.hoisted(() => vi.fn());
const sendSenseiDirectMessagesMock = vi.hoisted(() => vi.fn());
const sendEmailTemplateMock = vi.hoisted(() => vi.fn());

vi.mock('./user', () => ({
    getNotificationSettings: getNotificationSettingsMock,
}));

vi.mock('./sensei', () => ({
    sendSenseiDirectMessages: sendSenseiDirectMessagesMock,
}));

vi.mock('./email', () => ({
    sendEmailTemplate: sendEmailTemplateMock,
}));

import { NotificationEventTypes } from '@jackstenglein/chess-dojo-common/src/database/notification';
import { gameReviewSignupMessage, handleGameReviewSignup } from './subscription';

describe('gameReviewSignupMessage', () => {
    beforeEach(() => {
        process.env.frontendHost = 'https://www.chessdojo.club';
    });

    it('includes the user, cohort, Discord mention, profile link, and admin link', () => {
        const message = gameReviewSignupMessage({
            username: 'dojo_user',
            displayName: 'Dojo User',
            dojoCohort: '1200-1300',
            discordId: '12345',
            discordUsername: 'dojo_user',
        });

        expect(message).toContain('Dojo User (dojo_user)');
        expect(message).toContain('Dojo cohort: 1200-1300');
        expect(message).toContain('Discord: <@12345>');
        expect(message).toContain('https://www.chessdojo.club/profile/dojo_user');
        expect(message).toContain('https://www.chessdojo.club/admin/game-review');
    });
});

describe('handleGameReviewSignup', () => {
    beforeEach(() => {
        getNotificationSettingsMock.mockReset();
        sendSenseiDirectMessagesMock.mockReset();
        sendEmailTemplateMock.mockReset();
        process.env.frontendHost = 'https://www.chessdojo.club';
    });

    it('sends a sensei DM for Game Review users', async () => {
        getNotificationSettingsMock.mockResolvedValue({
            username: 'dojo_user',
            displayName: 'Dojo User',
            dojoCohort: '1200-1300',
            discordId: '12345',
            discordUsername: 'dojo_user',
            subscriptionStatus: 'SUBSCRIBED',
            subscriptionTier: SubscriptionTier.GameReview,
        });

        await handleGameReviewSignup({
            type: NotificationEventTypes.GAME_REVIEW_SIGNUP,
            username: 'dojo_user',
        });

        expect(sendSenseiDirectMessagesMock).toHaveBeenCalledTimes(1);
        expect(sendSenseiDirectMessagesMock.mock.calls[0][0]).toBe(
            NotificationEventTypes.GAME_REVIEW_SIGNUP,
        );
        expect(sendSenseiDirectMessagesMock.mock.calls[0][1]).toContain('Dojo User (dojo_user)');
    });

    it('ignores users that are no longer Game Review subscribers', async () => {
        getNotificationSettingsMock.mockResolvedValue({
            username: 'dojo_user',
            displayName: 'Dojo User',
            dojoCohort: '1200-1300',
            subscriptionStatus: 'SUBSCRIBED',
            subscriptionTier: SubscriptionTier.Lecture,
        });

        await handleGameReviewSignup({
            type: NotificationEventTypes.GAME_REVIEW_SIGNUP,
            username: 'dojo_user',
        });

        expect(sendSenseiDirectMessagesMock).not.toHaveBeenCalled();
    });
});
