import { describe, expect, it } from 'vitest';
import { evalToWhiteShare, formatEval, latestEvals, scoreGuesses, WcEval } from './api';

describe('evalToWhiteShare', () => {
    it('moves one board row per point up to 3', () => {
        expect(evalToWhiteShare(0)).toBe(0.5);
        expect(evalToWhiteShare(1)).toBeCloseTo(5 / 8);
        expect(evalToWhiteShare(2)).toBeCloseTo(6 / 8);
        expect(evalToWhiteShare(3)).toBeCloseTo(7 / 8);
        expect(evalToWhiteShare(-3)).toBeCloseTo(1 / 8);
    });

    it('keeps rising past 3 without filling the bar', () => {
        const at5 = evalToWhiteShare(5);
        const at10 = evalToWhiteShare(10);
        expect(at5).toBeGreaterThan(7 / 8);
        expect(at10).toBeGreaterThan(at5);
        expect(at10).toBeLessThan(1);
        expect(evalToWhiteShare(-10)).toBeGreaterThan(0);
        expect(evalToWhiteShare(50)).toBe(at10);
    });
});

describe('formatEval', () => {
    it('signs and rounds', () => {
        expect(formatEval(1.53)).toBe('+1.5');
        expect(formatEval(-3)).toBe('-3');
        expect(formatEval(0.01)).toBe('0');
    });
});

describe('latestEvals', () => {
    const e = (username: string, ply: number, value: number, updatedAt = 't1'): WcEval => ({
        username,
        displayName: username,
        ply,
        value,
        updatedAt,
    });

    it('carries the newest eval at or before the ply', () => {
        const evals = [e('a', 0, 0), e('a', 4, 1), e('b', 2, -1), e('a', 9, 3)];
        const result = latestEvals(evals, 6);
        expect(result.find((x) => x.username === 'a')?.value).toBe(1);
        expect(result.find((x) => x.username === 'b')?.value).toBe(-1);
    });

    it('prefers the later update on the same ply', () => {
        const result = latestEvals([e('a', 2, 1, 't2'), e('a', 2, 2, 't1')], 2);
        expect(result[0].value).toBe(1);
    });
});

describe('scoreGuesses', () => {
    it('counts right guesses only for moves already played', () => {
        const played = ['e2e4', 'c7c5', 'g1f3'];
        const result = scoreGuesses(played, [
            {
                username: 'a',
                displayName: 'A',
                guesses: { 1: 'e2e4', 2: 'e7e5', 3: 'g1f3', 4: 'd7d6' },
            },
            { username: 'b', displayName: 'B', guesses: { 1: 'e2e4', 2: 'c7c5', 3: 'g1f3' } },
            { username: 'c', displayName: 'C', guesses: { 4: 'd7d6' } },
        ]);
        expect(result).toEqual([
            { username: 'b', displayName: 'B', correct: 3, guessed: 3 },
            { username: 'a', displayName: 'A', correct: 2, guessed: 3 },
        ]);
    });
});
