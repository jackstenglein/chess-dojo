import { describe, expect, it, vi } from 'vitest';

// The service keeps its data in memory in these tests, as it does locally.
vi.hoisted(() => {
    process.env.WC_LIVE_STORE = 'memory';
});

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

describe('Game 0', () => {
    it('serves the replayed test game without Lichess', async () => {
        const { currentTestRoundId, testRoundState } =
            await import('@jackstenglein/chess-dojo-common/src/wcLive/testGame');
        const { getRoundState } = await import('./lichess');
        const id = currentTestRoundId(Date.now());
        const state = await getRoundState(id);
        expect(state.played.length).toBe(testRoundState(id, Date.now())?.sans.length);
        expect(state.result === '*' || state.result === '1-0').toBe(true);
    });
});

describe('analysis', () => {
    it('adds variations, follows the cursor and refuses to delete the game', async () => {
        const { apply } = await import('./analysis');
        const main = ['e4', 'e5', 'Nf3'];
        let state = { roundId: 'xLgOJ6cb', lines: [] as string[][], version: 0 };
        state = apply(
            state,
            { action: 'move', roundId: 'xLgOJ6cb', path: ['e4', 'c5'] },
            main,
            'a',
        );
        state = apply(
            state,
            { action: 'move', roundId: 'xLgOJ6cb', path: ['e4', 'c5', 'Nf3'] },
            main,
            'a',
        );
        expect(state.lines).toEqual([['e4', 'c5', 'Nf3']]);
        const after = apply(
            state,
            { action: 'delete', roundId: 'xLgOJ6cb', path: ['e4', 'c5'] },
            main,
            'a',
        );
        expect(after.lines).toEqual([]);
        expect(after.cursor?.path).toEqual(['e4']);
        expect(() =>
            apply(state, { action: 'delete', roundId: 'xLgOJ6cb', path: ['e4', 'e5'] }, main, 'a'),
        ).toThrow();
    });
});

describe('guess stats', () => {
    it('flags right guesses made just before the move came in', async () => {
        const { computeGuessStats } = await import('./stats');
        const rows = computeGuessStats(
            ['e2e4', 'c7c5'],
            { 1: '2026-11-24T14:00:10.000Z', 2: '2026-11-24T14:01:00.000Z' },
            [
                {
                    username: 'early',
                    displayName: 'Early',
                    guesses: { 1: 'e2e4', 2: 'c7c5' },
                    times: { 1: '2026-11-24T13:50:00.000Z', 2: '2026-11-24T14:00:20.000Z' },
                },
                {
                    username: 'late',
                    displayName: 'Late',
                    guesses: { 1: 'e2e4', 2: 'c7c5' },
                    times: { 1: '2026-11-24T14:00:08.000Z', 2: '2026-11-24T14:00:59.500Z' },
                },
            ],
            [
                { username: 'late', ply: 2, uci: 'd7d6', at: '2026-11-24T14:00:30.000Z' },
                { username: 'late', ply: 2, uci: 'c7c5', at: '2026-11-24T14:00:59.500Z' },
            ],
        );
        expect(rows.map((r) => [r.username, r.correct, r.closeCalls, r.changes])).toEqual([
            ['late', 2, 2, 2],
            ['early', 2, 0, 0],
        ]);
        expect(rows[0].details.map((d) => d.leadSeconds)).toEqual([2, 0.5]);
    });
});
