import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const axiosGetMock = vi.hoisted(() => vi.fn());

vi.mock('@/api/axiosService', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/api/axiosService')>();
    return { axiosService: { ...actual.axiosService, get: axiosGetMock } };
});

import { fetchOpenClassicalLichessGame } from './lichessGame';

const game = {
    status: 'resign',
    winner: 'black',
    players: {
        white: { userId: 'alice' },
        black: { userId: 'bob' },
    },
};

beforeEach(() => {
    axiosGetMock.mockReset();
    vi.stubEnv('LICHESS_API_TOKEN', '');
});

describe('fetchOpenClassicalLichessGame', () => {
    it('sends the Lichess API token and does not follow redirects', async () => {
        vi.stubEnv('LICHESS_API_TOKEN', 'lip_token');
        axiosGetMock.mockResolvedValue({ data: game });

        await expect(
            fetchOpenClassicalLichessGame('https://lichess.org/abcdefgh/black'),
        ).resolves.toEqual({
            white: 'alice',
            black: 'bob',
            result: '0-1',
        });

        expect(axiosGetMock).toHaveBeenCalledWith('https://lichess.org/api/game/abcdefgh', {
            headers: { Authorization: 'Bearer lip_token' },
            maxRedirects: 0,
            functionName: 'getLichessGame',
        });
    });

    it('omits the token when it is not configured', async () => {
        axiosGetMock.mockResolvedValue({
            data: { ...game, status: 'draw', winner: undefined },
        });

        await expect(
            fetchOpenClassicalLichessGame('https://lichess.org/abcdefgh#1'),
        ).resolves.toEqual({
            white: 'alice',
            black: 'bob',
            result: '1/2-1/2',
        });

        expect(axiosGetMock).toHaveBeenCalledWith('https://lichess.org/api/game/abcdefgh', {
            headers: {},
            maxRedirects: 0,
            functionName: 'getLichessGame',
        });
    });

    it('returns null when Lichess refuses the game', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        axiosGetMock.mockRejectedValue(
            new AxiosError(
                'Request failed with status code 303',
                AxiosError.ERR_BAD_RESPONSE,
                undefined,
                undefined,
                {
                    status: 303,
                    statusText: 'See Other',
                    headers: { location: '/signup' },
                    config: { headers: new AxiosHeaders() },
                    data: '',
                },
            ),
        );

        await expect(
            fetchOpenClassicalLichessGame('https://lichess.org/abcdefgh'),
        ).resolves.toBeNull();
    });

    it('does not call Lichess for a non-lichess url', async () => {
        await expect(
            fetchOpenClassicalLichessGame('https://www.chess.com/game/live/1'),
        ).resolves.toBeNull();
        expect(axiosGetMock).not.toHaveBeenCalled();
    });
});
