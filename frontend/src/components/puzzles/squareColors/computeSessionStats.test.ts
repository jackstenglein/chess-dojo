import { SquareColorQuestion } from '@jackstenglein/chess-dojo-common/src/squareColors/api';
import { describe, expect, it, vi } from 'vitest';
import { computeSessionStats } from './SquareColorDrillPage';

function makeQuestion(overrides: Partial<SquareColorQuestion> = {}): SquareColorQuestion {
    return {
        square: 'e4',
        correctAnswer: 'white',
        userAnswer: 'white',
        responseTimeMs: 500,
        ...overrides,
    };
}

describe('computeSessionStats', () => {
    it('computes correct count from all-correct answers', () => {
        const questions = [makeQuestion(), makeQuestion(), makeQuestion()];
        const result = computeSessionStats(questions, Date.now() - 10_000);

        expect(result.totalQuestions).toBe(3);
        expect(result.correctCount).toBe(3);
    });

    it('computes correct count with mixed answers', () => {
        const questions = [
            makeQuestion({ userAnswer: 'white', correctAnswer: 'white' }),
            makeQuestion({ userAnswer: 'black', correctAnswer: 'white' }),
            makeQuestion({ userAnswer: 'white', correctAnswer: 'white' }),
        ];
        const result = computeSessionStats(questions, Date.now());

        expect(result.correctCount).toBe(2);
    });

    it('computes average response time', () => {
        const questions = [
            makeQuestion({ responseTimeMs: 200 }),
            makeQuestion({ responseTimeMs: 400 }),
            makeQuestion({ responseTimeMs: 600 }),
        ];
        const result = computeSessionStats(questions, Date.now());

        expect(result.avgResponseTimeMs).toBe(400);
    });

    it('rounds average response time to nearest integer', () => {
        const questions = [
            makeQuestion({ responseTimeMs: 100 }),
            makeQuestion({ responseTimeMs: 200 }),
            makeQuestion({ responseTimeMs: 300 }),
            makeQuestion({ responseTimeMs: 401 }),
        ];
        const result = computeSessionStats(questions, Date.now());

        expect(result.avgResponseTimeMs).toBe(250);
    });

    it('computes best streak of consecutive correct answers', () => {
        const questions = [
            makeQuestion({ userAnswer: 'white', correctAnswer: 'white' }),
            makeQuestion({ userAnswer: 'white', correctAnswer: 'white' }),
            makeQuestion({ userAnswer: 'black', correctAnswer: 'white' }),
            makeQuestion({ userAnswer: 'white', correctAnswer: 'white' }),
        ];
        const result = computeSessionStats(questions, Date.now());

        expect(result.bestStreak).toBe(2);
    });

    it('returns zero best streak when all answers are wrong', () => {
        const questions = [
            makeQuestion({ userAnswer: 'black', correctAnswer: 'white' }),
            makeQuestion({ userAnswer: 'black', correctAnswer: 'white' }),
        ];
        const result = computeSessionStats(questions, Date.now());

        expect(result.bestStreak).toBe(0);
    });

    it('computes total time in seconds from session start', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-01-01T00:00:30Z'));

        const sessionStart = new Date('2025-01-01T00:00:00Z').getTime();
        const result = computeSessionStats([makeQuestion()], sessionStart);

        expect(result.totalTimeSeconds).toBe(30);

        vi.useRealTimers();
    });

    it('returns the original questions array in the result', () => {
        const questions = [makeQuestion(), makeQuestion()];
        const result = computeSessionStats(questions, Date.now());

        expect(result.questions).toBe(questions);
    });

    it('handles a single question', () => {
        const questions = [makeQuestion({ responseTimeMs: 750 })];
        const result = computeSessionStats(questions, Date.now());

        expect(result.totalQuestions).toBe(1);
        expect(result.avgResponseTimeMs).toBe(750);
        expect(result.bestStreak).toBe(1);
    });
});
