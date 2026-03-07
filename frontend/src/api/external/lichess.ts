import axios, { Method } from 'axios';
import { useCallback, useState } from 'react';
import { Request, useRequest } from '../Request';

interface LichessPlayer {
    user?: {
        name: string;
        title?: string;
        patron?: boolean;
        id: string;
    };
    rating?: number;
    ratingDiff?: number;
    aiLevel?: number;
    provisional?: boolean;
}

interface Opening {
    eco: string;
    name: string;
    ply: number;
}

interface Clock {
    initial: number;
    increment: number;
    totalTime: number;
}

export enum LichessTimeClass {
    UltraBullet = 'ultraBullet',
    Bullet = 'bullet',
    Blitz = 'blitz',
    Rapid = 'rapid',
    Classical = 'classical',
    Correspondence = 'correspondence',
}

export interface LichessGame {
    id: string;
    rated: boolean;
    variant: string;
    speed: LichessTimeClass;
    perf: LichessPerfType;
    createdAt: number;
    lastMoveAt: number;
    status: string;
    players: { white: LichessPlayer; black: LichessPlayer };
    opening: Opening;
    moves: string;
    clock: Clock;
    pgn: string;
    winner?: string;
}

export enum LichessPerfType {
    UltraBullet = 'ultraBullet',
    Bullet = 'bullet',
    Blitz = 'blitz',
    Rapid = 'rapid',
    Classical = 'classical',
    Correspondence = 'correspondence',
    Chess960 = 'chess960',
    Crazyhouse = 'crazyhouse',
    Antichess = 'antichess',
    Atomic = 'atomic',
    Horde = 'horde',
    KingOfTheHill = 'kingOfTheHill',
    RacingKings = 'racingKings',
    ThreeCheck = 'threeCheck',
}

export enum LichessVariant {
    Standard = 'standard',
}

/**
 * Settings for exporting games.
 */
interface ExportUserGamesParams {
    /**
     * Username of the player whose games you should export.
     */
    username: string;

    /**
     * Download games played since this timestamp. Defaults to account creation date.
     */
    since?: number;

    /**
     * Download games played until this timestamp. Defaults to now.
     */
    until?: number;

    /**
     * How many games to download. WARNING: Defaults to all!
     */
    max?: number;

    /**
     * Only games played against this opponent.
     */
    vs?: string;

    /**
     * Only rated (true) or casual (false) games.
     */
    rated?: boolean;

    /**
     * Only games in these speeds or variants. Multiple perf types can be specified, separated by a comma.
     * Example: blitz,rapid,classical
     */
    perfType?: string;

    /**
     * Only games played as this color.
     */
    color?: 'white' | 'black';

    /**
     * Only games with or without a computer analysis available.
     */
    analysed?: boolean;

    /**
     * Include the PGN moves.
     *
     * Default: true
     */
    moves?: boolean;

    /**
     * Include the PGN tags.
     *
     * Default: true
     */
    tags?: boolean;

    /**
     * Include clock status when available. Either as PGN comments or in a clocks JSON field, as centisecond integers, depending on the response type.
     *
     * Default: true.
     */
    clocks?: boolean;

    /**
     * Include analysis evaluations and comments, when available. Either as PGN comments or in an analysis JSON field, depending on the response type.
     *
     * Default: false
     */
    evals?: boolean;

    /**
     * Include accuracy percent of each player, when available.
     *
     * Default: false
     */
    accuracy?: boolean;

    /**
     * Include the opening name. Example: [Opening "King's Gambit Accepted, King's Knight Gambit"]
     *
     * Default: true
     */
    opening?: boolean;

    /**
     * Plies which mark the beginning of the middlegame and endgame. Only available in JSON.
     */
    division?: boolean;

    /**
     * Ongoing games are delayed by a few seconds ranging from 3 to 60 depending on the time control, as to prevent cheat bots from using this API.
     *
     * Default: false
     */
    ongoing?: boolean;

    /**
     * Include finished games. Set to false to only get ongoing games.
     */
    finished?: boolean;

    /**
     * Insert textual annotations in the PGN about the opening, analysis variations, mistakes, and game termination.
     */
    literate?: boolean;

