import { logger } from '@/logging/logger';
import {
    GameImportTypes,
    OnlineGameImportType,
} from '@jackstenglein/chess-dojo-common/src/database/game';
import { useEffect, useMemo } from 'react';
import { GameResult } from '../../database/game';
import { ChesscomGame, ChesscomGameResult, ChesscomTimeClass, useChesscomGames } from './chesscom';
import { LichessGame, LichessTimeClass, useLichessUserGames } from './lichess';

/** A unified interface for online games from any source. */
export interface OnlineGame {
    /** The source where this game was originally pulled from. */
    source: OnlineGameImportType;

    /** The id of the game in the original source. */
    id: string;

    /** The URL of the game in the original source. */
    url: string;

    /** The time the game ended, in Unix epoch milliseconds. */
    endTime: number;

    /** Whether the game was rated or not. */
    rated: boolean;

    /** The variant of the game. */
    variant: OnlineGameVariant | string;

    /** The player with white. */
    white: OnlineGamePlayer;

    /** The player with black. */
    black: OnlineGamePlayer;

    /** The result of the game. */
    result: GameResult;

    /** The reason for the result of the game. */
    resultReason: OnlineGameResultReason;

    /** The PGN of the game. */
    pgn: string;

    /** The time control of the game. */
    timeControl: OnlineGameTimeControl;

    /** The speed class of the game. */
    timeClass: OnlineGameTimeClass;
}

/** The variant of the OnlineGame. */
export enum OnlineGameVariant {
    Standard = 'standard',
    FromPosition = 'fromPosition',
    Chess960 = 'chess960',
    CrazyHouse = 'crazyhouse',
    AntiChess = 'antichess',
    Atomic = 'atomic',
    Horde = 'horde',
    KingOfTheHill = 'kingOfTheHill',
    RacingKings = 'racingKings',
    ThreeCheck = 'threeCheck',
}

export interface OnlineGamePlayer {
    /** The id of the player on the original source. */
    id: string;

    /** The username of the player on the original source. */
    username: string;

    /** The rating of the player on the original source. */
    rating?: number;

    /** Whether the player's rating is provisional. */
    provisional?: boolean;
}

export enum OnlineGameResultReason {
    Unknown = '',
    Resignation = 'resignation',
    Checkmate = 'checkmate',
    Timeout = 'timeout',
    Agreement = 'agreement',
    Abandonment = 'abandonment',
    InsufficientMaterial = 'insufficient material',
    Stalemate = 'stalemate',
    Repetition = 'repetition',
}

export interface OnlineGameTimeControl {
    /** The initial starting time of the clock. */
    initialSeconds: number;

    /** The amount of time gained per move. */
    incrementSeconds: number;
}

export enum OnlineGameTimeClass {
    Bullet = 'bullet',
    Blitz = 'blitz',
    Rapid = 'rapid',
    Classical = 'classical',
    Daily = 'daily',
}

/**
 * Converts the given ChesscomGame to an OnlineGame. Games played using variant rules will return null,
 * unless skipVariant is false.
 * @param game The game to convert.
 * @param skipVariant Whether to return null for variants. Defaults to true.
 * @returns The OnlineGame version of the ChesscomGame.
 */
export function chesscomOnlineGame(game: ChesscomGame, skipVariant = true): OnlineGame | null {
    if (skipVariant && game.rules !== 'chess') {
        return null;
    }

    const [result, resultReason] = chesscomGameResult(game);

    return {
        source: GameImportTypes.chesscomGame,
        id: game.uuid,
        url: game.url,
        endTime: game.end_time * 1000,
        rated: game.rated,
        variant: game.rules === 'chess' ? OnlineGameVariant.Standard : game.rules,
        white: {
            id: game.white.uuid,
            username: game.white.username,
            rating: game.white.rating,
        },
        black: {
            id: game.black.uuid,
            username: game.black.username,
            rating: game.black.rating,
        },
        result,
        resultReason,
        pgn: game.pgn,
        timeControl: {
            initialSeconds: parseInt(game.time_control),
            incrementSeconds: parseInt(game.time_control.split('+')[1] || '0'),
        },
        timeClass: getTimeClass(game.time_class),
    };
}

