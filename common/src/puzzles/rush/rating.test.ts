import { describe, expect, it } from 'vitest';
import { PuzzleRushAttempt } from './api';
import {
    PUZZLE_RUSH_MAX_RATING,
    PUZZLE_RUSH_START_RATING,
    PuzzleRushLadder,
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
        const ladder = initialRushLadder();
        expect(nextRushRating(ladder)).toBe(350);

        ladder.stack.push(350);
        ladder.streak += 1;
        expect(nextRushRating(ladder)).toBe(410);

        ladder.stack.push(410);
        ladder.streak += 1;
        expect(nextRushRating(ladder)).toBe(480);
    });

    it('caps rating at PUZZLE_RUSH_MAX_RATING', () => {
        const ladder: PuzzleRushLadder = {
            stack: [PUZZLE_RUSH_MAX_RATING - 10],
            streak: 0,
            strikes: 0,
        };
        expect(nextRushRating(ladder)).toBe(PUZZLE_RUSH_MAX_RATING);
    });
});

describe('applyRushResult', () => {
    it('starts at 300 with no streak or strikes', () => {
        const ladder = initialRushLadder();
        expect(currentRushRating(ladder)).toBe(PUZZLE_RUSH_START_RATING);
        expect(ladder.streak).toBe(0);
        expect(ladder.strikes).toBe(0);
    });

    it('pushes ratings on wins', () => {
        let ladder = initialRushLadder();
        ladder = applyRushResult(ladder, 'win');
        expect(currentRushRating(ladder)).toBe(350);
        ladder = applyRushResult(ladder, 'win');
        expect(currentRushRating(ladder)).toBe(410);
        expect(ladder.streak).toBe(2);
        expect(ladder.strikes).toBe(0);
    });

    it('pops back to the previous rating on a loss and resets the streak', () => {
        let ladder = initialRushLadder();
        ladder = applyRushResult(ladder, 'win');
        ladder = applyRushResult(ladder, 'win');
        expect(failedRushRating(ladder)).toBe(350);

        ladder = applyRushResult(ladder, 'loss');
        expect(currentRushRating(ladder)).toBe(350);
        expect(ladder.streak).toBe(0);
        expect(ladder.strikes).toBe(1);

        ladder = applyRushResult(ladder, 'loss');
        expect(currentRushRating(ladder)).toBe(300);
        expect(ladder.strikes).toBe(2);
    });

    it('never drops below the start rating', () => {
        let ladder = initialRushLadder();
        expect(failedRushRating(ladder)).toBe(300);
        ladder = applyRushResult(ladder, 'loss');
        expect(currentRushRating(ladder)).toBe(300);
        ladder = applyRushResult(ladder, 'loss');
        expect(currentRushRating(ladder)).toBe(300);
    });

    it('does not cap the streak bonus after a loss', () => {
        let ladder = initialRushLadder();
        ladder = applyRushResult(ladder, 'win');
        ladder = applyRushResult(ladder, 'win');
        ladder = applyRushResult(ladder, 'loss');
        ladder = applyRushResult(ladder, 'win');
        ladder = applyRushResult(ladder, 'win');
        expect(currentRushRating(ladder)).toBe(460);
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
            peakCompletedRating: 0,
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
        expect(stats.peakCompletedRating).toBe(430);
    });

    it('does not include the rating reached after the final win in the peak', () => {
        const stats = computePuzzleRushStats([attempt('win', 300), attempt('win', 360)]);
        expect(stats.peakRating).toBe(360);
        expect(stats.peakCompletedRating).toBe(360);
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
        expect(stats.peakCompletedRating).toBe(0);
    });
});