    /**
     * Include the FEN notation of the last position of the game. The response type must be set to application/x-ndjson by the request Accept header.
     */
    lastFen?: boolean;

    /**
     * URL of a text file containing real names and ratings, to replace Lichess usernames and ratings in the PGN.
     * Example: https://gist.githubusercontent.com/ornicar/6bfa91eb61a2dcae7bcd14cce1b2a4eb/raw/768b9f6cc8a8471d2555e47ba40fb0095e5fba37/gistfile1.txt
     */
    players?: string;

    /**
     * Sort order of the games. Default: "dateDesc". Enum: "dateAsc" "dateDesc".
     */
    sort?: 'dateAsc' | 'dateDesc';
}

/**
 * Returns the Lichess player object of the winner, or undefined if there was no winner.
 * @param game The game to get the winner for.
 */
export function getLichessWinner(game: LichessGame) {
    if (game.winner !== 'white' && game.winner !== 'black') {
        return;
    }

    return game.players[game.winner];
}

/**
 * Returns a user-facing display string of the game's result.
 * @param game The game to get the result for.
 */
export function getLichessGameResult(game: LichessGame) {
    const { winner, status } = game;
    if (status === 'noStart') {
        return 'aborted';
    }

    if (!winner) {
        if (status === 'draw') {
            return '½–½';
        }

        return 'unknown outcome';
    }

    const result = winner === 'white' ? '1–0' : '0–1';

    if (status === 'resign') {
        return `${result} by resignation`;
    }

    if (status === 'outoftime') {
        return `${result} on time`;
    }

    if (status === 'mate') {
        return `${result} by mate`;
    }

    return result;
}

export interface LichessExportGamesResponse {
    data: LichessGame[];
}

/**
 * A hook to fetch Lichess games.
 * @returns The list of games, a callback to fetch games and the request object.
 */
export function useLichessUserGames(): [
    LichessGame[] | undefined,
    (params: ExportUserGamesParams, force?: boolean) => void,
    Request<LichessExportGamesResponse>,
] {
    const request = useRequest<LichessExportGamesResponse>();
    const [games, setGames] = useState<LichessGame[]>();

    const requestGames = useCallback(
        (params: ExportUserGamesParams, force?: boolean) => {
            if (!force && request.isSent()) {
                return;
            }

            request.onStart();

            lichessApi
                .exportUserGames(params)
                .then((resp) => {
                    request.onSuccess();
                    setGames(resp.data);
                })
                .catch((err: unknown) => {
                    request.onFailure(err);
                });
        },
        [request],
    );

    return [games, requestGames, request];
}

export const lichessApi = {
    exportUserGames: (params: ExportUserGamesParams) =>
        requestLichessNDJson<ExportUserGamesParams, LichessExportGamesResponse>({
            params: {
                clocks: true,
                evals: false,
                opening: true,
                accuracy: false,
                ...params,
            },
            method: 'GET',
            endpoint: `/api/games/user/${params.username}`,
        }),
};

function requestLichessNDJson<T, R>({
    endpoint,
    data,
    params,
    method,
}: {
    endpoint: string;
    method: Method;
    params?: T;
    data?: T;
}): Promise<R> {
    return new Promise<R>((resolve, reject) => {
        // TODO: stream the response?
        axios
            .request<T, { data: string }>({
                method,
                data,
                params,
                url: `https://lichess.org${endpoint}`,
                headers: {
                    Accept: 'application/x-ndjson',
                },
            })
            .then((resp) => {
                // Not type-safe
                const parsedResp = {
                    data: resp.data
                        .split('\n')
                        .filter((line) => line)
                        .map((line) => JSON.parse(line) as unknown),
                } as R;

                resolve(parsedResp);
            })
            .catch((err: unknown) => {
                let message = 'Unknown reason';

                if (
                    err &&
                    typeof err === 'object' &&
                    'message' in err &&
                    typeof err.message === 'string'
                ) {
                    message = err.message;
                }

                const helpfulError = new Error(`Failed to contact Lichess API: ${message}`);

                reject(helpfulError);
            });
    });
}