/**
 * Gets the result and reason for the result from a ChesscomGame.
 * @param game The game to get the result/reason for.
 * @returns An array containing the result and reason.
 */
export function chesscomGameResult(game: ChesscomGame): [GameResult, OnlineGameResultReason] {
    if (game.white.result === ChesscomGameResult.Win) {
        return [GameResult.White, chesscomGameResultReason(game.black.result)];
    }
    if (game.black.result === ChesscomGameResult.Win) {
        return [GameResult.Black, chesscomGameResultReason(game.white.result)];
    }
    return [GameResult.Draw, chesscomGameResultReason(game.white.result)];
}

/**
 * Converts a ChesscomGameResult into an OnlineGameResultReason.
 * @param reason The reason to convert.
 */
function chesscomGameResultReason(reason: ChesscomGameResult): OnlineGameResultReason {
    switch (reason) {
        case ChesscomGameResult.Resigned:
            return OnlineGameResultReason.Resignation;
        case ChesscomGameResult.Checkmated:
            return OnlineGameResultReason.Checkmate;
        case ChesscomGameResult.Timeout:
            return OnlineGameResultReason.Timeout;
        case ChesscomGameResult.DrawAgreement:
            return OnlineGameResultReason.Agreement;
        case ChesscomGameResult.Abandonded:
            return OnlineGameResultReason.Abandonment;
        case ChesscomGameResult.InsufficientMaterial:
            return OnlineGameResultReason.InsufficientMaterial;
        case ChesscomGameResult.Repetition:
            return OnlineGameResultReason.Repetition;

        default:
            return OnlineGameResultReason.Unknown;
    }
}

/**
 * Convers the given time class to an OnlineGameTimeClass, if it isn't one already.
 * @param tc The time class to convert.
 */
export function getTimeClass(
    tc: ChesscomTimeClass | LichessTimeClass,
    timeControl?: string,
): OnlineGameTimeClass {
    switch (tc) {
        case LichessTimeClass.UltraBullet:
        case LichessTimeClass.Bullet:
        case ChesscomTimeClass.Bullet:
            return OnlineGameTimeClass.Bullet;

        case LichessTimeClass.Blitz:
        case ChesscomTimeClass.Blitz:
            return OnlineGameTimeClass.Blitz;

        case LichessTimeClass.Rapid:
        case ChesscomTimeClass.Rapid:
            if (timeControl && parseInt(timeControl.split('+')[0]) > 30 * 60) {
                return OnlineGameTimeClass.Classical;
            }
            return OnlineGameTimeClass.Rapid;

        case LichessTimeClass.Classical:
            return OnlineGameTimeClass.Classical;

        case ChesscomTimeClass.Daily:
        case LichessTimeClass.Correspondence:
            return OnlineGameTimeClass.Daily;
    }
}

/**
 * Converts the given LichessGame to an OnlineGame. Games played using variant rules will return null,
 * unless skipVariant is false.
 * @param game The game to convert.
 * @param skipVariant Whether to return null for variants. Defaults to true.
 * @returns The OnlineGame version of the LichessGame.
 */
