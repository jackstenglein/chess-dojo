import { describe, expect, it } from 'vitest';
import { formatMonth, formatPercent, lastMonths, percent } from './statsFormat';

const month = (m: string, signups: number) => ({
    month: m,
    signups,
    free: signups,
    paying: 0,
    churned: 0,
    complimentary: 0,
    onboarded: 0,
    active30: 0,
});

describe('lastMonths', () => {
    const now = new Date('2026-11-26T12:00:00Z');

    it('fills months without signups, ending with the current month', () => {
        const result = lastMonths([month('2026-09', 4), month('2026-11', 2)], 4, now);
        expect(result.map((m) => [m.month, m.signups])).toEqual([
            ['2026-08', 0],
            ['2026-09', 4],
            ['2026-10', 0],
            ['2026-11', 2],
        ]);
    });

    it('crosses year boundaries', () => {
        const result = lastMonths([], 3, new Date('2026-01-15T00:00:00Z'));
        expect(result.map((m) => m.month)).toEqual(['2025-11', '2025-12', '2026-01']);
    });

    it('starts at the first signup for all months', () => {
        const result = lastMonths([month('2026-08', 1)], 0, now);
        expect(result.map((m) => m.month)).toEqual(['2026-08', '2026-09', '2026-10', '2026-11']);
    });
});

describe('formatting', () => {
    it('formats percentages and months', () => {
        expect(formatPercent(percent(1, 3))).toBe('33.3%');
        expect(formatPercent(percent(1, 0))).toBe('–');
        expect(formatMonth('2026-11')).toBe('Nov 2026');
    });
});
