import { describe, expect, it } from 'vitest';
import { ApiError } from '../directoryService/api';
import { checkGuess } from './guess';
import { parseRoundPgn } from './lichess';

const HEADERS = '[Event "WCC"]\n[White "Sindarov, Javokhir"]\n[Black "Gukesh D"]\n';

function statusOf(fn: () => void): number | undefined {
    try {
        fn();
        return undefined;
    } catch (err) {
        return (err as ApiError).statusCode;
    }
}

describe('parseRoundPgn', () => {
    it('reads the moves of a game that has not started', () => {
        const state = parseRoundPgn(`${HEADERS}[Result "*"]\n\n *\n`);
        expect(state.played).toEqual([]);
        expect(state.result).toBe('*');
    });

    it('reads moves with clocks', () => {
        const state = parseRoundPgn(
            `${HEADERS}[Result "*"]\n\n1. e4 { [%clk 1:59:50] } 1... c5 { [%clk 1:59:41] } *\n`,
        );
        expect(state.played).toEqual(['e2e4', 'c7c5']);
    });
});

describe('checkGuess', () => {
    const start = parseRoundPgn(`${HEADERS}[Result "*"]\n\n *\n`);
    const afterE4 = parseRoundPgn(`${HEADERS}[Result "*"]\n\n1. e4 *\n`);

    it('accepts the first move before the game starts', () => {
        expect(statusOf(() => checkGuess(start, 1, 'e2e4'))).toBeUndefined();
    });

    it('rejects a move that was already played', () => {
        expect(statusOf(() => checkGuess(afterE4, 1, 'd2d4'))).toBe(409);
    });

    it('rejects guesses further ahead than the next move', () => {
        expect(statusOf(() => checkGuess(afterE4, 3, 'g1f3'))).toBe(400);
    });

    it('rejects illegal moves', () => {
        expect(statusOf(() => checkGuess(afterE4, 2, 'e2e4'))).toBe(400);
        expect(statusOf(() => checkGuess(afterE4, 2, 'c7c5'))).toBeUndefined();
    });

    it('rejects guesses once the game is over', () => {
        const over = parseRoundPgn(`${HEADERS}[Result "1/2-1/2"]\n\n1. e4 1/2-1/2\n`);
        expect(statusOf(() => checkGuess(over, 2, 'c7c5'))).toBe(409);
    });
});
