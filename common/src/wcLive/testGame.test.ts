import { Chess } from '@jackstenglein/chess';
import { describe, expect, it } from 'vitest';
import {
    currentTestRoundId,
    isTestRoundId,
    TEST_MOVE_SECONDS,
    TEST_PRESTART_SECONDS,
    testRoundState,
} from './testGame';

describe('test game', () => {
    const now = Date.UTC(2026, 10, 23, 15, 0, 0);
    const id = currentTestRoundId(now);

    it('makes 8-character ids that are recognized', () => {
        expect(id).toMatch(/^tst[0-9a-z]{5}$/);
        expect(isTestRoundId(id)).toBe(true);
        expect(isTestRoundId('xLgOJ6cb')).toBe(false);
    });

    it('plays every move legally and ends in mate', () => {
        const state = testRoundState(id, now + 60 * 60 * 1000);
        // An hour later the loop is over, so the state is the whole game.
        expect(state?.result).toBe('1-0');
        const chess = new Chess({ pgn: state?.pgn });
        expect(chess.history()).toHaveLength(33);
        expect(chess.isCheckmate()).toBe(true);
    });

    it('opens with time to guess move 1, then plays one move per interval', () => {
        const first = testRoundState(id, 0 + parseInt(id.slice(3), 36) * 0 + now);
        expect(first).toBeDefined();
        const start = first?.startsAt ?? 0;
        expect(testRoundState(id, start - 1)?.sans).toEqual([]);
        expect(testRoundState(id, start)?.sans).toEqual(['e4']);
        expect(testRoundState(id, start + TEST_MOVE_SECONDS * 1000)?.sans).toEqual(['e4', 'e5']);
        expect(start - TEST_PRESTART_SECONDS * 1000).toBeLessThanOrEqual(now);
    });

    it('has no state for a loop that has not begun', () => {
        expect(testRoundState(currentTestRoundId(now + 24 * 3600 * 1000), now)).toBeUndefined();
    });
});
