import { MateInOneAttempt } from '@jackstenglein/chess-dojo-common/src/mateInOne/api';
import { describe, expect, it } from 'vitest';
import { computeSessionStats } from './mateInOneDrillUtils';

function makeAttempt(overrides: Partial<MateInOneAttempt> = {}): MateInOneAttempt {
    return {
        puzzleId: 'abc01',
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
        correctMove: 'Qh5',
        userMove: 'Qh5',
        isCorrect: true,
        responseTimeMs: 500,
        ...overrides,
    };
}

describe('computeSessionStats', () => {
    it('counts all correct attempts', () => {
        const attempts = [makeAttempt(), makeAttempt(), makeAttempt()];
        const result = computeSessionStats(attempts, Date.now());
        expect(result.correctCount).toBe(3);
    });

    it('counts mixed correct/incorrect attempts', () => {
        const attempts = [
            makeAttempt({ isCorrect: true }),
            makeAttempt({ isCorrect: false }),
            makeAttempt({ isCorrect: true }),
        ];
        const result = computeSessionStats(attempts, Date.now());
        expect(result.correctCount).toBe(2);
    });

    it('computes average response time', () => {
        const attempts = [
            makeAttempt({ responseTimeMs: 200 }),
            makeAttempt({ responseTimeMs: 400 }),
            makeAttempt({ responseTimeMs: 600 }),
        ];
        const result = computeSessionStats(attempts, Date.now());
        expect(result.avgResponseTimeMs).toBe(400);
    });

    it('rounds average response time to nearest integer', () => {
        const attempts = [
            makeAttempt({ responseTimeMs: 100 }),
            makeAttempt({ responseTimeMs: 201 }),
        ];
        const result = computeSessionStats(attempts, Date.now());
        expect(result.avgResponseTimeMs).toBe(151);
    });

    it('returns 0 for avgResponseTimeMs when there are no attempts', () => {
        const result = computeSessionStats([], Date.now());
        expect(result.avgResponseTimeMs).toBe(0);
    });

    it('rounds total time milliseconds to seconds', () => {
        const result = computeSessionStats([makeAttempt()], 30_000);
        expect(result.totalTimeSeconds).toBe(30);
    });
});
