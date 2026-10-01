import { describe, expect, it } from 'vitest';
import { PuzzleRushAttempt } from './api';
import {
    PUZZLE_RUSH_START_RATING,
    applyRushResult,
    computePuzzleRushStats,
    currentRushRating,
    failedRushRating,
    initialRushLadder,
    nextRushRating,
} from './rating';

function attempt(result: 'win' | 'loss', puzzleRating: number): PuzzleRushAttempt {
    return {
        puzzleId: `p${puzzleRating}`,
        fen: '',
        moves: ['e2e4'],
        puzzleRating,
        searchRating: puzzleRating,
        result,
        timeSpentSeconds: 5,
    };
}

describe('nextRushRating', () => {
    it('adds 50 plus 10 per streak', () => {
        expect(nextRushRating(300, 1)).toBe(360);
        expect(nextRushRating(360, 2)).toBe(430);
        expect(nextRushRating(430, 3)).toBe(510);
    });
});

describe('applyRushResult', () => {
    it('starts at 300 with no streak', () => {
        const ladder = initialRushLadder();
        expect(currentRushRating(ladder)).toBe(PUZZLE_RUSH_START_RATING);
        expect(ladder.streak).toBe(0);
    });

    it('pushes ratings on wins', () => {
        let ladder = initialRushLadder();
        ladder = applyRushResult(ladder, 'win');
        expect(currentRushRating(ladder)).toBe(360);
        ladder = applyRushResult(ladder, 'win');
        expect(currentRushRating(ladder)).toBe(430);
        expect(ladder.streak).toBe(2);
    });

    it('pops back to the previous rating on a loss and resets the streak', () => {
        let ladder = initialRushLadder();
        ladder = applyRushResult(ladder, 'win');
        ladder = applyRushResult(ladder, 'win');
        expect(failedRushRating(ladder)).toBe(360);
        ladder = applyRushResult(ladder, 'loss');
        expect(currentRushRating(ladder)).toBe(360);
        expect(ladder.streak).toBe(0);
        ladder = applyRushResult(ladder, 'loss');
        expect(currentRushRating(ladder)).toBe(300);
    });

    it('never drops below the start rating', () => {
        let ladder = initialRushLadder();
        expect(failedRushRating(ladder)).toBe(300);
        ladder = applyRushResult(ladder, 'loss');
        expect(currentRushRating(ladder)).toBe(300);
        ladder = applyRushResult(ladder, 'loss');
        expect(currentRushRating(ladder)).toBe(300);
    });

    it('restarts the streak bonus after a loss', () => {
        let ladder = initialRushLadder();
        ladder = applyRushResult(ladder, 'win');
        ladder = applyRushResult(ladder, 'win');
        ladder = applyRushResult(ladder, 'loss');
        ladder = applyRushResult(ladder, 'win');
        expect(currentRushRating(ladder)).toBe(420);
    });
});

describe('computePuzzleRushStats', () => {
    it('handles an empty run', () => {
        const stats = computePuzzleRushStats([]);
        expect(stats).toEqual({
            correctCount: 0,
            totalCount: 0,
            percentage: 0,
            peakRating: 300,
        });
    });

    it('computes percentage and FIDE performance rating', () => {
        const stats = computePuzzleRushStats([
            attempt('win', 300),
            attempt('win', 360),
            attempt('win', 430),
            attempt('loss', 510),
        ]);
        expect(stats.correctCount).toBe(3);
        expect(stats.totalCount).toBe(4);
        expect(stats.percentage).toBe(75);
        // avg = 400, dp(75) = 193
        expect(stats.performanceRating).toBe(593);
        expect(stats.peakRating).toBe(510);
    });

    it('does not include the rating reached after the final win in the peak', () => {
        const stats = computePuzzleRushStats([attempt('win', 300), attempt('win', 360)]);
        expect(stats.peakRating).toBe(360);
        expect(stats.percentage).toBe(100);
        expect(stats.performanceRating).toBe(330 + 400);
    });

    it('clamps performance rating to 0 for a run with no correct answers', () => {
        const stats = computePuzzleRushStats([
            attempt('loss', 300),
            attempt('loss', 300),
            attempt('loss', 300),
        ]);
        expect(stats.performanceRating).toBe(0);
        expect(stats.peakRating).toBe(300);
    });
});
