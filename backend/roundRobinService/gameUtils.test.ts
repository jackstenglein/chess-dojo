'use strict';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const getLichessGameMock = vi.hoisted(() => vi.fn());
const getChesscomGameMock = vi.hoisted(() => vi.fn());

vi.mock('../pgnService/game/lichess', () => ({
    getLichessGame: getLichessGameMock,
}));

vi.mock('../pgnService/game/chesscom', () => ({
    getChesscomGame: getChesscomGameMock,
}));

import { ApiError } from '../directoryService/api';
import { parseGame } from './gameUtils';

describe('parseGame', () => {
    beforeEach(() => {
        getLichessGameMock.mockReset();
        getChesscomGameMock.mockReset();
    });

    it('parses a lichess game', async () => {
        getLichessGameMock.mockResolvedValue(
            '[White "alice_l"]\n[Black "bob_l"]\n[Result "1-0"]\n\n1. e4 e5 1-0',
        );

        await expect(parseGame('https://lichess.org/abc123')).resolves.toEqual({
            type: 'lichess',
            white: 'alice_l',
            black: 'bob_l',
            result: '1-0',
        });
        expect(getLichessGameMock).toHaveBeenCalledOnce();
    });

    it('parses a chess.com game', async () => {
        getChesscomGameMock.mockResolvedValue(
            '[White "alice_c"]\n[Black "bob_c"]\n[Result "0-1"]\n\n1. d4 d5 0-1',
        );

        await expect(parseGame('https://www.chess.com/game/live/123')).resolves.toEqual({
            type: 'chesscom',
            white: 'alice_c',
            black: 'bob_c',
            result: '0-1',
        });
        expect(getChesscomGameMock).toHaveBeenCalledOnce();
    });

    it('rejects unsupported urls', async () => {
        await expect(parseGame('https://example.com/game')).rejects.toBeInstanceOf(ApiError);
        await expect(parseGame('https://example.com/game')).rejects.toMatchObject({
            statusCode: 400,
        });
    });

    it('rejects invalid game results', async () => {
        getLichessGameMock.mockResolvedValue(
            '[White "alice_l"]\n[Black "bob_l"]\n[Result "*"]\n\n1. e4 *',
        );

        await expect(parseGame('https://lichess.org/abc123')).rejects.toMatchObject({
            statusCode: 400,
            publicMessage: expect.stringContaining('Invalid game result'),
        });
    });
});
