import axios, { AxiosRequestConfig } from 'axios';

export interface PgnImportError {
    statusCode: number;
    publicMessage: string;
    privateMessage?: string;
}

export type PgnImportResult<T> =
    { data: T; error?: undefined } | { data?: undefined; error: PgnImportError };

/**
 * Returns the specified pathname segment from the given URL.
 * @param url The URL to extract the pathname segment from.
 * @param idx The index of the pathname segment to extract.
 * @returns The specified pathname segment from the URL.
 */
function getPathSegment(url: string | undefined, idx: number): PgnImportResult<string> {
    if (!url) {
        return {
            error: {
                statusCode: 400,
                publicMessage: 'URL required',
                privateMessage: 'Attempted to parse an undefined URL',
            },
        };
    }

    let urlObj: URL;
    try {
        urlObj = new URL(url.trim());
    } catch (_error) {
        return {
            error: {
                statusCode: 400,
                publicMessage: 'Invalid url',
                privateMessage: `Was unable to parse this URL: ${url}`,
            },
        };
    }

    const parts = urlObj.pathname.split('/').filter((part) => part);
    if (idx >= parts.length) {
        return {
            error: {
                statusCode: 400,
                publicMessage: 'Invalid url',
                privateMessage: `Attempted to extract path segment index ${idx}, but only ${parts.length} segments found in url: ${url}`,
            },
        };
    }

    return { data: parts[idx] };
}

export class LichessFetcher {
    private token?: string;

    public constructor(token?: string) {
        this.token = token;
    }

    /**
     * Returns the axios config for a Lichess export. It sends ChessDojo's Lichess API token
     * when the fetcher has one: without it, Lichess only exports games that are recent or
     * between players rated 2200+ on average. Redirects are not followed, because Lichess
     * redirects the exports it refuses to its sign up page.
     * @param accept The Accept header to send, if any.
     */
    private getLichessConfig(accept?: string): AxiosRequestConfig {
        return {
            headers: {
                ...(accept ? { Accept: accept } : {}),
                ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
            },
            maxRedirects: 0,
        };
    }

    /**
     * Fetches the PGN of the given Lichess game.
     * @param url The URL of the Lichess game.
     * @returns The PGN of the Lichess game.
     */
    public async getLichessGame(url?: string): Promise<PgnImportResult<string>> {
        const { data, error } = getPathSegment(url, 0);
        if (error) {
            return { error };
        }

        // Lichess has a weird URL format for games, where the players get a special game ID
        // with extra characters at the end. Fetching this special game ID from the API results
        // in a 404, whereas truncating to only the first 8 characters will return the game.
        const gameId = data?.substring(0, 8);
        try {
            const exportUrl = `https://lichess.org/game/export/${gameId}?evals=0&clocks=1`;
            const response = await axios.get<string>(
                exportUrl,
                this.getLichessConfig('application/x-chess-pgn'),
            );
            return { data: response.data };
        } catch (err: unknown) {
            return handleError('Lichess Game', err);
        }
    }

    /**
     * Fetches the PGN of the given Lichess study chapter.
     * @param url The URL of the Lichess study chapter.
     * @returns The PGN of the chapter.
     */
    public async getLichessChapter(url?: string): Promise<PgnImportResult<string>> {
        const studyIdResp = getPathSegment(url, 1);
        if (studyIdResp.error) {
            return studyIdResp;
        }

        const chapterIdResp = getPathSegment(url, 2);
        if (chapterIdResp.error) {
            return chapterIdResp;
        }

        const exportUrl = `https://lichess.org/api/study/${studyIdResp.data}/${chapterIdResp.data}.pgn?source=true`;

        try {
            const response = await axios.get<string>(exportUrl, this.getLichessConfig());
            return { data: response.data };
        } catch (err) {
            return handleError('Lichess Study Chapter', err);
        }
    }

    /**
     * Fetches a list of the PGNs in the given Lichess study.
     * @param url The URL of the Lichess study.
     * @returns A list of the PGNs in the study.
     */
    public async getLichessStudy(url?: string): Promise<PgnImportResult<string[]>> {
        const studyIdResp = getPathSegment(url, 1);
        if (studyIdResp.error) {
            return studyIdResp;
        }

        const exportUrl = `https://lichess.org/api/study/${studyIdResp.data}.pgn?source=true`;
        try {
            const response = await axios.get<string>(exportUrl, this.getLichessConfig());
            return { data: splitPgns(response.data) };
        } catch (err) {
            return handleError('Lichess Study', err);
        }
    }
}

/**
 * Splits a list of PGNs in the same string into a list of strings,
 * using the provided separator.
 * @param pgns The PGN string to split.
 * @param separator The separator to split around. Defaults to a game
 * termination symbol, followed by 1 or more newlines, followed by the [ character.
 * @returns The list of split PGNs.
 */
function splitPgns(pgns: string, separator = /(1-0|0-1|1\/2-1\/2|\*)(\r?\n)+\[/): string[] {
    const splits = pgns.split(separator);
    const games: string[] = [];

    for (const split of splits) {
        if (isValidResult(split) && games.length > 0) {
            games[games.length - 1] += split;
        } else if (split.startsWith('[') || /^\d+/.exec(split.trim())) {
            games.push(split);
        } else if (split.trim().length > 0) {
            games.push(`[${split}`);
        }
    }

    return games.map((g) => g.trim()).filter((v) => v !== '');
}

/**
 * Returns true if the given result is a valid PGN result.
 *
 * @param result The result to check.
 * @returns True if the given result is valid.
 */
function isValidResult(result?: string): boolean {
    return !!result && ['1-0', '0-1', '1/2-1/2', '*'].includes(result);
}

/**
 * Throws a descriptive ApiError based on the error received when fetching
 * data from Lichess.
 * @param requested A description of the requested Lichess entity.
 * @param err The error thrown when fetching the Lichess entity.
 */
function handleError<T>(requested: string, err: unknown): PgnImportResult<T> {
    if (axios.isAxiosError(err) && err.response !== undefined) {
        const status = err.response.status;
        if (status === 403 || status === 401) {
            return {
                error: {
                    statusCode: 400,
                    publicMessage: `${requested} settings forbid exporting.`,
                },
            };
        } else if (status === 404) {
            return {
                error: {
                    statusCode: 400,
                    publicMessage: `${requested} not found.`,
                },
            };
        } else if (status >= 300 && status < 400) {
            return {
                error: {
                    statusCode: 400,
                    publicMessage: `${requested} can only be downloaded by signed-in users. Download its PGN from Lichess and import that instead.`,
                },
            };
        }
    }

    return {
        error: {
            statusCode: 500,
            publicMessage: 'Uknown error',
        },
    };
}
