import { describe, expect, it } from 'vitest';
import {
    barState,
    buildRoster,
    evalToWhiteShare,
    formatEval,
    latestEvals,
    layoutPins,
    scoreGuesses,
    WcEval,
    WcSensei,
} from './api';

describe('evalToWhiteShare', () => {
    it('follows the curve of the spec', () => {
        expect(evalToWhiteShare(0)).toBe(0.5);
        expect(evalToWhiteShare(0.4)).toBeCloseTo(0.56, 2);
        expect(evalToWhiteShare(-0.8)).toBeCloseTo(0.38, 2);
        expect(evalToWhiteShare(1.5)).toBeCloseTo(0.71, 2);
        expect(evalToWhiteShare(5)).toBeCloseTo(0.95, 2);
        expect(evalToWhiteShare(10)).toBeCloseTo(0.998, 2);
        expect(evalToWhiteShare(50)).toBe(evalToWhiteShare(10));
    });
});

describe('formatEval', () => {
    it('signs and shows one decimal', () => {
        expect(formatEval(1.53)).toBe('+1.5');
        expect(formatEval(-3)).toBe('-3.0');
        expect(formatEval(0.01)).toBe('0.0');
    });
});

const e = (senseiId: string, ply: number, value: number, updatedAt = 't1'): WcEval => ({
    senseiId,
    ply,
    value,
    updatedAt,
    updatedBy: senseiId,
});

describe('latestEvals', () => {
    it('carries the newest eval at or before the ply', () => {
        const evals = [e('a', 0, 0), e('a', 4, 1), e('b', 2, -1), e('a', 9, 3)];
        const result = latestEvals(evals, 6);
        expect(result.find((x) => x.senseiId === 'a')?.value).toBe(1);
        expect(result.find((x) => x.senseiId === 'b')?.value).toBe(-1);
    });

    it('prefers the later update on the same ply', () => {
        const result = latestEvals([e('a', 2, 1, 't2'), e('a', 2, 2, 't1')], 2);
        expect(result[0].value).toBe(1);
    });
});

describe('buildRoster', () => {
    it('starts with Jesse, David and Kostya in red, green and blue', () => {
        const roster = buildRoster([]);
        expect(roster.map((s) => [s.name, s.color, s.active])).toEqual([
            ['Jesse', '#e53935', true],
            ['David', '#43a047', true],
            ['Kostya', '#1e88e5', true],
        ]);
    });

    it('applies saved changes and appends guests in the order added', () => {
        const guest = (id: string, name: string, addedAt: string) => ({
            id,
            name,
            color: '#fb8c00',
            active: true,
            guest: true,
            addedAt,
        });
        const roster = buildRoster([
            guest('guest-2', 'Second', 't2'),
            { id: 'dpruess', name: 'x', color: '#8e24aa', active: false, guest: false },
            guest('guest-1', 'First', 't1'),
        ]);
        expect(roster.find((s) => s.id === 'dpruess')).toMatchObject({
            name: 'David',
            color: '#8e24aa',
            active: false,
        });
        expect(roster.slice(3).map((s) => s.name)).toEqual(['First', 'Second']);
    });
});

describe('barState', () => {
    const roster: WcSensei[] = buildRoster([
        { id: 'dpruess', name: 'David', color: '#43a047', active: false, guest: false },
    ]);

    it('averages the active senseis only', () => {
        const state = barState(
            roster,
            [e('jessekraai', 0, 1), e('dpruess', 0, 5), e('hellokostya', 0, 2)],
            3,
        );
        expect(state.pins.map((p) => p.sensei.id)).toEqual(['jessekraai', 'hellokostya']);
        expect(state.average).toBe(1.5);
    });

    it('is 0 with nobody active', () => {
        expect(barState(roster, [], 3)).toEqual({ pins: [], average: 0 });
    });
});

describe('layoutPins', () => {
    it('fans out pins within 3% of each other', () => {
        const result = layoutPins([
            { id: 'a', share: 0.5 },
            { id: 'b', share: 0.52 },
            { id: 'c', share: 0.7 },
        ]);
        const byId = Object.fromEntries(result.map((p) => [p.id, p]));
        expect(byId.a).toMatchObject({ column: 0, columns: 2 });
        expect(byId.b).toMatchObject({ column: 1, columns: 2 });
        expect(byId.c).toMatchObject({ column: 0, columns: 1 });
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
