import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LichessFetcher } from './lichess';

const axiosGetMock = vi.hoisted(() => vi.fn());

vi.mock('axios', async (importOriginal) => {
    const actual = await importOriginal<typeof import('axios')>();
    return { ...actual, default: { ...actual, get: axiosGetMock } };
});

function redirectError(location: string) {
    return new AxiosError(
        'Request failed with status code 303',
        AxiosError.ERR_BAD_RESPONSE,
        undefined,
        undefined,
        {
            status: 303,
            statusText: 'See Other',
            headers: { location },
            config: { headers: new AxiosHeaders() },
            data: '',
        },
    );
}

beforeEach(() => {
    axiosGetMock.mockReset();
});

describe('getLichessGame', () => {
    it('sends the Lichess API token and does not follow redirects', async () => {
        const fetcher = new LichessFetcher('lip_token');
        axiosGetMock.mockResolvedValue({ data: '[Event "Test"]' });

        await expect(
            fetcher.getLichessGame('https://lichess.org/abcdefghWXYZ'),
        ).resolves.toStrictEqual({
            data: '[Event "Test"]',
        });
        await fetcher.getLichessGame('https://lichess.org/abcdefgh/black');

        expect(axiosGetMock).toHaveBeenCalledWith(
            'https://lichess.org/game/export/abcdefgh?evals=0&clocks=1',
            {
                headers: { Accept: 'application/x-chess-pgn', Authorization: 'Bearer lip_token' },
                maxRedirects: 0,
            },
        );
    });

    it('exports anonymously when the token is not available', async () => {
        const fetcher = new LichessFetcher();
        axiosGetMock.mockResolvedValue({ data: '[Event "Test"]' });

        await fetcher.getLichessGame('https://lichess.org/abcdefgh');

        expect(axiosGetMock).toHaveBeenCalledWith(expect.any(String), {
            headers: { Accept: 'application/x-chess-pgn' },
            maxRedirects: 0,
        });
    });

    it('explains when Lichess redirects the export to its sign up page', async () => {
        const fetcher = new LichessFetcher();
        axiosGetMock.mockRejectedValue(redirectError('/signup'));

        await expect(fetcher.getLichessGame('https://lichess.org/abcdefgh')).resolves.toStrictEqual(
            {
                error: {
                    statusCode: 400,
                    publicMessage:
                        'Lichess Game can only be downloaded by signed-in users. Download its PGN from Lichess and import that instead.',
                },
            },
        );
    });
});

describe('getLichessChapter', () => {
    it('uses the study API', async () => {
        const fetcher = new LichessFetcher();
        axiosGetMock.mockResolvedValue({ data: '[Event "Chapter"]' });

        await fetcher.getLichessChapter('https://lichess.org/study/W67VW7nM/3wugVXBW');

        expect(axiosGetMock).toHaveBeenCalledWith(
            'https://lichess.org/api/study/W67VW7nM/3wugVXBW.pgn?source=true',
            { headers: {}, maxRedirects: 0 },
        );
    });
});

describe('getLichessStudy', () => {
    it('uses the study API', async () => {
        const fetcher = new LichessFetcher();
        axiosGetMock.mockResolvedValue({ data: '[Event "Chapter 1"]\n\n1. e4 *' });

        await fetcher.getLichessStudy('https://lichess.org/study/W67VW7nM');

        expect(axiosGetMock).toHaveBeenCalledWith(
            'https://lichess.org/api/study/W67VW7nM.pgn?source=true',
            { headers: {}, maxRedirects: 0 },
        );
    });
});
