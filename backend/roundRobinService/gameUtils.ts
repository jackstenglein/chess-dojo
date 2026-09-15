'use strict';

import { Chess } from '@jackstenglein/chess';
import { ApiError } from '../directoryService/api';
import { getChesscomGame } from '../pgnService/game/chesscom';
import { getLichessGame } from '../pgnService/game/lichess';

export interface GameData {
    type: 'chesscom' | 'lichess';
    white: string;
    black: string;
    result: '1-0' | '1/2-1/2' | '0-1';
}

/**
 * Fetches the game at the given URL and parses out the necessary data.
 * @param url The URL of the game to fetch.
 * @returns The data from the game.
 */
export async function parseGame(url: string): Promise<GameData> {
    let pgn = '';
    if (url.includes('lichess')) {
        pgn = await getLichessGame(url);
    } else if (url.includes('chess.com')) {
        pgn = await getChesscomGame(url);
    } else {
        throw new ApiError({
            statusCode: 400,
            publicMessage: `Invalid URL. Only Lichess and Chess.com URLs are accepted`,
        });
    }

    let data;
    try {
        const chess = new Chess({ pgn });
        data = {
            type: url.includes('lichess') ? 'lichess' : 'chesscom',
            white: chess.header().tags.White,
            black: chess.header().tags.Black,
            result: chess.header().tags.Result,
        };
    } catch (err) {
        throw new ApiError({
            statusCode: 400,
            publicMessage: 'Failed to read game data from URL',
            cause: err,
        });
    }

    if (!data.white) {
        throw new ApiError({
            statusCode: 400,
            publicMessage: 'Game data does not have a white username',
        });
    }
    if (!data.black) {
        throw new ApiError({
            statusCode: 400,
            publicMessage: 'Game data does not have a black username',
        });
    }
    if (data.result !== '1-0' && data.result !== '1/2-1/2' && data.result !== '0-1') {
        throw new ApiError({
            statusCode: 400,
            publicMessage: `Invalid game result: ${data.result}`,
        });
    }

    return data as GameData;
}
