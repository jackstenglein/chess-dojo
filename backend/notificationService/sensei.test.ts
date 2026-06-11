import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendDirectMessageMock = vi.hoisted(() => vi.fn());

vi.mock('./discord', () => ({
    sendDirectMessage: sendDirectMessageMock,
}));

import { getSenseiDiscordIds, sendSenseiDirectMessages } from './sensei';

describe('getSenseiDiscordIds', () => {
    beforeEach(() => {
        delete process.env.senseiDiscordIds;
    });

    it('trims configured IDs and removes empty entries', () => {
        process.env.senseiDiscordIds = '111, 222,,333 ';

        expect(getSenseiDiscordIds()).toEqual(['111', '222', '333']);
    });

    it('returns an empty list when no IDs are configured', () => {
        expect(getSenseiDiscordIds()).toEqual([]);
    });
});

describe('sendSenseiDirectMessages', () => {
    beforeEach(() => {
        sendDirectMessageMock.mockReset();
        process.env.senseiDiscordIds = '111,222';
    });

    it('sends the message to every configured sensei', async () => {
        sendDirectMessageMock.mockResolvedValue(undefined);

        await sendSenseiDirectMessages('GAME_REVIEW_SIGNUP', 'hello');

        expect(sendDirectMessageMock).toHaveBeenCalledTimes(2);
        expect(sendDirectMessageMock).toHaveBeenNthCalledWith(1, '111', 'hello');
        expect(sendDirectMessageMock).toHaveBeenNthCalledWith(2, '222', 'hello');
    });

    it('continues when one Discord DM fails', async () => {
        sendDirectMessageMock
            .mockRejectedValueOnce(new Error('Discord failed'))
            .mockResolvedValueOnce(undefined);

        await sendSenseiDirectMessages('GAME_REVIEW_SIGNUP', 'hello');

        expect(sendDirectMessageMock).toHaveBeenCalledTimes(2);
    });
});
