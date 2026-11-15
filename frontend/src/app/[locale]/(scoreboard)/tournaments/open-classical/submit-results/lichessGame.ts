'use server';

import { axiosService } from '@/api/axiosService';
import { logger } from '@/logging/logger';

interface LichessGameResponse {
    players: {
        white: { userId: string };
        black: { userId: string };
    };
    status: string;
    winner?: string;
}

export interface OpenClassicalLichessGame {
    white: string;
    black: string;
    result: string;
}

/**
 * Loads the players and result for a Lichess game URL. Sends ChessDojo's Lichess API
 * token when it is configured: without it, Lichess only returns games that are recent
 * or between players rated 2200+ on average.
 * @param gameUrl The Lichess game URL entered on the open classical submit form.
 * @returns The players and result, or null when the game cannot be read.
 */
export async function fetchOpenClassicalLichessGame(
    gameUrl: string,
): Promise<OpenClassicalLichessGame | null> {
    const gameId = lichessGameId(gameUrl);
    if (!gameId) {
        return null;
    }

    const token = process.env.LICHESS_API_TOKEN;
    try {
        const resp = await axiosService.get<LichessGameResponse>(
            `https://lichess.org/api/game/${gameId}`,
            {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                maxRedirects: 0,
                functionName: 'getLichessGame',
            },
        );
        return {
            white: resp.data.players.white.userId,
            black: resp.data.players.black.userId,
            result: lichessResult(resp.data),
        };
    } catch (err) {
        logger.error('Failed to fetch Lichess game for open classical submission: ', err);
        return null;
    }
}

/**
 * Returns the first path segment of a Lichess game URL.
 * @param gameUrl The URL to parse.
 * @returns The game id, or undefined when the URL is not a Lichess game URL.
 */
function lichessGameId(gameUrl: string): string | undefined {
    if (!gameUrl.startsWith('https://lichess.org/')) {
        return undefined;
    }
    const gameId = gameUrl.replace('https://lichess.org/', '').split('/')[0]?.split('#')[0];
    return gameId || undefined;
}

/**
 * Maps a Lichess game status onto a PGN result.
 * @param game The Lichess game response.
 * @returns The result, or an empty string when the game has no finished result.
 */
function lichessResult(game: LichessGameResponse): string {
    if (game.status === 'stalemate' || game.status === 'draw') {
        return '1/2-1/2';
    }
    if (game.winner === 'white') {
        return '1-0';
    }
    if (game.winner === 'black') {
        return '0-1';
    }
    return '';
}
