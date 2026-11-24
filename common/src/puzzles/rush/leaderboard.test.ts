import { describe, expect, it } from 'vitest';
import {
    puzzleRushCohort,
    puzzleRushLeaderboardRows,
    puzzleRushLeaderboardWrites,
    rankPuzzleRushLeaderboard,
} from './leaderboard';
import { applyPuzzleRushSummary, PuzzleRushSummaryRecord } from './summary';

const alice = 'alice';

function summaryWith(scores: { score: number; createdAt: string }[]): PuzzleRushSummaryRecord {
    let summary: PuzzleRushSummaryRecord | undefined;
    for (const run of scores) {
        summary = applyPuzzleRushSummary(summary, {
            username: alice,
            score: run.score,
            createdAt: run.createdAt,
            day: '2026-10-26',
            week: '2026-W44',
        }).summary;
    }
    if (!summary) {
        throw new Error('expected a summary');
    }
    return summary;
}

describe('rankPuzzleRushLeaderboard', () => {
    it('ranks a higher score first and gives tied scores the same rank', () => {
        const ranked = rankPuzzleRushLeaderboard([
            {
                username: 'cara',
                displayName: 'Cara',
                cohort: '1500-1600',
                score: 4,
                runs: 3,
                sessionCreatedAt: '2026-10-02T00:00:00.000Z',
            },
            {
                username: 'alice',
                displayName: 'Alice',
                cohort: '1400-1500',
                score: 9,
                runs: 2,
                sessionCreatedAt: '2026-10-03T00:00:00.000Z',
            },
            {
                username: 'bob',
                displayName: 'Bob',
                cohort: '1400-1500',
                score: 9,
                runs: 5,
                sessionCreatedAt: '2026-10-01T00:00:00.000Z',
            },
        ]);

        expect(ranked.map((row) => [row.username, row.rank, row.runs])).toEqual([
            ['bob', 1, 5],
            ['alice', 1, 2],
            ['cara', 3, 3],
        ]);
    });
});

describe('puzzleRushLeaderboardRows', () => {
    it('keeps all-time and current-month scores, and drops a cohort that is not in the Dojo', () => {
        const summary = summaryWith([
            { score: 9, createdAt: '2026-10-26T15:00:00.000Z' },
            { score: 4, createdAt: '2026-11-02T15:00:00.000Z' },
        ]);

        const november = puzzleRushLeaderboardRows(
            summary,
            { displayName: '  ', cohort: 'NO_COHORT' },
            '2026-11',
        );
        expect(november.allTime).toEqual({
            username: alice,
            displayName: alice,
            score: 9,
            runs: 2,
            sessionCreatedAt: '2026-10-26T15:00:00.000Z',
        });
        expect(november.monthly).toEqual({
            username: alice,
            displayName: alice,
            score: 4,
            runs: 1,
            sessionCreatedAt: '2026-11-02T15:00:00.000Z',
        });
        expect(november.allTime).not.toHaveProperty('cohort');

        const december = puzzleRushLeaderboardRows(
            summary,
            { displayName: 'Alice', cohort: '1400-1500' },
            '2026-12',
        );
        expect(december.monthly).toBeUndefined();
        expect(december.allTime?.cohort).toBe('1400-1500');
        expect(puzzleRushCohort('NO_COHORT')).toBeUndefined();
        expect(puzzleRushCohort('1400-1500')).toBe('1400-1500');
    });

    it('writes the all-time board and the month the summary is in', () => {
        const summary = summaryWith([{ score: 6, createdAt: '2026-10-26T15:00:00.000Z' }]);
        const writes = puzzleRushLeaderboardWrites(summary, {
            displayName: 'Alice',
            cohort: '1400-1500',
        });

        expect(writes.map((write) => write.period)).toEqual(['allTime', '2026-10']);
        expect(writes[0]?.row.runs).toBe(1);
        expect(writes[1]?.row.score).toBe(6);
    });
});
