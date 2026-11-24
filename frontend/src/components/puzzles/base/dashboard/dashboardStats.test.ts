import { DashboardAttempt } from '@jackstenglein/chess-dojo-common/src/puzzlebase/runs';
import { describe, expect, it } from 'vitest';
import {
    afterFirstMoveMs,
    attemptsCsv,
    overview,
    puzzleRows,
    rangeFor,
    ratingSystemsIn,
} from './dashboardStats';

const attempt = (over: Partial<DashboardAttempt> & { result?: string } = {}): DashboardAttempt => {
    const { result = 'clean', ...rest } = over;
    return {
        username: 'ann',
        puzzleId: '001',
        startedAt: '2026-11-20T10:00:00.000Z',
        finishedAt: '2026-11-20T10:01:00.000Z',
        moves: [
            {
                line: 0,
                ply: 0,
                expected: 'Rd8#',
                tries: [{ move: 'Rd8#', correct: true, ms: 20_000 }],
                ms: 20_000,
            },
        ],
        summary: {
            result: result as never,
            moves: 2,
            movesFirstTry: result === 'clean' ? 2 : 1,
            mistakes: result === 'clean' ? 0 : 1,
            revealed: 0,
            totalMs: 60_000,
        },
        fen: '8/8/8/8/8/8/8/8 w - - 0 1',
        puzzleRating: 1200,
        buckets: ['Tactics'],
        themes: ['Fork'],
        scoring: {
            accuracy: 1,
            speed: 0.8,
            score: 0.8,
            thinkingMs: 60_000,
            counted: true,
            puzzleRating: 1200,
            ratingBefore: 1000,
            ratingAfter: 1010,
            delta: 10,
        },
        solver: {
            displayName: 'Ann',
            cohort: '1000-1100',
            ratingSystem: 'LICHESS',
            normalizedRating: 1050,
            ratings: { LICHESS: 1400, CHESSCOM: 1100 },
        },
        ...rest,
    };
};

const RANGE = { from: '2026-11-18T12:00:00.000Z', to: '2026-11-20T12:00:00.000Z' };

describe('afterFirstMoveMs', () => {
    it('is the time after the first move was settled', () => {
        expect(afterFirstMoveMs(attempt())).toBe(40_000);
    });

    it('is undefined when no move was played', () => {
        expect(afterFirstMoveMs(attempt({ moves: [] }))).toBeUndefined();
    });
});

describe('overview', () => {
    it('counts attempts, people and puzzles, and fills every day of the range', () => {
        const result = overview(
            [
                attempt(),
                attempt({ username: 'bob', puzzleId: '002', result: 'solved' }),
                attempt({ finishedAt: '2026-11-18T15:00:00.000Z', result: 'abandoned' }),
            ],
            RANGE,
            'UTC',
        );
        expect(result).toMatchObject({
            attempts: 3,
            solvers: 2,
            puzzles: 2,
            clean: 1,
            solved: 1,
            abandoned: 1,
            cleanRate: 0.5,
            averageMs: 60_000,
            averageAfterFirstMs: 40_000,
        });
        expect(result.days).toEqual([
            { day: '2026-11-18', attempts: 1, solvers: 1 },
            { day: '2026-11-19', attempts: 0, solvers: 0 },
            { day: '2026-11-20', attempts: 2, solvers: 2 },
        ]);
    });

    it('has no rates when there is nothing', () => {
        const result = overview([], RANGE, 'UTC');
        expect(result.cleanRate).toBeUndefined();
        expect(result.averageMs).toBeUndefined();
        expect(result.days).toHaveLength(3);
    });
});

describe('puzzleRows', () => {
    it('sums up each puzzle, most played first', () => {
        const rows = puzzleRows([
            attempt({ puzzleId: '002' }),
            attempt(),
            attempt({
                username: 'bob',
                result: 'solved',
                solver: { normalizedRating: 1250, ratings: {} },
                scoring: undefined,
            }),
        ]);
        expect(rows.map((r) => r.puzzleId)).toEqual(['001', '002']);
        expect(rows[0]).toMatchObject({
            attempts: 2,
            solvers: 2,
            cleanRate: 0.5,
            averageSolverRating: 1150,
            averageDelta: 10,
            averageScore: 0.8,
        });
    });
});

describe('attemptsCsv', () => {
    it('writes one row per attempt with a column for every rating system seen', () => {
        const csv = attemptsCsv([attempt(), attempt({ solver: undefined, username: 'old' })]);
        const [header, first, second] = csv.split('\n');
        expect(header).toContain('After first move seconds');
        expect(header.endsWith('Chess.com,Lichess')).toBe(true);
        expect(first).toContain('ann,Ann,1000-1100,001,1200,clean,60,20,40');
        expect(first.endsWith('1100,1400')).toBe(true);
        expect(second.startsWith('2026-11-20T10:01:00.000Z,old,,')).toBe(true);
    });

    it('quotes values with commas', () => {
        const csv = attemptsCsv([attempt({ solver: { displayName: 'Doe, Jane', ratings: {} } })]);
        expect(csv).toContain('"Doe, Jane"');
    });
});

describe('ranges', () => {
    it('ends now and starts the right number of days back', () => {
        const now = Date.parse('2026-11-21T00:00:00.000Z');
        expect(rangeFor('7d', now)).toEqual({
            from: '2026-11-14T00:00:00.000Z',
            to: '2026-11-21T00:00:00.000Z',
        });
    });

    it('lists rating systems in a fixed order', () => {
        expect(ratingSystemsIn([attempt()])).toEqual(['CHESSCOM', 'LICHESS']);
    });
});
