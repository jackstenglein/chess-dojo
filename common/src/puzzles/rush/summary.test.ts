import { describe, expect, it } from 'vitest';
import {
    applyPuzzleRushSummary,
    isValidTimeZone,
    puzzleRushPeriods,
    puzzleRushStanding,
    PuzzleRushSummaryRecord,
    summarizePuzzleRushRuns,
    visiblePuzzleRushBests,
} from './summary';

const user = 'alice';

function update(score: number, createdAt: string, day = '2026-10-26', week = '2026-W44') {
    return { username: user, score, createdAt, day, week };
}

describe('puzzleRushPeriods', () => {
    it('uses the calendar day and ISO week in the given timezone', () => {
        const instant = new Date('2026-10-27T02:30:00.000Z');

        expect(puzzleRushPeriods(instant, 'UTC')).toEqual({
            day: '2026-10-27',
            week: '2026-W44',
        });
        // Etc/GMT+5 is five hours behind UTC.
        expect(puzzleRushPeriods(instant, 'Etc/GMT+5')).toEqual({
            day: '2026-10-26',
            week: '2026-W44',
        });
    });

    it('puts a Thursday on the ISO week of its own year', () => {
        expect(puzzleRushPeriods(new Date('2020-12-31T12:00:00.000Z'), 'UTC')).toEqual({
            day: '2020-12-31',
            week: '2020-W53',
        });
        expect(puzzleRushPeriods(new Date('2024-12-31T12:00:00.000Z'), 'UTC')).toEqual({
            day: '2024-12-31',
            week: '2025-W01',
        });
    });

    it('accepts IANA timezones and rejects names Intl does not know', () => {
        expect(isValidTimeZone('UTC')).toBe(true);
        expect(isValidTimeZone('Etc/GMT+5')).toBe(true);
        expect(isValidTimeZone('DEFAULT')).toBe(false);
        expect(isValidTimeZone('Not/AZone')).toBe(false);
    });
});

describe('applyPuzzleRushSummary', () => {
    it('records the first run as the best and rank 1 in every window', () => {
        const { summary, standing } = applyPuzzleRushSummary(
            undefined,
            update(8, '2026-10-26T15:00:00.000Z'),
        );

        expect(summary.version).toBe(1);
        expect(summary.allTime).toEqual({
            score: 8,
            sessionCreatedAt: '2026-10-26T15:00:00.000Z',
        });
        expect(summary.allTimeCounts).toEqual({ '8': 1 });
        expect(summary.dayCounts).toEqual({ period: '2026-10-26', counts: { '8': 1 } });
        expect(standing.index).toEqual({ allTime: 1, week: 1, day: 1 });
        expect(standing.newBest).toEqual({ allTime: true, week: true, day: true });
    });

    it('shares an index across tied scores and keeps the earlier best', () => {
        const first = applyPuzzleRushSummary(undefined, update(5, '2026-10-26T15:00:00.000Z'));
        const second = applyPuzzleRushSummary(first.summary, update(5, '2026-10-26T16:00:00.000Z'));

        expect(second.summary.allTime?.sessionCreatedAt).toBe('2026-10-26T15:00:00.000Z');
        expect(second.summary.allTimeCounts).toEqual({ '5': 2 });
        expect(second.standing.index).toEqual({ allTime: 1, week: 1, day: 1 });
        expect(second.standing.newBest).toEqual({ allTime: false, week: false, day: false });
    });

    it('ranks a lower score behind every higher run and leaves the best in place', () => {
        const first = applyPuzzleRushSummary(undefined, update(5, '2026-10-26T15:00:00.000Z'));
        const tied = applyPuzzleRushSummary(first.summary, update(5, '2026-10-26T16:00:00.000Z'));
        const lower = applyPuzzleRushSummary(tied.summary, update(3, '2026-10-26T17:00:00.000Z'));

        expect(lower.standing.index).toEqual({ allTime: 3, week: 3, day: 3 });
        expect(lower.standing.bests.allTime.score).toBe(5);
        expect(lower.standing.newBest.allTime).toBe(false);
        expect(lower.summary.allTimeCounts).toEqual({ '5': 2, '3': 1 });
    });

    it('replaces a window when its period changes, including with a lower score', () => {
        const monday = applyPuzzleRushSummary(undefined, update(9, '2026-10-26T15:00:00.000Z'));
        const tuesday = applyPuzzleRushSummary(
            monday.summary,
            update(4, '2026-10-27T15:00:00.000Z', '2026-10-27', '2026-W44'),
        );

        expect(tuesday.summary.day?.score).toBe(4);
        expect(tuesday.summary.dayCounts).toEqual({ period: '2026-10-27', counts: { '4': 1 } });
        expect(tuesday.summary.week?.score).toBe(9);
        expect(tuesday.summary.allTime?.score).toBe(9);
        expect(tuesday.standing.index).toEqual({ allTime: 2, week: 2, day: 1 });
        expect(tuesday.standing.newBest).toEqual({ allTime: false, week: false, day: true });
    });

    it('starts a new week histogram while keeping the all-time best', () => {
        const thisWeek = applyPuzzleRushSummary(undefined, update(9, '2026-10-26T15:00:00.000Z'));
        const nextWeek = applyPuzzleRushSummary(
            thisWeek.summary,
            update(2, '2026-11-02T15:00:00.000Z', '2026-11-02', '2026-W45'),
        );

        expect(nextWeek.summary.weekCounts).toEqual({ period: '2026-W45', counts: { '2': 1 } });
        expect(nextWeek.summary.allTime?.score).toBe(9);
        expect(nextWeek.standing.index.allTime).toBe(2);
        expect(nextWeek.standing.index.week).toBe(1);
        expect(
            visiblePuzzleRushBests(nextWeek.summary, { day: '2026-11-02', week: '2026-W45' }),
        ).toEqual({
            allTime: { score: 9, sessionCreatedAt: '2026-10-26T15:00:00.000Z' },
            week: { score: 2, sessionCreatedAt: '2026-11-02T15:00:00.000Z' },
            day: { score: 2, sessionCreatedAt: '2026-11-02T15:00:00.000Z' },
        });
    });
});

