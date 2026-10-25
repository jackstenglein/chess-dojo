import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const axiosGetMock = vi.hoisted(() => vi.fn());
const secretsSendMock = vi.hoisted(() => vi.fn());

vi.mock('axios', async (importOriginal) => {
    const actual = await importOriginal<typeof import('axios')>();
    return { ...actual, default: { ...actual, get: axiosGetMock } };
});

vi.mock('@aws-sdk/client-secrets-manager', () => ({
    SecretsManagerClient: class {
        send = secretsSendMock;
    },
    GetSecretValueCommand: class {
        input: unknown;
        constructor(input: unknown) {
            this.input = input;
        }
    },
}));

/** Imports a fresh copy of the module, so the cached Lichess token is reset. */
async function importLichess() {
    vi.resetModules();
    return import('./lichess.js');
}

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
    secretsSendMock.mockReset();
    vi.stubEnv('stage', 'dev');
});

describe('getLichessGame', () => {
    it('sends the Lichess API token and does not follow redirects', async () => {
        secretsSendMock.mockResolvedValue({ SecretString: 'lip_token' });
        axiosGetMock.mockResolvedValue({ data: '[Event "Test"]' });
        const { getLichessGame } = await importLichess();

        await expect(getLichessGame('https://lichess.org/abcdefghWXYZ')).resolves.toBe(
            '[Event "Test"]',
        );
        await getLichessGame('https://lichess.org/abcdefgh/black');

        expect(secretsSendMock).toHaveBeenCalledOnce();
        expect(secretsSendMock).toHaveBeenCalledWith(
            expect.objectContaining({ input: { SecretId: 'chess-dojo-dev-lichessApiToken' } }),
        );
        expect(axiosGetMock).toHaveBeenCalledWith(
            'https://lichess.org/game/export/abcdefgh?evals=0&clocks=1',
            {
                headers: { Accept: 'application/x-chess-pgn', Authorization: 'Bearer lip_token' },
                maxRedirects: 0,
            },
        );
    });

    it('exports anonymously when the token is not available', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        secretsSendMock.mockRejectedValue(new Error('ResourceNotFoundException'));
        axiosGetMock.mockResolvedValue({ data: '[Event "Test"]' });
        const { getLichessGame } = await importLichess();

        await getLichessGame('https://lichess.org/abcdefgh');

        expect(axiosGetMock).toHaveBeenCalledWith(expect.any(String), {
            headers: { Accept: 'application/x-chess-pgn' },
            maxRedirects: 0,
        });
    });

    it('explains when Lichess redirects the export to its sign up page', async () => {
        secretsSendMock.mockResolvedValue({});
        axiosGetMock.mockRejectedValue(redirectError('/signup'));
        const { getLichessGame } = await importLichess();

        await expect(getLichessGame('https://lichess.org/abcdefgh')).rejects.toMatchObject({
            statusCode: 400,
            publicMessage:
                'Lichess Game can only be downloaded by signed-in users. Download its PGN from Lichess and import that instead.',
        });
    });
});

describe('getLichessChapter', () => {
    it('uses the study API', async () => {
        secretsSendMock.mockResolvedValue({});
        axiosGetMock.mockResolvedValue({ data: '[Event "Chapter"]' });
        const { getLichessChapter } = await importLichess();

        await getLichessChapter('https://lichess.org/study/W67VW7nM/3wugVXBW');

        expect(axiosGetMock).toHaveBeenCalledWith(
            'https://lichess.org/api/study/W67VW7nM/3wugVXBW.pgn?source=true',
            { headers: {}, maxRedirects: 0 },
        );
    });
});

describe('getLichessStudy', () => {
    it('uses the study API', async () => {
        secretsSendMock.mockResolvedValue({});
        axiosGetMock.mockResolvedValue({ data: '[Event "Chapter 1"]\n\n1. e4 *' });
        const { getLichessStudy } = await importLichess();

        await getLichessStudy('https://lichess.org/study/W67VW7nM');

        expect(axiosGetMock).toHaveBeenCalledWith(
            'https://lichess.org/api/study/W67VW7nM.pgn?source=true',
            { headers: {}, maxRedirects: 0 },
        );
    });
});
