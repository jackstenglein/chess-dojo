import { describe, expect, it } from 'vitest';
import {
    formatChange,
    formatMonth,
    formatPercent,
    formatWeek,
    historyByPeriod,
    percent,
    signupRows,
    snapshotWeekAgo,
    weekOf,
} from './statsFormat';

const counts = (signups: number) => ({
    signups,
    free: signups,
    paying: 0,
    churned: 0,
    complimentary: 0,
    onboarded: 0,
    active30: 0,
});
const month = (m: string, signups: number) => ({ month: m, ...counts(signups) });
const week = (w: string, signups: number) => ({ week: w, ...counts(signups) });

const now = new Date('2026-11-26T12:00:00Z'); // a Thursday

describe('signupRows by month', () => {
    it('fills months without signups, ending with the current month', () => {
        const result = signupRows(
            { months: [month('2026-09', 4), month('2026-11', 2)] },
            'month',
            4,
            now,
        );
        expect(result.map((m) => [m.key, m.signups, m.starterStarted])).toEqual([
            ['2026-08', 0, 0],
            ['2026-09', 4, 0],
            ['2026-10', 0, 0],
            ['2026-11', 2, 0],
        ]);
    });

    it('crosses year boundaries', () => {
        const result = signupRows({ months: [] }, 'month', 3, new Date('2026-01-15T00:00:00Z'));
        expect(result.map((m) => m.key)).toEqual(['2025-11', '2025-12', '2026-01']);
    });

    it('starts at the first signup for all months', () => {
        const result = signupRows({ months: [month('2026-08', 1)] }, 'month', 0, now);
        expect(result.map((m) => m.key)).toEqual(['2026-08', '2026-09', '2026-10', '2026-11']);
    });
});

describe('signupRows by week', () => {
    it('fills weeks without signups, ending with the current week', () => {
        const result = signupRows(
            { months: [], weeks: [week('2026-11-09', 3), week('2026-11-23', 1)] },
            'week',
            3,
            now,
        );
        expect(result.map((w) => [w.key, w.signups])).toEqual([
            ['2026-11-09', 3],
            ['2026-11-16', 0],
            ['2026-11-23', 1],
        ]);
    });

    it('works without weeks from an older backend', () => {
        expect(signupRows({ months: [] }, 'week', 2, now).map((w) => w.key)).toEqual([
            '2026-11-16',
            '2026-11-23',
        ]);
    });
});

describe('weeks', () => {
    it('finds the Monday of a week', () => {
        expect(weekOf(now)).toBe('2026-11-23');
        expect(weekOf(new Date('2026-11-23T00:00:00Z'))).toBe('2026-11-23');
        expect(weekOf(new Date('2026-11-29T23:00:00Z'))).toBe('2026-11-23');
        expect(weekOf(new Date('2026-01-01T00:00:00Z'))).toBe('2025-12-29');
    });

    const snapshot = (date: string, accounts: number) => ({
        date,
        accounts,
        free: 0,
        paying: 0,
        paid: 0,
        active7: 0,
        active30: 0,
    });

    it('keeps the last snapshot of each week', () => {
        const history = [
            snapshot('2026-11-20', 1),
            snapshot('2026-11-22', 2),
            snapshot('2026-11-23', 3),
            snapshot('2026-11-26', 4),
        ];
        expect(historyByPeriod(history, 'week').map((h) => [h.key, h.accounts])).toEqual([
            ['2026-11-16', 2],
            ['2026-11-23', 4],
        ]);
        expect(historyByPeriod(history, 'month').map((h) => [h.key, h.accounts])).toEqual([
            ['2026-11', 4],
        ]);
    });

    it('finds the snapshot from a week ago', () => {
        expect(snapshotWeekAgo([snapshot('2026-11-22', 1)], now)).toBeUndefined();
        expect(
            snapshotWeekAgo(
                [snapshot('2026-11-10', 0), snapshot('2026-11-18', 1), snapshot('2026-11-19', 2)],
                now,
            )?.accounts,
        ).toBe(2);
        expect(snapshotWeekAgo([snapshot('2026-11-10', 0)], now)).toBeUndefined();
    });

    it('formats changes', () => {
        expect(formatChange(110, 100)).toBe('+10 vs last week');
        expect(formatChange(1000, 2500)).toBe('-1,500 vs last week');
        expect(formatChange(5, 5)).toBe('0 vs last week');
        expect(formatChange(5, undefined)).toBeUndefined();
    });
});

describe('formatting', () => {
    it('formats percentages, months and weeks', () => {
        expect(formatPercent(percent(1, 3))).toBe('33.3%');
        expect(formatPercent(percent(1, 0))).toBe('–');
        expect(formatMonth('2026-11')).toBe('Nov 2026');
        expect(formatWeek('2026-11-23')).toBe('Nov 23');
        expect(formatWeek('2026-11-23', true)).toBe('Nov 23, 2026');
    });
});