export function lichessOnlineGame(game: LichessGame, skipVariant = true): OnlineGame | null {
    if (
        skipVariant &&
        game.variant !== OnlineGameVariant.Standard &&
        game.variant !== OnlineGameVariant.FromPosition
    ) {
        return null;
    }

    const [result, resultReason] = lichessGameResult(game);
    const { white, black } = game.players;

    logger.debug(`lichessOnlineGame: ${game.id}`, game);

    return {
        source: GameImportTypes.lichessGame,
        id: game.id,
        url: `https://lichess.org/${game.id}`,
        endTime: game.lastMoveAt,
        rated: game.rated,
        variant: game.variant,
        white: {
            id: white.user?.id || '',
            username: white.aiLevel
                ? `Stockfish Level ${white.aiLevel}`
                : white.user?.name || 'Unknown Player',
            rating: white.rating,
            provisional: white.provisional,
        },
        black: {
            id: black.user?.id || '',
            username: black.aiLevel
                ? `Stockfish Level ${black.aiLevel}`
                : black.user?.name || 'Unknown Player',
            rating: black.aiLevel ? 0 : black.rating,
            provisional: black.provisional,
        },
        result,
        resultReason,
        pgn: game.pgn,
        timeControl: {
            initialSeconds: game.clock?.initial ?? 0,
            incrementSeconds: game.clock?.increment ?? 0,
        },
        timeClass: getTimeClass(game.speed),
    };
}

/**
 * Gets the result and reason for the result from a LichessGame.
 * @param game The game to get the result/reason for.
 * @returns An array containing the result and reason.
 */
export function lichessGameResult(game: LichessGame): [GameResult, OnlineGameResultReason] {
    let result = GameResult.Draw;
    if (game.winner === 'white') {
        result = GameResult.White;
    } else if (game.winner === 'black') {
        result = GameResult.Black;
    }

    switch (game.status) {
        case 'mate':
            return [result, OnlineGameResultReason.Checkmate];
        case 'resign':
            return [result, OnlineGameResultReason.Resignation];
        case 'stalemate':
            return [result, OnlineGameResultReason.Stalemate];
        case 'timeout':
            return [result, OnlineGameResultReason.Timeout];
        case 'outoftime':
            return [result, OnlineGameResultReason.Timeout];

        default:
            return [result, OnlineGameResultReason.Unknown];
    }
}

export interface UseOnlineGamesParams {
    /** The Lichess username to fetch games for. */
    lichess?: string;

    /** The Chess.com username to fetch games for. */
    chesscom?: string;
}

/**
 * A hook to fetch online games for the provided usernames.
 * @param params The lichess and chess.com usernames to fetch games for.
 * @returns A list of games from the provided platforms, combined and sorted by dates. The request
 * objects for each platform are returned as well.
 */
export function useOnlineGames(params: UseOnlineGamesParams) {
    const { lichess, chesscom } = params;

    const [lichessGames, requestLichessGames, lichessRequest] = useLichessUserGames();
    const [chesscomGames, requestChesscomGames, chesscomRequest] = useChesscomGames();

    useEffect(() => {
        if (!lichess) {
            return;
        }

        requestLichessGames({
            username: lichess,
            max: 50,
        });
    }, [lichess, requestLichessGames]);

    useEffect(() => {
        if (!chesscom) {
            return;
        }

        const now = new Date();
        const currentTimeframe = {
            year: `${now.getFullYear()}`,
            month: `0${now.getMonth() + 1}`.slice(-2),
        };

        const lastMonth = new Date(now.setMonth(now.getMonth() - 1));

        requestChesscomGames({
            username: chesscom,
            timeframes: [
                currentTimeframe,
                {
                    year: `${lastMonth.getFullYear()}`,
                    month: `0${lastMonth.getMonth() + 1}`.slice(-2),
                },
            ],
        });
    }, [chesscom, requestChesscomGames]);

    const games = useMemo(() => {
        return (lichessGames || [])
            .map((g) => lichessOnlineGame(g))
            .concat(chesscomGames?.map((g) => chesscomOnlineGame(g)) || [])
            .filter(isOnlineGame)
            .sort((lhs, rhs) => rhs.endTime - lhs.endTime);
    }, [lichessGames, chesscomGames]);

    return {
        games,
        requests: {
            lichess: lichessRequest,
            chesscom: chesscomRequest,
        },
    };
}

function isOnlineGame(g: OnlineGame | null): g is OnlineGame {
    return g !== null;
}