describe('visiblePuzzleRushBests', () => {
    it('hides week and day bests from a previous period', () => {
        const { summary } = applyPuzzleRushSummary(
            undefined,
            update(6, '2026-10-26T15:00:00.000Z'),
        );

        expect(visiblePuzzleRushBests(summary, { day: '2026-10-27', week: '2026-W45' })).toEqual({
            allTime: { score: 6, sessionCreatedAt: '2026-10-26T15:00:00.000Z' },
            week: undefined,
            day: undefined,
        });
        expect(visiblePuzzleRushBests(undefined, { day: '2026-10-26', week: '2026-W44' })).toEqual({
            allTime: undefined,
            week: undefined,
            day: undefined,
        });
    });
});

describe('summarizePuzzleRushRuns', () => {
    it('keeps the earlier best when replaying saved runs in order', () => {
        const summary = summarizePuzzleRushRuns(
            user,
            [
                { score: 4, createdAt: '2026-10-26T15:00:00.000Z' },
                { score: 9, createdAt: '2026-10-26T16:00:00.000Z' },
                { score: 9, createdAt: '2026-11-02T15:00:00.000Z' },
            ],
            'UTC',
        );

        expect(summary?.allTime).toEqual({
            score: 9,
            sessionCreatedAt: '2026-10-26T16:00:00.000Z',
        });
        expect(summary?.week).toMatchObject({ score: 9, period: '2026-W45' });
        expect(summary?.allTimeCounts).toEqual({ '4': 1, '9': 2 });
    });
});

describe('puzzleRushStanding', () => {
    it('reads the index from counts that already include the run', () => {
        const { summary } = applyPuzzleRushSummary(
            undefined,
            update(8, '2026-10-26T15:00:00.000Z'),
        );
        const later = applyPuzzleRushSummary(summary, update(4, '2026-10-26T18:00:00.000Z'));

        expect(
            puzzleRushStanding(later.summary, update(8, '2026-10-26T15:00:00.000Z')),
        ).toMatchObject({
            index: { allTime: 1, week: 1, day: 1 },
            newBest: { allTime: true, week: true, day: true },
        });
        expect(
            puzzleRushStanding(later.summary, update(4, '2026-10-26T18:00:00.000Z')).index.allTime,
        ).toBe(2);
    });

    it('describes a player with no stored summary as rank 1', () => {
        const standing = puzzleRushStanding(
            undefined as PuzzleRushSummaryRecord | undefined,
            update(1, '2026-10-26T15:00:00.000Z'),
        );
        expect(standing.index).toEqual({ allTime: 1, week: 1, day: 1 });
    });
});
