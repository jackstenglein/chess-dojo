import {
    PuzzleAttempt,
    PuzzleSession,
    emptyCounters,
    groupIntoSessions,
    statsFromAttempts,
    toPuzzleAttempt,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/runs';
import { describe, expect, it } from 'vitest';
import {
    dayKey,
    formatDay,
    formatDuration,
    formatPercent,
    formatTime,
    groupByDay,
    tagRows,
    withAllBuckets,
} from './statsView';

const attempt = (puzzleId: string, finishedAt: string, ok = true): PuzzleAttempt =>
    toPuzzleAttempt(
        {
            puzzleId,
            startedAt: new Date(Date.parse(finishedAt) - 60_000).toISOString(),
            finishedAt,
            abandoned: false,
            moves: [
                ok
                    ? {
                          line: 0,
                          ply: 0,
                          expected: 'Nf7+',
                          tries: [{ move: 'Nf7+', correct: true, ms: 2000 }],
                          ms: 2000,
                      }
                    : {
                          line: 0,
                          ply: 0,
                          expected: 'Nf7+',
                          tries: [
                              { move: 'Qh5', correct: false, ms: 1000 },
                              { move: 'Nf7+', correct: true, ms: 3000 },
                          ],
                          ms: 3000,
                      },
            ],
        },
        { fen: 'F', rating: 800, buckets: ['Tactics'], themes: ['Fork'] },
    );

describe('dayKey', () => {
    it('is the calendar day where the viewer is, not in UTC', () => {
        const late = '2026-09-29T23:30:00.000Z';
        expect(dayKey(late, 'UTC')).toBe('2026-09-29');
        expect(dayKey(late, 'Asia/Tokyo')).toBe('2026-09-30');
        expect(dayKey(late, 'America/Los_Angeles')).toBe('2026-09-29');
    });
});

describe('groupByDay', () => {
    const attempts = [
        attempt('a', '2026-09-29T09:00:00.000Z'),
        attempt('b', '2026-09-29T09:10:00.000Z', false),
        attempt('c', '2026-09-29T20:00:00.000Z'),
        attempt('d', '2026-09-27T12:00:00.000Z'),
    ];
    const sessions = groupIntoSessions(attempts);

    it('puts each session under the day it started, newest day first', () => {
        const days = groupByDay(sessions, attempts, 'UTC');
        expect(days.map((d) => d.key)).toEqual(['2026-09-29', '2026-09-27']);
        expect(days[0].sessions).toHaveLength(2);
    });

    it('puts each attempt in the session it happened in, oldest first', () => {
        const [today] = groupByDay(sessions, attempts, 'UTC');
        const [evening, morning] = today.sessions;
        expect(morning.attempts.map((a) => a.puzzleId)).toEqual(['a', 'b']);
        expect(evening.attempts.map((a) => a.puzzleId)).toEqual(['c']);
    });

    it('adds up a day', () => {
        const [today] = groupByDay(sessions, attempts, 'UTC');
        expect(today.totals).toMatchObject({ attempts: 3, clean: 2, solved: 1, mistakes: 1 });
    });

    it('splits a session that crosses midnight by when it started, not when it ended', () => {
        const overnight = [
            attempt('a', '2026-09-29T23:50:00.000Z'),
            attempt('b', '2026-09-30T00:10:00.000Z'),
        ];
        const days = groupByDay(groupIntoSessions(overnight), overnight, 'UTC');
        expect(days).toHaveLength(1);
        expect(days[0].key).toBe('2026-09-29');
        expect(days[0].sessions[0].attempts).toHaveLength(2);
    });

    it('shows nothing for no sessions, and leaves out an attempt that fits no session', () => {
        expect(groupByDay([], [], 'UTC')).toEqual([]);
        const lone = [attempt('z', '2026-09-01T00:00:00.000Z')];
        const days = groupByDay(sessions, lone, 'UTC');
        expect(days.flatMap((d) => d.sessions.flatMap((s) => s.attempts))).toEqual([]);
    });
});

describe('formatting', () => {
    it('formats durations', () => {
        expect(formatDuration(0)).toBe('0s');
        expect(formatDuration(45_000)).toBe('45s');
        expect(formatDuration(83_000)).toBe('1m 23s');
        expect(formatDuration(65 * 60_000)).toBe('1h 05m');
        expect(formatDuration(undefined)).toBe('–');
    });

    it('formats percents, with a dash for nothing', () => {
        expect(formatPercent(0.833)).toBe('83%');
        expect(formatPercent(1)).toBe('100%');
        expect(formatPercent(0)).toBe('0%');
        expect(formatPercent(undefined)).toBe('–');
    });

    it('formats times and days for the viewer', () => {
        expect(formatTime('2026-09-29T09:05:00.000Z', 'UTC')).toBe('9:05 AM');
        expect(formatTime('2026-09-29T21:05:00.000Z', 'America/New_York')).toBe('5:05 PM');
        expect(formatDay('2026-09-29')).toBe('Tue, Sep 29');
    });
});

describe('tagRows', () => {
    const c = (attempts: number, movesFirstTry: number, moves: number) => ({
        ...emptyCounters(),
        attempts,
        clean: attempts,
        moves,
        movesFirstTry,
        totalMs: attempts * 10_000,
    });
    const byTag = {
        Fork: c(10, 9, 10),
        Pin: c(6, 3, 6),
        Skewer: c(1, 0, 1),
        'Passed pawn': c(4, 4, 4),
    };

    it('orders by how much each was played', () => {
        expect(tagRows(byTag, 'played').map((r) => r.name)).toEqual([
            'Fork',
            'Pin',
            'Passed pawn',
            'Skewer',
        ]);
    });

    it('orders weakest first, but only judges tags played enough', () => {
        // Skewer is 0% but from a single puzzle, so it is not called a weakness. It goes last.
        expect(tagRows(byTag, 'weakest').map((r) => r.name)).toEqual([
            'Pin',
            'Fork',
            'Passed pawn',
            'Skewer',
        ]);
    });

    it('orders by name', () => {
        expect(tagRows(byTag, 'name').map((r) => r.name)).toEqual([
            'Fork',
            'Passed pawn',
            'Pin',
            'Skewer',
        ]);
    });

    it('works out the numbers of each row', () => {
        const pin = tagRows(byTag, 'played').find((r) => r.name === 'Pin');
        expect(pin).toMatchObject({ firstTryRate: 0.5, averageMs: 10_000 });
    });

    it('agrees with the stats worked out from attempts', () => {
        const attempts = [
            attempt('a', '2026-09-29T09:00:00.000Z'),
            attempt('b', '2026-09-29T09:10:00.000Z', false),
        ];
        const rows = tagRows(statsFromAttempts(attempts).themes, 'played');
        expect(rows[0]).toMatchObject({ name: 'Fork', firstTryRate: 0.5 });
    });
});

it('has the types it says', () => {
    const session: PuzzleSession = { ...emptyCounters(), startedAt: 'a', lastActiveAt: 'b' };
    expect(session.startedAt).toBe('a');
});

describe('withAllBuckets', () => {
    it('adds every bucket nobody has played yet, with zeros', () => {
        const played = { ...emptyCounters(), attempts: 3 };
        const all = withAllBuckets({ Tactics: played });
        expect(Object.keys(all).sort()).toEqual([
            'Endgame',
            'Middlegame',
            'Opening',
            'Strategy',
            'Tactics',
        ]);
        expect(all.Tactics.attempts).toBe(3);
        expect(all.Strategy.attempts).toBe(0);
    });
});
